import { useEffect, useState } from 'react';
import { analyticsAPI } from '../api';
import { CSVExportButton } from '../components/CSVExport';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts';
import { TrendingUp, Zap, DollarSign, Award, RefreshCw } from 'lucide-react';

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function MetricCard({ label, value, icon: Icon, color, sub }) {
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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="font-medium text-slate-200 mb-2">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>₹{Number(p.value).toLocaleString()}</strong>
        </p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await analyticsAPI.getAnalytics();
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const monthlyData = (data?.monthlyRevenue || []).map(m => ({
    name: `${MONTH_NAMES[m._id.month]} ${m._id.year}`,
    Revenue: m.revenue,
    Trips: m.trips
  }));

  const costData = (data?.topCostliest || []).map(v => ({
    name: v.vehicle.registration_no,
    'Fuel Cost': v.totalFuelCost,
    'Maintenance': v.totalMaintenanceCost
  }));

  const vehicleAnalytics = data?.vehicleAnalytics || [];
  const avgFuelEfficiency = vehicleAnalytics.length > 0
    ? (vehicleAnalytics.reduce((s, v) => s + v.fuelEfficiency, 0) / vehicleAnalytics.filter(v => v.fuelEfficiency > 0).length || 0).toFixed(1)
    : 0;
  const totalRevenue = vehicleAnalytics.reduce((s, v) => s + v.totalRevenue, 0);
  const totalOpCost = vehicleAnalytics.reduce((s, v) => s + v.operationalCost, 0);

  const csvVehicleData = vehicleAnalytics.map(v => ({
    Vehicle: v.vehicle.registration_no, Model: v.vehicle.name_model,
    'Fuel Efficiency (km/L)': v.fuelEfficiency, 'Total Fuel Cost': v.totalFuelCost,
    'Total Maintenance Cost': v.totalMaintenanceCost, 'Total Revenue': v.totalRevenue,
    'Operational Cost': v.operationalCost, 'ROI %': v.roi, 'Trips Completed': v.tripCount
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">Live-computed from all fleet data</p>
        </div>
        <div className="flex gap-2">
          <CSVExportButton data={csvVehicleData} filename="vehicle_analytics" />
          <button onClick={load} disabled={loading} className="btn-secondary text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Fleet Utilization" value={`${data?.fleetUtilizationPct || 0}%`} icon={TrendingUp} color="bg-primary-900/40 text-primary-400" sub="Vehicles on trip / total" />
        <MetricCard label="Avg Fuel Efficiency" value={`${avgFuelEfficiency} km/L`} icon={Zap} color="bg-emerald-900/40 text-emerald-400" sub="Distance / liters" />
        <MetricCard label="Total Revenue" value={`₹${(totalRevenue / 1000).toFixed(1)}K`} icon={DollarSign} color="bg-blue-900/40 text-blue-400" sub="All completed trips" />
        <MetricCard label="Total Op. Cost" value={`₹${(totalOpCost / 1000).toFixed(1)}K`} icon={Award} color="bg-rose-900/40 text-rose-400" sub="Fuel + Maintenance" />
      </div>

      {/* Monthly Revenue Chart */}
      <div className="card">
        <h2 className="text-base font-semibold text-white mb-4">Monthly Revenue (Last 6 Months)</h2>
        {monthlyData.length === 0 ? (
          <p className="text-slate-500 text-sm">No completed trips with revenue data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Costliest Vehicles */}
      <div className="card">
        <h2 className="text-base font-semibold text-white mb-4">Top Costliest Vehicles</h2>
        {costData.length === 0 ? (
          <p className="text-slate-500 text-sm">No cost data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={costData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Bar dataKey="Fuel Cost" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Maintenance" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Vehicle Analytics Table */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-base font-semibold text-white">Per-Vehicle Analytics</h2>
          <p className="text-xs text-slate-500 mt-1">ROI = (Revenue − Operational Cost) / Acquisition Cost × 100</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-700 bg-slate-800/50">
              <tr>
                <th className="table-header">Vehicle</th>
                <th className="table-header">Trips Done</th>
                <th className="table-header">Fuel Eff. (km/L)</th>
                <th className="table-header">Fuel Cost</th>
                <th className="table-header">Maint. Cost</th>
                <th className="table-header">Op. Cost</th>
                <th className="table-header">Revenue</th>
                <th className="table-header">ROI %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={8} className="table-cell text-center text-slate-500 py-8">Loading…</td></tr>
              ) : vehicleAnalytics.length === 0 ? (
                <tr><td colSpan={8} className="table-cell text-center text-slate-500 py-8">No analytics data yet.</td></tr>
              ) : vehicleAnalytics.map(v => (
                <tr key={v.vehicle._id} className="hover:bg-slate-700/20">
                  <td className="table-cell">
                    <span className="font-mono font-medium">{v.vehicle.registration_no}</span>
                    <br /><span className="text-xs text-slate-500">{v.vehicle.name_model}</span>
                  </td>
                  <td className="table-cell text-center">{v.tripCount}</td>
                  <td className="table-cell">
                    <span className={`font-medium ${v.fuelEfficiency > 10 ? 'text-emerald-400' : v.fuelEfficiency > 5 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {v.fuelEfficiency || '—'}
                    </span>
                  </td>
                  <td className="table-cell text-amber-300">₹{v.totalFuelCost.toLocaleString()}</td>
                  <td className="table-cell text-rose-300">₹{v.totalMaintenanceCost.toLocaleString()}</td>
                  <td className="table-cell font-semibold text-rose-300">₹{v.operationalCost.toLocaleString()}</td>
                  <td className="table-cell text-emerald-300">₹{v.totalRevenue.toLocaleString()}</td>
                  <td className="table-cell">
                    <span className={`font-bold ${v.roi > 0 ? 'text-emerald-400' : v.roi < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {v.roi > 0 ? '+' : ''}{v.roi}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
