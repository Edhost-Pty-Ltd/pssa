# PSSA API contract

**Personal Shoppers and Sourcing Association** · Version 1.1.1 · 17 November 2026, Africa/Johannesburg (SAST, UTC+2)

This is a wording-only refresh of version 1.1. Paths, methods, request and response shapes, enums and ID formats are unchanged.

This is the agreed request and response shape for the PSSA backend. It is the document Naledi and Tshepang should build against while Ryan and KG finish the API. If a screen needs a change, update this file in the same pull request as the code.

- Backend and public/member frontend: [`Edhost-Pty-Ltd/pssa`](https://github.com/Edhost-Pty-Ltd/pssa) (`backend/` on port 5000, `frontend/` on port 5174)
- Admin frontend: [`Edhost-Pty-Ltd/pssa-admin-dashboard`](https://github.com/Edhost-Pty-Ltd/pssa-admin-dashboard) (port 5175, frontend only, proxies `/api` to the pssa backend)
- Intended path in the pssa repo: `docs/api-contract.md`
- The archived Personal-Shopper repo is not the source of truth

The backend and the Prisma schema are being built from scratch in Phase 1. Do not reuse or extend the backend code or migrations already in the repo. **Status** in the tables below is **To build** for every route.

---

## 1. Conventions

**The `/api` prefix.** Every backend route lives under `/api`. In development, Vite forwards `/api` from port 5174 (public/member) and 5175 (admin) to Express on port 5000. The browser calls relative URLs such as `/api/auth/otp/send`, and the session cookie travels with the request. Production should keep the same prefix, behind HTTPS on PSSA.site.

**Auth via the `ec_session` cookie.** On a successful sign-in the server sets an httpOnly cookie named `ec_session`, holding a JWT (HS256, 7 days). JavaScript cannot read it. `loadUser` verifies the token, loads the user, and checks `tokenVersion` so a logout can invalidate older tokens. A missing or stale session is treated as signed out (see `GET /api/auth/me`). A signed-in user with the wrong role is `403`.

**Member sign-in is passwordless.** The Figma member portal asks for an email, sends a one-time code, and signs the person in when the code is correct. There is no password on that flow. Admin accounts still sign in with the seeded email and password at `POST /api/auth/login`.

**Standard error shape.** Errors use `{ error, errors?, fields? }`. `error` is a human-readable string the page can show. `fields` is an optional map of field name to a short message, used for forms (for example `{ email: "This email is already registered." }`). Do not leak stack traces or SQL in production.

**Statuses in the API** use the shared snake_case values in section 4, not free text. The frontend may show friendlier words, including the Figma labels.

**Dates** are stored and returned in ISO 8601. Display them in Africa/Johannesburg. Complaint service times use business days in that zone.

**Privacy.** Public endpoints never return identity documents, bank evidence, or private home addresses. Phone numbers on public profiles are masked, as in the Figma file. The seed creates only the admin account. No demo or mock data belongs in pages or in the seed.

**Never commit `.env`.** Secrets are shared privately, never on GitHub.

---

## 2. Roles

| Role | Who | How they sign in |
| --- | --- | --- |
| `MEMBER` | An applicant going through verification, and later a certified member | Passwordless email OTP (`/api/auth/otp/send` and `/otp/verify`) |
| `CUSTOMER` | A person who only searches, checks a badge, or files a complaint | No account is required for search or a badge check. A complaint can be filed without a login. |
| `ADMIN` | A reviewer | Password login at `/api/auth/login`. Admin accounts are created only by `npm run db:seed`. There is no public admin sign-up. |

---

## 3. Identifiers

Keep these three prefixes consistent. Do not invent a fourth style.

| Kind | Format | Example | Notes |
| --- | --- | --- | --- |
| Application | `APP-YYYY-XXXX` | `APP-2026-0098` | Used on the admin review screen |
| Certificate | `PSSA-YYYY-XXXXXX` | `PSSA-2026-004821` | Unique. Live-check URL: `/verify/PSSA-YYYY-XXXXXX` |
| Complaint | `PSSA-C-YYYY-XXXX` | `PSSA-C-2026-0184` | Issued when a complete complaint is stored |

The public live-check page is `/verify/:certificateNumber`. The API behind it is `GET /api/verify/:certificateNumber`. Do not use the shorter `/v/` path also shown on the Figma badge.

---

## 4. Status enums

### Application status

| Value | Shown as | Meaning |
| --- | --- | --- |
| `draft` | Draft | The applicant has a file but has not submitted it yet. |
| `submitted` | Submitted / Ready for review | The applicant has submitted the file for review. |
| `under_review` | Under review | A reviewer is actively working the file. |
| `needs_info` | Needs information / Action needed | The reviewer has asked for more or clearer evidence. The file stays open. |
| `approved` | Approved / Certified | Approval has been recorded. Activation still requires every gate. |
| `rejected` | Rejected | The application was declined, with written reasons. |

### Member status

| Value | Shown as | Public wording |
| --- | --- | --- |
| `active` | Active | Certified, current, and allowed to show the badge. |
| `suspended` | Suspended | Approval is temporarily inactive. Public wording: “Suspended, approval temporarily inactive”. Never “scammer”. |
| `expired` | Expired | The 12-month period has ended and renewal has not been completed. No silent grace period. |
| `revoked` | Revoked | Approval has been withdrawn. Badge rights end immediately. |
| `resigned` | Resigned | The member has left. Badge rights end immediately. Outstanding duties remain. |

Application status covers the file, and member status covers the certified person. Pending or rejected applicants are not returned by public search (404), so the register does not reveal that they applied.

### Document status

| Value | Shown as | Meaning |
| --- | --- | --- |
| `uploaded` | Uploaded | The file is in, and a reviewer has not yet started. |
| `under_review` | Under review | A reviewer is looking at the file. |
| `accepted` | Accepted | The check has passed. Uploading is not the same as passing. |
| `needs_resubmission` | Needs resubmission | The file was not accepted and the applicant must send a replacement, with a reviewer note. |

Channel checks may also show **Confirmed** or **Code sent** on the member screen.

### Complaint status

| Value | Shown as | Meaning |
| --- | --- | --- |
| `received` | Received | Stored, with a `PSSA-C-YYYY-XXXX` reference number. |
| `under_review` | Under review | A reviewer is working the case. First moving it here should stamp the acknowledgement time if that is still empty. |
| `awaiting_member_response` | Awaiting response | The member has been asked to answer and has not yet done so. |
| `decided` | Decided | A reasoned outcome has been recorded and both sides have been told, with the appeal deadline. |
| `under_appeal` | Under appeal | An appeal was lodged within ten business days and is being reviewed by a different person. |

Complaint outcomes (shown as in the Figma file): `no_breach` (No breach), `corrective_action` (Corrective action), `suspension` (Suspension), `revocation` (Revocation).

---

## 5. Key data models

These are the records the API hangs off. KG designs a new Prisma schema from scratch to match this contract; later phases add assessments, certificates, complaints, appeals and renewals.

| Model | Key fields and rules |
| --- | --- |
| User | `id`, `email`, `passwordHash?` (required for ADMIN, not required for passwordless members), `role`, `tokenVersion`, `emailVerifiedAt`, `phoneVerifiedAt`, `lastLoginAt`, `createdAt`. A password hash is never returned. |
| MemberProfile | Names, phone, trading name, scope, idNumber, physicalAddress, city, channels, member status, `validFrom`, `validUntil`. Private fields never go on public endpoints. Identity today is treated as a South African ID number in the API; the Verification Standard also allows an overseas passport route — KG should make identity type/number support that (nullable SA ID vs passport) so “profile complete” does not force an SA ID forever. |
| Application | `id`, `userId`, `number` (`APP-YYYY-XXXX`), `status`, `submittedAt`, `agreementAcceptedAt`, `agreementVersion`, reviews. Created by the submit endpoint. |
| Document | `id`, `userId`, `type`, storage path, `status`, `reviewerNote`, `reviewedAt`, `reviewedBy`. Types: `id_document`, `proof_of_residence`, `bank_evidence`, `business_registration`, `channel_evidence`. Stored privately. |
| TutorialVideo and VideoProgress | Progress must not treat a skip-ahead as completion. Official lesson files come from the senior (four tutorial videos). |
| ExamQuestion and ExamAttempt | Questions include `isCritical`. An attempt stores question ids, answers, score, percent, passed, `criticalFailed`, `startedAt`, `expiresAt` (the 45-minute mark), `submittedAt`, and type (`entrance` or `refresher`). The answer key never goes to the applicant. Official content is the 30-question paper from the senior. |
| Certificate | `id`, `number` (`PSSA-YYYY-XXXXXX`, unique), `memberId`, `issuedAt`, `validFrom`, `validUntil`, scope, `pdfPath`, `qrTargetUrl` (`/verify/PSSA-YYYY-XXXXXX`), status. Issued only after the gates and a recorded human approval. |
| Complaint and Appeal | `id`, `referenceNumber` (`PSSA-C-YYYY-XXXX`), `memberId`, type, description, status, contact, consent, `acknowledgedAt`, `decisionDueAt`, `decidedAt`, `appealDeadline`, outcome, reasons. |
| AdminReview and StatusHistory | Who, what, why, when, and `conflictDeclared`. Every application decision, status change, retake permission and complaint outcome gets a row. |

---

## 6. Endpoints

Owners: **Ryan** (API and business logic), **KG** (schema, migrations, queries), **Tshepang** (`pssa/frontend`), **Naledi** (`pssa-admin-dashboard`). New admin endpoints are added to the pssa backend through a pull request there.

### 6.1 Auth and OTP

Member sign-in is passwordless: send a code, then verify the code. Phase 1 builds public `POST /api/auth/otp/send` and `POST /api/auth/otp/verify`. Tshepang’s sign-in page depends on send-code landing first.

| Method | Path | Who | In / Out | Status |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/otp/send` | Public | **In:** `{ email }`. Phone: `{ email, channel: "phone" }` returns 400 until an SMS service exists. **Out:** `200 { sent, destination (masked), expiresAt }`. Stores the OTP against the email only — it does **not** create a user yet (avoids bots/typos filling `users`). Do not reveal whether the email is already registered. Rate-limited. Do not return a `devCode` in production. | Exists |
| POST | `/api/auth/otp/verify` | Public | **In:** `{ email, code }` (six digits). **Out:** `200 { user }` and `Set-Cookie: ec_session`. On a correct code, **creates** a passwordless `MEMBER` if needed (or resumes an existing one), sets `emailVerifiedAt`, and issues the session. Wrong, expired or over-attempted codes return 400 with a field error on `code`. | Exists |
| POST | `/api/auth/login` | Public | **In:** `{ email, password }`. **Out:** `200 { user }` and `Set-Cookie: ec_session`. Updates `lastLoginAt`. This is the admin sign-in. Members who use OTP may have no password and must not be required to use this endpoint. Rate-limited. | To build |
| POST | `/api/auth/logout` | Signed in | **In:** none. **Out:** `200 { ok: true }`. Clears the cookie and increments `tokenVersion`. Safe to call when signed out. | To build |
| GET | `/api/auth/me` | Public | **In:** cookie only. **Out:** `200 { user }` or `200 { user: null }` if there is no valid session. The frontend calls this on load to restore a session. | To build |

Do not use `POST /api/auth/register` for the member portal; it is **not** the Figma member flow. Passwordless send-code and verify-code are the member sign-in. A public form must never accept an `ADMIN` role.

### 6.2 Member profile and application

The signed-in member API lives under `/api/member` (not `/api/seller` or `/api/applicant`).

| Method | Path | Who | In / Out | Status |
| --- | --- | --- | --- | --- |
| GET | `/api/member/profile` | Member | **In:** cookie. **Out:** `200 { profile }` including status, masked ID number, address, channels and a documents summary. Never a password hash. | Exists |
| PATCH | `/api/member/profile` | Member | **In:** partial body: name, phone, trading name, scope, idNumber, physicalAddress, city, channel URLs (`null` deletes a channel). **Out:** `200 { profile }`. `409` if the ID number belongs to someone else. | Exists |
| GET | `/api/member/application` | Member | **In:** cookie. **Out:** `200 { application, progress }` — see **Application progress shape** below. Until the member accepts the agreement or submits, `application` may be a null draft (`id` / `number` null, `status: "draft"`). Status stays `draft` until submit. | Exists |
| POST | `/api/member/application/submit` | Member | **In:** empty body, or `{ confirm: true }`. **Out:** `200` or `201 { application }` with status `submitted` and an `APP-YYYY-XXXX` number. `409` if required profile fields, documents or agreement acceptance are missing. | Exists |
| POST | `/api/member/application/agreement` | Member | **In:** `{ accepted: true, version }` (the published Policy 01 version). **Out:** `200 { application }` with `agreementAcceptedAt` and version stored. Creates the draft application row (and number) if it does not exist yet. Agreement text content is blocked until the senior provides Policy 01; the API already stores acceptance + version. | Exists |

#### Application progress shape

`GET /api/member/application` returns this shape for the member dashboard:

```json
{
  "application": {
    "id": null,
    "number": null,
    "status": "draft",
    "submittedAt": null,
    "agreementAcceptedAt": null,
    "agreementVersion": null
  },
  "progress": {
    "percent": 17,
    "steps": [
      { "key": "profile", "label": "Profile", "state": "complete", "detail": "Complete" },
      { "key": "documents", "label": "Verification documents", "state": "action_needed", "detail": "1 needs resubmission" },
      { "key": "tutorials", "label": "Conduct tutorials", "state": "not_started", "detail": "0 of 4 complete" },
      { "key": "assessment", "label": "Entrance assessment", "state": "locked", "detail": "Locked" },
      { "key": "review", "label": "Review", "state": "locked", "detail": "Locked" },
      { "key": "certified", "label": "Certified", "state": "locked", "detail": "Locked" }
    ],
    "actions": [
      {
        "step": "documents",
        "title": "Bank account evidence",
        "detail": "The account holder name is not visible.",
        "status": "needs_resubmission"
      }
    ],
    "canSubmit": false
  }
}
```

Rules for the member portal:

- `application.status` is `draft` until the member submits.
- Before agreement/submit, `application.id` and `application.number` may be `null`.
- Each step `state` is one of: `complete`, `in_progress`, `action_needed`, `not_started`, `locked`.
- Step keys are: `profile`, `documents`, `tutorials`, `assessment`, `review`, `certified`.
- `percent` is `round(100 * completeSteps / 6)`.
- `actions` lists document resubmission work (and later other action-needed items) for the dashboard cards.
- `canSubmit` is true only when profile + required documents/channels + agreement are done and the application is still `draft` or `needs_info`.
- Profile complete requires name, phone, id number, address, city and scope. **`tradingName` is optional** (members may trade under their own name).
- Channel confirm currently accepts any 6-digit code for UI testing; verification gate V5 needs a real outbound code check before launch. Adding the same platform again updates the existing channel instead of creating a duplicate.
- Tutorials/assessment stay locked or not started until those models and official content land.

### 6.3 Documents

Uploads accept the types below, including bank and channel evidence, and allow replace as in the Figma file.

| Method | Path | Who | In / Out | Status |
| --- | --- | --- | --- | --- |
| POST | `/api/member/documents` | Member | **In:** `multipart/form-data`: `file`, plus `type`: `id_document` \| `proof_of_residence` \| `bank_evidence` \| `business_registration` \| `channel_evidence`. **Out:** `201 { document }` with status `uploaded`. | Exists |
| GET | `/api/member/documents` | Member | **In:** cookie. **Out:** `200 { documents[] }` with type, status, reviewer note and dates. Never a public URL. | Exists |
| GET | `/api/member/documents/:id/file` | Member (owner) or admin | **In:** cookie. **Out:** the private file. `403` if the caller is not the owner or an authorised admin. Log access. | Exists |
| DELETE | `/api/member/documents/:id` | Member | **In:** path id. **Out:** `200 { ok: true }` if the document is not yet `accepted`. Replacing a file that needs resubmission is also required, as in the Figma “Replace” action. | Exists |
| POST | `/api/member/channels` | Member | **In:** `{ platform, handle or url }`. **Out:** `201 { channel }` with status `code_sent` or `uploaded`. | Exists |
| POST | `/api/member/channels/:id/confirm` | Member | **In:** `{ code }`. **Out:** `200 { channel }` with status `confirmed`. | Exists |
| PATCH | `/api/admin/documents/:id` | Admin | **In:** `{ reviewStatus: "accepted" \| "needs_resubmission" \| "under_review", reviewerNote? }`. A `needs_resubmission` decision requires a note of at least 10 characters. **Out:** `200 { document }`. | Exists |
| GET | `/api/admin/documents/:id/file` | Admin | **In:** cookie. **Out:** the private file. Log access. | Exists |

### 6.4 Tutorials and exam

The official exam is **30 questions in 45 minutes**, a pass mark of **at least 80 percent**, and **every critical question correct**. After a fail, one retake is allowed after at least **seven calendar days**. After two failed attempts, further training and a reviewer’s approval are required. Tutorial content is blocked until the four official videos arrive; the official paper is blocked until the senior provides the 30 questions with critical ones marked.

| Method | Path | Who | In / Out | Status |
| --- | --- | --- | --- | --- |
| GET | `/api/tutorials/active` | Member or admin | **In:** cookie. **Out:** `200 { tutorials[] }` with title, duration and the member’s completion. | To build |
| GET | `/api/tutorials/:id/stream` | Member or admin | **In:** cookie. **Out:** the video stream. | To build |
| POST | `/api/tutorials/:id/progress` | Member | **In:** `{ positionSeconds, durationSeconds? }`. **Out:** `200 { progress }`. A skip-ahead must not count as complete. | To build |
| GET | `/api/exam/status` | Member | **In:** cookie. **Out:** `200 { open, passed, attempts, canStart, reason?, retakeOpensAt? }`. | To build |
| POST | `/api/exam/start` | Member | **In:** empty, or `{ type: "entrance" \| "refresher" }`. **Out:** `201 { attempt, questions[], expiresAt }` — 30 questions, no answer key, 45-minute `expiresAt`. | To build |
| POST | `/api/exam/attempts/:id/submit` | Member | **In:** `{ answers }`. **Out:** `200 { attempt }` with score, percent, passed, and `criticalFailed`. Late or over-time submits are scored as a fail. | To build |
| GET | `/api/exam/attempts` | Member | **In:** cookie. **Out:** `200 { attempts[] }` (no answer key). | To build |
| POST | `/api/exam/attempts/:id/appeal` | Member | **In:** `{ reason }`. **Out:** `201 { appeal }`. | To build |
| GET | `/api/tutorials` | Admin | **In:** cookie. **Out:** `200 { tutorials[] }` including inactive ones. | To build |
| POST | `/api/tutorials` | Admin | **In:** multipart video plus title. **Out:** `201 { tutorial }`. | To build |
| PATCH | `/api/tutorials/:id` | Admin | **In:** title, duration, active flag. **Out:** `200 { tutorial }`. | To build |
| POST | `/api/tutorials/:id/activate` | Admin | **In:** none. **Out:** `200 { tutorial }`. | To build |
| GET | `/api/exam/questions` | Admin | **In:** cookie. **Out:** `200 { questions[] }` including `isCritical` and the correct option (admin only). | To build |
| POST | `/api/exam/attempts/:id/allow-retake` | Admin | **In:** `{ reason, conflictDeclared: true }`. **Out:** `200 { attempt }`. Used after two failed attempts. | To build |
| GET | `/api/admin/applications/:id/tutorial` | Admin | **In:** path id. **Out:** tutorial completion for that applicant. | To build |
| GET | `/api/admin/applications/:id/exam` | Admin | **In:** path id. **Out:** score, pass/fail, attempts used, time taken. | To build |

### 6.5 Admin applications

| Method | Path | Who | In / Out | Status |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/summary` | Admin | **In:** none. **Out:** tiles such as awaiting review, needs information, average review time, approval rate. | Exists |
| GET | `/api/admin/applications` | Admin | **In:** query `status?`, `q?`, `page`, `pageSize`. **Out:** `200 { items, page, pageSize, total }`. | Exists |
| GET | `/api/admin/applications/:id` | Admin | **In:** path id. **Out:** `200 { application, activation }` with profile, documents, channels, reviews, decision history, and the four activation gates. No raw ID or bank files in the JSON — use the file endpoints. | Exists |
| POST | `/api/admin/applications/:id/decision` | Admin | **In:** `{ decision: "approved" \| "rejected" \| "needs_info", reason, conflictDeclared: true }`. **Out:** `200 { application, activation, certificate }`. Reason (min 10 chars) and `conflictDeclared: true` are required for every decision. Approve requires verification docs accepted + agreement on file (`409` otherwise). Approve **records** the decision but sets `memberStatus: active` only when every gate passes (verification, exam, agreement, approval). Today the exam gate is still open (no exam models/content), so approve does **not** activate. `certificate` stays `null` until Active + `PSSA-YYYY-XXXXXX` issuance lands with KG. A fee flag alone must never set Active. | Exists |
| POST | `/api/admin/applications/:id/second-approval` | Admin | **In:** `{ accepted: true, conflictDeclared: true, reason? }`. **Out:** `200 { application, certificate }`. Use this if the team keeps a second authorised reviewer before activation. The reviewer must not be the first decision-maker. | To build |

### 6.6 Certificates and live verification

A certificate is issued only after the gates and a recorded human approval have passed. The number is `PSSA-YYYY-XXXXXX` and must be unique. A QR code on the PDF points at `/verify/PSSA-YYYY-XXXXXX`. Screenshots and old PDFs do not prove current status — only this live endpoint does.

| Method | Path | Who | In / Out | Status |
| --- | --- | --- | --- | --- |
| GET | `/api/member/certificate` | Member | **In:** cookie. **Out:** `200 { certificate }` with number, validity, scope, live-check URL and status. An expired or revoked member still sees the record, clearly not Active. | To build |
| GET | `/api/member/certificate/pdf` | Member | **In:** cookie. **Out:** the PDF. | To build |
| GET | `/api/verify/:certificateNumber` | Public | **In:** path is the certificate number, for example `PSSA-2026-004821`. **Out:** `200` public payload: name, trading name, number, scope, status, `validUntil`, verified channels. `404` if the number is unknown. Never ID, bank or address fields. Status must change the moment membership expires, is suspended, is revoked or the member resigns, even if a background job failed. Use neutral public wording. | To build |

### 6.7 Public register

| Method | Path | Who | In / Out | Status |
| --- | --- | --- | --- | --- |
| GET | `/api/search/members` | Public | **In:** query `q` (name, trading name, member number or certificate number `PSSA-YYYY-XXXXXX`), `page`, `pageSize`. **Out:** `200 { items, page, pageSize, total }` with live status, scope, valid-until and verified channels only. Pending applicants are omitted. | To build |
| GET | `/api/search/members/:id` | Public | **In:** path id or certificate number. **Out:** the same public payload as the live-check. `404` if the person is not publicly visible. | To build |

### 6.8 Complaints and appeals

Complaints are new. They are always free. Service times in Africa/Johannesburg: acknowledge within **two business days**; the member has **five business days** to respond; aim to decide within **30 business days**; an appeal may be lodged within **ten business days**.

| Method | Path | Who | In / Out | Status |
| --- | --- | --- | --- | --- |
| POST | `/api/complaints` | Public | **In:** type (`misconduct` \| `impersonation` \| `badge_misuse`), member lookup, description, evidence files, contact, privacy consent. A draft may be saved without all fields. **Out:** `201 { complaint, referenceNumber }` in the form `PSSA-C-YYYY-XXXX` when the report is complete. Never require an ID upload or a password from the complainant. | To build |
| GET | `/api/complaints/:reference` | Complainant (login or a one-time access token sent by email) | **In:** the `PSSA-C-YYYY-XXXX` reference. **Out:** `200 { complaint }` with status, next steps and public-safe history. No private member evidence. | To build |
| POST | `/api/member/complaints/:id/response` | Member named in the case | **In:** `{ body, files? }`. **Out:** `200 { complaint }`. | To build |
| POST | `/api/complaints/:id/appeal` | Complainant or member | **In:** `{ reason }`. **Out:** `201 { appeal }` if lodged within ten business days. A different person hears the appeal. | To build |
| GET | `/api/admin/complaints` | Admin | **In:** query `status?`, `type?`, `q?`, `page`. **Out:** `200 { items, page, pageSize, total }`. | To build |
| GET | `/api/admin/complaints/:id` | Admin | **In:** path id. **Out:** `200 { complaint }` with timeline, evidence, member response, parties and deadlines. | To build |
| PATCH | `/api/admin/complaints/:id` | Admin | **In:** `{ status?, assigneeId?, internalNote? }`. Setting `under_review` should stamp acknowledgement if it is still empty. | To build |
| POST | `/api/admin/complaints/:id/decision` | Admin | **In:** `{ outcome: "no_breach" \| "corrective_action" \| "suspension" \| "revocation", reasons, conflictDeclared: true }`. **Out:** `200 { complaint, member? }`. If the outcome suspends or revokes a member, the live badge and public register update immediately. | To build |
| POST | `/api/admin/complaints/:id/appeal-decision` | Admin (a different reviewer) | **In:** `{ decision, reasons, conflictDeclared: true }`. **Out:** `200 { appeal, complaint }`. | To build |

### 6.9 Members, status and renewal

| Method | Path | Who | In / Out | Status |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/members` | Admin | **In:** query `status?`, `q?`, `page`. **Out:** `200 { items, page, pageSize, total }`. | To build |
| GET | `/api/admin/members/:id` | Admin | **In:** path id. **Out:** `200 { member }` with status, certificate (`PSSA-YYYY-XXXXXX`), history summary. | To build |
| POST | `/api/admin/members/:id/status` | Admin | **In:** `{ status: "active" \| "suspended" \| "expired" \| "revoked" \| "resigned", reason, conflictDeclared: true }`. **Out:** `200 { member, historyEntry }`. The live badge and public register update immediately. Include `resigned`, which the Figma control does not show. | To build |
| GET | `/api/admin/members/:id/history` | Admin | **In:** path id. **Out:** `200 { history[] }`: from, to, reason, actor, `conflictDeclared`, at. | To build |
| GET | `/api/member/renewal` | Member | **In:** cookie. **Out:** `200 { validUntil, windowOpensAt, status, checklist, lastReminderAt? }`. | To build |
| POST | `/api/member/renewal/start` | Member | **In:** empty, or `{ confirm: true }`. **Out:** `201 { renewal }` so the member can update documents and sit the refresher exam. | To build |
| POST | `/api/member/renewal/declaration` | Member | **In:** `{ accepted: true, version, statements? }`. **Out:** `200 { renewal }`. | To build |
| POST | `/api/admin/renewals/:id/decision` | Admin | **In:** `{ decision: "approved" \| "rejected" \| "needs_info", reason, conflictDeclared: true }`. **Out:** `200 { renewal, member }`. On approval, `validUntil` normally moves forward 12 months. A fee or payment must never lift a suspension or set Active by itself. Renewed certificates keep the `PSSA-YYYY-XXXXXX` format. | To build |

### 6.10 Other

| Method | Path | Who | In / Out | Status |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | Public | **Out:** `{ ok: true, database: "connected" }`, or an error if the database is down. | To build |
| GET | `/api/order-template` | Public | **Out:** the blank customer order template as a PDF, or `302` to a static file. This may instead be a static file in `pssa/frontend`. | To build |

Policy pages (Code of Conduct, Privacy Policy, Complaints and Appeals, Badge Rules) are static frontend routes in `pssa/frontend` and do not need an API.

### 6.11 Scheduled jobs (not HTTP endpoints)

| Job | Owner | What it must do |
| --- | --- | --- |
| Expiry | KG, with Ryan on mail | When `validUntil` is reached, member status becomes `expired`. The live badge and public register must not show Active, even if this job failed — compute status from the stored date as well as from a flag. |
| Renewal reminders | Ryan, with KG on dates | Try to email the member 60, 30 and 7 calendar days before expiry, and send a confirmation when expiry happens. These are a service target, not a right that keeps a badge Active. |
| Complaint deadline mail | Ryan | Remind reviewers when the two-business-day acknowledgement or the 30-business-day decision target is close or overdue. |
| Privacy and retention | Ryan, with KG on queries | Remove or archive identity and bank files according to the published retention schedule. Do not keep private evidence for ever. |

---

## 7. Approval gates

Becoming an Active member takes four separate steps, and each one has to pass on its own:

1. Verification of identity, address or registration, bank details, and the channels the person trades on
2. A passed entrance exam (30 questions, 45 minutes, at least 80 percent, every critical question correct)
3. Acceptance of the current membership agreement (Policy 01)
4. A recorded human approval, with a conflict-of-interest declaration

Paying a fee, or passing the exam, must never switch a profile to Active by itself. Membership then lasts **12 months** from activation, with no silent grace period.

`POST /api/admin/applications/:id/decision` evaluates these gates on every approve. The application may become `approved` when verification + agreement are in place, but **Active is withheld** until every gate passes — including the entrance exam once that model/content exists.

---

## 8. Open questions

These are still for the team to write down, alongside the branch rule (feature branch, pull request, mentor merges; no direct pushes to `main`).

- When the official logo, Policy 01, the four tutorial videos and the 30 exam questions arrive, who stores them and in which environment?
- Do we keep a second authorised reviewer before activation, or is one recorded decision enough in the first release?
- For complaint deadlines, do business days skip South African public holidays, or only weekends?
- Is the customer order template a static frontend file, or served from `GET /api/order-template`?
- The session cookie is named `ec_session` in this contract. Do we keep that name, or rename it now, before launch?
- When will fees, if any, be introduced, and how do we make sure a payment record can never set a member to Active by itself?
- Should `MemberProfile` store identity as SA ID and/or passport (overseas route in the Verification Standard), and how does “profile complete” treat each?

This contract is for internal team planning. It is not a legal policy and does not replace the official PSSA documents.
