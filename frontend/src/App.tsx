import { BrowserRouter, Route, Routes } from "react-router-dom";
import ComingSoon from "./pages/ComingSoon";
import Landing from "./pages/public/Landing";
import ScreensReference from "./screens-reference";

// Routes
// Public pages go in src/pages/public, member portal pages in src/pages/member.
// /design shows the full Figma reference; pages that aren't built yet show "Coming soon".
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/design/*" element={<ScreensReference />} />
        <Route path="*" element={<ComingSoon />} />
      </Routes>
    </BrowserRouter>
  );
}
