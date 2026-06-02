import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

const LOCAL_KEY = 'local_auth_user';

const generateLocalId = (email) => `local_${email.replace(/[^a-z0-9]/gi,'')}`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      // Local/mock mode: do not call external public-settings. Rely on local session.
      setAppPublicSettings({});
      try {
        await checkUserAuth();
      } catch (e) {
        // Keep unauthenticated if check fails
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoadingPublicSettings(false);
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const stored = localStorage.getItem(LOCAL_KEY);
      if (stored) {
        const currentUser = JSON.parse(stored);
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        // Do not auto-authenticate via SDK in local mode; remain unauthenticated
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      if (error?.status === 401 || error?.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    }
  };

  // Local login (email/password mock). Stores user in localStorage under LOCAL_KEY
  const login = async (email, password) => {
    if (!email || !password) throw new Error('Email and password required');
    const user = { id: generateLocalId(email), email, full_name: email.split('@')[0], role: 'admin' };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(user));
    setUser(user);
    setIsAuthenticated(true);
    setAuthChecked(true);
    return user;
  };

  // Google login handler. If provided an `id_token` (JWT), decode it and use
  // the token payload as the user. Otherwise fallback to mock email.
  const loginWithGoogle = async (id_token_or_email = null) => {
    try {
      if (id_token_or_email && id_token_or_email.includes('.')) {
        // Assume JWT id_token
        const parts = id_token_or_email.split('.');
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        const email = payload.email || payload.preferred_username || 'google_user@local';
        const user = { id: generateLocalId(email), email, full_name: payload.name || email.split('@')[0], role: 'admin', provider: 'google', raw: payload };
        localStorage.setItem(LOCAL_KEY, JSON.stringify(user));
        setUser(user);
        setIsAuthenticated(true);
        setAuthChecked(true);
        return user;
      }
      // fallback: treat param as email or generate default
      const googleEmail = id_token_or_email || 'user@gmail.com';
      const user = { id: generateLocalId(googleEmail), email: googleEmail, full_name: googleEmail.split('@')[0], role: 'admin', provider: 'google' };
      localStorage.setItem(LOCAL_KEY, JSON.stringify(user));
      setUser(user);
      setIsAuthenticated(true);
      setAuthChecked(true);
      return user;
    } catch (e) {
      throw e;
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem(LOCAL_KEY);
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
      loginWithGoogle
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
