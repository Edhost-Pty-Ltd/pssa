# PSSA backend (API)

Express 5 + TypeScript + Prisma + PostgreSQL. Serves the public site, the member portal
**and** the admin dashboard (`pssa-admin-dashboard` repo). This is the only code that
touches the database; both frontends call it through `/api`.

## First-time setup

1. Create the database (PostgreSQL must be running):

       createdb -h localhost -U postgres pssa

2. Copy `.env.example` to `.env` and fill in `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
   and the SMTP values (ask the team lead; never commit `.env`).

3. Install, create the tables and the admin account, then start:

       npm install
       npm run db:migrate      # first time: creates the tables (answer the migration name prompt with: init)
       npm run db:seed         # creates the admin account from .env — no demo data
       npm run dev             # http://localhost:5000/api/health

## After pulling schema changes

    npm install && npm run db:deploy && npx prisma generate

then restart `npm run dev`.

## API areas

| Prefix            | Purpose                                              |
|-------------------|------------------------------------------------------|
| `/api/auth`       | register, login, logout, me, OTP send/verify         |
| `/api/member`     | the signed-in member's profile and documents         |
| `/api/members`    | member registration                                  |
| `/api/search`     | public member register (verified members only)       |
| `/api/tutorials`  | tutorial videos and watch progress                   |
| `/api/exam`       | conduct assessment                                   |
| `/api/admin`      | applications, reviews, certificates (ADMIN role)     |

Error shape for every endpoint: `{ error, errors: [], fields: { field: "message" } }`.
