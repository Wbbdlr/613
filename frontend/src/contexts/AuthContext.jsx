import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

function persistUser(userData) {
  localStorage.setItem('613_auth', JSON.stringify(userData));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('613_auth');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const login = useCallback((userData) => {
    persistUser(userData);
    setUser(userData);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      if (patch.settings) {
        next.settings = { ...(current.settings || {}), ...patch.settings };
      }
      persistUser(next);
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('613_auth');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
