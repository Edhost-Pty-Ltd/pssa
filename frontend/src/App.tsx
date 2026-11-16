import { BrowserRouter, Route, Routes } from "react-router-dom";
import ScreensReference from "./screens-reference";

// Routes
// Public pages go in src/pages/public, member portal pages in src/pages/member.
// Until a page is built, the Figma reference is shown so the whole design can be clicked through.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<ScreensReference />} />
      </Routes>
    </BrowserRouter>
  );
}
