require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Vehicle, Driver, Trip, MaintenanceLog, FuelLog, Expense } = require('../models');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Vehicle.deleteMany({}),
      Driver.deleteMany({}),
      Trip.deleteMany({}),
      MaintenanceLog.deleteMany({}),
      FuelLog.deleteMany({}),
      Expense.deleteMany({})
    ]);
    console.log('🧹 Cleared existing data');

    // ─── Users (one per role) ─────────────────────────────────────────────────
    const password_hash = await bcrypt.hash('TransitOps@2024', 12);
    const users = await User.insertMany([
      { name: 'PRINCE (Fleet Manager)', email: 'd24it149@charusat.edu.in', password_hash, role: 'fleet_manager' },
      { name: 'Fleet Manager Mike', email: 'fleet@transitops.com', password_hash, role: 'fleet_manager' },
      { name: 'Dispatcher Dave', email: 'dispatch@transitops.com', password_hash, role: 'dispatcher' },
      { name: 'Safety Officer Sara', email: 'safety@transitops.com', password_hash, role: 'safety_officer' },
      { name: 'Financial Analyst Fiona', email: 'finance@transitops.com', password_hash, role: 'financial_analyst' }
    ]);
    console.log(`✅ Created ${users.length} users`);

    // ─── Vehicles ─────────────────────────────────────────────────────────────
    const vehicles = await Vehicle.insertMany([
      { registration_no: 'VAN-05', name_model: 'Toyota HiAce Van', type: 'van', max_capacity_kg: 600, odometer: 45200, acquisition_cost: 850000, status: 'available' },
      { registration_no: 'VAN-07', name_model: 'Ford Transit Van', type: 'van', max_capacity_kg: 700, odometer: 32100, acquisition_cost: 920000, status: 'available' },
      { registration_no: 'TRK-12', name_model: 'Tata LPT 1613', type: 'truck', max_capacity_kg: 6000, odometer: 128400, acquisition_cost: 2200000, status: 'on_trip' },
      { registration_no: 'TRK-15', name_model: 'Ashok Leyland BOSS', type: 'truck', max_capacity_kg: 7500, odometer: 89700, acquisition_cost: 2800000, status: 'available' },
      { registration_no: 'MINI-03', name_model: 'Maruti Super Carry', type: 'mini', max_capacity_kg: 420, odometer: 18900, acquisition_cost: 650000, status: 'in_shop' },
      { registration_no: 'MINI-06', name_model: 'Mahindra Jeeto Plus', type: 'mini', max_capacity_kg: 500, odometer: 22300, acquisition_cost: 580000, status: 'available' },
      { registration_no: 'VAN-02', name_model: 'Piaggio Ape Max', type: 'van', max_capacity_kg: 350, odometer: 67800, acquisition_cost: 450000, status: 'retired' }
    ]);
    console.log(`✅ Created ${vehicles.length} vehicles`);

    // ─── Drivers ──────────────────────────────────────────────────────────────
    const futureExpiry = new Date();
    futureExpiry.setFullYear(futureExpiry.getFullYear() + 2);

    const pastExpiry = new Date();
    pastExpiry.setFullYear(pastExpiry.getFullYear() - 1);

    const drivers = await Driver.insertMany([
      { name: 'Alex Kumar', license_no: 'DL-MH-09-2019-001234', license_category: 'LMV', license_expiry: futureExpiry, contact: '9876543210', safety_score: 94, trip_completion_pct: 98, status: 'available' },
      { name: 'Rajan Singh', license_no: 'DL-UP-35-2020-005678', license_category: 'HMV', license_expiry: futureExpiry, contact: '9876543211', safety_score: 87, trip_completion_pct: 92, status: 'on_trip' },
      { name: 'Priya Patel', license_no: 'DL-GJ-08-2018-009012', license_category: 'LMV', license_expiry: futureExpiry, contact: '9876543212', safety_score: 96, trip_completion_pct: 100, status: 'available' },
      { name: 'Mohammed Ali', license_no: 'DL-TN-22-2021-003456', license_category: 'HMV', license_expiry: futureExpiry, contact: '9876543213', safety_score: 79, trip_completion_pct: 85, status: 'available' },
      { name: 'Suresh Yadav', license_no: 'DL-RJ-06-2017-007890', license_category: 'LMV', license_expiry: pastExpiry, contact: '9876543214', safety_score: 72, trip_completion_pct: 78, status: 'off_duty' },
      { name: 'Kavita Reddy', license_no: 'DL-AP-10-2022-001111', license_category: 'LMV', license_expiry: futureExpiry, contact: '9876543215', safety_score: 88, trip_completion_pct: 94, status: 'suspended' }
    ]);
    console.log(`✅ Created ${drivers.length} drivers`);

    // ─── Trips ────────────────────────────────────────────────────────────────
    const van05 = vehicles.find(v => v.registration_no === 'VAN-05');
    const trk12 = vehicles.find(v => v.registration_no === 'TRK-12');
    const van07 = vehicles.find(v => v.registration_no === 'VAN-07');

    const alex = drivers.find(d => d.name === 'Alex Kumar');
    const rajan = drivers.find(d => d.name === 'Rajan Singh');
    const priya = drivers.find(d => d.name === 'Priya Patel');

    const completedDate = new Date();
    completedDate.setDate(completedDate.getDate() - 5);

    const trips = await Trip.insertMany([
      // Draft trip - Van-05 / Alex / 450kg (the demo scenario from spec)
      {
        source: 'Mumbai Warehouse', destination: 'Pune Distribution Centre',
        vehicle_id: van05._id, driver_id: alex._id,
        cargo_weight_kg: 450, planned_distance_km: 148,
        status: 'draft', revenue: 12000, notes: 'Priority delivery — electronics'
      },
      // Dispatched trip - TRK-12 / Rajan
      {
        source: 'Delhi Depot', destination: 'Chandigarh Hub',
        vehicle_id: trk12._id, driver_id: rajan._id,
        cargo_weight_kg: 4200, planned_distance_km: 248,
        status: 'dispatched', revenue: 35000, notes: 'FMCG goods shipment'
      },
      // Completed trip - Van-07 / Priya
      {
        source: 'Chennai Port', destination: 'Bangalore Warehouse',
        vehicle_id: van07._id, driver_id: priya._id,
        cargo_weight_kg: 550, planned_distance_km: 346,
        status: 'completed', revenue: 18500,
        final_odometer: 32446, fuel_consumed: 38.5,
        completed_at: completedDate, notes: 'Auto parts delivery'
      },
      // Another completed trip
      {
        source: 'Jaipur Factory', destination: 'Ahmedabad Depot',
        vehicle_id: van05._id, driver_id: alex._id,
        cargo_weight_kg: 380, planned_distance_km: 275,
        status: 'completed', revenue: 14500,
        final_odometer: 45475, fuel_consumed: 29.2,
        completed_at: new Date(completedDate.getTime() - 7 * 24 * 60 * 60 * 1000),
        notes: 'Textile goods'
      }
    ]);
    console.log(`✅ Created ${trips.length} trips`);

    // ─── Maintenance Logs ─────────────────────────────────────────────────────
    const mini03 = vehicles.find(v => v.registration_no === 'MINI-03');
    const maintenanceLogs = await MaintenanceLog.insertMany([
      {
        vehicle_id: mini03._id, service_type: 'Engine Overhaul',
        cost: 45000, date: new Date(), status: 'in_shop',
        notes: 'Major engine repair — estimated 5 days'
      },
      {
        vehicle_id: trk12._id, service_type: 'Tyre Replacement',
        cost: 18000, date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        status: 'completed', notes: 'All 6 tyres replaced'
      },
      {
        vehicle_id: van07._id, service_type: 'Oil Change & Filter',
        cost: 3500, date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        status: 'completed', notes: 'Routine service'
      }
    ]);
    console.log(`✅ Created ${maintenanceLogs.length} maintenance logs`);

    // ─── Fuel Logs ────────────────────────────────────────────────────────────
    const completedTrip = trips.find(t => t.status === 'completed' && t.vehicle_id.equals(van07._id));
    const completedTrip2 = trips.find(t => t.status === 'completed' && t.vehicle_id.equals(van05._id));

    const fuelLogs = await FuelLog.insertMany([
      { vehicle_id: van07._id, trip_id: completedTrip._id, date: completedDate, liters: 38.5, cost: 3465 },
      { vehicle_id: van05._id, trip_id: completedTrip2._id, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), liters: 29.2, cost: 2628 },
      { vehicle_id: trk12._id, trip_id: null, date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), liters: 85, cost: 7650 },
      { vehicle_id: van07._id, trip_id: null, date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), liters: 42, cost: 3780 }
    ]);
    console.log(`✅ Created ${fuelLogs.length} fuel logs`);

    // ─── Expenses ─────────────────────────────────────────────────────────────
    const expenses = await Expense.insertMany([
      { vehicle_id: van07._id, trip_id: completedTrip._id, toll: 380, other: 200, maintenance_linked: 0, description: 'Highway tolls + parking', date: completedDate },
      { vehicle_id: trk12._id, trip_id: null, toll: 750, other: 500, maintenance_linked: 18000, description: 'Tyre replacement + toll', date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
    ]);
    // Trigger pre-save total computation
    for (const exp of await Expense.find()) {
      exp.total = (exp.toll || 0) + (exp.other || 0) + (exp.maintenance_linked || 0);
      await exp.save();
    }
    console.log(`✅ Created ${expenses.length} expenses`);

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Demo Credentials (all passwords: TransitOps@2024)');
    console.log('  Fleet Manager  : fleet@transitops.com');
    console.log('  Dispatcher     : dispatch@transitops.com');
    console.log('  Safety Officer : safety@transitops.com');
    console.log('  Financial Analyst: finance@transitops.com');
    console.log('\n🚐 Demo Scenario: Van-05 + Alex Kumar = 450kg draft trip (Mumbai → Pune)');
    console.log('   → Try dispatching it to trigger the full transaction flow!\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seed();
