require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: 'Too many requests from this IP — try again in 15 minutes.' }
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/finance', require('./routes/fuel'));
app.use('/api', require('./routes/analytics'));

// 404 handler
app.use((req, res) => res.status(404).json({ message: `Route ${req.method} ${req.path} not found.` }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
});

// Automated daily background task for driver license expiry email reminders
const startExpiryScheduler = () => {
  const runScan = async () => {
    try {
      console.log('⏰ Running automated driver license expiry check...');
      const { sendExpiryReminder } = require('./utils/mailer');
      const { Driver } = require('./models');
      const drivers = await Driver.find({});
      const now = new Date();
      let sentCount = 0;

      for (const driver of drivers) {
        if (!driver.email) continue;
        const expiry = new Date(driver.license_expiry);
        const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        if (daysLeft > -7 && daysLeft <= 7) {
          try {
            await sendExpiryReminder(driver, daysLeft);
            sentCount++;
          } catch (mailErr) {
            console.error(`Failed to send background email to ${driver.email}:`, mailErr.message);
          }
        }
      }
      console.log(`⏰ Expiry check finished. Sent ${sentCount} reminders.`);
    } catch (err) {
      console.error('⏰ Failed to run automated expiry scan:', err.message);
    }
  };

  // Run on startup after short delay
  setTimeout(runScan, 5000);
  // Run every 24 hours
  setInterval(runScan, 24 * 60 * 60 * 1000);
};

// ─── MongoDB + Server boot ────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Atlas connected');
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
    startExpiryScheduler();
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
