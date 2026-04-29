import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import LoginView from './components/views/LoginView';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? <Layout /> : <LoginView />;
}

export default App;
