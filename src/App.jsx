import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import LoginView from './components/views/LoginView';
import PublicBookingView from './components/views/PublicBookingView';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

function MainApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas dark:bg-surface-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink dark:border-white"></div>
      </div>
    );
  }

  return user ? <Layout /> : <LoginView />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/book/:adminId" element={<PublicBookingView />} />
        <Route path="/" element={<MainApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="bottom-right" />
    </Router>
  );
}

export default App;
