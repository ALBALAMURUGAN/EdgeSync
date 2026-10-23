import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import Home from './pages/Home';
import Console from './pages/Console';
import Fleet from './pages/Fleet';
import Analytics from './pages/Analytics';
import OutageLab from './pages/OutageLab';
import Architecture from './pages/Architecture';

export default function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/console" element={<Console />} />
            <Route path="/fleet" element={<Fleet />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/outage" element={<OutageLab />} />
            <Route path="/architecture" element={<Architecture />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ToastProvider>
  );
}
