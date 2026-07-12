import { useEffect, useState } from 'react';
import { maintenanceAPI, vehiclesAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import StatusPill from '../components/StatusPill';
import Modal, { ErrorCallout, ConfirmModal } from '../components/Modal';
import { CSVExportButton } from '../components/CSVExport';
import { Plus, CheckCircle, Wrench, Info, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const emptyForm = { vehicle_id: '', service_type: '', cost: '', date: '', notes: '' };

export default function Maintenance() {
  const { can } = useAuth();
  const canEdit = can('edit', 'maintenance');

  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [closeTarget, setCloseTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [logRes, vehRes] = await Promise.all([
        maintenanceAPI.getAll(),
        vehiclesAPI.getAll()
      ]);
      setLogs(logRes.data);
      setVehicles(vehRes.data.filter(v => !['retired', 'on_trip'].includes(v.status)));
    } catch (e) { toast.error('Failed to load maintenance data.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    const newErrors = {};
    if (!form.vehicle_id) newErrors.vehicle_id = 'Vehicle is required.';
    if (!form.service_type?.trim()) newErrors.service_type = 'Service description is required.';
    
    const costVal = Number(form.cost);
    if (form.cost === '' || isNaN(costVal)) newErrors.cost = 'Service cost is required.';
    else if (costVal < 0) newErrors.cost = 'Service cost cannot be negative.';

    if (!form.date) newErrors.date = 'Date is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true); setErrors({});
    try {
      await maintenanceAPI.create({ ...form, cost: Number(form.cost) || 0, date: form.date });
      toast.success('Maintenance log created — vehicle status → In Shop.');
      setModalOpen(false); setForm(emptyForm); load();
    } catch (err) {
      setErrors({ global: err.response?.data?.message || 'Failed to create maintenance log.' });
    } finally { setSaving(false); }
  };

  const handleClose = async (log) => {
    try {
      await maintenanceAPI.close(log._id, { cost: log.cost });
      toast.success('Maintenance completed — vehicle restored to Available.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close maintenance log.');
    }
  };

  const handleDelete = async (id) => {
    try { await maintenanceAPI.delete(id); toast.success('Log deleted.'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to delete.'); }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const csvData = logs.map(l => ({
    Vehicle: l.vehicle_id?.registration_no, Model: l.vehicle_id?.name_model,
    'Service Type': l.service_type, Cost: l.cost,
    Date: fmtDate(l.date), Status: l.status, Notes: l.notes
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Maintenance</h1>
          <p className="text-slate-400 text-sm mt-1">{logs.filter(l => l.status === 'in_shop').length} vehicles currently in shop</p>
        </div>
        <div className="flex gap-2">
          <CSVExportButton data={csvData} filename="maintenance_logs" />
          {canEdit && (
            <button className="btn-primary" onClick={() => { setModalOpen(true); setForm(emptyForm); setFormError(''); }}>
              <Plus className="w-4 h-4" /> Log Service
            </button>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 text-sm text-amber-300">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>Creating a maintenance record immediately sets the vehicle status to <strong>In Shop</strong> — it disappears from all dispatch dropdowns until the record is closed.</span>
      </div>

      {/* Logs table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-700 bg-slate-800/50">
              <tr>
                <th className="table-header">Vehicle</th>
                <th className="table-header">Service Type</th>
                <th className="table-header">Cost</th>
                <th className="table-header">Date</th>
                <th className="table-header">Status</th>
                <th className="table-header">Notes</th>
                {canEdit && <th className="table-header">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={7} className="table-cell text-center text-slate-500 py-12">Loading…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="table-cell text-center text-slate-500 py-12">No maintenance records yet.</td></tr>
              ) : logs.map(log => (
                <tr key={log._id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="table-cell">
                    <span className="font-medium font-mono">{log.vehicle_id?.registration_no}</span>
                    <br /><span className="text-xs text-slate-500">{log.vehicle_id?.name_model}</span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-3.5 h-3.5 text-amber-400" />
                      {log.service_type}
                    </div>
                  </td>
                  <td className="table-cell font-medium">₹{log.cost?.toLocaleString()}</td>
                  <td className="table-cell text-slate-400">{fmtDate(log.date)}</td>
                  <td className="table-cell"><StatusPill status={log.status} /></td>
                  <td className="table-cell text-slate-500 text-xs max-w-48 truncate">{log.notes || '—'}</td>
                  {canEdit && (
                    <td className="table-cell">
                      <div className="flex gap-2">
                        {log.status === 'in_shop' && (
                          <button onClick={() => setCloseTarget(log)} className="btn-success text-xs px-2 py-1">
                            <CheckCircle className="w-3 h-3" /> Close
                          </button>
                        )}
                        <button onClick={() => setDeleteTarget(log)} className="text-slate-400 hover:text-rose-400 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Log Service Record">
        <div className="space-y-4">
          <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> This will immediately set the vehicle's status to In Shop.
          </div>
          <ErrorCallout message={errors.global} />
          <div>
            <label className="label">Vehicle *</label>
            <select className="select" value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))}>
              <option value="">Select vehicle…</option>
              {vehicles.map(v => <option key={v._id} value={v._id}>{v.registration_no} — {v.name_model} ({v.status})</option>)}
            </select>
            {errors.vehicle_id && <p className="text-rose-400 text-xs mt-1">{errors.vehicle_id}</p>}
          </div>
          <div>
            <label className="label">Service Type *</label>
            <input className="input" placeholder="Engine Overhaul, Tyre Replacement…" value={form.service_type}
              onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))} />
            {errors.service_type && <p className="text-rose-400 text-xs mt-1">{errors.service_type}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cost (₹) *</label>
              <input className="input" type="number" placeholder="45000" value={form.cost}
                onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} />
              {errors.cost && <p className="text-rose-400 text-xs mt-1">{errors.cost}</p>}
            </div>
            <div>
              <label className="label">Date *</label>
              <input className="input" type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              {errors.date && <p className="text-rose-400 text-xs mt-1">{errors.date}</p>}
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} placeholder="Details…" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Logging…' : 'Log Service Record'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Close confirm */}
      <ConfirmModal isOpen={!!closeTarget} onClose={() => setCloseTarget(null)}
        onConfirm={() => { handleClose(closeTarget); setCloseTarget(null); }}
        title="Complete Maintenance"
        message={`Mark ${closeTarget?.service_type} on ${closeTarget?.vehicle_id?.registration_no} as completed? Vehicle will return to Available (unless retired).`}
        confirmLabel="Complete" />

      {/* Delete confirm */}
      <ConfirmModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => { handleDelete(deleteTarget._id); setDeleteTarget(null); }}
        title="Delete Log" message="Delete this maintenance record?" confirmLabel="Delete" danger />
    </div>
  );
}
