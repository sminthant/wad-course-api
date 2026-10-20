# How to Test the App

## Student Information

- **Student Name:**
- **Student ID:**

## Test Credentials

Every test account uses the password `password123`.

| Role | Username | Email |
| --- | --- | --- |
| Student | student1 | student1@example.com |
| Student | student2 | student2@example.com |
| Student | student3 | student3@example.com |
| Teacher | teacher1 | teacher1@example.com |
| Teacher | teacher2 | teacher2@example.com |
| Teacher | teacher3 | teacher3@example.com |

Log in with either the username or the email.

## Prerequisites

- Node.js 20 or newer
- A MongoDB database
- `next-backend/.env.local` with `MONGODB_URI` and `JWT_SECRET`
- `react-frontend/.env` with `VITE_API_URL=http://localhost:3000`

## How to Run & Test

### 1. Backend Setup (`next-backend/`)

```bash
cd next-backend
npm install
npm run seed
npm run dev
```

The API runs at http://localhost:3000.

### 2. Frontend Setup (`react-frontend/`)

```bash
cd react-frontend
npm install
npm run dev
```

Open http://localhost:5173.

### Deployment

- Frontend source: https://github.com/sminthant/wad-course-web
- Backend source: https://github.com/sminthant/wad-course-api
- Frontend: https://wad-course-web.vercel.app
- Backend API: https://wad-course-api.vercel.app

The frontend sends `/api` requests to its own host. Vercel forwards those requests to the backend, so the login cookie stays on the frontend site. Backend environment variables on Vercel are `MONGODB_URI`, `JWT_SECRET`, and `MONGODB_DB`.

MongoDB Atlas must allow Vercel to connect. In Atlas, open Network Access and add `0.0.0.0/0`. Until that address is allowed, the deployed login returns an error even though the local app works.

### 3. Testing Walkthrough

Sample courses are created by `npm run seed`:

| Course | Teacher | Status | Notes |
| --- | --- | --- | --- |
| Web Development | teacher1 | Open | Max 2 students. student1 and student2 are enrolled, so it is full. |
| Database Systems | teacher1 | Close | Visible to students, enrollment is rejected. |
| Cancelled Seminar | teacher1 | Cancel | Hidden from the student course list. |
| Computer Networks | teacher2 | Open | Available for enrollment. |

1. Open the frontend. Unauthenticated visitors are sent to the sign-in page. `GET http://localhost:3000/api/course` without a login cookie returns 401.
2. Sign in as `teacher1` / `password123`. The list shows only teacher1's courses. Open **Web Development** and confirm student1 is listed. Delete stays unavailable because a student is enrolled.
3. Create a course, update its status, and delete a course that has no enrollments.
4. Sign in as `teacher2` and open a teacher1 course URL. The API rejects it.
5. Sign in as `student1` / `password123`. Cancelled Seminar is absent. Filter by `web` or `teacher2`.
6. Open **Database Systems**. Enrollment is rejected because the status is Close.
7. Open **Computer Networks** and enroll. Enrolling again is rejected.
8. Open **My enrollments**. Web Development and Computer Networks are listed.
