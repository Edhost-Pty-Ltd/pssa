import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { MemberLayout } from "./components/member/MemberLayout";
import { RequireMember } from "./components/member/RequireMember";
import { AuthProvider } from "./context/AuthProvider";
import ComingSoon from "./pages/ComingSoon";
import ComponentsPreview from "./pages/dev/ComponentsPreview";
import Assessment, { ExamPage } from "./pages/member/Assessment";
import Renewal from "./pages/member/Renewal";
import Certificate from "./pages/member/Certificate";
import Dashboard from "./pages/member/Dashboard";
import MemberComplaints from "./pages/member/MemberComplaints";
import Profile from "./pages/member/Profile";
import SignIn from "./pages/member/SignIn";
import Tutorials from "./pages/member/Tutorials";
import Verification from "./pages/member/Verification";
import Landing from "./pages/public/Landing";
import Policy from "./pages/public/Policy";
import Register from "./pages/public/Register";
import RaiseConcern from "./pages/public/RaiseConcern";
import TrackComplaint from "./pages/public/TrackComplaint";
import VerifyCertificate from "./pages/public/VerifyCertificate";
import ScreensReference from "./screens-reference";

// Routes
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/policies/:slug" element={<Policy />} />
          <Route path="/concern" element={<RaiseConcern />} />
          <Route path="/concern/track" element={<TrackComplaint />} />
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
              <Route path="certificate" element={<Certificate />} />
              <Route path="complaints" element={<MemberComplaints />} />
              <Route path="renewal" element={<Renewal />} />
              <Route path="renewal/refresher" element={<ExamPage type="refresher" />} />
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
