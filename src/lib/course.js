export const COURSE_STATUS = {
  OPEN: "open",
  CLOSE: "close",
  CANCEL: "cancel",
};

const STATUS_VALUES = Object.values(COURSE_STATUS);

let indexPromise;

export function ensureCourseIndexes(db) {
  if (!indexPromise) {
    indexPromise = Promise.all([
      db.collection("courses").createIndex({ teacherId: 1 }),
      db.collection("enrollments").createIndex({ studentId: 1 }),
      db
        .collection("enrollments")
        .createIndex({ courseId: 1, studentId: 1 }, { unique: true }),
    ]);
  }
  return indexPromise;
}

export function parseCourseBody(body) {
  const name = String(body?.name ?? "").trim();
  const duration = Number(body?.duration);
  const price = Number(body?.price);
  const maxStudent = Number(body?.maxStudent);
  const status = String(body?.status ?? "").trim().toLowerCase();

  let topics = body?.topics;
  if (typeof topics === "string") {
    topics = topics.split(",");
  }
  if (!Array.isArray(topics)) {
    topics = [];
  }
  topics = topics.map((topic) => String(topic).trim()).filter(Boolean);

  if (!name) {
    return { error: "Course name is required." };
  }
  if (!Number.isInteger(duration) || duration < 1) {
    return { error: "Duration must be a whole number of days greater than 0." };
  }
  if (topics.length === 0) {
    return { error: "At least one topic is required." };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { error: "Price must be a number greater than or equal to 0." };
  }
  if (!Number.isInteger(maxStudent) || maxStudent < 1) {
    return { error: "Max student must be a whole number greater than 0." };
  }
  if (!STATUS_VALUES.includes(status)) {
    return { error: "Status must be Open, Close, or Cancel." };
  }

  return {
    value: { name, duration, topics, price, maxStudent, status },
  };
}

export function publicCourse(course) {
  const enrolledCount = course.enrolledCount ?? 0;
  return {
    id: course._id.toString(),
    name: course.name,
    duration: course.duration,
    topics: course.topics,
    price: course.price,
    maxStudent: course.maxStudent,
    status: course.status,
    teacherId: course.teacherId.toString(),
    teacherName: course.teacherName,
    enrolledCount,
    seatsRemaining: Math.max(course.maxStudent - enrolledCount, 0),
  };
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
