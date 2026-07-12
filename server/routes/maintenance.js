const router = require('express').Router();
const { getMaintenanceLogs, createMaintenanceLog, closeMaintenanceLog, updateMaintenanceLog, deleteMaintenanceLog } = require('../controllers/maintenanceController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// fleet_manager manages maintenance
router.get('/', authorize('fleet_manager', 'financial_analyst', 'dispatcher'), getMaintenanceLogs);
router.post('/', authorize('fleet_manager'), createMaintenanceLog);
router.patch('/:id/close', authorize('fleet_manager'), closeMaintenanceLog);
router.put('/:id', authorize('fleet_manager'), updateMaintenanceLog);
router.delete('/:id', authorize('fleet_manager'), deleteMaintenanceLog);

module.exports = router;
