import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store";
import { useAppDispatch, useAppSelector } from "./hooks/useRedux";
import { initKeycloak } from "./store/slices/authSlice";
import { Layout } from "./components/layout";
import {
  HomePage,
  TournamentsPage,
  TeamsPage,
  GamesPage,
  CalendarPage,
  ProfilePage,
  SettingsPage,
  AdminPage,
  TeamCreatePage,
  TeamDetailPage,
  GameDetailPage,
  TournamentDetailPage,
  LeaderboardsPage,
  NotificationsPage,
  DiscordAdminPage,
  BookingPage,
  TeacherTimePage,
  TournamentEmbedPage,
} from "./pages";
import { AdminLogs } from "./components/admin/AdminLogs";
import { PuffLoader } from "react-spinners";
import { Toaster } from "./components/ui/sonner";

function AppContent() {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  const initRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (initRef.current) {
      return;
    }

    initRef.current = true;

    const initAuth = async () => {
      await dispatch(initKeycloak());
    };

    initAuth();
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      console.error("Auth error:", error);
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <PuffLoader color="#8b5cf6" size={60} />
          <span className="font-bold uppercase tracking-widest text-muted-foreground group-hover:text-white transition-colors text-lg">
            Betöltés...
          </span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="tournaments" element={<TournamentsPage />} />
          <Route path="tournaments/:id" element={<TournamentDetailPage />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="teams/create" element={<TeamCreatePage />} />
          <Route path="teams/:id" element={<TeamDetailPage />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="games/:id" element={<GameDetailPage />} />
          <Route path="leaderboards" element={<LeaderboardsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="discord-settings" element={<DiscordAdminPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/:id" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="admin/logs" element={<AdminLogs />} />
          <Route path="teacher/time" element={<TeacherTimePage />} />
          <Route path="booking" element={<BookingPage />} />
        </Route>
        <Route
          path="/embed/tournaments/:id"
          element={<TournamentEmbedPage />}
        />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
