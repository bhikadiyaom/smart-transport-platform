const { Driver } = require('../models');

const formatDuplicateError = (err) => {
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    if (field === 'license_no') return 'License number already exists — each driver must have a unique license.';
    return `Duplicate value for ${field}.`;
  }
  return null;
};

// GET /api/drivers
const getDrivers = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const drivers = await Driver.find(filter).sort({ createdAt: -1 });
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch drivers.' });
  }
};

// GET /api/drivers/available — for dispatch dropdowns (excludes suspended, on_trip, expired license)
const getAvailableDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find({
      status: 'available',
      license_expiry: { $gt: new Date() }
    }).sort({ name: 1 });
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch available drivers.' });
  }
};

// GET /api/drivers/:id
const getDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found.' });
    res.json(driver);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch driver.' });
  }
};

// POST /api/drivers
const createDriver = async (req, res) => {
  try {
    const driver = await Driver.create(req.body);
    res.status(201).json(driver);
  } catch (err) {
    const dupMsg = formatDuplicateError(err);
    if (dupMsg) return res.status(409).json({ message: dupMsg });
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map(e => e.message).join(', ') });
    }
    res.status(500).json({ message: 'Failed to create driver.' });
  }
};

// PUT /api/drivers/:id
const updateDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!driver) return res.status(404).json({ message: 'Driver not found.' });
    res.json(driver);
  } catch (err) {
    const dupMsg = formatDuplicateError(err);
    if (dupMsg) return res.status(409).json({ message: dupMsg });
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map(e => e.message).join(', ') });
    }
    res.status(500).json({ message: 'Failed to update driver.' });
  }
};

// DELETE /api/drivers/:id
const deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found.' });
    if (driver.status === 'on_trip') {
      return res.status(400).json({ message: 'Cannot delete a driver currently on a trip.' });
    }
    await driver.deleteOne();
    res.json({ message: 'Driver deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete driver.' });
  }
};

// PATCH /api/drivers/:id/status
const updateDriverStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['available', 'off_duty', 'suspended'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${allowed.join(', ')}` });
    }
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found.' });
    if (driver.status === 'on_trip') {
      return res.status(400).json({ message: 'Cannot change status of a driver currently on a trip.' });
    }
    driver.status = status;
    await driver.save();
    res.json(driver);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update driver status.' });
  }
};

module.exports = { getDrivers, getAvailableDrivers, getDriver, createDriver, updateDriver, deleteDriver, updateDriverStatus };
