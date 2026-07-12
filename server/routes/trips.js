const router = require('express').Router();
const { getTrips, getTrip, createTrip, dispatchTrip, completeTrip, cancelTrip, deleteTrip } = require('../controllers/tripController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// dispatcher edits trips; safety_officer can view
router.get('/', authorize('dispatcher', 'safety_officer', 'fleet_manager', 'financial_analyst'), getTrips);
router.get('/:id', authorize('dispatcher', 'safety_officer', 'fleet_manager', 'financial_analyst'), getTrip);
router.post('/', authorize('dispatcher'), createTrip);
router.patch('/:id/dispatch', authorize('dispatcher'), dispatchTrip);
router.patch('/:id/complete', authorize('dispatcher'), completeTrip);
router.patch('/:id/cancel', authorize('dispatcher'), cancelTrip);
router.delete('/:id', authorize('dispatcher'), deleteTrip);

module.exports = router;
