const router = require('express').Router();
const { getDashboard, getAnalytics } = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/dashboard', authorize('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'), getDashboard);
router.get('/analytics', authorize('fleet_manager', 'financial_analyst'), getAnalytics);

module.exports = router;
