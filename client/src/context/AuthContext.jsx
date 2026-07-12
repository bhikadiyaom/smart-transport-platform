import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

const RBAC = {
  fleet_manager: {
    fleet: 'edit',
    drivers: 'none',
    trips: 'none',
    finance: 'none',
    analytics: 'edit',
    maintenance: 'edit',
    dashboard: 'view'
  },
  dispatcher: {
    fleet: 'view',
    drivers: 'view',
    trips: 'edit',
    finance: 'none',
    analytics: 'none',
    maintenance: 'view',
    dashboard: 'view'
  },
  safety_officer: {
    fleet: 'none',
    drivers: 'edit',
    trips: 'view',
    finance: 'none',
    analytics: 'none',
    maintenance: 'none',
    dashboard: 'view'
  },
  financial_analyst: {
    fleet: 'view',
    drivers: 'none',
    trips: 'none',
    finance: 'edit',
    analytics: 'edit',
    maintenance: 'none',
    dashboard: 'view'
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData, tokenData, rememberMe) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('token', tokenData);
    storage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setToken(tokenData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  /**
   * can('edit', 'fleet') => true if user role can edit fleet
   * can('view', 'trips') => true if user role can at least view trips
   */
  const can = (action, resource) => {
    if (!user) return false;
    const permission = RBAC[user.role]?.[resource] || 'none';
    if (action === 'view') return permission === 'view' || permission === 'edit';
    if (action === 'edit') return permission === 'edit';
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, can, loading, RBAC }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
