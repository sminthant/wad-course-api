import { ObjectId } from "mongodb";
import { getActor } from "@/lib/actor";
import { COURSE_STATUS, ensureCourseIndexes, publicCourse } from "@/lib/course";
import { getDb } from "@/lib/mongodb";
import { ROLES } from "@/lib/user";
import {
  errorResponse,
  printExceptionLog,
  successResponse,
} from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request, { params }) {
  try {
    const actor = getActor(request);
    if (actor.role !== ROLES.STUDENT) {
      return errorResponse("Only students can enroll in a course.", 403);
    }

    const { course_id: courseId } = await params;
    if (!ObjectId.isValid(courseId)) {
      return errorResponse("Invalid course id.", 400);
    }

    const db = await getDb();
    await ensureCourseIndexes(db);
    const courseObjectId = new ObjectId(courseId);
    const studentObjectId = new ObjectId(actor.id);

    const alreadyEnrolled = await db.collection("enrollments").findOne({
      courseId: courseObjectId,
      studentId: studentObjectId,
    });
    if (alreadyEnrolled) {
      return errorResponse("You are already enrolled in this course.", 409);
    }

    const course = await db.collection("courses").findOne({ _id: courseObjectId });
    if (!course || course.status === COURSE_STATUS.CANCEL) {
      return errorResponse("Course not found.", 404);
    }
    if (course.status !== COURSE_STATUS.OPEN) {
      return errorResponse("This course is not open for enrollment.", 403);
    }

    const updated = await db.collection("courses").findOneAndUpdate(
      {
        _id: courseObjectId,
        status: COURSE_STATUS.OPEN,
        $expr: { $lt: ["$enrolledCount", "$maxStudent"] },
      },
      { $inc: { enrolledCount: 1 } },
      { returnDocument: "after" },
    );

    if (!updated) {
      return errorResponse("This course has no seats remaining.", 403);
    }

    try {
      await db.collection("enrollments").insertOne({
        courseId: courseObjectId,
        studentId: studentObjectId,
        studentUsername: actor.username,
        studentEmail: actor.email,
        enrolledAt: new Date(),
      });
    } catch (error) {
      await db.collection("courses").updateOne(
        { _id: courseObjectId },
        { $inc: { enrolledCount: -1 } },
      );
      if (error?.code === 11000) {
        return errorResponse("You are already enrolled in this course.", 409);
      }
      throw error;
    }

    return successResponse(
      { message: "Enrolled.", course: publicCourse(updated) },
      201,
    );
  } catch (error) {
    printExceptionLog("Enroll", error);
    return errorResponse("Unable to enroll in the course.", 500);
  }
}
