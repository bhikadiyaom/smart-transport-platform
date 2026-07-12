const mongoose = require('mongoose');
const { Vehicle, Driver, Trip, FuelLog, MaintenanceLog, Expense } = require('../models');

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const [vehicles, drivers, trips] = await Promise.all([
      Vehicle.find(),
      Driver.find(),
      Trip.find()
    ]);

    const activeVehicles = vehicles.filter(v => v.status === 'on_trip').length;
    const availableVehicles = vehicles.filter(v => v.status === 'available').length;
    const inMaintenance = vehicles.filter(v => v.status === 'in_shop').length;
    const retiredVehicles = vehicles.filter(v => v.status === 'retired').length;
    const activeTrips = trips.filter(t => t.status === 'dispatched').length;
    const pendingTrips = trips.filter(t => t.status === 'draft').length;
    const driversOnDuty = drivers.filter(d => d.status === 'on_trip').length;
    const totalVehicles = vehicles.length;
    const fleetUtilization = totalVehicles > 0
      ? Math.round((activeVehicles / totalVehicles) * 100)
      : 0;

    // Status distribution
    const statusDistribution = {
      available: availableVehicles,
      on_trip: activeVehicles,
      in_shop: inMaintenance,
      retired: retiredVehicles
    };

    // Recent trips
    const recentTrips = await Trip.find()
      .populate('vehicle_id', 'registration_no name_model')
      .populate('driver_id', 'name')
      .sort({ created_at: -1 })
      .limit(10);

    res.json({
      kpis: {
        activeVehicles,
        availableVehicles,
        inMaintenance,
        retiredVehicles,
        totalVehicles,
        activeTrips,
        pendingTrips,
        driversOnDuty,
        fleetUtilization
      },
      statusDistribution,
      recentTrips
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dashboard data.' });
  }
};

// ─── Analytics ────────────────────────────────────────────────────────────────
const getAnalytics = async (req, res) => {
  try {
    const vehicles = await Vehicle.find();

    // Fuel efficiency per vehicle: total distance / total fuel
    const vehicleAnalytics = await Promise.all(vehicles.map(async (v) => {
      const vid = v._id;

      const fuelLogs = await FuelLog.find({ vehicle_id: vid });
      const maintenanceLogs = await MaintenanceLog.find({ vehicle_id: vid });
      const trips = await Trip.find({ vehicle_id: vid, status: 'completed' });

      const totalFuelCost = fuelLogs.reduce((s, f) => s + (f.cost || 0), 0);
      const totalFuelLiters = fuelLogs.reduce((s, f) => s + (f.liters || 0), 0);
      const totalMaintenanceCost = maintenanceLogs.reduce((s, m) => s + (m.cost || 0), 0);
      const totalDistance = trips.reduce((s, t) => s + (t.planned_distance_km || 0), 0);
      const totalRevenue = trips.reduce((s, t) => s + (t.revenue || 0), 0);

      const fuelEfficiency = totalFuelLiters > 0 ? +(totalDistance / totalFuelLiters).toFixed(2) : 0;
      const operationalCost = totalFuelCost + totalMaintenanceCost;
      const roi = v.acquisition_cost > 0
        ? +((totalRevenue - operationalCost) / v.acquisition_cost * 100).toFixed(2)
        : 0;

      return {
        vehicle: { _id: v._id, registration_no: v.registration_no, name_model: v.name_model, type: v.type, acquisition_cost: v.acquisition_cost },
        totalFuelCost,
        totalFuelLiters,
        totalMaintenanceCost,
        totalDistance,
        totalRevenue,
        fuelEfficiency,
        operationalCost,
        roi,
        tripCount: trips.length
      };
    }));

    // Monthly revenue from completed trips (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Trip.aggregate([
      { $match: { status: 'completed', completed_at: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$completed_at' }, month: { $month: '$completed_at' } },
          revenue: { $sum: '$revenue' },
          trips: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Fleet utilization trend (completed trips per month)
    const fleetUtilizationTrend = await Trip.aggregate([
      { $match: { created_at: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$created_at' }, month: { $month: '$created_at' }, status: '$status' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Top costliest vehicles
    const topCostliest = [...vehicleAnalytics]
      .sort((a, b) => b.operationalCost - a.operationalCost)
      .slice(0, 5);

    // Overall fleet utilization
    const allVehicles = await Vehicle.find();
    const onTrip = allVehicles.filter(v => v.status === 'on_trip').length;
    const fleetUtilizationPct = allVehicles.length > 0
      ? Math.round((onTrip / allVehicles.length) * 100)
      : 0;

    res.json({
      vehicleAnalytics,
      monthlyRevenue,
      fleetUtilizationTrend,
      topCostliest,
      fleetUtilizationPct
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch analytics.' });
  }
};

module.exports = { getDashboard, getAnalytics };
