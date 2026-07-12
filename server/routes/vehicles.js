const router = require('express').Router();
const { getVehicles, getAvailableVehicles, getVehicle, createVehicle, updateVehicle, deleteVehicle } = require('../controllers/vehicleController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Available vehicles for dispatch (dispatcher can view)
router.get('/available', authorize('fleet_manager', 'dispatcher', 'financial_analyst'), getAvailableVehicles);

// Full CRUD — fleet_manager edits, others view
router.get('/', authorize('fleet_manager', 'dispatcher', 'financial_analyst'), getVehicles);
router.get('/:id', authorize('fleet_manager', 'dispatcher', 'financial_analyst'), getVehicle);
router.post('/', authorize('fleet_manager'), createVehicle);
router.put('/:id', authorize('fleet_manager'), updateVehicle);
router.delete('/:id', authorize('fleet_manager'), deleteVehicle);

module.exports = router;
