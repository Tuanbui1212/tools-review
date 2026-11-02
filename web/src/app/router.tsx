import { RequireAuth } from "@crt/shared";
import { Navigate, Route, Routes } from "react-router-dom";

import { LoginPage } from "../features/auth";
import { ChapterPagesPage, CreateChapterPage } from "../features/chapters";
import { ProjectDetailPage, ProjectFormPage, ProjectsPage } from "../features/projects";
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
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/create" element={<ProjectFormPage />} />
        <Route path="projects/:id/edit" element={<ProjectFormPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="projects/:projectId/chapters/create" element={<CreateChapterPage />} />
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
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  );
}
