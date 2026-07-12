const router = require('express').Router();
const {
  getFuelLogs, createFuelLog, updateFuelLog, deleteFuelLog,
  getExpenses, createExpense, updateExpense, deleteExpense,
  getOperationalCost
} = require('../controllers/fuelController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// financial_analyst edits fuel & expenses; fleet_manager/dispatcher can view
router.get('/fuel', authorize('financial_analyst', 'fleet_manager', 'dispatcher'), getFuelLogs);
router.post('/fuel', authorize('financial_analyst'), createFuelLog);
router.put('/fuel/:id', authorize('financial_analyst'), updateFuelLog);
router.delete('/fuel/:id', authorize('financial_analyst'), deleteFuelLog);

router.get('/expenses', authorize('financial_analyst', 'fleet_manager'), getExpenses);
router.post('/expenses', authorize('financial_analyst'), createExpense);
router.put('/expenses/:id', authorize('financial_analyst'), updateExpense);
router.delete('/expenses/:id', authorize('financial_analyst'), deleteExpense);

router.get('/operational-cost/:vehicle_id', authorize('financial_analyst', 'fleet_manager'), getOperationalCost);

module.exports = router;
