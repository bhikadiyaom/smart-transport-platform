const { FuelLog, Expense, Vehicle, Trip } = require('../models');

// ─── FUEL LOGS ────────────────────────────────────────────────────────────────
const getFuelLogs = async (req, res) => {
  try {
    const { vehicle_id, trip_id } = req.query;
    const filter = {};
    if (vehicle_id) filter.vehicle_id = vehicle_id;
    if (trip_id) filter.trip_id = trip_id;

    const logs = await FuelLog.find(filter)
      .populate('vehicle_id', 'registration_no name_model')
      .populate('trip_id', 'source destination')
      .sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch fuel logs.' });
  }
};

const createFuelLog = async (req, res) => {
  try {
    const log = await FuelLog.create(req.body);
    const populated = await FuelLog.findById(log._id)
      .populate('vehicle_id', 'registration_no name_model')
      .populate('trip_id', 'source destination');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create fuel log.' });
  }
};

const updateFuelLog = async (req, res) => {
  try {
    const log = await FuelLog.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('vehicle_id', 'registration_no name_model')
      .populate('trip_id', 'source destination');
    if (!log) return res.status(404).json({ message: 'Fuel log not found.' });
    res.json(log);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update fuel log.' });
  }
};

const deleteFuelLog = async (req, res) => {
  try {
    const log = await FuelLog.findByIdAndDelete(req.params.id);
    if (!log) return res.status(404).json({ message: 'Fuel log not found.' });
    res.json({ message: 'Fuel log deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete fuel log.' });
  }
};

// ─── EXPENSES ─────────────────────────────────────────────────────────────────
const getExpenses = async (req, res) => {
  try {
    const { vehicle_id, trip_id } = req.query;
    const filter = {};
    if (vehicle_id) filter.vehicle_id = vehicle_id;
    if (trip_id) filter.trip_id = trip_id;

    const expenses = await Expense.find(filter)
      .populate('vehicle_id', 'registration_no name_model')
      .populate('trip_id', 'source destination')
      .sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch expenses.' });
  }
};

const createExpense = async (req, res) => {
  try {
    const expense = await Expense.create(req.body);
    const populated = await Expense.findById(expense._id)
      .populate('vehicle_id', 'registration_no name_model')
      .populate('trip_id', 'source destination');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create expense.' });
  }
};

const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('vehicle_id', 'registration_no name_model')
      .populate('trip_id', 'source destination');
    if (!expense) return res.status(404).json({ message: 'Expense not found.' });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update expense.' });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found.' });
    res.json({ message: 'Expense deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete expense.' });
  }
};

// ─── Operational Cost per vehicle (live computed) ─────────────────────────────
const getOperationalCost = async (req, res) => {
  try {
    const { vehicle_id } = req.params;
    const [fuelResult, maintenanceResult] = await Promise.all([
      FuelLog.aggregate([
        { $match: { vehicle_id: require('mongoose').Types.ObjectId.createFromHexString(vehicle_id) } },
        { $group: { _id: null, total: { $sum: '$cost' } } }
      ]),
      require('../models').MaintenanceLog.aggregate([
        { $match: { vehicle_id: require('mongoose').Types.ObjectId.createFromHexString(vehicle_id) } },
        { $group: { _id: null, total: { $sum: '$cost' } } }
      ])
    ]);

    const fuelCost = fuelResult[0]?.total || 0;
    const maintenanceCost = maintenanceResult[0]?.total || 0;
    const total = fuelCost + maintenanceCost;

    res.json({ vehicle_id, fuel_cost: fuelCost, maintenance_cost: maintenanceCost, total });
  } catch (err) {
    res.status(500).json({ message: 'Failed to compute operational cost.' });
  }
};

module.exports = {
  getFuelLogs, createFuelLog, updateFuelLog, deleteFuelLog,
  getExpenses, createExpense, updateExpense, deleteExpense,
  getOperationalCost
};
