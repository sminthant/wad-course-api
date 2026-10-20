export const ROLES = {
  STUDENT: "student",
  TEACHER: "teacher",
};

export function publicUser(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
  };
}
