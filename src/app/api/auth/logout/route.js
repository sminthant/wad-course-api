import {
  authCookie,
  optionsResponse,
  printExceptionLog,
  successResponse,
} from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function OPTIONS() {
  return optionsResponse();
}

export async function POST() {
  try {
    const response = successResponse({ message: "Logged out." }, 200);
    response.cookies.set("token", "", { ...authCookie, maxAge: 0 });
    return response;
  } catch (error) {
    printExceptionLog("Logout", error);
    return successResponse({ message: "Logged out." }, 200);
  }
}
