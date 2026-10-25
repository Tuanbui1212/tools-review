import { Route, Routes } from "react-router-dom";

import { SystemStatusPage } from "../features/system";
import { MainLayout } from "./layout/MainLayout";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<SystemStatusPage />} />
      </Route>
    </Routes>
  );
}
