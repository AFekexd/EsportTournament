import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './hooks/useRedux';
import { initKeycloak } from './store/slices/authSlice';
import { Layout } from './components/layout';
import { HomePage, TournamentsPage, TeamsPage, GamesPage } from './pages';
import './App.css';

function AppContent() {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(initKeycloak());
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-spinner" />
          <span className="loading-text">Betöltés...</span>
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
          <Route path="teams" element={<TeamsPage />} />
          <Route path="games" element={<GamesPage />} />
          {/* Additional routes to be added */}
          <Route path="calendar" element={<div className="page-placeholder">Naptár - Hamarosan</div>} />
          <Route path="profile" element={<div className="page-placeholder">Profil - Hamarosan</div>} />
          <Route path="settings" element={<div className="page-placeholder">Beállítások - Hamarosan</div>} />
          <Route path="admin" element={<div className="page-placeholder">Admin - Hamarosan</div>} />
        </Route>
      </Routes>
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
