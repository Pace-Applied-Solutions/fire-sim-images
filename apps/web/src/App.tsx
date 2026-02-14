import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ScenarioPage } from './pages/ScenarioPage';
import { GalleryPage } from './pages/GalleryPage';
import { SettingsPage } from './pages/SettingsPage';
import { ToastContainer } from './components/ui/Toast';
import './theme/global.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ScenarioPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
