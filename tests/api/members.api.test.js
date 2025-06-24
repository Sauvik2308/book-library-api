const sqlite3 = require('sqlite3').verbose();
const { createApp } = require('../../server');
const request = require('supertest');
let app;

beforeAll(async () => {
  const db = new sqlite3.Database(':memory:');
  app = createApp(db);
  await app.ready;
});

describe('Members API Endpoints', () => {
  it('GET /api/members returns 200 and members array', async () => {
    const res = await request(app).get('/api/members');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('members');
    expect(Array.isArray(res.body.members)).toBe(true);
  });

  it('POST /api/members creates a member', async () => {
    const res = await request(app)
      .post('/api/members')
      .send({ name: 'Test User', email: 'testuser@email.com', phone: '1234567890' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('member');
  });

  it('POST /api/members fails with missing name', async () => {
    const res = await request(app)
      .post('/api/members')
      .send({ email: 'fail@email.com' });
    expect(res.statusCode).toBe(400);
  });
});
