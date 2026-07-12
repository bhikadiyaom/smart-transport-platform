import { useEffect, useState } from 'react';
import { analyticsAPI } from '../api';
import { CSVExportButton } from '../components/CSVExport';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, Zap, DollarSign, AlertTriangle,
  RefreshCw, BarChart3, Truck, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DONUT_COLORS = { available: '#10b981', on_trip: '#f59e0b', in_shop: '#3b82f6', retired: '#64748b' };
const DONUT_LABELS = { available: 'Available', on_trip: 'On Trip', in_shop: 'In Shop', retired: 'Retired' };

/* ── Tooltip ─────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ animation: 'fadeIn 150ms ease' }}
      className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs shadow-2xl">
      <p className="font-semibold text-slate-200 mb-2 text-sm">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-bold text-white">
            {p.name === 'Trips' ? p.value : `₹${Number(p.value).toLocaleString()}`}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ── Skeleton helpers ────────────────────────────────────── */
const Sk = ({ w = 'full', h = 4, rounded = 'lg' }) => (
  <div className={`w-${w} h-${h} rounded-${rounded} skeleton`} />
);
function ChartSkeleton({ height = 220 }) {
  return (
    <div style={{ height }} className="flex items-end gap-2 px-4 pb-4">
      {[55, 75, 40, 88, 65, 50, 70].map((h, i) => (
        <div key={i} className="flex-1 rounded-t-lg skeleton" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

/* ── KPI Card ────────────────────────────────────────────── */
function StatCard({ label, value, sub, icon: Icon, gradient, trend, delay = 0 }) {
  const trendColor = trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-rose-400' : 'text-slate-500';
  const TrendIcon  = trend > 0 ? ArrowUpRight : trend < 0 ? ArrowDownRight : Minus;
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 kpi-card-enter border border-slate-700/60"
      style={{ background: 'rgb(30 41 59)', animationDelay: `${delay}ms`, animationFillMode: 'both' }}>
      {/* Glow blob */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 blur-2xl pointer-events-none"
        style={{ background: gradient }} />
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: `${gradient}22`, border: `1px solid ${gradient}44` }}>
          <Icon className="w-5 h-5" style={{ color: gradient }} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value ?? '—'}</p>
      <p className="text-sm font-medium text-slate-300 mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── ROI Badge ───────────────────────────────────────────── */
function RoiBadge({ roi }) {
  if (roi > 0)  return <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-900/30 border border-emerald-700/40 px-2 py-0.5 rounded-full"><ArrowUpRight className="w-3 h-3" />+{roi}%</span>;
  if (roi < 0)  return <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-900/30 border border-rose-700/40 px-2 py-0.5 rounded-full"><ArrowDownRight className="w-3 h-3" />{roi}%</span>;
  return <span className="text-xs text-slate-500">—</span>;
}

/* ── Efficiency Bar ──────────────────────────────────────── */
function EffBar({ value }) {
  const pct   = Math.min((value / 20) * 100, 100);
  const color = value > 12 ? '#10b981' : value > 6 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color }}>{value || '—'}</span>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function Analytics() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setTab]   = useState('overview');

  const load = async () => {
    setLoading(true);
    try { const res = await analyticsAPI.getAnalytics(); setData(res.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const monthlyData = (data?.monthlyRevenue || []).map(m => ({
    name: `${MONTH_NAMES[m._id.month]} '${String(m._id.year).slice(2)}`,
    Revenue: m.revenue, Trips: m.trips,
  }));

  const costData = (data?.topCostliest || []).map(v => ({
    name: v.vehicle.registration_no,
    'Fuel': v.totalFuelCost,
    'Maint.': v.totalMaintenanceCost,
  }));

  const vehicleAnalytics = data?.vehicleAnalytics || [];
  const avgFuel  = vehicleAnalytics.length
    ? (vehicleAnalytics.reduce((s, v) => s + v.fuelEfficiency, 0) / (vehicleAnalytics.filter(v => v.fuelEfficiency > 0).length || 1)).toFixed(1) : 0;
  const totalRev  = vehicleAnalytics.reduce((s, v) => s + v.totalRevenue, 0);
  const totalCost = vehicleAnalytics.reduce((s, v) => s + v.operationalCost, 0);
  const netProfit = totalRev - totalCost;

  const donutData = data?.statusDistribution
    ? Object.entries(data.statusDistribution).filter(([, v]) => v > 0).map(([k, v]) => ({ name: k, value: v }))
    : [];

  const csvData = vehicleAnalytics.map(v => ({
    Vehicle: v.vehicle.registration_no, Model: v.vehicle.name_model,
    'Fuel Eff (km/L)': v.fuelEfficiency, 'Fuel Cost': v.totalFuelCost,
    'Maint Cost': v.totalMaintenanceCost, 'Op Cost': v.operationalCost,
    Revenue: v.totalRevenue, 'ROI %': v.roi, Trips: v.tripCount,
  }));

  const TABS = ['overview', 'costs', 'vehicles'];

  return (
    <div className="min-h-full bg-slate-900">
      {/* ── Hero Header ─────────────────────────────────── */}
      <div className="relative overflow-hidden px-6 pt-8 pb-6"
        style={{ background: 'linear-gradient(135deg, rgb(15 23 42) 0%, rgb(30 27 75) 50%, rgb(15 23 42) 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-violet-600/8 rounded-full blur-3xl" />
        </div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}>
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Reports & Analytics</h1>
              <p className="text-slate-400 text-sm mt-0.5">Live-computed · All fleet data · Real-time</p>
            </div>
          </div>
          <div className="flex gap-2">
            <CSVExportButton data={csvData} filename="vehicle_analytics" />
            <button onClick={load} disabled={loading}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="relative flex gap-1 mt-6 bg-slate-800/50 rounded-xl p-1 w-fit border border-slate-700/50">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200"
              style={activeTab === t
                ? { background: '#4f46e5', color: '#fff', boxShadow: '0 4px 12px rgba(79,70,229,0.4)' }
                : { color: '#94a3b8' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* ── KPI Row ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-700/60 p-5 space-y-3" style={{ background: 'rgb(30 41 59)' }}>
              <div className="flex justify-between"><Sk w="11" h="11" rounded="xl" /><Sk w="12" h="4" /></div>
              <Sk w="20" h="7" /><Sk w="32" h="4" /><Sk w="24" h="3" />
            </div>
          )) : <>
            <StatCard label="Fleet Utilization"   value={`${data?.fleetUtilizationPct || 0}%`}     icon={TrendingUp}   gradient="#6366f1" sub="Vehicles on trip vs total"  delay={0}   />
            <StatCard label="Avg Fuel Efficiency"  value={`${avgFuel} km/L`}                          icon={Zap}          gradient="#10b981" sub="Kilometres per litre"       delay={60}  />
            <StatCard label="Total Revenue"        value={`₹${(totalRev/1000).toFixed(1)}K`}          icon={DollarSign}   gradient="#3b82f6" sub="All completed trips"        delay={120} />
            <StatCard label="Net Profit / Loss"    value={`₹${(netProfit/1000).toFixed(1)}K`}         icon={netProfit >= 0 ? TrendingUp : AlertTriangle}
              gradient={netProfit >= 0 ? '#10b981' : '#ef4444'} sub="Revenue − Operational Cost" delay={180} />
          </>}
        </div>

        {/* ── Overview Tab ──────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Area Chart — Revenue Trend */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-700/60 p-5"
                style={{ background: 'rgb(30 41 59)' }}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-semibold text-white">Revenue Trend</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Last 6 months · completed trips</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-indigo-400 rounded inline-block" />Revenue</span>
                  </div>
                </div>
                {loading ? <ChartSkeleton height={220} /> : monthlyData.length === 0 ? (
                  <div className="h-52 flex flex-col items-center justify-center text-slate-500">
                    <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm">No revenue data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"   stopColor="#6366f1" stopOpacity={0.35} />
                          <stop offset="95%"  stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(51,65,85,0.5)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                        tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                      <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 2' }} />
                      <Area dataKey="Revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#revArea)"
                        dot={{ fill: '#6366f1', r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: '#6366f1', stroke: '#312e81', strokeWidth: 2 }}
                        isAnimationActive animationDuration={900} animationEasing="ease-out" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Donut — Fleet Status */}
              <div className="rounded-2xl border border-slate-700/60 p-5 flex flex-col"
                style={{ background: 'rgb(30 41 59)' }}>
                <h2 className="text-base font-semibold text-white mb-1">Fleet Status</h2>
                <p className="text-xs text-slate-500 mb-4">Vehicle distribution</p>
                {loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full skeleton" />
                  </div>
                ) : donutData.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">No data</div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={donutData} cx="50%" cy="50%" innerRadius={42} outerRadius={68}
                          paddingAngle={3} dataKey="value" animationBegin={0} animationDuration={900} isAnimationActive>
                          {donutData.map(e => <Cell key={e.name} fill={DONUT_COLORS[e.name] || '#64748b'} />)}
                        </Pie>
                        <Tooltip content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const { name, value } = payload[0];
                          return (
                            <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
                              <span style={{ color: DONUT_COLORS[name] }} className="font-semibold">{DONUT_LABELS[name] || name}</span>
                              <span className="text-slate-300 ml-2">{value} vehicles</span>
                            </div>
                          );
                        }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-y-2 mt-2">
                      {donutData.map(e => (
                        <div key={e.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[e.name] }} />
                          <span>{DONUT_LABELS[e.name] || e.name}</span>
                          <span className="font-semibold text-slate-200 ml-auto">{e.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Costs Tab ─────────────────────────────────── */}
        {activeTab === 'costs' && (
          <div className="rounded-2xl border border-slate-700/60 p-5" style={{ background: 'rgb(30 41 59)' }}>
            <div className="mb-5">
              <h2 className="text-base font-semibold text-white">Cost Breakdown by Vehicle</h2>
              <p className="text-xs text-slate-500 mt-0.5">Fuel vs maintenance expenditure</p>
            </div>
            {loading ? <ChartSkeleton height={260} /> : costData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-slate-500 text-sm">No cost data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={costData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                      <stop offset="100%" stopColor="#d97706" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="mGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(51,65,85,0.5)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ color: '#94a3b8', fontSize: 12, paddingTop: 12 }} />
                  <Bar dataKey="Fuel"   stackId="a" fill="url(#fGrad)" radius={[0,0,0,0]} isAnimationActive animationDuration={800} />
                  <Bar dataKey="Maint." stackId="a" fill="url(#mGrad)" radius={[6,6,0,0]} isAnimationActive animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* ── Vehicles Tab ──────────────────────────────── */}
        {activeTab === 'vehicles' && (
          <div className="rounded-2xl border border-slate-700/60 overflow-hidden" style={{ background: 'rgb(30 41 59)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60">
              <div>
                <h2 className="text-base font-semibold text-white">Per-Vehicle Performance</h2>
                <p className="text-xs text-slate-500 mt-0.5">ROI = (Revenue − Op. Cost) / Acquisition Cost × 100</p>
              </div>
            </div>
            <div className="overflow-x-auto table-fade-in">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/60" style={{ background: 'rgba(15,23,42,0.5)' }}>
                    <th className="table-header">Vehicle</th>
                    <th className="table-header text-center">Trips</th>
                    <th className="table-header">Fuel Eff.</th>
                    <th className="table-header">Fuel Cost</th>
                    <th className="table-header">Maint. Cost</th>
                    <th className="table-header">Op. Cost</th>
                    <th className="table-header">Revenue</th>
                    <th className="table-header">ROI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="table-cell"><div className="h-4 rounded skeleton" /></td>
                        ))}
                      </tr>
                    ))
                  ) : vehicleAnalytics.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="table-cell text-center py-16">
                        <Truck className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">No analytics data yet</p>
                      </td>
                    </tr>
                  ) : vehicleAnalytics.map(v => (
                    <tr key={v.vehicle._id}>
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary-900/40 border border-primary-700/30 flex items-center justify-center flex-shrink-0">
                            <Truck className="w-4 h-4 text-primary-400" />
                          </div>
                          <div>
                            <p className="font-mono font-semibold text-slate-100 text-sm">{v.vehicle.registration_no}</p>
                            <p className="text-xs text-slate-500 truncate max-w-28">{v.vehicle.name_model}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-center">
                        <span className="w-7 h-7 rounded-full bg-slate-700/60 flex items-center justify-center text-xs font-bold text-slate-200 mx-auto">
                          {v.tripCount}
                        </span>
                      </td>
                      <td className="table-cell"><EffBar value={v.fuelEfficiency} /></td>
                      <td className="table-cell text-amber-300 font-medium">₹{v.totalFuelCost.toLocaleString()}</td>
                      <td className="table-cell text-rose-300">₹{v.totalMaintenanceCost.toLocaleString()}</td>
                      <td className="table-cell">
                        <span className="font-semibold text-rose-300">₹{v.operationalCost.toLocaleString()}</span>
                      </td>
                      <td className="table-cell">
                        <span className="font-semibold text-emerald-300">₹{v.totalRevenue.toLocaleString()}</span>
                      </td>
                      <td className="table-cell"><RoiBadge roi={v.roi} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
