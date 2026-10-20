import { ObjectId } from "mongodb";
import { getActor } from "@/lib/actor";
import {
  COURSE_STATUS,
  ensureCourseIndexes,
  escapeRegex,
  parseCourseBody,
  publicCourse,
} from "@/lib/course";
import { getDb } from "@/lib/mongodb";
import { ROLES } from "@/lib/user";
import {
  errorResponse,
  printExceptionLog,
  successResponse,
} from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  try {
    const actor = getActor(request);
    const db = await getDb();
    await ensureCourseIndexes(db);

    const scope = request.nextUrl.searchParams.get("scope");
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    if (actor.role === ROLES.TEACHER) {
      const filter = { teacherId: new ObjectId(actor.id) };
      if (query) {
        filter.name = new RegExp(escapeRegex(query), "i");
      }
      const courses = await db
        .collection("courses")
        .find(filter)
        .sort({ name: 1 })
        .toArray();
      return successResponse({ courses: courses.map(publicCourse) }, 200);
    }

    if (actor.role !== ROLES.STUDENT) {
      return errorResponse("You are not allowed to view courses.", 403);
    }

    if (scope === "enrolled") {
      const enrollments = await db
        .collection("enrollments")
        .find({ studentId: new ObjectId(actor.id) })
        .toArray();
      const courseIds = enrollments.map((enrollment) => enrollment.courseId);
      const courses = await db
        .collection("courses")
        .find({ _id: { $in: courseIds } })
        .sort({ name: 1 })
        .toArray();
      return successResponse({ courses: courses.map(publicCourse) }, 200);
    }

    const filter = { status: { $ne: COURSE_STATUS.CANCEL } };
    if (query) {
      const regex = new RegExp(escapeRegex(query), "i");
      filter.$or = [{ name: regex }, { teacherName: regex }];
    }

    const courses = await db
      .collection("courses")
      .find(filter)
      .sort({ name: 1 })
      .toArray();
    return successResponse({ courses: courses.map(publicCourse) }, 200);
  } catch (error) {
    printExceptionLog("List courses", error);
    return errorResponse("Unable to load courses.", 500);
  }
}

export async function POST(request) {
  try {
    const actor = getActor(request);
    if (actor.role !== ROLES.TEACHER) {
      return errorResponse("Only teachers can create courses.", 403);
    }

    const parsed = parseCourseBody(await request.json());
    if (parsed.error) {
      return errorResponse(parsed.error, 400);
    }

    const db = await getDb();
    await ensureCourseIndexes(db);
    const now = new Date();
    const result = await db.collection("courses").insertOne({
      ...parsed.value,
      teacherId: new ObjectId(actor.id),
      teacherName: actor.username,
      enrolledCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    const course = await db.collection("courses").findOne({ _id: result.insertedId });
    return successResponse({ course: publicCourse(course) }, 201);
  } catch (error) {
    printExceptionLog("Create course", error);
    return errorResponse("Unable to create the course.", 500);
  }
}
