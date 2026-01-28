import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
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
  TVDisplayPage,
  TVRecruitmentPage,
  ScrimsPage,
  NewsPage,
  NewsDetailPage,
  DiscordCallbackPage,
} from "./pages";
import RequestsPage from "./pages/admin/RequestsPage";
import { AdminLogs } from "./components/admin/AdminLogs";
import ReleasesPage from "./pages/admin/ReleasesPage";
import { PuffLoader } from "react-spinners";
import { Toaster, toast } from "sonner";
import { TermsModal } from "./components/common/TermsModal";

// Wrapper to force remount when profile ID changes
const ProfileWrapper = () => {
  const { id } = useParams();
  return <ProfilePage key={id || 'me'} />;
};

// Wrapper to force remount when tournament ID changes
const TournamentWrapper = () => {
  const { id } = useParams();
  return <TournamentDetailPage key={id} />;
};

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
      // Csak akkor jelezzük, ha van konkrét hibaüzenet
      if (error !== "Failed to initialize authentication service") {
        toast.error(error, { duration: 5000 });
      }
    }
  }, [error]);

  const loadingContent = (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <PuffLoader color="#8b5cf6" size={60} />
        <span className="font-bold uppercase tracking-widest text-muted-foreground group-hover:text-white transition-colors text-lg">
          Betöltés...
        </span>
      </div>
    </div>
  );

  return (
    <BrowserRouter>
      {isLoading ? (
        loadingContent
      ) : (
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="tournaments" element={<TournamentsPage />} />
            <Route path="tournaments/:id" element={<TournamentWrapper />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="teams/create" element={<TeamCreatePage />} />
            <Route path="teams/:id" element={<TeamDetailPage />} />
            <Route path="games" element={<GamesPage />} />
            <Route path="games/:id" element={<GameDetailPage />} />
            <Route path="leaderboards" element={<LeaderboardsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="discord-settings" element={<DiscordAdminPage />} />
            <Route path="auth/discord/callback" element={<DiscordCallbackPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="profile" element={<ProfileWrapper />} />
            <Route path="profile/:id" element={<ProfileWrapper />} />
            <Route path="settings" element={<SettingsPage />} />

            <Route path="admin" element={<AdminPage />} />
            <Route path="admin/requests" element={<RequestsPage />} />
            <Route path="admin/releases" element={<ReleasesPage />} />
            <Route path="admin/logs" element={<AdminLogs />} />
            <Route path="teacher/time" element={<TeacherTimePage />} />
            <Route path="booking" element={<BookingPage />} />
            <Route path="scrims" element={<ScrimsPage />} />
            <Route path="news" element={<NewsPage />} />
            <Route path="news/:slug" element={<NewsDetailPage />} />
          </Route>
          <Route
            path="/embed/tournaments/:id"
            element={<TournamentEmbedPage />}
          />
          <Route path="/tv" element={<TVDisplayPage />} />
          <Route path="/tv2" element={<TVRecruitmentPage />} />
        </Routes>
      )}
      <Toaster />
      <TermsModal />
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
