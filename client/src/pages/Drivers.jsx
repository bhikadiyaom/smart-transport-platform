import { useEffect, useState } from 'react';
import { driversAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import StatusPill from '../components/StatusPill';
import Modal, { ErrorCallout, ConfirmModal } from '../components/Modal';
import { CSVExportButton } from '../components/CSVExport';
import { Plus, Pencil, Trash2, Search, AlertTriangle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['available', 'off_duty', 'suspended'];
const emptyForm = {
  name: '', license_no: '', license_category: 'LMV',
  license_expiry: '', contact: '', safety_score: 100,
  trip_completion_pct: 100, status: 'available'
};

function LicenseExpiry({ date }) {
  const expiry = new Date(date);
  const now = new Date();
  const isExpired = expiry < now;
  const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (isExpired) return (
    <span className="flex items-center gap-1 text-rose-400 text-xs font-medium">
      <AlertTriangle className="w-3 h-3" /> Expired {expiry.toLocaleDateString('en-IN')}
    </span>
  );
  if (daysLeft < 30) return (
    <span className="flex items-center gap-1 text-amber-400 text-xs">
      <AlertTriangle className="w-3 h-3" /> Expires in {daysLeft}d
    </span>
  );
  return <span className="text-slate-400 text-xs">{expiry.toLocaleDateString('en-IN')}</span>;
}

function SafetyBar({ score }) {
  const color = score >= 90 ? 'bg-emerald-500' : score >= 75 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden w-16">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-slate-300 w-8">{score}</span>
    </div>
  );
}

export default function Drivers() {
  const { can } = useAuth();
  const canEdit = can('edit', 'drivers');

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await driversAPI.getAll({ search, status: statusFilter });
      setDrivers(res.data);
    } catch (e) { toast.error('Failed to load drivers.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, statusFilter]);

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setFormError(''); setModalOpen(true); };
  const openEdit = (d) => {
    setForm({
      name: d.name, license_no: d.license_no, license_category: d.license_category,
      license_expiry: d.license_expiry?.slice(0, 10), contact: d.contact,
      safety_score: d.safety_score, trip_completion_pct: d.trip_completion_pct, status: d.status
    });
    setEditingId(d._id); setFormError(''); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.license_no || !form.license_expiry) {
      setFormError('Name, license number, and expiry date are required.');
      return;
    }
    setSaving(true); setFormError('');
    try {
      if (editingId) { await driversAPI.update(editingId, form); toast.success('Driver updated.'); }
      else { await driversAPI.create(form); toast.success('Driver added.'); }
      setModalOpen(false); load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save driver.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await driversAPI.delete(id); toast.success('Driver removed.'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to delete.'); }
  };

  const handleStatusChange = async (id, status) => {
    try { await driversAPI.updateStatus(id, status); toast.success(`Status → ${status}`); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to update status.'); }
  };

  const csvData = drivers.map(d => ({
    Name: d.name, 'License No': d.license_no, Category: d.license_category,
    'License Expiry': new Date(d.license_expiry).toLocaleDateString(),
    Contact: d.contact, 'Safety Score': d.safety_score,
    'Trip Completion %': d.trip_completion_pct, Status: d.status
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Drivers & Safety Profiles</h1>
          <p className="text-slate-400 text-sm mt-1">{drivers.length} drivers registered</p>
        </div>
        <div className="flex gap-2">
          <CSVExportButton data={csvData} filename="drivers" />
          {canEdit && (
            <button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4" /> Add Driver</button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-48">
            <Search className="w-4 h-4 text-slate-400" />
            <input className="input py-1.5 text-sm" placeholder="Search by name…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select py-1.5 text-sm w-40" value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {['available', 'on_trip', 'off_duty', 'suspended'].map(s =>
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            )}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-700 bg-slate-800/50">
              <tr>
                <th className="table-header">Driver</th>
                <th className="table-header">License</th>
                <th className="table-header">Expiry</th>
                <th className="table-header">Contact</th>
                <th className="table-header">Safety Score</th>
                <th className="table-header">Trip Completion</th>
                <th className="table-header">Status</th>
                {canEdit && <th className="table-header">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={8} className="table-cell text-center text-slate-500 py-12">Loading…</td></tr>
              ) : drivers.length === 0 ? (
                <tr><td colSpan={8} className="table-cell text-center text-slate-500 py-12">No drivers found.</td></tr>
              ) : drivers.map(d => {
                const expired = new Date(d.license_expiry) < new Date();
                return (
                  <tr key={d._id} className={`hover:bg-slate-700/20 transition-colors ${expired ? 'bg-rose-950/10' : ''}`}>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary-800 flex items-center justify-center text-xs font-bold text-primary-200">
                          {d.name.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-100">{d.name}</span>
                        {d.status === 'suspended' && <Shield className="w-3.5 h-3.5 text-rose-400" />}
                      </div>
                    </td>
                    <td className="table-cell font-mono text-xs text-slate-400">{d.license_no}<br /><span className="text-slate-600">{d.license_category}</span></td>
                    <td className="table-cell"><LicenseExpiry date={d.license_expiry} /></td>
                    <td className="table-cell text-slate-400">{d.contact}</td>
                    <td className="table-cell"><SafetyBar score={d.safety_score} /></td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <div className="h-1 rounded-full bg-slate-700 w-12 overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full" style={{ width: `${d.trip_completion_pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-400">{d.trip_completion_pct}%</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      {canEdit ? (
                        <select
                          value={d.status}
                          disabled={d.status === 'on_trip'}
                          onChange={e => handleStatusChange(d._id, e.target.value)}
                          className="text-xs bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-slate-300 disabled:opacity-50"
                        >
                          {d.status === 'on_trip' && <option value="on_trip">On Trip</option>}
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </select>
                      ) : <StatusPill status={d.status} />}
                    </td>
                    {canEdit && (
                      <td className="table-cell">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(d)} className="text-slate-400 hover:text-white p-1"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteTarget(d)} className="text-slate-400 hover:text-rose-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Driver' : 'Add Driver'}>
        <div className="space-y-4">
          <ErrorCallout message={formError} />
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Full Name *</label>
              <input className="input" placeholder="Alex Kumar" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">License No. *</label>
              <input className="input uppercase" placeholder="DL-MH-09-2019-001234" value={form.license_no}
                onChange={e => setForm(f => ({ ...f, license_no: e.target.value }))} />
            </div>
            <div>
              <label className="label">License Category</label>
              <input className="input" placeholder="LMV / HMV" value={form.license_category}
                onChange={e => setForm(f => ({ ...f, license_category: e.target.value }))} />
            </div>
            <div>
              <label className="label">License Expiry *</label>
              <input className="input" type="date" value={form.license_expiry}
                onChange={e => setForm(f => ({ ...f, license_expiry: e.target.value }))} />
            </div>
            <div>
              <label className="label">Contact</label>
              <input className="input" placeholder="+91 9876543210" value={form.contact}
                onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
            </div>
            <div>
              <label className="label">Safety Score (0–100)</label>
              <input className="input" type="number" min="0" max="100" value={form.safety_score}
                onChange={e => setForm(f => ({ ...f, safety_score: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Trip Completion %</label>
              <input className="input" type="number" min="0" max="100" value={form.trip_completion_pct}
                onChange={e => setForm(f => ({ ...f, trip_completion_pct: Number(e.target.value) }))} />
            </div>
            {editingId && (
              <div className="col-span-2">
                <label className="label">Status</label>
                <select className="select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update Driver' : 'Add Driver'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget._id)} title="Remove Driver"
        message={`Remove ${deleteTarget?.name} from the system?`} confirmLabel="Remove" danger />
    </div>
  );
}
