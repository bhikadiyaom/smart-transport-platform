const mongoose = require('mongoose');
const { Trip, Vehicle, Driver, FuelLog } = require('../models');

// ─── Helper: format capacity error ────────────────────────────────────────────
const capacityError = (cargo, max) =>
  `Cargo weight (${cargo} kg) exceeds vehicle capacity (${max} kg) — dispatch blocked. Exceeded by ${cargo - max} kg.`;

// ─── GET /api/trips ───────────────────────────────────────────────────────────
const getTrips = async (req, res) => {
  try {
    const { status, vehicle_id, driver_id } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (vehicle_id) filter.vehicle_id = vehicle_id;
    if (driver_id) filter.driver_id = driver_id;

    const trips = await Trip.find(filter)
      .populate('vehicle_id', 'registration_no name_model type')
      .populate('driver_id', 'name license_no')
      .sort({ created_at: -1 });
    res.json(trips);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch trips.' });
  }
};

// ─── GET /api/trips/:id ───────────────────────────────────────────────────────
const getTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('vehicle_id')
      .populate('driver_id');
    if (!trip) return res.status(404).json({ message: 'Trip not found.' });
    res.json(trip);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch trip.' });
  }
};

// ─── POST /api/trips — create a draft trip ────────────────────────────────────
const createTrip = async (req, res) => {
  try {
    const { source, destination, vehicle_id, driver_id, cargo_weight_kg, planned_distance_km, notes, revenue } = req.body;

    // Pre-validate vehicle availability
    const vehicle = await Vehicle.findById(vehicle_id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    if (vehicle.status !== 'available') {
      return res.status(400).json({ message: `Vehicle is currently ${vehicle.status} and cannot be assigned.` });
    }
    if (['in_shop', 'retired'].includes(vehicle.status)) {
      return res.status(400).json({ message: `Vehicle is ${vehicle.status} and cannot be dispatched.` });
    }

    // Pre-validate driver availability
    const driver = await Driver.findById(driver_id);
    if (!driver) return res.status(404).json({ message: 'Driver not found.' });
    if (driver.status !== 'available') {
      return res.status(400).json({ message: `Driver is currently ${driver.status} and cannot be assigned.` });
    }
    if (driver.license_expiry < new Date()) {
      return res.status(400).json({ message: `Driver's license expired on ${new Date(driver.license_expiry).toLocaleDateString()} — assign a different driver.` });
    }

    // Capacity check
    if (cargo_weight_kg > vehicle.max_capacity_kg) {
      return res.status(400).json({ message: capacityError(cargo_weight_kg, vehicle.max_capacity_kg) });
    }

    const trip = await Trip.create({
      source, destination, vehicle_id, driver_id,
      cargo_weight_kg, planned_distance_km: planned_distance_km || 0,
      notes, revenue: revenue || 0,
      status: 'draft'
    });

    const populated = await Trip.findById(trip._id)
      .populate('vehicle_id', 'registration_no name_model type')
      .populate('driver_id', 'name license_no');

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create trip.' });
  }
};

// ─── PATCH /api/trips/:id/dispatch — TRANSACTIONAL ───────────────────────────
const dispatchTrip = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const trip = await Trip.findById(req.params.id).session(session);
    if (!trip) throw new Error('Trip not found.');
    if (trip.status !== 'draft') throw new Error(`Trip is already ${trip.status} — cannot dispatch.`);

    const vehicle = await Vehicle.findById(trip.vehicle_id).session(session);
    if (!vehicle) throw new Error('Assigned vehicle not found.');
    if (vehicle.status !== 'available') {
      throw new Error(`Vehicle (${vehicle.registration_no}) is currently ${vehicle.status} — no longer available.`);
    }
    if (['in_shop', 'retired'].includes(vehicle.status)) {
      throw new Error(`Vehicle (${vehicle.registration_no}) is ${vehicle.status} and cannot be dispatched.`);
    }

    const driver = await Driver.findById(trip.driver_id).session(session);
    if (!driver) throw new Error('Assigned driver not found.');
    if (driver.status !== 'available') {
      throw new Error(`Driver (${driver.name}) is currently ${driver.status} — no longer available.`);
    }
    if (driver.license_expiry < new Date()) {
      throw new Error(`Driver (${driver.name})'s license expired on ${new Date(driver.license_expiry).toLocaleDateString()} — dispatch blocked.`);
    }

    // Capacity check (re-validate at dispatch time)
    if (trip.cargo_weight_kg > vehicle.max_capacity_kg) {
      throw new Error(capacityError(trip.cargo_weight_kg, vehicle.max_capacity_kg));
    }

    trip.status = 'dispatched';
    vehicle.status = 'on_trip';
    driver.status = 'on_trip';

    await trip.save({ session });
    await vehicle.save({ session });
    await driver.save({ session });

    await session.commitTransaction();

    const populated = await Trip.findById(trip._id)
      .populate('vehicle_id', 'registration_no name_model type')
      .populate('driver_id', 'name license_no');

    res.json(populated);
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

// ─── PATCH /api/trips/:id/complete — TRANSACTIONAL ───────────────────────────
const completeTrip = async (req, res) => {
  const { final_odometer, fuel_consumed, fuel_cost, revenue } = req.body;

  if (final_odometer === undefined || fuel_consumed === undefined) {
    return res.status(400).json({ message: 'Final odometer reading and fuel consumed are required to complete a trip.' });
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const trip = await Trip.findById(req.params.id).session(session);
    if (!trip) throw new Error('Trip not found.');
    if (trip.status !== 'dispatched') throw new Error(`Trip is ${trip.status} — only dispatched trips can be completed.`);

    const vehicle = await Vehicle.findById(trip.vehicle_id).session(session);
    if (!vehicle) throw new Error('Assigned vehicle not found.');

    const driver = await Driver.findById(trip.driver_id).session(session);
    if (!driver) throw new Error('Assigned driver not found.');

    // Validate odometer
    if (final_odometer < vehicle.odometer) {
      throw new Error(`Final odometer (${final_odometer} km) cannot be less than current odometer (${vehicle.odometer} km).`);
    }

    trip.status = 'completed';
    trip.completed_at = new Date();
    trip.final_odometer = final_odometer;
    trip.fuel_consumed = fuel_consumed;
    if (revenue !== undefined) trip.revenue = revenue;

    vehicle.status = 'available';
    vehicle.odometer = final_odometer;

    driver.status = 'available';
    // Update trip_completion_pct
    const totalTrips = await Trip.countDocuments({ driver_id: driver._id, status: { $in: ['completed', 'cancelled'] } });
    const completedTrips = await Trip.countDocuments({ driver_id: driver._id, status: 'completed' });
    driver.trip_completion_pct = totalTrips > 0 ? Math.round(((completedTrips + 1) / (totalTrips + 1)) * 100) : 100;

    await trip.save({ session });
    await vehicle.save({ session });
    await driver.save({ session });

    // Auto-create FuelLog inside the transaction
    await FuelLog.create([{
      vehicle_id: vehicle._id,
      trip_id: trip._id,
      date: new Date(),
      liters: fuel_consumed,
      cost: fuel_cost || 0
    }], { session });

    await session.commitTransaction();

    const populated = await Trip.findById(trip._id)
      .populate('vehicle_id', 'registration_no name_model type')
      .populate('driver_id', 'name license_no');

    res.json(populated);
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

// ─── PATCH /api/trips/:id/cancel — TRANSACTIONAL ─────────────────────────────
const cancelTrip = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const trip = await Trip.findById(req.params.id).session(session);
    if (!trip) throw new Error('Trip not found.');
    if (!['draft', 'dispatched'].includes(trip.status)) {
      throw new Error(`Trip is ${trip.status} — only draft or dispatched trips can be cancelled.`);
    }

    const vehicle = await Vehicle.findById(trip.vehicle_id).session(session);
    const driver = await Driver.findById(trip.driver_id).session(session);

    trip.status = 'cancelled';

    if (vehicle && vehicle.status === 'on_trip') vehicle.status = 'available';
    if (driver && driver.status === 'on_trip') driver.status = 'available';

    await trip.save({ session });
    if (vehicle) await vehicle.save({ session });
    if (driver) await driver.save({ session });

    await session.commitTransaction();

    const populated = await Trip.findById(trip._id)
      .populate('vehicle_id', 'registration_no name_model type')
      .populate('driver_id', 'name license_no');

    res.json(populated);
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

// ─── DELETE /api/trips/:id ────────────────────────────────────────────────────
const deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found.' });
    if (trip.status === 'dispatched') {
      return res.status(400).json({ message: 'Cannot delete a dispatched trip — cancel it first.' });
    }
    await trip.deleteOne();
    res.json({ message: 'Trip deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete trip.' });
  }
};

module.exports = { getTrips, getTrip, createTrip, dispatchTrip, completeTrip, cancelTrip, deleteTrip };
