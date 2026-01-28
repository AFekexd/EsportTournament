import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "../common/CommandPalette";
import { useAppSelector } from "../../hooks/useRedux";

export function Layout() {
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div
        className={`transition-all duration-300 ease-in-out ${sidebarOpen ? "md:ml-64" : "md:ml-20"
          } w-full`}
      >
        <Navbar />
        <main className="flex-1 overflow-y-auto bg-background/50 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
