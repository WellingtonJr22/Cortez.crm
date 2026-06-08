import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

// Small fetch helper that always sends/receives the session cookie and
// surfaces a useful error message from the JSON body.
const api = async (path, options = {}) => {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message = data?.error || `Erro ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    setIsLoadingPublicSettings(true);
    setAuthError(null);
    setAppPublicSettings({});
    await checkUserAuth();
    setIsLoadingPublicSettings(false);
  };

  // Verify the session against the server (/api/auth/me).
  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const data = await api('/api/auth/me', { method: 'GET' });
      setUser(data.user);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      // 401 simply means "not logged in" — not a surfaced error.
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const login = async (email, password) => {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
    setIsAuthenticated(true);
    setAuthChecked(true);
    setAuthError(null);
    return data.user;
  };

  const signup = async (email, password, full_name) => {
    const data = await api('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    });
    setUser(data.user);
    setIsAuthenticated(true);
    setAuthChecked(true);
    setAuthError(null);
    return data.user;
  };

  const logout = async (shouldRedirect = true) => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore — clear local state regardless
    }
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) window.location.href = '/login';
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
      login,
      signup,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
