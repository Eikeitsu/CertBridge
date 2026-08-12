import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/features/shell/ui/AppShell";
import { OverviewPage } from "@/features/overview";
import { CertsPage } from "@/features/certs";
import { LogPage } from "@/features/log";
import { SettingsPage } from "@/features/settings";

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/certs" element={<CertsPage />} />
          <Route path="/log" element={<LogPage />} />
          <Route path="/more" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
