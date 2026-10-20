import {
  X_HEADER_USER_EMAIL,
  X_HEADER_USER_ID,
  X_HEADER_USER_NAME,
  X_HEADER_USER_ROLE,
} from "./constant";

export function getActor(request) {
  return {
    id: request.headers.get(X_HEADER_USER_ID) || "",
    username: request.headers.get(X_HEADER_USER_NAME) || "",
    email: request.headers.get(X_HEADER_USER_EMAIL) || "",
    role: request.headers.get(X_HEADER_USER_ROLE) || "",
  };
}
