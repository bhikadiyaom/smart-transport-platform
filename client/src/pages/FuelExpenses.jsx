import { useEffect, useState } from 'react';
import { financeAPI, vehiclesAPI, tripsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Modal, { ErrorCallout } from '../components/Modal';
import { CSVExportButton } from '../components/CSVExport';
import { Plus, Pencil, Trash2, Fuel, Receipt, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';

const emptyFuel = { vehicle_id: '', trip_id: '', date: '', liters: '', cost: '' };
const emptyExpense = { vehicle_id: '', trip_id: '', toll: '', other: '', maintenance_linked: '', description: '', date: '' };

export default function FuelExpenses() {
  const { can } = useAuth();
  const canEdit = can('edit', 'finance');

  const [tab, setTab] = useState('fuel');
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyFuel);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [opCosts, setOpCosts] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [fuelRes, expRes, vehRes, tripRes] = await Promise.all([
        financeAPI.getFuelLogs(),
        financeAPI.getExpenses(),
        vehiclesAPI.getAll(),
        tripsAPI.getAll()
      ]);
      setFuelLogs(fuelRes.data);
      setExpenses(expRes.data);
      setVehicles(vehRes.data);
      setTrips(tripRes.data);

      // Compute operational cost for each vehicle
      const costs = {};
      for (const v of vehRes.data) {
        try {
          const r = await financeAPI.getOperationalCost(v._id);
          costs[v._id] = r.data;
        } catch (_) {}
      }
      setOpCosts(costs);
    } catch (e) { toast.error('Failed to load financial data.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditTarget(null);
    setForm(tab === 'fuel' ? emptyFuel : emptyExpense);
    setErrors({}); setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditTarget(item);
    if (tab === 'fuel') {
      setForm({ vehicle_id: item.vehicle_id?._id || '', trip_id: item.trip_id?._id || '', date: item.date?.slice(0, 10), liters: item.liters, cost: item.cost });
    } else {
      setForm({ vehicle_id: item.vehicle_id?._id || '', trip_id: item.trip_id?._id || '', toll: item.toll, other: item.other, maintenance_linked: item.maintenance_linked, description: item.description, date: item.date?.slice(0, 10) });
    }
    setErrors({}); setModalOpen(true);
  };

  const handleSave = async () => {
    const newErrors = {};
    if (!form.vehicle_id) newErrors.vehicle_id = 'Vehicle selection is required.';
    
    if (!form.date) newErrors.date = 'Date is required.';
    else {
      const d = new Date(form.date);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // allow today
      if (d > today) newErrors.date = 'Date cannot be in the future.';
    }

    if (tab === 'fuel') {
      const litersVal = Number(form.liters);
      if (form.liters === '' || isNaN(litersVal)) newErrors.liters = 'Liters is required.';
      else if (litersVal <= 0) newErrors.liters = 'Liters must be greater than zero.';

      const costVal = Number(form.cost);
      if (form.cost === '' || isNaN(costVal)) newErrors.cost = 'Cost is required.';
      else if (costVal <= 0) newErrors.cost = 'Cost must be greater than zero.';
    } else {
      const tollVal = Number(form.toll || 0);
      const otherVal = Number(form.other || 0);
      const maintVal = Number(form.maintenance_linked || 0);

      if (form.toll !== '' && (isNaN(tollVal) || tollVal < 0)) newErrors.toll = 'Toll must be non-negative.';
      if (form.other !== '' && (isNaN(otherVal) || otherVal < 0)) newErrors.other = 'Other must be non-negative.';
      if (form.maintenance_linked !== '' && (isNaN(maintVal) || maintVal < 0)) newErrors.maintenance_linked = 'Maintenance must be non-negative.';

      if (tollVal === 0 && otherVal === 0 && maintVal === 0) {
        newErrors.global = 'At least one expense amount (Toll, Other, or Maintenance) must be greater than zero.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true); setErrors({});
    try {
      if (tab === 'fuel') {
        if (editTarget) await financeAPI.updateFuelLog(editTarget._id, form);
        else await financeAPI.createFuelLog(form);
        toast.success(editTarget ? 'Fuel log updated.' : 'Fuel log created.');
      } else {
        if (editTarget) await financeAPI.updateExpense(editTarget._id, form);
        else await financeAPI.createExpense(form);
        toast.success(editTarget ? 'Expense updated.' : 'Expense recorded.');
      }
      setModalOpen(false); load();
    } catch (err) {
      setErrors({ global: err.response?.data?.message || 'Failed to save transaction.' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      if (tab === 'fuel') { await financeAPI.deleteFuelLog(id); toast.success('Fuel log deleted.'); }
      else { await financeAPI.deleteExpense(id); toast.success('Expense deleted.'); }
      load();
    } catch (err) { toast.error('Failed to delete.'); }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

  const totalFuelCost = fuelLogs.reduce((s, f) => s + (f.cost || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.total || 0), 0);

  const fuelCsvData = fuelLogs.map(f => ({
    Vehicle: f.vehicle_id?.registration_no, Trip: f.trip_id?.source ? `${f.trip_id.source}→${f.trip_id.destination}` : '',
    Date: fmtDate(f.date), 'Liters': f.liters, 'Cost (₹)': f.cost
  }));
  const expCsvData = expenses.map(e => ({
    Vehicle: e.vehicle_id?.registration_no, Trip: e.trip_id?.source ? `${e.trip_id.source}→${e.trip_id.destination}` : '',
    Toll: e.toll, Other: e.other, Maintenance: e.maintenance_linked, Total: e.total,
    Description: e.description, Date: fmtDate(e.date)
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fuel & Expenses</h1>
          <p className="text-slate-400 text-sm mt-1">Total Fuel Cost: ₹{totalFuelCost.toLocaleString()} · Total Expenses: ₹{totalExpenses.toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <CSVExportButton data={tab === 'fuel' ? fuelCsvData : expCsvData} filename={tab === 'fuel' ? 'fuel_logs' : 'expenses'} />
          {canEdit && <button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4" /> Add {tab === 'fuel' ? 'Fuel Log' : 'Expense'}</button>}
        </div>
      </div>

      {/* Tab switch */}
      <div className="flex gap-2">
        <button onClick={() => setTab('fuel')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'fuel' ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'}`}>
          <Fuel className="w-4 h-4" /> Fuel Logs
        </button>
        <button onClick={() => setTab('expenses')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'expenses' ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'}`}>
          <Receipt className="w-4 h-4" /> Expenses
        </button>
        <button onClick={() => setTab('opCost')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'opCost' ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'}`}>
          <TrendingDown className="w-4 h-4" /> Operational Cost
        </button>
      </div>

      {/* Fuel Logs Tab */}
      {tab === 'fuel' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-slate-700 bg-slate-800/50">
              <tr>
                <th className="table-header">Vehicle</th>
                <th className="table-header">Trip</th>
                <th className="table-header">Date</th>
                <th className="table-header">Liters</th>
                <th className="table-header">Cost</th>
                {canEdit && <th className="table-header">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? <tr><td colSpan={6} className="table-cell text-center text-slate-500 py-8">Loading…</td></tr>
                : fuelLogs.length === 0 ? <tr><td colSpan={6} className="table-cell text-center text-slate-500 py-8">No fuel logs yet.</td></tr>
                : fuelLogs.map(f => (
                  <tr key={f._id} className="hover:bg-slate-700/20">
                    <td className="table-cell font-mono text-sm">{f.vehicle_id?.registration_no}</td>
                    <td className="table-cell text-xs text-slate-400">{f.trip_id ? `${f.trip_id.source}→${f.trip_id.destination}` : '—'}</td>
                    <td className="table-cell text-slate-400">{fmtDate(f.date)}</td>
                    <td className="table-cell">{f.liters} L</td>
                    <td className="table-cell font-medium">₹{f.cost?.toLocaleString()}</td>
                    {canEdit && (
                      <td className="table-cell">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(f)} className="text-slate-400 hover:text-white p-1"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(f._id)} className="text-slate-400 hover:text-rose-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Expenses Tab */}
      {tab === 'expenses' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-slate-700 bg-slate-800/50">
              <tr>
                <th className="table-header">Vehicle</th>
                <th className="table-header">Trip</th>
                <th className="table-header">Toll</th>
                <th className="table-header">Other</th>
                <th className="table-header">Maintenance</th>
                <th className="table-header">Total</th>
                <th className="table-header">Date</th>
                {canEdit && <th className="table-header">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? <tr><td colSpan={8} className="table-cell text-center text-slate-500 py-8">Loading…</td></tr>
                : expenses.length === 0 ? <tr><td colSpan={8} className="table-cell text-center text-slate-500 py-8">No expenses yet.</td></tr>
                : expenses.map(e => (
                  <tr key={e._id} className="hover:bg-slate-700/20">
                    <td className="table-cell font-mono text-sm">{e.vehicle_id?.registration_no}</td>
                    <td className="table-cell text-xs text-slate-400">{e.trip_id ? `${e.trip_id.source}→${e.trip_id.destination}` : '—'}</td>
                    <td className="table-cell">₹{e.toll?.toLocaleString()}</td>
                    <td className="table-cell">₹{e.other?.toLocaleString()}</td>
                    <td className="table-cell">₹{e.maintenance_linked?.toLocaleString()}</td>
                    <td className="table-cell font-semibold text-amber-300">₹{e.total?.toLocaleString()}</td>
                    <td className="table-cell text-slate-400">{fmtDate(e.date)}</td>
                    {canEdit && (
                      <td className="table-cell">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(e)} className="text-slate-400 hover:text-white p-1"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(e._id)} className="text-slate-400 hover:text-rose-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Operational Cost Tab */}
      {tab === 'opCost' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-slate-700 bg-slate-800/50">
              <tr>
                <th className="table-header">Vehicle</th>
                <th className="table-header">Fuel Cost</th>
                <th className="table-header">Maintenance Cost</th>
                <th className="table-header">Total Op. Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {vehicles.map(v => {
                const c = opCosts[v._id];
                return (
                  <tr key={v._id} className="hover:bg-slate-700/20">
                    <td className="table-cell font-mono">{v.registration_no} <span className="text-slate-500 font-sans text-xs ml-1">{v.name_model}</span></td>
                    <td className="table-cell">₹{(c?.fuel_cost || 0).toLocaleString()}</td>
                    <td className="table-cell">₹{(c?.maintenance_cost || 0).toLocaleString()}</td>
                    <td className="table-cell font-semibold text-rose-300">₹{(c?.total || 0).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? `Edit ${tab === 'fuel' ? 'Fuel Log' : 'Expense'}` : `Add ${tab === 'fuel' ? 'Fuel Log' : 'Expense'}`}>
        <div className="space-y-4">
          <ErrorCallout message={errors.global} />
          <div>
            <label className="label">Vehicle *</label>
            <select className="select" value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))}>
              <option value="">Select vehicle…</option>
              {vehicles.map(v => <option key={v._id} value={v._id}>{v.registration_no} — {v.name_model}</option>)}
            </select>
            {errors.vehicle_id && <p className="text-rose-400 text-xs mt-1">{errors.vehicle_id}</p>}
          </div>
          <div>
            <label className="label">Trip (optional)</label>
            <select className="select" value={form.trip_id} onChange={e => setForm(f => ({ ...f, trip_id: e.target.value }))}>
              <option value="">No trip</option>
              {trips.map(t => <option key={t._id} value={t._id}>{t.source} → {t.destination} ({t.status})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date *</label>
            <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            {errors.date && <p className="text-rose-400 text-xs mt-1">{errors.date}</p>}
          </div>

          {tab === 'fuel' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Liters *</label>
                <input className="input" type="number" placeholder="38.5" value={form.liters} onChange={e => setForm(f => ({ ...f, liters: e.target.value }))} />
                {errors.liters && <p className="text-rose-400 text-xs mt-1">{errors.liters}</p>}
              </div>
              <div>
                <label className="label">Cost (₹) *</label>
                <input className="input" type="number" placeholder="3465" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} />
                {errors.cost && <p className="text-rose-400 text-xs mt-1">{errors.cost}</p>}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Toll (₹)</label>
                  <input className="input" type="number" placeholder="380" value={form.toll} onChange={e => setForm(f => ({ ...f, toll: e.target.value }))} />
                  {errors.toll && <p className="text-rose-400 text-xs mt-1">{errors.toll}</p>}
                </div>
                <div>
                  <label className="label">Other (₹)</label>
                  <input className="input" type="number" placeholder="200" value={form.other} onChange={e => setForm(f => ({ ...f, other: e.target.value }))} />
                  {errors.other && <p className="text-rose-400 text-xs mt-1">{errors.other}</p>}
                </div>
                <div>
                  <label className="label">Maintenance (₹)</label>
                  <input className="input" type="number" placeholder="0" value={form.maintenance_linked} onChange={e => setForm(f => ({ ...f, maintenance_linked: e.target.value }))} />
                  {errors.maintenance_linked && <p className="text-rose-400 text-xs mt-1">{errors.maintenance_linked}</p>}
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input" placeholder="Highway tolls + parking" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <p className="text-xs text-slate-500">Total = Toll + Other + Maintenance (computed on save)</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editTarget ? 'Update' : 'Add'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
