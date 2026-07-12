import { useEffect, useState, useRef } from 'react';
import { analyticsAPI } from '../api';
import StatusPill from '../components/StatusPill';
import { Truck, Users, MapPin, TrendingUp, Clock, Activity, RefreshCw, Zap } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

/* ── Count-up hook ─────────────────────────────────────────────── */
function useCountUp(target, duration = 800) {
  const [count, setCount] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target === undefined || target === null || isNaN(Number(target))) {
      setCount(target);
      return;
    }
    const numTarget = Number(target);
    if (numTarget === 0) { setCount(0); return; }
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * numTarget));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return count;
}

/* ── Skeleton loader ───────────────────────────────────────────── */
function KPISkeleton() {
  return (
    <div className="kpi-card space-y-3">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl skeleton" />
        <div className="w-12 h-7 rounded-lg skeleton" />
      </div>
      <div className="w-24 h-4 rounded skeleton" />
      <div className="w-16 h-3 rounded skeleton" />
    </div>
  );
}

/* ── KPI Card with count-up ────────────────────────────────────── */
function KPICard({ label, value, icon: Icon, color, sub, delay = 0 }) {
  const numericValue = typeof value === 'string' && value.includes('%')
    ? parseFloat(value)
    : Number(value);
  const isPercent    = typeof value === 'string' && value.includes('%');
  const animated     = useCountUp(isNaN(numericValue) ? 0 : numericValue, 800);

  const displayValue = value === undefined || value === null
    ? '—'
    : isPercent
      ? `${animated}%`
      : animated;

  return (
    <div
      className="kpi-card kpi-card-enter"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-2xl font-bold text-white tabular-nums">{displayValue}</span>
      </div>
      <p className="text-sm font-medium text-slate-300">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

/* ── Donut Chart ───────────────────────────────────────────────── */
const DONUT_COLORS = {
  available: '#10b981',
  on_trip:   '#f59e0b',
  in_shop:   '#3b82f6',
  retired:   '#64748b',
};
const DONUT_LABELS = {
  available: 'Available',
  on_trip:   'On Trip',
  in_shop:   'In Shop',
  retired:   'Retired',
};

const DonutTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <span style={{ color: DONUT_COLORS[name] }} className="font-semibold">{DONUT_LABELS[name] || name}</span>
      <span className="text-slate-300 ml-2">{value} vehicles</span>
    </div>
  );
};

