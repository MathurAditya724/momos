import { Outlet } from "react-router";
import Header from "@/client/components/layout/Header";

export default function HomeLayout() {
  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <Outlet />
      </div>
    </div>
  );
}
