import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }
    return savedToken;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await axios.get('/api/auth?action=me');
          setUser(res.data);
        } catch (error) {
          console.error("Failed to fetch user:", error);
          if (error.response?.status !== 401) {
            setUser({ token }); // fallback
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  // Intercept 401s to automatically logout
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const logout = () => {
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  };

  const updateProfile = async (data) => {
    const res = await axios.put('/api/auth?action=me', data);
    setUser(res.data);
  };

  const changePassword = async (currentPassword, newPassword) => {
    await axios.post('/api/auth?action=password', { currentPassword, newPassword });
  };

  const login = async (username, password) => {
    const res = await axios.post('/api/auth?action=login', { username, password });
    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data) => {
    const res = await axios.post('/api/auth?action=register', data);
    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, changePassword }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
