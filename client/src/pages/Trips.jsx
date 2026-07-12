import { useEffect, useState } from 'react';
import { tripsAPI, vehiclesAPI, driversAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import StatusPill from '../components/StatusPill';
import Modal, { ErrorCallout, ConfirmModal } from '../components/Modal';
import { CSVExportButton } from '../components/CSVExport';
import { Plus, CheckCircle, XCircle, AlertCircle, MapPin, Truck, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const emptyForm = {
  source: '', destination: '', vehicle_id: '', driver_id: '',
  cargo_weight_kg: '', planned_distance_km: '', notes: '', revenue: ''
};

const STATUSES = ['draft', 'dispatched', 'completed', 'cancelled'];

function LifecycleStepper({ status }) {
  const steps = ['draft', 'dispatched', 'completed'];
  const currentIdx = steps.indexOf(status === 'cancelled' ? 'draft' : status);
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const active = i <= currentIdx && status !== 'cancelled';
        const label = step.charAt(0).toUpperCase() + step.slice(1);
        return (
          <div key={step} className="flex items-center">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all
              ${active ? 'bg-primary-900/40 text-primary-300 border border-primary-700' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
              {label}
            </div>
            {i < steps.length - 1 && <div className={`w-3 h-px mx-0.5 ${active && i < currentIdx ? 'bg-primary-600' : 'bg-slate-700'}`} />}
          </div>
        );
      })}
      {status === 'cancelled' && <span className="ml-2 text-xs text-rose-400 font-medium">Cancelled</span>}
    </div>
  );
}

function CapacityBar({ cargo, max }) {
  if (!max || !cargo) return null;
  const pct = Math.min((cargo / max) * 100, 100);
  const exceeded = cargo > max;
  return (
    <div className="mt-3 space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>Vehicle Capacity: <strong>{max} kg</strong></span>
        <span>Cargo: <strong className={exceeded ? 'text-rose-400' : 'text-slate-200'}>{cargo} kg</strong></span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${exceeded ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }} />
      </div>
      {exceeded && (
        <div className="error-callout">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Vehicle Capacity: {max} kg / Cargo Weight: {cargo} kg / 
            <strong> Capacity exceeded by {cargo - max} kg — dispatch blocked</strong>
          </span>
        </div>
      )}
    </div>
  );
}

