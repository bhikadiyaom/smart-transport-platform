import { useAuth } from '../context/AuthContext';

const RBAC_MATRIX = [
  { role: 'Fleet Manager', fleet: 'Edit', drivers: '—', trips: '—', finance: '—', analytics: 'Edit', maintenance: 'Edit' },
  { role: 'Dispatcher', fleet: 'View', drivers: 'View', trips: 'Edit', finance: '—', analytics: '—', maintenance: 'View' },
  { role: 'Safety Officer', fleet: '—', drivers: 'Edit', trips: 'View', finance: '—', analytics: '—', maintenance: '—' },
  { role: 'Financial Analyst', fleet: 'View', drivers: '—', trips: '—', finance: 'Edit', analytics: 'Edit', maintenance: '—' },
];

const COLUMNS = ['Fleet', 'Drivers', 'Trips', 'Finance', 'Analytics', 'Maintenance'];

function PermCell({ value }) {
  if (value === 'Edit') return <span className="badge bg-emerald-900/40 text-emerald-300 border border-emerald-700">Edit</span>;
  if (value === 'View') return <span className="badge bg-blue-900/40 text-blue-300 border border-blue-700">View</span>;
  return <span className="text-slate-600">—</span>;
}

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings & RBAC</h1>
        <p className="text-slate-400 text-sm mt-1">System configuration and role-based access control</p>
      </div>

      {/* Depot config */}
      <div className="card">
        <h2 className="text-base font-semibold text-white mb-4">Platform Configuration</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="label">Depot / Organisation Name</label>
            <input className="input" defaultValue="TransitOps Central Depot" readOnly className="input opacity-60 cursor-not-allowed" />
          </div>
          <div>
            <label className="label">Currency</label>
            <input className="input" defaultValue="INR (₹)" readOnly className="input opacity-60 cursor-not-allowed" />
          </div>
          <div>
            <label className="label">Distance Unit</label>
            <input className="input" defaultValue="Kilometers (km)" readOnly className="input opacity-60 cursor-not-allowed" />
          </div>
          <div>
            <label className="label">Weight Unit</label>
            <input className="input" defaultValue="Kilograms (kg)" readOnly className="input opacity-60 cursor-not-allowed" />
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-4">Configuration changes require system admin access.</p>
      </div>

      {/* Current user */}
      <div className="card">
        <h2 className="text-base font-semibold text-white mb-4">Your Account</h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-700 flex items-center justify-center text-lg font-bold text-white">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-white">{user?.name}</p>
            <p className="text-sm text-slate-400">{user?.email}</p>
            <span className="badge bg-primary-900/40 text-primary-300 border border-primary-700 mt-1">
              {user?.role?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </span>
          </div>
        </div>
      </div>

      {/* RBAC Matrix */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-base font-semibold text-white">Role-Based Access Control Matrix</h2>
          <p className="text-xs text-slate-500 mt-1">This matrix is enforced on both the API server and the frontend. Read-only.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-700 bg-slate-800/50">
              <tr>
                <th className="table-header">Role</th>
                {COLUMNS.map(c => <th key={c} className="table-header">{c}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {RBAC_MATRIX.map(row => (
                <tr key={row.role} className={`hover:bg-slate-700/20 ${row.role.toLowerCase().replace(' ', '_') === user?.role ? 'bg-primary-900/20 border-l-2 border-l-primary-500' : ''}`}>
                  <td className="table-cell font-medium">
                    {row.role}
                    {row.role.toLowerCase().replace(' ', '_') === user?.role && (
                      <span className="ml-2 text-xs text-primary-400">(you)</span>
                    )}
                  </td>
                  <td className="table-cell"><PermCell value={row.fleet} /></td>
                  <td className="table-cell"><PermCell value={row.drivers} /></td>
                  <td className="table-cell"><PermCell value={row.trips} /></td>
                  <td className="table-cell"><PermCell value={row.finance} /></td>
                  <td className="table-cell"><PermCell value={row.analytics} /></td>
                  <td className="table-cell"><PermCell value={row.maintenance} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
