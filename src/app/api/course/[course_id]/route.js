import { ObjectId } from "mongodb";
import { getActor } from "@/lib/actor";
import {
  COURSE_STATUS,
  ensureCourseIndexes,
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

async function loadAccessibleCourse(db, actor, courseId) {
  if (!ObjectId.isValid(courseId)) {
    return { error: errorResponse("Invalid course id.", 400) };
  }

  const course = await db.collection("courses").findOne({
    _id: new ObjectId(courseId),
  });
  if (!course) {
    return { error: errorResponse("Course not found.", 404) };
  }

  const isOwner =
    actor.role === ROLES.TEACHER && course.teacherId.toString() === actor.id;

  if (actor.role === ROLES.TEACHER && !isOwner) {
    return { error: errorResponse("You can only access your own courses.", 403) };
  }

  if (actor.role === ROLES.STUDENT && course.status === COURSE_STATUS.CANCEL) {
    const enrollment = await db.collection("enrollments").findOne({
      courseId: course._id,
      studentId: new ObjectId(actor.id),
    });
    if (!enrollment) {
      return { error: errorResponse("Course not found.", 404) };
    }
  }

  if (actor.role !== ROLES.TEACHER && actor.role !== ROLES.STUDENT) {
    return { error: errorResponse("You are not allowed to access this course.", 403) };
  }

  return { course, isOwner };
}

export async function GET(request, { params }) {
  try {
    const actor = getActor(request);
    const { course_id: courseId } = await params;
    const db = await getDb();
    await ensureCourseIndexes(db);
    const loaded = await loadAccessibleCourse(db, actor, courseId);
    if (loaded.error) {
      return loaded.error;
    }

    const enrollments = await db
      .collection("enrollments")
      .find({ courseId: loaded.course._id })
      .sort({ studentUsername: 1 })
      .toArray();

    const payload = {
      course: publicCourse(loaded.course),
    };

    if (loaded.isOwner) {
      payload.students = enrollments.map((enrollment) => ({
        id: enrollment.studentId.toString(),
        username: enrollment.studentUsername,
        email: enrollment.studentEmail,
      }));
    } else {
      payload.enrolled = enrollments.some(
        (enrollment) => enrollment.studentId.toString() === actor.id,
      );
    }

    return successResponse(payload, 200);
  } catch (error) {
    printExceptionLog("Get course", error);
    return errorResponse("Unable to load the course.", 500);
  }
}

export async function PUT(request, { params }) {
  try {
    const actor = getActor(request);
    if (actor.role !== ROLES.TEACHER) {
      return errorResponse("Only the course owner can update a course.", 403);
    }

    const parsed = parseCourseBody(await request.json());
    if (parsed.error) {
      return errorResponse(parsed.error, 400);
    }

    const { course_id: courseId } = await params;
    const db = await getDb();
    await ensureCourseIndexes(db);
    const loaded = await loadAccessibleCourse(db, actor, courseId);
    if (loaded.error) {
      return loaded.error;
    }

    if (parsed.value.maxStudent < loaded.course.enrolledCount) {
      return errorResponse(
        "Max student cannot be lower than the number of enrolled students.",
        400,
      );
    }

    const course = await db.collection("courses").findOneAndUpdate(
      { _id: loaded.course._id, teacherId: new ObjectId(actor.id) },
      {
        $set: {
          ...parsed.value,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    return successResponse({ course: publicCourse(course) }, 200);
  } catch (error) {
    printExceptionLog("Update course", error);
    return errorResponse("Unable to update the course.", 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const actor = getActor(request);
    if (actor.role !== ROLES.TEACHER) {
      return errorResponse("Only the course owner can delete a course.", 403);
    }

    const { course_id: courseId } = await params;
    const db = await getDb();
    await ensureCourseIndexes(db);
    const loaded = await loadAccessibleCourse(db, actor, courseId);
    if (loaded.error) {
      return loaded.error;
    }

    const enrolledCount = await db.collection("enrollments").countDocuments({
      courseId: loaded.course._id,
    });
    if (enrolledCount > 0) {
      return errorResponse(
        "A course can be deleted only when no student is enrolled.",
        403,
      );
    }

    await db.collection("courses").deleteOne({
      _id: loaded.course._id,
      teacherId: new ObjectId(actor.id),
    });
    return successResponse({ message: "Course deleted." }, 200);
  } catch (error) {
    printExceptionLog("Delete course", error);
    return errorResponse("Unable to delete the course.", 500);
  }
}
