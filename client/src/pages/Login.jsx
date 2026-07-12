import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import { Zap, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '', rememberMe: false });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.login({ email: form.email, password: form.password, rememberMe: form.rememberMe });
      login(res.data.user, res.data.token, form.rememberMe);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed — please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Quick demo login buttons
  const demoAccounts = [
    { label: 'Fleet Manager', email: 'fleet@transitops.com', color: 'text-indigo-400' },
    { label: 'Dispatcher', email: 'dispatch@transitops.com', color: 'text-blue-400' },
    { label: 'Safety Officer', email: 'safety@transitops.com', color: 'text-emerald-400' },
    { label: 'Financial Analyst', email: 'finance@transitops.com', color: 'text-amber-400' },
  ];

  const quickLogin = async (email) => {
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.login({ email, password: 'TransitOps@2024', rememberMe: false });
      login(res.data.user, res.data.token, false);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg shadow-primary-900/50">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">TransitOps</h1>
          <p className="text-slate-400 mt-1 text-sm">Smart Transport Operations Platform</p>
        </div>

        {/* Card */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>

          {error && (
            <div className="error-callout mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                className="input"
                type="email"
                name="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={form.rememberMe}
                  onChange={handleChange}
                  className="rounded border-slate-600 bg-slate-800 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-400">Remember me for 7 days</span>
              </label>
              <span className="text-sm text-primary-400 cursor-pointer hover:text-primary-300">Forgot password?</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Demo quick login */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-xs text-slate-500 text-center mb-3">
              🚀 Demo accounts — click to log in instantly
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map(({ label, email, color }) => (
                <button
                  key={email}
                  onClick={() => quickLogin(email)}
                  disabled={loading}
                  className="text-xs px-3 py-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 transition-all border border-slate-600 hover:border-slate-500 text-left"
                >
                  <span className={`font-medium ${color}`}>{label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-600 text-center mt-2">Password: TransitOps@2024</p>
          </div>
        </div>
      </div>
    </div>
  );
}
