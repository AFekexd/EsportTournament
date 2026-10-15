import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "../common/CommandPalette";
import { ErrorBoundary } from "../common/ErrorBoundary";
import { useAppSelector } from "../../hooks/useRedux";

export function Layout() {
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);

  return (
    <div className="min-h-screen bg-background flex w-full overflow-x-hidden">
      <Sidebar />
      <div
        className={`transition-all duration-300 ease-in-out ${
          sidebarOpen ? "md:ml-64" : "md:ml-20"
        } flex-1 min-w-0 flex flex-col min-h-screen w-full`}
      >
        <Navbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background/50 p-4 md:p-6 lg:p-8 min-w-0">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
