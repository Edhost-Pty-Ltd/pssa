# PSSA — Personal Shoppers and Sourcing Association

Public website, member portal and backend API for PSSA.
The admin dashboard lives in the `pssa-admin-dashboard` repo and uses this backend.

## Structure

- `frontend/` — React + Vite + Tailwind (port 5174)
- `backend/` — Express + Prisma + PostgreSQL (port 5000)

## Run locally

Frontend:

    cd frontend
    npm install
    npm run dev

Backend: see `backend/README.md` (coming with the backend foundation).

## Working rules

- Work in a feature branch and open a pull request; `main` is protected.
- Never commit `.env` files or secrets.
- No demo or mock data; the seed creates only the admin account.
