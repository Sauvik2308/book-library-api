const sqlite3 = require('sqlite3').verbose();
const { createApp } = require('../../server');
const request = require('supertest');
let app;

beforeAll(async () => {
  const db = new sqlite3.Database(':memory:');
  app = createApp(db);
  await app.ready;
});

describe('Books API Endpoints', () => {
  it('GET /api/books returns 200 and books array', async () => {
    const res = await request(app).get('/api/books');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('books');
  });
});
