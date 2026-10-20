import bcrypt from "bcrypt";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "course_service";

if (!uri) {
  console.error("MONGODB_URI is missing. Add it to next-backend/.env.local.");
  process.exit(1);
}

const password = "password123";
const accounts = [
  ["student1", "student1@example.com", "student"],
  ["student2", "student2@example.com", "student"],
  ["student3", "student3@example.com", "student"],
  ["teacher1", "teacher1@example.com", "teacher"],
  ["teacher2", "teacher2@example.com", "teacher"],
  ["teacher3", "teacher3@example.com", "teacher"],
];

const clientOptions = {
  family: 4,
  autoSelectFamily: false,
  serverSelectionTimeoutMS: 8000,
};

let client;
for (let attempt = 1; attempt <= 5; attempt += 1) {
  client = new MongoClient(uri, clientOptions);
  try {
    await client.connect();
    break;
  } catch (error) {
    await client.close().catch(() => {});
    if (attempt === 5) {
      throw error;
    }
    console.log(`Connection attempt ${attempt} failed. Retrying...`);
  }
}

try {
  const users = client.db(dbName).collection("users");
  const passwordHash = await bcrypt.hash(password, 10);

  for (const [username, email, role] of accounts) {
    await users.updateOne(
      { username },
      {
        $set: {
          username,
          email,
          password: passwordHash,
          role,
        },
      },
      { upsert: true },
    );
  }

  await users.createIndex({ username: 1 }, { unique: true });
  await users.createIndex({ email: 1 }, { unique: true });

  const courses = client.db(dbName).collection("courses");
  const enrollments = client.db(dbName).collection("enrollments");
  const teacher1 = await users.findOne({ username: "teacher1" });
  const teacher2 = await users.findOne({ username: "teacher2" });
  const student1 = await users.findOne({ username: "student1" });

  const samples = [
    {
      name: "Web Development",
      duration: 45,
      topics: ["HTML", "React", "APIs"],
      price: 3500,
      maxStudent: 2,
      status: "open",
      teacher: teacher1,
    },
    {
      name: "Database Systems",
      duration: 30,
      topics: ["MongoDB", "Indexes"],
      price: 2800,
      maxStudent: 20,
      status: "close",
      teacher: teacher1,
    },
    {
      name: "Cancelled Seminar",
      duration: 5,
      topics: ["Research"],
      price: 0,
      maxStudent: 10,
      status: "cancel",
      teacher: teacher1,
    },
    {
      name: "Computer Networks",
      duration: 40,
      topics: ["TCP", "HTTP"],
      price: 3200,
      maxStudent: 25,
      status: "open",
      teacher: teacher2,
    },
  ];

  for (const sample of samples) {
    const { teacher, ...fields } = sample;
    await courses.updateOne(
      { name: fields.name, teacherId: teacher._id },
      {
        $set: {
          ...fields,
          teacherId: teacher._id,
          teacherName: teacher.username,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          enrolledCount: 0,
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
  }

  const webDevelopment = await courses.findOne({
    name: "Web Development",
    teacherId: teacher1._id,
  });
  await enrollments.updateOne(
    { courseId: webDevelopment._id, studentId: student1._id },
    {
      $setOnInsert: {
        courseId: webDevelopment._id,
        studentId: student1._id,
        studentUsername: student1.username,
        studentEmail: student1.email,
        enrolledAt: new Date(),
      },
    },
    { upsert: true },
  );

  const enrollmentCount = await enrollments.countDocuments({
    courseId: webDevelopment._id,
  });
  await courses.updateOne(
    { _id: webDevelopment._id },
    { $set: { enrolledCount: enrollmentCount } },
  );

  await courses.createIndex({ teacherId: 1 });
  await enrollments.createIndex({ studentId: 1 });
  await enrollments.createIndex(
    { courseId: 1, studentId: 1 },
    { unique: true },
  );

  console.log(`Seeded ${accounts.length} users in ${dbName}.users`);
  console.log(`Seeded ${samples.length} sample courses`);
} finally {
  await client.close();
}
