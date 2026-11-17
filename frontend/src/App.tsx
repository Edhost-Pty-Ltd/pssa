import { BrowserRouter, Route, Routes } from "react-router-dom";
import ComponentsPreview from "./pages/dev/ComponentsPreview";
import ScreensReference from "./screens-reference";

// Routes
// Public pages go in src/pages/public, member portal pages in src/pages/member.
// Until a page is built, the Figma reference is shown so the whole design can be clicked through.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {import.meta.env.DEV && <Route path="/dev/components" element={<ComponentsPreview />} />}
        <Route path="/*" element={<ScreensReference />} />
      </Routes>
    </BrowserRouter>
  );
}
