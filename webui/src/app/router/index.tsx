import { HashRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "@/features/shell/ui/AppShell";

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="*" element={<AppShell />} />
      </Routes>
    </HashRouter>
  );
}
