const allowedOrigin =
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV == "development"
    ? "http://localhost:5173"
    : "http://localhost:5173");

let corsHeaders = {
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export default corsHeaders;
