import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ScenarioPage } from './pages/ScenarioPage';
import { GalleryPage } from './pages/GalleryPage';
import { SettingsPage } from './pages/SettingsPage';
import { ToastContainer } from './components/ui/Toast';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { initializeAppInsights } from './utils/appInsights';
import './theme/global.css';

function App() {
  useEffect(() => {
    // Initialize Application Insights on app startup
    initializeAppInsights();
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ScenarioPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
