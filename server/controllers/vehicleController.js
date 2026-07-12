const { Vehicle } = require('../models');

const formatDuplicateError = (err) => {
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    if (field === 'registration_no') return 'Registration number already exists — use a unique plate number.';
    return `Duplicate value for ${field}.`;
  }
  return null;
};

// GET /api/vehicles
const getVehicles = async (req, res) => {
  try {
    const { type, status, search } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (search) filter.registration_no = { $regex: search, $options: 'i' };

    const vehicles = await Vehicle.find(filter).sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch vehicles.' });
  }
};

// GET /api/vehicles/available  — for dispatch dropdowns (excludes in_shop, retired, on_trip)
const getAvailableVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ status: 'available' }).sort({ name_model: 1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch available vehicles.' });
  }
};

// GET /api/vehicles/:id
const getVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch vehicle.' });
  }
};

// POST /api/vehicles
const createVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.create(req.body);
    res.status(201).json(vehicle);
  } catch (err) {
    const dupMsg = formatDuplicateError(err);
    if (dupMsg) return res.status(409).json({ message: dupMsg });
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map(e => e.message).join(', ') });
    }
    res.status(500).json({ message: 'Failed to create vehicle.' });
  }
};

// PUT /api/vehicles/:id
const updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    res.json(vehicle);
  } catch (err) {
    const dupMsg = formatDuplicateError(err);
    if (dupMsg) return res.status(409).json({ message: dupMsg });
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map(e => e.message).join(', ') });
    }
    res.status(500).json({ message: 'Failed to update vehicle.' });
  }
};

// DELETE /api/vehicles/:id
const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    if (vehicle.status === 'on_trip') {
      return res.status(400).json({ message: 'Cannot delete a vehicle that is currently on a trip.' });
    }
    await vehicle.deleteOne();
    res.json({ message: 'Vehicle deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete vehicle.' });
  }
};

module.exports = { getVehicles, getAvailableVehicles, getVehicle, createVehicle, updateVehicle, deleteVehicle };