export default function Trips() {
  const { can } = useAuth();
  const canEdit = can('edit', 'trips');

  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completingTrip, setCompletingTrip] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [completeForm, setCompleteForm] = useState({ final_odometer: '', fuel_consumed: '', fuel_cost: '', revenue: '' });
  const [errors, setErrors] = useState({});
  const [completeError, setCompleteError] = useState('');
  const [saving, setSaving] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);

  const selectedVehicle = vehicles.find(v => v._id === form.vehicle_id);
  const cargoNum = Number(form.cargo_weight_kg);
  const capacityExceeded = selectedVehicle && cargoNum > selectedVehicle.max_capacity_kg;

  const load = async () => {
    setLoading(true);
    try {
      if (canEdit) {
        const [tripRes, vehRes, drvRes] = await Promise.all([
          tripsAPI.getAll({ status: statusFilter }),
          vehiclesAPI.getAvailable(),
          driversAPI.getAvailable()
        ]);
        setTrips(tripRes.data);
        setVehicles(vehRes.data);
        setDrivers(drvRes.data);
      } else {
        const tripRes = await tripsAPI.getAll({ status: statusFilter });
        setTrips(tripRes.data);
      }
    } catch (e) { toast.error('Failed to load trips.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleCreate = async () => {
    const newErrors = {};
    if (!form.source?.trim()) newErrors.source = 'Origin / Source is required.';
    if (!form.destination?.trim()) newErrors.destination = 'Destination is required.';
    if (!form.vehicle_id) newErrors.vehicle_id = 'Vehicle assignment is required.';
    if (!form.driver_id) newErrors.driver_id = 'Driver assignment is required.';

    const cargo = Number(form.cargo_weight_kg);
    if (form.cargo_weight_kg === '' || isNaN(cargo)) newErrors.cargo_weight_kg = 'Cargo weight is required.';
    else if (cargo <= 0) newErrors.cargo_weight_kg = 'Cargo weight must be greater than zero.';

    const dist = Number(form.planned_distance_km);
    if (form.planned_distance_km === '' || isNaN(dist)) newErrors.planned_distance_km = 'Planned distance is required.';
    else if (dist < 0) newErrors.planned_distance_km = 'Planned distance cannot be negative.';

    const rev = Number(form.revenue);
    if (form.revenue !== '' && (isNaN(rev) || rev < 0)) newErrors.revenue = 'Revenue cannot be negative.';

    if (capacityExceeded) {
      newErrors.cargo_weight_kg = `Cargo weight exceeds vehicle capacity of ${selectedVehicle.max_capacity_kg} kg.`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true); setErrors({});
    try {
      await tripsAPI.create({ ...form, cargo_weight_kg: Number(form.cargo_weight_kg), planned_distance_km: Number(form.planned_distance_km) || 0, revenue: Number(form.revenue) || 0 });
      toast.success('Trip created as draft.');
      setCreateOpen(false); setForm(emptyForm); load();
    } catch (err) {
      setErrors({ global: err.response?.data?.message || 'Failed to create trip.' });
    } finally { setSaving(false); }
  };

  const handleDispatch = async (tripId) => {
    try {
      await tripsAPI.dispatch(tripId);
      toast.success('Trip dispatched — vehicle and driver status updated.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Dispatch failed.');
    }
  };

  const handleComplete = async () => {
    if (!completeForm.final_odometer || !completeForm.fuel_consumed) {
      setCompleteError('Final odometer and fuel consumed are required.'); return;
    }
    setSaving(true); setCompleteError('');
    try {
      await tripsAPI.complete(completingTrip._id, {
        final_odometer: Number(completeForm.final_odometer),
        fuel_consumed: Number(completeForm.fuel_consumed),
        fuel_cost: Number(completeForm.fuel_cost) || 0,
        revenue: Number(completeForm.revenue) || completingTrip.revenue
      });
      toast.success('Trip completed — FuelLog auto-created, vehicle and driver now available.');
      setCompleteOpen(false); setCompletingTrip(null); load();
    } catch (err) {
      setCompleteError(err.response?.data?.message || 'Failed to complete trip.');
    } finally { setSaving(false); }
  };

  const handleCancel = async (tripId) => {
    try {
      await tripsAPI.cancel(tripId);
      toast.success('Trip cancelled — vehicle and driver restored to available.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancel failed.');
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

  const csvData = trips.map(t => ({
    Source: t.source, Destination: t.destination,
    Vehicle: t.vehicle_id?.registration_no, Driver: t.driver_id?.name,
    'Cargo (kg)': t.cargo_weight_kg, 'Distance (km)': t.planned_distance_km,
    Status: t.status, Created: fmtDate(t.created_at)
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trip Dispatcher</h1>
          <p className="text-slate-400 text-sm mt-1">{trips.length} trips • Live Board</p>
        </div>
        <div className="flex gap-2">
          <CSVExportButton data={csvData} filename="trips" />
          {canEdit && (
            <button className="btn-primary" onClick={() => { setCreateOpen(true); setForm(emptyForm); setErrors({}); }}>
              <Plus className="w-4 h-4" /> Create Trip
            </button>
          )}
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['', ...STATUSES].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'}`}>
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Trip Live Board */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card space-y-3">
                <div className="flex justify-between">
                  <div className="flex gap-2">
                    {Array.from({ length: 4 }).map((_, j) => <div key={j} className="w-16 h-5 rounded-full skeleton" />)}
                  </div>
                  <div className="w-24 h-7 rounded-lg skeleton" />
                </div>
                <div className="w-3/4 h-5 rounded skeleton" />
                <div className="flex gap-4">
                  <div className="w-20 h-3 rounded skeleton" />
                  <div className="w-20 h-3 rounded skeleton" />
                  <div className="w-16 h-3 rounded skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="card text-center py-12">
            <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500">No trips found. {canEdit && 'Create your first trip above.'}</p>
          </div>
        ) : trips.map(trip => (
          <div key={trip._id} className="card" style={{ transition: 'transform 200ms ease, box-shadow 200ms ease' }}
               onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.4)'; }}
               onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <LifecycleStepper status={trip.status} />
                </div>
                <h3 className="font-semibold text-white text-base">
                  {trip.source} <span className="text-slate-500">→</span> {trip.destination}
                </h3>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {trip.vehicle_id?.registration_no} ({trip.vehicle_id?.name_model})</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {trip.driver_id?.name}</span>
                  <span>📦 {trip.cargo_weight_kg} kg</span>
                  {trip.planned_distance_km > 0 && <span>📍 {trip.planned_distance_km} km</span>}
                  {trip.notes && <span className="text-slate-500 italic">"{trip.notes}"</span>}
                </div>
                <p className="text-xs text-slate-600 mt-1">Created: {fmtDate(trip.created_at)}</p>
              </div>

              {/* Actions */}
              {canEdit && (
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {trip.status === 'draft' && (
                    <>
                      <button className="btn-primary text-xs px-3 py-1.5" onClick={() => handleDispatch(trip._id)}>
                        <CheckCircle className="w-3.5 h-3.5" /> Dispatch
                      </button>
                      <button className="btn-danger text-xs px-3 py-1.5" onClick={() => setCancelTarget(trip)}>
                        <XCircle className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </>
                  )}
                  {trip.status === 'dispatched' && (
                    <>
                      <button className="btn-success text-xs px-3 py-1.5" onClick={() => {
                        setCompletingTrip(trip);
                        setCompleteForm({ final_odometer: trip.vehicle_id?.odometer || '', fuel_consumed: '', fuel_cost: '', revenue: trip.revenue });
                        setCompleteError(''); setCompleteOpen(true);
                      }}>
                        <CheckCircle className="w-3.5 h-3.5" /> Complete
                      </button>
                      <button className="btn-danger text-xs px-3 py-1.5" onClick={() => setCancelTarget(trip)}>
                        <XCircle className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Trip Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create New Trip" size="lg">
        <div className="space-y-4">
          <ErrorCallout message={errors.global} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Origin / Source *</label>
              <input className="input" placeholder="Mumbai Warehouse" value={form.source}
                onChange={e => setForm(f => ({ ...f, source: e.target.value }))} />
              {errors.source && <p className="text-rose-400 text-xs mt-1">{errors.source}</p>}
            </div>
            <div>
              <label className="label">Destination *</label>
              <input className="input" placeholder="Pune Distribution Centre" value={form.destination}
                onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} />
              {errors.destination && <p className="text-rose-400 text-xs mt-1">{errors.destination}</p>}
            </div>
            <div>
              <label className="label">Vehicle * (available only)</label>
              <select className="select" value={form.vehicle_id}
                onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))}>
                <option value="">Select vehicle…</option>
                {vehicles.map(v => (
                  <option key={v._id} value={v._id}>
                    {v.registration_no} — {v.name_model} ({v.max_capacity_kg} kg max)
                  </option>
                ))}
              </select>
              {errors.vehicle_id && <p className="text-rose-400 text-xs mt-1">{errors.vehicle_id}</p>}
              {vehicles.length === 0 && <p className="text-xs text-amber-400 mt-1">No available vehicles right now.</p>}
            </div>
            <div>
              <label className="label">Driver * (available, valid license only)</label>
              <select className="select" value={form.driver_id}
                onChange={e => setForm(f => ({ ...f, driver_id: e.target.value }))}>
                <option value="">Select driver…</option>
                {drivers.map(d => <option key={d._id} value={d._id}>{d.name} — {d.license_no}</option>)}
              </select>
              {errors.driver_id && <p className="text-rose-400 text-xs mt-1">{errors.driver_id}</p>}
              {drivers.length === 0 && <p className="text-xs text-amber-400 mt-1">No eligible drivers available.</p>}
            </div>
            <div>
              <label className="label">Cargo Weight (kg) *</label>
              <input className="input" type="number" placeholder="450" value={form.cargo_weight_kg}
                onChange={e => setForm(f => ({ ...f, cargo_weight_kg: e.target.value }))} />
              {errors.cargo_weight_kg && <p className="text-rose-400 text-xs mt-1">{errors.cargo_weight_kg}</p>}
            </div>
            <div>
              <label className="label">Planned Distance (km) *</label>
              <input className="input" type="number" placeholder="148" value={form.planned_distance_km}
                onChange={e => setForm(f => ({ ...f, planned_distance_km: e.target.value }))} />
              {errors.planned_distance_km && <p className="text-rose-400 text-xs mt-1">{errors.planned_distance_km}</p>}
            </div>
            <div>
              <label className="label">Revenue (₹)</label>
              <input className="input" type="number" placeholder="12000" value={form.revenue}
                onChange={e => setForm(f => ({ ...f, revenue: e.target.value }))} />
              {errors.revenue && <p className="text-rose-400 text-xs mt-1">{errors.revenue}</p>}
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" placeholder="Priority delivery…" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          {/* Live capacity validation */}
          {form.vehicle_id && form.cargo_weight_kg && !errors.cargo_weight_kg && (
            <CapacityBar cargo={cargoNum} max={selectedVehicle?.max_capacity_kg} />
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleCreate} disabled={saving || capacityExceeded}>
              {saving ? 'Creating…' : 'Create Trip'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Complete Trip Modal */}
      <Modal isOpen={completeOpen} onClose={() => setCompleteOpen(false)} title="Complete Trip">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Completing: <strong className="text-white">{completingTrip?.source} → {completingTrip?.destination}</strong>
          </p>
          <p className="text-xs text-slate-500">A FuelLog entry will be created automatically from the values below.</p>
          <ErrorCallout message={completeError} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Final Odometer (km) *</label>
              <input className="input" type="number" placeholder="45650" value={completeForm.final_odometer}
                onChange={e => setCompleteForm(f => ({ ...f, final_odometer: e.target.value }))} />
            </div>
            <div>
              <label className="label">Fuel Consumed (liters) *</label>
              <input className="input" type="number" placeholder="38.5" value={completeForm.fuel_consumed}
                onChange={e => setCompleteForm(f => ({ ...f, fuel_consumed: e.target.value }))} />
            </div>
            <div>
              <label className="label">Fuel Cost (₹)</label>
              <input className="input" type="number" placeholder="3465" value={completeForm.fuel_cost}
                onChange={e => setCompleteForm(f => ({ ...f, fuel_cost: e.target.value }))} />
            </div>
            <div>
              <label className="label">Revenue (₹)</label>
              <input className="input" type="number" value={completeForm.revenue}
                onChange={e => setCompleteForm(f => ({ ...f, revenue: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setCompleteOpen(false)}>Cancel</button>
            <button className="btn-success" onClick={handleComplete} disabled={saving}>
              {saving ? 'Completing…' : '✓ Complete Trip'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Cancel confirm */}
      <ConfirmModal isOpen={!!cancelTarget} onClose={() => setCancelTarget(null)}
        onConfirm={() => handleCancel(cancelTarget._id)} title="Cancel Trip"
        message={`Cancel the trip from ${cancelTarget?.source} to ${cancelTarget?.destination}? Vehicle and driver will be restored to available.`}
        confirmLabel="Cancel Trip" danger />
    </div>
  );
}
