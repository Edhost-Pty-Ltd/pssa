import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { MemberLayout } from "./components/member/MemberLayout";
import { RequireMember } from "./components/member/RequireMember";
import { AuthProvider } from "./context/AuthProvider";
import ComponentsPreview from "./pages/dev/ComponentsPreview";
import NotBuiltYet from "./pages/member/NotBuiltYet";
import Overview from "./pages/member/Overview";
import SignIn from "./pages/member/SignIn";
import ScreensReference from "./screens-reference";

// Routes
// Public pages go in src/pages/public, member portal pages in src/pages/member.
// Everything under /member needs a signed-in MEMBER (RequireMember).
// Until a page is built, the Figma reference is shown so the whole design can be clicked through.
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/member/sign-in" element={<SignIn />} />
          <Route path="/member" element={<RequireMember />}>
            <Route element={<MemberLayout />}>
              <Route index element={<Overview />} />
              <Route path="verification" element={<NotBuiltYet title="Verification" when="Phase 1 (verification documents)" />} />
              <Route path="tutorials" element={<NotBuiltYet title="Tutorials" when="Phase 2" />} />
              <Route path="assessment" element={<NotBuiltYet title="Assessment" when="Phase 2" />} />
              <Route path="certificate" element={<NotBuiltYet title="Certificate & badge" when="Phase 2" />} />
              <Route path="*" element={<Navigate to="/member" replace />} />
            </Route>
          </Route>
          {import.meta.env.DEV && <Route path="/dev/components" element={<ComponentsPreview />} />}
          <Route path="/*" element={<ScreensReference />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
