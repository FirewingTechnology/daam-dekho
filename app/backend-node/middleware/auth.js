import jwt from 'jsonwebtoken';
import { get } from '../utils/db.js';

const getJwtSecret = () => {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is required in production mode!');
    process.exit(1);
  }
  return process.env.JWT_SECRET || 'daamdekho_secret_dev_12345';
};

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    // BUG-04 FIX: Check that the user still exists in the database.
    // A valid JWT can belong to a deleted user — without this check, every
    // subsequent req.user.id access would throw a TypeError.
    const user = await get(
      `SELECT id, name, email, pincode FROM users WHERE id = ?`,
      [decoded.id]
    );

    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Not authorized to access this route' });
  }
};
