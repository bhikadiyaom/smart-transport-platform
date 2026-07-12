const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Verifies the Bearer JWT and attaches req.user
 */
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided — please log in.' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password_hash');
    if (!user) return res.status(401).json({ message: 'User not found — please log in again.' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token — please log in again.' });
  }
};

/**
 * Returns middleware that allows only the listed roles
 * Usage: router.get('/route', authenticate, authorize('fleet_manager','dispatcher'), handler)
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthenticated.' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Access denied — your role (${req.user.role}) cannot perform this action.`
    });
  }
  next();
};

module.exports = { authenticate, authorize };
