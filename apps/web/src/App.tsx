import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { MsalProvider } from '@azure/msal-react';
import { ScenarioPage } from './pages/ScenarioPage';
import { GalleryPage } from './pages/GalleryPage';
import { SettingsPage } from './pages/SettingsPage';
import { PromptLabPage } from './pages/PromptLabPage';
import { ToastContainer } from './components/ui/Toast';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { initializeAppInsights } from './utils/appInsights';
import { msalInstance } from './config/msal';
import './theme/global.css';

function App() {
  useEffect(() => {
    // Initialize Application Insights on app startup
    initializeAppInsights();
  }, []);

  return (
    <ErrorBoundary>
      <MsalProvider instance={msalInstance}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ScenarioPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/lab" element={<PromptLabPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      </MsalProvider>
    </ErrorBoundary>
  );
}

export default App;
