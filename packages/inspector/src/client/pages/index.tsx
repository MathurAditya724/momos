import { Route, Routes } from "react-router";
import HomePage from "./home";
import HomeLayout from "./home/layout";
import NotFound from "./notFound";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeLayout />}>
        <Route index element={<HomePage />} />
      </Route>
      <Route path="/404" element={<NotFound />} />
    </Routes>
  );
}