function FleetDonut({ distribution }) {
  const data = Object.entries(distribution)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: key, value }));

  if (!data.length) return (
    <div className="h-40 flex items-center justify-center text-slate-500 text-sm">No data yet</div>
  );

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={3}
          dataKey="value"
          animationBegin={0}
          animationDuration={900}
          isAnimationActive={true}
        >
          {data.map(entry => (
            <Cell key={entry.name} fill={DONUT_COLORS[entry.name] || '#64748b'} />
          ))}
        </Pie>
        <Tooltip content={<DonutTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ color: '#94a3b8', fontSize: 12 }}>{DONUT_LABELS[value] || value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ── Status Bar ────────────────────────────────────────────────── */
function StatusBar({ distribution }) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return <div className="h-2.5 rounded-full bg-slate-700 w-full" />;

  const segments = [
    { key: 'available', color: 'bg-emerald-500', label: 'Available' },
    { key: 'on_trip',   color: 'bg-amber-500',   label: 'On Trip' },
    { key: 'in_shop',   color: 'bg-blue-500',     label: 'In Shop' },
    { key: 'retired',   color: 'bg-slate-500',    label: 'Retired' },
  ];

  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-2.5 w-full mb-3 gap-0.5">
        {segments.map(({ key, color }) => {
          const pct = ((distribution[key] || 0) / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={key}
              className={`${color} transition-all duration-700`}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4">
        {segments.map(({ key, color, label }) => (
          <div key={key} className="flex items-center gap-2 text-xs text-slate-400">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span>{label}: <strong className="text-slate-200">{distribution[key] || 0}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

/* ── Dashboard ─────────────────────────────────────────────────── */
export default function Dashboard() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = async () => {
    setLoading(true);
    try {
      const res = await analyticsAPI.getDashboard();
      setData(res.data);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const kpis = data?.kpis || {};

  const kpiDefs = [
    { label: 'Active Vehicles',    value: kpis.activeVehicles,       icon: Truck,      color: 'bg-blue-900/40 text-blue-400',     sub: 'On trip right now' },
    { label: 'Available Vehicles', value: kpis.availableVehicles,    icon: Truck,      color: 'bg-emerald-900/40 text-emerald-400', sub: 'Ready to dispatch' },
    { label: 'In Maintenance',     value: kpis.inMaintenance,        icon: Activity,   color: 'bg-amber-900/40 text-amber-400',   sub: 'In shop' },
    { label: 'Fleet Utilization',  value: `${kpis.fleetUtilization || 0}%`, icon: TrendingUp, color: 'bg-primary-900/40 text-primary-400', sub: 'On-trip / total' },
    { label: 'Active Trips',       value: kpis.activeTrips,          icon: MapPin,     color: 'bg-blue-900/40 text-blue-400',     sub: 'Dispatched' },
    { label: 'Pending Trips',      value: kpis.pendingTrips,         icon: Clock,      color: 'bg-slate-700/40 text-slate-400',   sub: 'Draft' },
    { label: 'Drivers on Duty',    value: kpis.driversOnDuty,        icon: Users,      color: 'bg-purple-900/40 text-purple-400', sub: 'Currently on trip' },
    { label: 'Total Vehicles',     value: kpis.totalVehicles,        icon: Truck,      color: 'bg-slate-700/40 text-slate-400',   sub: 'All fleet' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Operations Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time fleet overview</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <KPISkeleton key={i} />)
          : kpiDefs.map((kpi, i) => (
              <KPICard key={kpi.label} {...kpi} delay={i * 60} />
            ))
        }
      </div>

      {/* Status Distribution + Donut */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-base font-semibold text-white mb-4">Vehicle Status Distribution</h2>
          {loading
            ? <div className="space-y-2"><div className="h-2.5 rounded-full skeleton" /><div className="h-3 w-32 rounded skeleton mt-3" /></div>
            : <StatusBar distribution={data?.statusDistribution || {}} />
          }
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-white mb-2">Fleet Utilization Breakdown</h2>
          {loading
            ? <div className="h-40 flex items-center justify-center"><div className="w-32 h-32 rounded-full skeleton" /></div>
            : <FleetDonut distribution={data?.statusDistribution || {}} />
          }
        </div>
      </div>

      {/* Recent Trips */}
      <div className="card p-0 overflow-hidden">
        <div className="p-5 border-b border-slate-700 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary-400" />
          <h2 className="text-base font-semibold text-white">Recent Trips</h2>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex-1 h-4 rounded skeleton" />
                <div className="w-20 h-4 rounded skeleton" />
                <div className="w-20 h-4 rounded skeleton" />
                <div className="w-16 h-5 rounded-full skeleton" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto table-fade-in">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="table-header">Route</th>
                  <th className="table-header">Vehicle</th>
                  <th className="table-header">Driver</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {(data?.recentTrips || []).map(trip => (
                  <tr key={trip._id}>
                    <td className="table-cell">
                      <span className="font-medium">{trip.source}</span>
                      <span className="text-slate-500 mx-1">→</span>
                      <span>{trip.destination}</span>
                    </td>
                    <td className="table-cell text-slate-400">{trip.vehicle_id?.registration_no || '—'}</td>
                    <td className="table-cell text-slate-400">{trip.driver_id?.name || '—'}</td>
                    <td className="table-cell"><StatusPill status={trip.status} /></td>
                    <td className="table-cell text-slate-500">{fmtDate(trip.created_at)}</td>
                  </tr>
                ))}
                {!data?.recentTrips?.length && (
                  <tr><td colSpan={5} className="table-cell text-slate-500 text-center py-10">No trips yet — seed the database or create a trip.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-600 text-right">Last refreshed: {lastRefresh.toLocaleTimeString()}</p>
    </div>
  );
}
