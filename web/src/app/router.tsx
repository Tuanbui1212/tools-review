import { RequireAuth } from "@crt/shared";
import { Navigate, Route, Routes } from "react-router-dom";

import { LoginPage } from "../features/auth";
import { ChapterPagesPage } from "../features/chapters";
import { ProjectDetailPage, ProjectsPage } from "../features/projects";
import { SystemStatusPage } from "../features/system";
import { UsersPage } from "../features/users";
import { MainLayout } from "./layout/MainLayout";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route index element={<SystemStatusPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="projects/:projectId/chapters/:chapterId" element={<ChapterPagesPage />} />
        <Route
          path="users"
          element={
            <RequireAuth roles={["admin", "root"]}>
              <UsersPage />
            </RequireAuth>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
