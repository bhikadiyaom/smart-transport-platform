import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Truck, Users, MapPin, Wrench,
  Fuel, BarChart3, Settings, LogOut, Zap, Sun, Moon
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, resource: 'dashboard' },
  { to: '/fleet', label: 'Fleet Registry', icon: Truck, resource: 'fleet' },
  { to: '/drivers', label: 'Drivers & Safety', icon: Users, resource: 'drivers' },
  { to: '/trips', label: 'Trip Dispatcher', icon: MapPin, resource: 'trips' },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench, resource: 'maintenance' },
  { to: '/fuel', label: 'Fuel & Expenses', icon: Fuel, resource: 'finance' },
  { to: '/analytics', label: 'Reports & Analytics', icon: BarChart3, resource: 'analytics' },
  { to: '/settings', label: 'Settings & RBAC', icon: Settings, resource: 'dashboard' },
];

const roleColors = {
  fleet_manager:     'text-indigo-400 bg-indigo-900/30',
  dispatcher:        'text-blue-400 bg-blue-900/30',
  safety_officer:    'text-emerald-400 bg-emerald-900/30',
  financial_analyst: 'text-amber-400 bg-amber-900/30',
};

const roleLabels = {
  fleet_manager:     'Fleet Manager',
  dispatcher:        'Dispatcher',
  safety_officer:    'Safety Officer',
  financial_analyst: 'Financial Analyst',
};

export default function Sidebar() {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    return document.documentElement.classList.contains('light') ? 'light' : 'dark';
  });
  const [iconKey, setIconKey] = useState(0);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('theme', nextTheme);
    setTheme(nextTheme);
    setIconKey(k => k + 1); // remount icon to trigger animation
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col" style={{ transition: 'background-color 300ms ease' }}>
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-900/40">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">TransitOps</p>
            <p className="text-xs text-slate-500">Smart Transport Platform</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon, resource }) => {
          const hasAccess = can('view', resource) || resource === 'dashboard';
          if (!hasAccess) return null;
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                isActive ? 'nav-item-active' : 'nav-item'
              }
            >
              <Icon className="nav-icon w-4 h-4" />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User card */}
      <div className="p-4 border-t border-slate-800 space-y-1">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-primary-700 flex items-center justify-center text-sm font-bold text-white shadow">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-100 truncate">{user?.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[user?.role] || 'text-slate-400'}`}>
              {roleLabels[user?.role] || user?.role}
            </span>
          </div>
        </div>

        {/* Theme Toggle — animated icon */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2.5 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 px-3 py-2 rounded-lg transition-all duration-200 mb-1"
        >
          <span key={iconKey} className="theme-icon-enter">
            {theme === 'light'
              ? <Moon className="w-4 h-4" />
              : <Sun className="w-4 h-4" />
            }
          </span>
          <span>{theme === 'light' ? 'Dark Theme' : 'Light Theme'}</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 text-sm text-slate-400 hover:text-rose-400 hover:bg-rose-900/20 px-3 py-2 rounded-lg transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
