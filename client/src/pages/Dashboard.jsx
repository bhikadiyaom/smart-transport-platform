import { useEffect, useState } from 'react';
import { analyticsAPI } from '../api';
import StatusPill from '../components/StatusPill';
import { Truck, Users, MapPin, TrendingUp, Clock, Activity, RefreshCw } from 'lucide-react';

function KPICard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-2xl font-bold text-white">{value ?? '—'}</span>
      </div>
      <p className="text-sm font-medium text-slate-300">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function StatusBar({ distribution }) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return <div className="h-3 rounded-full bg-slate-700 w-full" />;

  const segments = [
    { key: 'available', color: 'bg-emerald-500', label: 'Available' },
    { key: 'on_trip', color: 'bg-blue-500', label: 'On Trip' },
    { key: 'in_shop', color: 'bg-amber-500', label: 'In Shop' },
    { key: 'retired', color: 'bg-slate-500', label: 'Retired' },
  ];

  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-3 w-full mb-3">
        {segments.map(({ key, color }) => {
          const pct = ((distribution[key] || 0) / total) * 100;
          if (pct === 0) return null;
          return <div key={key} className={`${color}`} style={{ width: `${pct}%` }} />;
        })}
      </div>
      <div className="flex flex-wrap gap-4">
        {segments.map(({ key, color, label }) => (
          <div key={key} className="flex items-center gap-2 text-xs text-slate-400">
            <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span>{label}: <strong className="text-slate-200">{distribution[key] || 0}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
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
        <KPICard label="Active Vehicles" value={kpis.activeVehicles} icon={Truck} color="bg-blue-900/40 text-blue-400" sub="On trip right now" />
        <KPICard label="Available Vehicles" value={kpis.availableVehicles} icon={Truck} color="bg-emerald-900/40 text-emerald-400" sub="Ready to dispatch" />
        <KPICard label="In Maintenance" value={kpis.inMaintenance} icon={Activity} color="bg-amber-900/40 text-amber-400" sub="In shop" />
        <KPICard label="Fleet Utilization" value={`${kpis.fleetUtilization || 0}%`} icon={TrendingUp} color="bg-primary-900/40 text-primary-400" sub="On-trip / total" />
        <KPICard label="Active Trips" value={kpis.activeTrips} icon={MapPin} color="bg-blue-900/40 text-blue-400" sub="Dispatched" />
        <KPICard label="Pending Trips" value={kpis.pendingTrips} icon={Clock} color="bg-slate-700/40 text-slate-400" sub="Draft" />
        <KPICard label="Drivers on Duty" value={kpis.driversOnDuty} icon={Users} color="bg-purple-900/40 text-purple-400" sub="Currently on trip" />
        <KPICard label="Total Vehicles" value={kpis.totalVehicles} icon={Truck} color="bg-slate-700/40 text-slate-400" sub="All fleet" />
      </div>

      {/* Status Distribution */}
      <div className="card">
        <h2 className="text-base font-semibold text-white mb-4">Vehicle Status Distribution</h2>
        <StatusBar distribution={data?.statusDistribution || {}} />
      </div>

      {/* Recent Trips */}
      <div className="card">
        <h2 className="text-base font-semibold text-white mb-4">Recent Trips</h2>
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
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
              <tbody className="divide-y divide-slate-700/50">
                {(data?.recentTrips || []).map(trip => (
                  <tr key={trip._id} className="hover:bg-slate-700/20 transition-colors">
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
                  <tr><td colSpan={5} className="table-cell text-slate-500 text-center py-8">No trips yet — seed the database or create a trip.</td></tr>
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
