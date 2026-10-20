import bcrypt from "bcrypt";
import { signToken } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { publicUser } from "@/lib/user";
import {
  authCookie,
  errorResponse,
  optionsResponse,
  printExceptionLog,
  successResponse,
} from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request) {
  try {
    const body = await request.json();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    if (!username || !password) {
      return errorResponse("Username and password are required.", 400);
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({
      $or: [{ username }, { email: username.toLowerCase() }],
    });

    if (!user) {
      return errorResponse("Invalid username or password.", 401);
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return errorResponse("Invalid username or password.", 401);
    }

    const token = signToken(user);
    const response = successResponse({ user: publicUser(user) }, 200);
    response.cookies.set("token", token, authCookie);
    return response;
  } catch (error) {
    printExceptionLog("Login", error);
    return errorResponse("Unable to log in.", 500);
  }
}
