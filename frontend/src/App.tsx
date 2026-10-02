import { useEffect, useRef, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store";
import { useAppDispatch, useAppSelector } from "./hooks/useRedux";
import { initKeycloak } from "./store/slices/authSlice";
import { Layout } from "./components/layout";
import { PuffLoader } from "react-spinners";
import { Toaster, toast } from "sonner";
import { HomePage } from "./pages/Home";

// Lazy-loaded routes for fast initial page load & code splitting
const TournamentsPage = lazy(() => import("./pages/Tournaments").then(m => ({ default: m.TournamentsPage })));
const TournamentDetailPage = lazy(() => import("./pages/TournamentDetail").then(m => ({ default: m.TournamentDetailPage })));
const TournamentRulesPage = lazy(() => import("./pages/TournamentRulesPage").then(m => ({ default: m.TournamentRulesPage })));
const TeamsPage = lazy(() => import("./pages/Teams").then(m => ({ default: m.TeamsPage })));
const TeamCreatePage = lazy(() => import("./pages/TeamCreate").then(m => ({ default: m.TeamCreatePage })));
const TeamDetailPage = lazy(() => import("./pages/TeamDetail").then(m => ({ default: m.TeamDetailPage })));
const LeaderboardsPage = lazy(() => import("./pages/Leaderboards").then(m => ({ default: m.LeaderboardsPage })));
const CalendarPage = lazy(() => import("./pages/Calendar").then(m => ({ default: m.CalendarPage })));
const BookingPage = lazy(() => import("./pages/Booking").then(m => ({ default: m.BookingPage })));
const ProfilePage = lazy(() => import("./pages/Profile").then(m => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import("./pages/Settings").then(m => ({ default: m.SettingsPage })));
const NotificationsPage = lazy(() => import("./pages/Notifications").then(m => ({ default: m.NotificationsPage })));
const AdminPage = lazy(() => import("./pages/Admin").then(m => ({ default: m.AdminPage })));
const RequestsPage = lazy(() => import("./pages/admin/RequestsPage"));
const ReleasesPage = lazy(() => import("./pages/admin/ReleasesPage"));
const AdminLogs = lazy(() => import("./components/admin/AdminLogs").then(m => ({ default: m.AdminLogs })));
const DiscordAdminPage = lazy(() => import("./pages/DiscordSettings").then(m => ({ default: m.DiscordAdminPage })));
const DiscordCallbackPage = lazy(() => import("./pages/DiscordCallbackPage").then(m => ({ default: m.DiscordCallbackPage })));
const TeacherTimePage = lazy(() => import("./pages/TeacherTimePage").then(m => ({ default: m.TeacherTimePage })));
const BugReportPage = lazy(() => import("./pages/BugReportPage").then(m => ({ default: m.BugReportPage })));
const IncidentPage = lazy(() => import("./pages/IncidentPage"));
const GlobalRulesPage = lazy(() => import("./pages/GlobalRulesPage").then(m => ({ default: m.GlobalRulesPage })));
const TournamentEmbedPage = lazy(() => import("./pages/embed/TournamentEmbedPage").then(m => ({ default: m.TournamentEmbedPage })));
const TeamEmbedPage = lazy(() => import("./pages/embed/TeamEmbedPage").then(m => ({ default: m.TeamEmbedPage })));
const TVDisplayPage = lazy(() => import("./pages/TVDisplayPage").then(m => ({ default: m.TVDisplayPage })));
const TVRecruitmentPage = lazy(() => import("./pages/TVRecruitmentPage").then(m => ({ default: m.TVRecruitmentPage })));

// Lazy-load TermsModal to decouple heavy pdfjs engine from initial bundle
const TermsModal = lazy(() => import("./components/common/TermsModal").then(m => ({ default: m.TermsModal })));

const RouteLoadingFallback = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Modul betöltése...</span>
  </div>
);

// Wrapper to force remount when profile ID changes
const ProfileWrapper = () => {
  const { id } = useParams();
  return <ProfilePage key={id || "me"} />;
};

// Wrapper to force remount when tournament ID changes
const TournamentWrapper = () => {
  const { id } = useParams();
  return <TournamentDetailPage key={id} />;
};

function AppContent() {
  const dispatch = useAppDispatch();
  const { isLoading, error, user } = useAppSelector((state) => state.auth);
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
      if (error !== "Failed to initialize authentication service") {
        toast.error(error, { duration: 5000 });
      }
    }
  }, [error]);

  const loadingContent = (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <PuffLoader color="#ffffffff" size={60} />
        <span className="font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors text-lg">
          Betöltés...
        </span>
      </div>
    </div>
  );

  const shouldShowTerms = Boolean(user && !user.tosAcceptedAt);

  return (
    <BrowserRouter>
      {isLoading ? (
        loadingContent
      ) : (
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="tournaments" element={<TournamentsPage />} />
              <Route path="tournaments/:id" element={<TournamentWrapper />} />
              <Route path="tournaments/:id/rules" element={<TournamentRulesPage />} />

              <Route path="teams" element={<TeamsPage />} />
              <Route path="teams/create" element={<TeamCreatePage />} />
              <Route path="teams/:id" element={<TeamDetailPage />} />
              <Route path="leaderboards" element={<LeaderboardsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="discord-settings" element={<DiscordAdminPage />} />
              <Route
                path="auth/discord/callback"
                element={<DiscordCallbackPage />}
              />
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
              <Route path="bug-report" element={<BugReportPage />} />
              <Route path="incidents" element={<IncidentPage />} />
              <Route path="rules" element={<GlobalRulesPage />} />
            </Route>
            <Route
              path="/embed/tournaments/:id"
              element={<TournamentEmbedPage />}
            />
            <Route path="/embed/teams/:id" element={<TeamEmbedPage />} />
            <Route path="/tv" element={<TVDisplayPage />} />
            <Route path="/tv2" element={<TVRecruitmentPage />} />
          </Routes>
        </Suspense>
      )}
      <Toaster />
      {shouldShowTerms && (
        <Suspense fallback={null}>
          <TermsModal />
        </Suspense>
      )}
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
