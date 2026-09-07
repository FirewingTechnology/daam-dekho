import request from 'supertest';
import app from '../app.js';
import { connectDB, closeDB } from '../utils/db.js';

describe('API Smoke Tests', () => {
  beforeAll(async () => {
    await connectDB();
  });
  afterAll(async () => {
    await closeDB();
  });
  test('GET /health should return 200 and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toBe('healthy');
  });

  test('GET / should return API info', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toContain('DaamDekho');
  });

  test('GET /api/home should return products and categories', async () => {
    const res = await request(app).get('/api/home');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('trendingDeals');
  });

  test('GET /api/categories should return a list of categories', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('categories');
    expect(Array.isArray(res.body.categories)).toBe(true);
  });

  test('GET /api/products/non-existent-product should return 404', async () => {
    const res = await request(app).get('/api/products/non-existent-product');
    expect(res.statusCode).toEqual(404);
  });
});
