import { Outlet } from "react-router";

export default function HomeLayout() {
  return (
    <div className="h-screen flex-1 flex items-center justify-center">
      <Outlet />
    </div>
  );
}
