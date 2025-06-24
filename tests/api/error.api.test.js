const sqlite3 = require('sqlite3').verbose();
const { createApp } = require('../../server');
const request = require('supertest');
let app;

beforeAll(async () => {
  const db = new sqlite3.Database(':memory:');
  app = createApp(db);
  await app.ready;
  // Register error route BEFORE error/404 middleware
  app.get('/error', (req, res) => { throw new Error('Test error'); });
});

describe('Error and 404 Handling', () => {
  it('returns 404 for unknown endpoint', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
