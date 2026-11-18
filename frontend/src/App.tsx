import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { MemberLayout } from "./components/member/MemberLayout";
import { RequireMember } from "./components/member/RequireMember";
import { AuthProvider } from "./context/AuthProvider";
import ComingSoon from "./pages/ComingSoon";
import ComponentsPreview from "./pages/dev/ComponentsPreview";
import NotBuiltYet from "./pages/member/NotBuiltYet";
import Assessment from "./pages/member/Assessment";
import Dashboard from "./pages/member/Dashboard";
import Profile from "./pages/member/Profile";
import SignIn from "./pages/member/SignIn";
import Tutorials from "./pages/member/Tutorials";
import Verification from "./pages/member/Verification";
import Landing from "./pages/public/Landing";
import VerifyCertificate from "./pages/public/VerifyCertificate";
import ScreensReference from "./screens-reference";

// Routes
// Public pages go in src/pages/public, member portal pages in src/pages/member.
// Everything under /member needs a signed-in MEMBER (RequireMember).
// /design shows the full Figma reference; pages that aren't built yet show "Coming soon".
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/verify" element={<VerifyCertificate />} />
          <Route path="/verify/:number" element={<VerifyCertificate />} />

          <Route path="/member/sign-in" element={<SignIn />} />
          <Route path="/member" element={<RequireMember />}>
            <Route element={<MemberLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="verification" element={<Verification />} />
              <Route path="tutorials" element={<Tutorials />} />
              <Route path="assessment" element={<Assessment />} />
              <Route path="certificate" element={<NotBuiltYet title="Certificate & badge" when="Phase 2" />} />
              <Route path="*" element={<Navigate to="/member" replace />} />
            </Route>
          </Route>

          <Route path="/design/*" element={<ScreensReference />} />
          {import.meta.env.DEV && <Route path="/dev/components" element={<ComponentsPreview />} />}
          <Route path="*" element={<ComingSoon />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
