# Attendance Backend

Node.js + Express + PostgreSQL (via Prisma) backend for an ERP attendance
system with two biometric verification sources: the mobile app (phone
Face ID / fingerprint) and an office hardware fingerprint device.

## Folder structure

```
AttendanceBackend/
├── server.js                    # entry point
├── prisma/
│   ├── schema.prisma             # database design (employees, devices, attendance)
│   └── seed.js                   # creates a default admin + device API key
├── src/
│   ├── config/
│   │   ├── env.js                # reads .env
│   │   └── db.js                 # shared Prisma client
│   ├── middleware/
│   │   ├── auth.js               # JWT auth for employees (mobile app)
│   │   └── deviceAuth.js         # API key auth for the office device
│   ├── controllers/
│   │   ├── authController.js     # login
│   │   ├── attendanceController.js  # mobile + device check-in, reports
│   │   └── employeeController.js # admin: create/list employees
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── attendanceRoutes.js
│   │   └── employeeRoutes.js
│   └── app.js                    # wires routes together
```

## Setup

1. Install PostgreSQL locally, or use a hosted one (Supabase, Neon, Railway all have free tiers).
2. `npm install`
3. Copy `.env.example` to `.env` and set `DATABASE_URL` to your database.
4. Run the migration (creates the actual tables from schema.prisma):
   ```
   npm run prisma:migrate
   ```
5. Seed a default admin + device:
   ```
   npm run seed
   ```
6. Start the server:
   ```
   npm run dev
   ```

Default admin login: `admin@company.com` / `admin123` — change this immediately in a real deployment.

## API design

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/login` | none | Employee logs in, gets a JWT |
| POST | `/attendance/mobile-checkin` | JWT (employee) | Mobile app: mark attendance after biometric success |
| GET | `/attendance/me` | JWT (employee) | Employee views their own history |
| POST | `/attendance/device-checkin` | Device API key | Office scanner pushes a verified match |
| GET | `/attendance` | JWT (admin) | Admin views/filters all records |
| POST | `/employees` | JWT (admin) | Admin creates an employee |
| GET | `/employees` | JWT (admin) | Admin lists employees |

## Why this design

- **Biometric matching never happens on the server.** The phone's OS and the
  office device both do their own matching locally and only tell your API
  "this person is verified" — your backend just needs to trust and log that,
  which sidesteps huge privacy/compliance complexity around storing raw
  biometric data.
- **Two different auth mechanisms on purpose.** Employees authenticate with
  a JWT (they log in once, the token proves who they are on every request).
  The office device isn't a person — it authenticates with a fixed API key
  instead, since there's no "login" concept for a machine sitting in a lobby.
- **One attendance table, tagged by source.** Rather than separate tables
  for mobile vs device check-ins, `source` (`MOBILE`/`DEVICE`) on a single
  table keeps reporting simple — one query gets you everyone's attendance
  regardless of how they checked in.
- **Toggle check-in/check-out with one endpoint.** Both check-in routes
  check for an already-open record today; if one exists, the same tap
  closes it out as a check-out instead of requiring separate endpoints.

## Testing the API without hardware yet

You can simulate a device check-in with curl before you have real hardware:

```bash
curl -X POST http://localhost:4000/attendance/device-checkin \
  -H "Content-Type: application/json" \
  -H "X-Device-Key: device-key-change-me" \
  -d '{"employeeId": "PASTE_AN_EMPLOYEE_ID_HERE"}'
```

## Next steps
- Connect the React Native app's login screen to `POST /auth/login`
- Add `expo-local-authentication` to the app, then call `/attendance/mobile-checkin` on success
- Build a simple web or tablet admin dashboard against `GET /attendance`
