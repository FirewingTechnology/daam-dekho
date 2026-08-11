import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { run, get } from '../utils/db.js';

const getJwtSecret = () => {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is required in production mode!');
    process.exit(1);
  }
  return process.env.JWT_SECRET || 'daamdekho_secret_dev_12345';
};

export const register = async (userData) => {
  const { name, email, password, pincode } = userData;
  const passwordHash = await bcrypt.hash(password, 10);
  
  const result = await run(
    `INSERT INTO users (name, email, password_hash, pincode) VALUES (?, ?, ?, ?)`,
    [name, email, passwordHash, pincode]
  );
  
  const user = await get(`SELECT id, name, email, pincode FROM users WHERE id = ?`, [result.lastID]);
  const token = jwt.sign({ id: user.id }, getJwtSecret(), { expiresIn: '7d' });
  
  return { user, token };
};

export const login = async (email, password) => {
  const user = await get(`SELECT * FROM users WHERE email = ?`, [email]);
  if (!user) throw new Error('Invalid credentials');
  
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw new Error('Invalid credentials');
  
  const token = jwt.sign({ id: user.id }, getJwtSecret(), { expiresIn: '7d' });
  
  const { password_hash, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

export const updatePincode = async (userId, pincode) => {
  await run(`UPDATE users SET pincode = ? WHERE id = ?`, [pincode, userId]);
  return { success: true };
};

// BUG-03 FIX: Removed the dead `getWishlist` function that called `query`
// which was never imported, and was never used anywhere (wishlist is in userController.js).
