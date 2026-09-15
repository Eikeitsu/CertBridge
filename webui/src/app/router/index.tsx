import { HashRouter, Route, Routes } from "react-router-dom";
import { PackRoot } from "@/packs/PackRoot";

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="*" element={<PackRoot />} />
      </Routes>
    </HashRouter>
  );
}
