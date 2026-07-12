import { useEffect, useState } from 'react';
import { vehiclesAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import StatusPill from '../components/StatusPill';
import Modal, { ErrorCallout, ConfirmModal } from '../components/Modal';
import { CSVExportButton } from '../components/CSVExport';
import { Plus, Pencil, Trash2, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const VEHICLE_TYPES = ['van', 'truck', 'mini'];
const VEHICLE_STATUSES = ['available', 'on_trip', 'in_shop', 'retired'];

const emptyForm = {
  registration_no: '', name_model: '', type: 'van',
  max_capacity_kg: '', odometer: '', acquisition_cost: '', status: 'available'
};

export default function Fleet() {
  const { can } = useAuth();
  const canEdit = can('edit', 'fleet');

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', status: '', search: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await vehiclesAPI.getAll(filters);
      setVehicles(res.data);
    } catch (e) {
      toast.error('Failed to load vehicles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filters]);

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setErrors({}); setModalOpen(true); };
  const openEdit = (v) => {
    setForm({
      registration_no: v.registration_no, name_model: v.name_model, type: v.type,
      max_capacity_kg: v.max_capacity_kg, odometer: v.odometer,
      acquisition_cost: v.acquisition_cost, status: v.status
    });
    setEditingId(v._id);
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async () => {
    const newErrors = {};
    if (!form.registration_no?.trim()) newErrors.registration_no = 'Registration number is required.';
    if (!form.name_model?.trim()) newErrors.name_model = 'Model name is required.';
    if (!form.type) newErrors.type = 'Vehicle type is required.';
    
    const cap = Number(form.max_capacity_kg);
    if (form.max_capacity_kg === '' || isNaN(cap)) newErrors.max_capacity_kg = 'Max Capacity is required.';
    else if (cap <= 0) newErrors.max_capacity_kg = 'Max Capacity must be greater than zero.';

    const odo = Number(form.odometer);
    if (form.odometer === '' || isNaN(odo)) newErrors.odometer = 'Odometer is required.';
    else if (odo < 0) newErrors.odometer = 'Odometer cannot be negative.';

    const cost = Number(form.acquisition_cost);
    if (form.acquisition_cost === '' || isNaN(cost)) newErrors.acquisition_cost = 'Acquisition cost is required.';
    else if (cost <= 0) newErrors.acquisition_cost = 'Acquisition cost must be greater than zero.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      if (editingId) {
        await vehiclesAPI.update(editingId, form);
        toast.success('Vehicle updated.');
      } else {
        await vehiclesAPI.create(form);
        toast.success('Vehicle added to fleet.');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setErrors({ global: err.response?.data?.message || 'Failed to save vehicle.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await vehiclesAPI.delete(id);
      toast.success('Vehicle removed.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete vehicle.');
    }
  };

  const csvData = vehicles.map(v => ({
    'Registration No': v.registration_no,
    'Model': v.name_model,
    'Type': v.type,
    'Max Capacity (kg)': v.max_capacity_kg,
    'Odometer (km)': v.odometer,
    'Acquisition Cost': v.acquisition_cost,
    'Status': v.status
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fleet Registry</h1>
          <p className="text-slate-400 text-sm mt-1">{vehicles.length} vehicles in fleet</p>
        </div>
        <div className="flex gap-2">
          <CSVExportButton data={csvData} filename="fleet_registry" />
          {canEdit && (
            <button className="btn-primary" onClick={openAdd}>
              <Plus className="w-4 h-4" /> Add Vehicle
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-48">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              className="input py-1.5 text-sm"
              placeholder="Search by registration no…"
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            />
          </div>
          <select className="select py-1.5 text-sm w-36" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
            <option value="">All Types</option>
            {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <select className="select py-1.5 text-sm w-40" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Statuses</option>
            {VEHICLE_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <button className="btn-secondary text-sm py-1.5" onClick={() => setFilters({ type: '', status: '', search: '' })}>
            <Filter className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-700 bg-slate-800/50">
              <tr>
                <th className="table-header">Registration</th>
                <th className="table-header">Model</th>
                <th className="table-header">Type</th>
                <th className="table-header">Max Capacity</th>
                <th className="table-header">Odometer</th>
                <th className="table-header">Acq. Cost</th>
                <th className="table-header">Status</th>
                {canEdit && <th className="table-header">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={8} className="table-cell text-center text-slate-500 py-12">Loading vehicles…</td></tr>
              ) : vehicles.length === 0 ? (
                <tr><td colSpan={8} className="table-cell text-center text-slate-500 py-12">No vehicles found. {canEdit && 'Click "Add Vehicle" to get started.'}</td></tr>
              ) : vehicles.map(v => (
                <tr key={v._id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="table-cell font-mono font-medium text-slate-100">{v.registration_no}</td>
                  <td className="table-cell">{v.name_model}</td>
                  <td className="table-cell capitalize">{v.type}</td>
                  <td className="table-cell">{v.max_capacity_kg?.toLocaleString()} kg</td>
                  <td className="table-cell">{v.odometer?.toLocaleString()} km</td>
                  <td className="table-cell">₹{v.acquisition_cost?.toLocaleString()}</td>
                  <td className="table-cell"><StatusPill status={v.status} /></td>
                  {canEdit && (
                    <td className="table-cell">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(v)} className="text-slate-400 hover:text-white transition-colors p-1">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(v)} className="text-slate-400 hover:text-rose-400 transition-colors p-1">
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

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Vehicle' : 'Add New Vehicle'}>
        <div className="space-y-4">
          <ErrorCallout message={errors.global} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Registration No. *</label>
              <input className="input uppercase" placeholder="VAN-05" value={form.registration_no}
                onChange={e => setForm(f => ({ ...f, registration_no: e.target.value }))} />
              {errors.registration_no && <p className="text-rose-400 text-xs mt-1">{errors.registration_no}</p>}
            </div>
            <div>
              <label className="label">Model Name *</label>
              <input className="input" placeholder="Toyota HiAce" value={form.name_model}
                onChange={e => setForm(f => ({ ...f, name_model: e.target.value }))} />
              {errors.name_model && <p className="text-rose-400 text-xs mt-1">{errors.name_model}</p>}
            </div>
            <div>
              <label className="label">Type *</label>
              <select className="select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              {errors.type && <p className="text-rose-400 text-xs mt-1">{errors.type}</p>}
            </div>
            <div>
              <label className="label">Max Capacity (kg) *</label>
              <input className="input" type="number" placeholder="600" value={form.max_capacity_kg}
                onChange={e => setForm(f => ({ ...f, max_capacity_kg: e.target.value }))} />
              {errors.max_capacity_kg && <p className="text-rose-400 text-xs mt-1">{errors.max_capacity_kg}</p>}
            </div>
            <div>
              <label className="label">Odometer (km) *</label>
              <input className="input" type="number" placeholder="0" value={form.odometer}
                onChange={e => setForm(f => ({ ...f, odometer: e.target.value }))} />
              {errors.odometer && <p className="text-rose-400 text-xs mt-1">{errors.odometer}</p>}
            </div>
            <div>
              <label className="label">Acquisition Cost (₹) *</label>
              <input className="input" type="number" placeholder="850000" value={form.acquisition_cost}
                onChange={e => setForm(f => ({ ...f, acquisition_cost: e.target.value }))} />
              {errors.acquisition_cost && <p className="text-rose-400 text-xs mt-1">{errors.acquisition_cost}</p>}
            </div>
            <div className="col-span-2">
              <label className="label">Status *</label>
              <select className="select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {VEHICLE_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
              {errors.status && <p className="text-rose-400 text-xs mt-1">{errors.status}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update Vehicle' : 'Add Vehicle'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget._id)}
        title="Remove Vehicle"
        message={`Remove ${deleteTarget?.registration_no} (${deleteTarget?.name_model}) from fleet? This cannot be undone.`}
        confirmLabel="Remove"
        danger
      />
    </div>
  );
}
