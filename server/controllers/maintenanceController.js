const mongoose = require('mongoose');
const { MaintenanceLog, Vehicle } = require('../models');

// ─── GET /api/maintenance ─────────────────────────────────────────────────────
const getMaintenanceLogs = async (req, res) => {
  try {
    const { vehicle_id, status } = req.query;
    const filter = {};
    if (vehicle_id) filter.vehicle_id = vehicle_id;
    if (status) filter.status = status;

    const logs = await MaintenanceLog.find(filter)
      .populate('vehicle_id', 'registration_no name_model type')
      .sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch maintenance logs.' });
  }
};

// ─── POST /api/maintenance — TRANSACTIONAL ────────────────────────────────────
const createMaintenanceLog = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { vehicle_id, service_type, cost, date, notes } = req.body;

    const vehicle = await Vehicle.findById(vehicle_id).session(session);
    if (!vehicle) throw new Error('Vehicle not found.');
    if (vehicle.status === 'on_trip') {
      throw new Error(`Vehicle (${vehicle.registration_no}) is currently on a trip — cannot send to shop while in use.`);
    }
    if (vehicle.status === 'retired') {
      throw new Error(`Vehicle (${vehicle.registration_no}) is retired — cannot create maintenance log.`);
    }

    const [log] = await MaintenanceLog.create([{
      vehicle_id, service_type, cost: cost || 0,
      date: date || new Date(), notes, status: 'in_shop'
    }], { session });

    vehicle.status = 'in_shop';
    await vehicle.save({ session });

    await session.commitTransaction();

    const populated = await MaintenanceLog.findById(log._id)
      .populate('vehicle_id', 'registration_no name_model type');

    res.status(201).json(populated);
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

// ─── PATCH /api/maintenance/:id/close — TRANSACTIONAL ────────────────────────
const closeMaintenanceLog = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const log = await MaintenanceLog.findById(req.params.id).session(session);
    if (!log) throw new Error('Maintenance log not found.');
    if (log.status === 'completed') throw new Error('Maintenance record is already completed.');

    const vehicle = await Vehicle.findById(log.vehicle_id).session(session);
    if (!vehicle) throw new Error('Vehicle not found.');

    log.status = 'completed';
    if (req.body.cost !== undefined) log.cost = req.body.cost;

    // Business rule: retired vehicles stay retired
    if (vehicle.status !== 'retired') {
      vehicle.status = 'available';
    }

    await log.save({ session });
    await vehicle.save({ session });

    await session.commitTransaction();

    const populated = await MaintenanceLog.findById(log._id)
      .populate('vehicle_id', 'registration_no name_model type');

    res.json(populated);
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

// ─── PUT /api/maintenance/:id ─────────────────────────────────────────────────
const updateMaintenanceLog = async (req, res) => {
  try {
    const log = await MaintenanceLog.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('vehicle_id', 'registration_no name_model type');
    if (!log) return res.status(404).json({ message: 'Maintenance log not found.' });
    res.json(log);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update maintenance log.' });
  }
};

// ─── DELETE /api/maintenance/:id ─────────────────────────────────────────────
const deleteMaintenanceLog = async (req, res) => {
  try {
    const log = await MaintenanceLog.findByIdAndDelete(req.params.id);
    if (!log) return res.status(404).json({ message: 'Maintenance log not found.' });
    res.json({ message: 'Maintenance log deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete maintenance log.' });
  }
};

module.exports = { getMaintenanceLogs, createMaintenanceLog, closeMaintenanceLog, updateMaintenanceLog, deleteMaintenanceLog };
