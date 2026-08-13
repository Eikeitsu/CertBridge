import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/features/shell/ui/AppShell";
import { OverviewPage } from "@/features/overview";
import { CertsPage } from "@/features/certs";
import { LogPage } from "@/features/log";
import { SettingsPage } from "@/features/settings";
import { TAB_PATH } from "@/shared/config/navigation";
import { TabName } from "@/entities/module/enums";

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path={TAB_PATH[TabName.Home]} element={<OverviewPage />} />
          <Route path={TAB_PATH[TabName.Certs]} element={<CertsPage />} />
          <Route path={TAB_PATH[TabName.Log]} element={<LogPage />} />
          <Route path={TAB_PATH[TabName.More]} element={<SettingsPage />} />
          <Route path="*" element={<Navigate to={TAB_PATH[TabName.Home]} replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
