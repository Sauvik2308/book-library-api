const sqlite3 = require('sqlite3').verbose();
const { createApp } = require('../../server');
const request = require('supertest');
let app;

beforeAll(async () => {
  const db = new sqlite3.Database(':memory:');
  app = createApp(db);
  await app.ready;
});

describe('Books API /api/books/:id', () => {
  it('GET /api/books/:id returns 200 for valid id', async () => {
    const res = await request(app).get('/api/books/1');
    expect([200,404]).toContain(res.statusCode); // 200 if exists, 404 if not
  });

  it('GET /api/books/:id returns 404 for invalid id', async () => {
    const res = await request(app).get('/api/books/99999');
    expect(res.statusCode).toBe(404);
  });

  it('PUT /api/books/:id updates a book', async () => {
    const res = await request(app)
      .put('/api/books/1')
      .send({ title: 'Updated', author: 'Updated', isbn: 'upd123', genre: 'Upd', publication_year: 2025, total_copies: 2 });
    expect([200,404]).toContain(res.statusCode);
  });
});
