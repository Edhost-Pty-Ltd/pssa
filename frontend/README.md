# PSSA frontend

Public website and member portal. React 19, Vite, Tailwind CSS 4, react-router.

    npm install
    npm run dev        # http://localhost:5174 (proxies /api to the backend on 5000)
    npm run build      # typecheck + production build
    npm run lint

## Layout

- `src/pages/public/`  — Home, Register, Member profile, Complaint, Order template
- `src/pages/member/`  — Dashboard, Verification, Tutorials, Exam, Exam results, Certificate
- `src/components/`    — shared UI (Icon, Logo, Status, headers, footer)
- `src/context/`       — AuthContext (signed-in user)
- `src/api/`           — one file per backend area (members, applications, complaints, ...)
- `src/lib/`           — `api.ts` (fetch helper), `saId.ts` (SA ID number validation)
- `src/screens-reference.tsx` — the full Figma design in one file; move screens out of it as pages are built, then delete it
