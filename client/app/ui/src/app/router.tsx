import { Route, Routes } from "react-router-dom";

import { ConnectionPage } from "../features/connection";
import { MainLayout } from "./layout/MainLayout";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<ConnectionPage />} />
      </Route>
    </Routes>
  );
}
