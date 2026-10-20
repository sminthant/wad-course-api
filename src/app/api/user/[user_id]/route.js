import { ObjectId } from "mongodb";
import { X_HEADER_USER_ID } from "@/lib/constant";
import { getDb } from "@/lib/mongodb";
import { publicUser } from "@/lib/user";
import {
  errorResponse,
  printExceptionLog,
  successResponse,
} from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request, { params }) {
  try {
    const { user_id: userId } = await params;
    const db = await getDb();

    if (userId === "me") {
      const currentUserId = request.headers.get(X_HEADER_USER_ID);
      const user = await db.collection("users").findOne({
        _id: new ObjectId(currentUserId),
      });

      if (!user) {
        return errorResponse("User not found.", 404);
      }

      return successResponse({ user: publicUser(user) }, 200);
    }

    if (!ObjectId.isValid(userId)) {
      return errorResponse("Invalid user id.", 400);
    }

    const user = await db.collection("users").findOne({
      _id: new ObjectId(userId),
    });

    if (!user) {
      return errorResponse("User not found.", 404);
    }

    return successResponse({ user: publicUser(user) }, 200);
  } catch (error) {
    printExceptionLog("Get user", error);
    return errorResponse("Unable to load user.", 500);
  }
}
