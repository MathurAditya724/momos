import { useEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router";
import HomePage from "./home";
import HomeLayout from "./home/layout";
import NotFound from "./notFound";
import SettingsPage from "./settings";
import WorkspacePage from "./workspace";
import WorkspaceSettingsPage from "./workspace/settings";

export default function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!window.electronAPI) {
      return;
    }

    return window.electronAPI.onOpenSettings(() => {
      const segments = location.pathname.split("/").filter(Boolean);
      const workspaceId =
        segments.length > 0 && segments[0] !== "settings" ? segments[0] : null;

      if (workspaceId) {
        navigate(`/${workspaceId}/settings`);
        return;
      }

      navigate("/settings");
    });
  }, [location.pathname, navigate]);

  return (
    <Routes>
      <Route path="/" element={<HomeLayout />}>
        <Route index element={<HomePage />} />
      </Route>
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/:id" element={<WorkspacePage />} />
      <Route path="/:id/settings" element={<WorkspaceSettingsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
