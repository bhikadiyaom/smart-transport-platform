const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── User ────────────────────────────────────────────────────────────────────
const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  role: {
    type: String,
    enum: ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'],
    required: true
  },
  failed_login_attempts: { type: Number, default: 0 },
  locked_until: { type: Date, default: null }
}, { timestamps: true });

// ─── Vehicle ─────────────────────────────────────────────────────────────────
const vehicleSchema = new Schema({
  registration_no: { type: String, unique: true, required: true, trim: true, uppercase: true },
  name_model: { type: String, required: true },
  type: { type: String, enum: ['van', 'truck', 'mini'], required: true },
  max_capacity_kg: { type: Number, required: true, min: 1 },
  odometer: { type: Number, default: 0, min: 0 },
  acquisition_cost: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['available', 'on_trip', 'in_shop', 'retired'],
    default: 'available'
  }
}, { timestamps: true });

// ─── Driver ──────────────────────────────────────────────────────────────────
const driverSchema = new Schema({
  name: { type: String, required: true },
  license_no: { type: String, unique: true, required: true, trim: true, uppercase: true },
  license_category: { type: String, default: 'B' },
  license_expiry: { type: Date, required: true },
  contact: { type: String },
  safety_score: { type: Number, default: 100, min: 0, max: 100 },
  trip_completion_pct: { type: Number, default: 100, min: 0, max: 100 },
  status: {
    type: String,
    enum: ['available', 'on_trip', 'off_duty', 'suspended'],
    default: 'available'
  }
}, { timestamps: true });

// ─── Trip ────────────────────────────────────────────────────────────────────
const tripSchema = new Schema({
  source: { type: String, required: true },
  destination: { type: String, required: true },
  vehicle_id: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  driver_id: { type: Schema.Types.ObjectId, ref: 'Driver', required: true },
  cargo_weight_kg: { type: Number, required: true, min: 0 },
  planned_distance_km: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'dispatched', 'completed', 'cancelled'],
    default: 'draft'
  },
  created_at: { type: Date, default: Date.now },
  completed_at: { type: Date },
  final_odometer: { type: Number },
  fuel_consumed: { type: Number },
  revenue: { type: Number, default: 0 },
  notes: { type: String }
});

// ─── MaintenanceLog ──────────────────────────────────────────────────────────
const maintenanceLogSchema = new Schema({
  vehicle_id: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  service_type: { type: String, required: true },
  cost: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['in_shop', 'completed'],
    default: 'in_shop'
  },
  notes: { type: String }
}, { timestamps: true });

// ─── FuelLog ─────────────────────────────────────────────────────────────────
const fuelLogSchema = new Schema({
  vehicle_id: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  trip_id: { type: Schema.Types.ObjectId, ref: 'Trip', default: null },
  date: { type: Date, default: Date.now },
  liters: { type: Number, required: true, min: 0 },
  cost: { type: Number, required: true, min: 0 }
}, { timestamps: true });

// ─── Expense ─────────────────────────────────────────────────────────────────
const expenseSchema = new Schema({
  trip_id: { type: Schema.Types.ObjectId, ref: 'Trip' },
  vehicle_id: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  toll: { type: Number, default: 0 },
  other: { type: Number, default: 0 },
  maintenance_linked: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  status: { type: String, default: 'recorded' },
  date: { type: Date, default: Date.now },
  description: { type: String }
}, { timestamps: true });

// Pre-save hook to auto-compute total
expenseSchema.pre('save', function (next) {
  this.total = (this.toll || 0) + (this.other || 0) + (this.maintenance_linked || 0);
  next();
});

module.exports = {
  User: mongoose.model('User', userSchema),
  Vehicle: mongoose.model('Vehicle', vehicleSchema),
  Driver: mongoose.model('Driver', driverSchema),
  Trip: mongoose.model('Trip', tripSchema),
  MaintenanceLog: mongoose.model('MaintenanceLog', maintenanceLogSchema),
  FuelLog: mongoose.model('FuelLog', fuelLogSchema),
  Expense: mongoose.model('Expense', expenseSchema)
};
