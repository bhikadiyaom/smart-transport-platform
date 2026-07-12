const router = require('express').Router();
const { getDrivers, getAvailableDrivers, getDriver, createDriver, updateDriver, deleteDriver, updateDriverStatus } = require('../controllers/driverController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Available drivers for dispatch
router.get('/available', authorize('dispatcher', 'safety_officer'), getAvailableDrivers);

// safety_officer edits drivers; dispatcher can view for trip creation
router.get('/', authorize('safety_officer', 'dispatcher'), getDrivers);
router.get('/:id', authorize('safety_officer', 'dispatcher'), getDriver);
router.post('/', authorize('safety_officer'), createDriver);
router.put('/:id', authorize('safety_officer'), updateDriver);
router.delete('/:id', authorize('safety_officer'), deleteDriver);
router.patch('/:id/status', authorize('safety_officer'), updateDriverStatus);

module.exports = router;
