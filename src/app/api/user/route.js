import { getDb } from "@/lib/mongodb";
import { publicUser } from "@/lib/user";
import {
  errorResponse,
  printExceptionLog,
  successResponse,
} from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDb();
    const users = await db
      .collection("users")
      .find({}, { projection: { password: 0 } })
      .sort({ role: 1, username: 1 })
      .toArray();

    return successResponse({ users: users.map(publicUser) }, 200);
  } catch (error) {
    printExceptionLog("List users", error);
    return errorResponse("Unable to load users.", 500);
  }
}
