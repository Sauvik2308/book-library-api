const sqlite3 = require('sqlite3').verbose();
const { createApp } = require('../../server');
const request = require('supertest');
let app;

beforeAll(async () => {
  const db = new sqlite3.Database(':memory:');
  app = createApp(db);
  await app.ready;
});

describe('Borrowings API Endpoints', () => {
  it('GET /api/borrowings returns 200 and borrowings array', async () => {
    const res = await request(app).get('/api/borrowings');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('borrowings');
    expect(Array.isArray(res.body.borrowings)).toBe(true);
  });

  it('POST /api/borrowings fails with missing book_id', async () => {
    const res = await request(app)
      .post('/api/borrowings')
      .send({ member_id: 1 });
    expect(res.statusCode).toBe(400);
  });
});
