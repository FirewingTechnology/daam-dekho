import * as authService from '../services/authService.js';

export const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    // BUG-21 FIX: Consistent error handling — duplicate email returns 409, others 500
    if (err.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    // BUG-21 FIX: login errors are auth errors (401), not server errors.
    // Use res directly here (not next) to keep the 401 status correct.
    return res.status(401).json({ error: err.message });
  }
};

export const getProfile = async (req, res) => {
  res.json(req.user);
};

export const updatePincode = async (req, res, next) => {
  try {
    const result = await authService.updatePincode(req.user.id, req.body.pincode);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
