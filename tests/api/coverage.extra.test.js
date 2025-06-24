const sqlite3 = require('sqlite3').verbose();
const { createApp } = require('../../server');
const request = require('supertest');
let app, db;

describe('Extra Coverage for Library API', () => {
  beforeEach(async () => {
    db = new sqlite3.Database(':memory:');
    app = createApp(db);
    await app.ready;
  });

  it('POST /api/books fails with missing title/author', async () => {
    let res = await request(app).post('/api/books').send({ author: 'A' });
    expect(res.statusCode).toBe(400);
    res = await request(app).post('/api/books').send({ title: 'T' });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/books fails with duplicate ISBN', async () => {
    await request(app).post('/api/books').send({ title: 'A', author: 'B', isbn: 'dup', total_copies: 1 });
    const res = await request(app).post('/api/books').send({ title: 'C', author: 'D', isbn: 'dup', total_copies: 1 });
    expect(res.statusCode).toBe(500);
  });

  it('GET /api/members?active_only=true returns only active', async () => {
    const res = await request(app).get('/api/members?active_only=true');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.members)).toBe(true);
  });

  it('POST /api/members fails with missing email', async () => {
    const res = await request(app).post('/api/members').send({ name: 'NoEmail' });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/borrowings fails if book not available', async () => {
    // Set available_copies to 0 for book id 1
    await new Promise((resolve, reject) => db.run('UPDATE books SET available_copies = 0 WHERE id = 1', err => err ? reject(err) : resolve()));
    const res = await request(app).post('/api/borrowings').send({ book_id: 1, member_id: 1 });
    expect(res.statusCode).toBe(400);
  });

  it('GET /api/borrowings?status=borrowed returns 200', async () => {
    const res = await request(app).get('/api/borrowings?status=borrowed');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.borrowings)).toBe(true);
  });

  it('GET /api/stats works with empty tables', async () => {
    await new Promise((resolve, reject) => db.run('DELETE FROM books', err => err ? reject(err) : resolve()));
    await new Promise((resolve, reject) => db.run('DELETE FROM members', err => err ? reject(err) : resolve()));
    const res = await request(app).get('/api/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body.stats.total_books).toBe(0);
  });

  it('GET / returns index.html', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/<html/i);
  });

  it('GET /health returns status OK', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  it('returns 404 for static file not found', async () => {
    const res = await request(app).get('/not-a-real-file.js');
    expect(res.statusCode).toBe(404);
  });

  it('GET /api/books with genre and available_only', async () => {
    let res = await request(app).get('/api/books?genre=Fiction');
    expect(res.statusCode).toBe(200);
    res = await request(app).get('/api/books?available_only=true');
    expect(res.statusCode).toBe(200);
    res = await request(app).get('/api/books?genre=Fiction&available_only=true');
    expect(res.statusCode).toBe(200);
  });

  it('GET /api/borrowings with member_id', async () => {
    const res = await request(app).get('/api/borrowings?member_id=1');
    expect(res.statusCode).toBe(200);
  });

  it('POST /api/members fails with duplicate email', async () => {
    await request(app).post('/api/members').send({ name: 'A', email: 'dup@email.com', phone: '1' });
    const res = await request(app).post('/api/members').send({ name: 'B', email: 'dup@email.com', phone: '2' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Email already exists/);
  });

  it('PUT /api/books/:id returns 404 for invalid id', async () => {
    const res = await request(app).put('/api/books/9999').send({ title: 'T', author: 'A', isbn: 'i', genre: 'g', publication_year: 2025, total_copies: 1 });
    expect(res.statusCode).toBe(404);
  });

  it('DELETE /api/books/:id returns 404 for invalid id', async () => {
    const res = await request(app).delete('/api/books/9999');
    expect(res.statusCode).toBe(404);
  });

  it('POST /api/borrowings fails with missing member_id', async () => {
    const res = await request(app).post('/api/borrowings').send({ book_id: 1 });
    expect(res.statusCode).toBe(400);
  });

  it('PUT /api/borrowings/:id/return returns 404 for already returned', async () => {
    // Borrow and return a book
    const borrow = await request(app).post('/api/borrowings').send({ book_id: 1, member_id: 1 });
    const id = borrow.body.borrowing_id;
    await request(app).put(`/api/borrowings/${id}/return`);
    const res = await request(app).put(`/api/borrowings/${id}/return`);
    expect(res.statusCode).toBe(404);
  });

  it('GET /api/stats handles DB error', async () => {
    // Monkey-patch db.get to simulate error
    const orig = db.get;
    db.get = function(sql, cb) { cb(new Error('fail')); };
    const res = await request(app).get('/api/stats');
    expect(res.statusCode).toBe(500);
    db.get = orig;
  });

  it('GET /api/books handles DB error', async () => {
    const orig = db.all;
    db.all = function(sql, params, cb) { cb(new Error('fail')); };
    const res = await request(app).get('/api/books');
    expect(res.statusCode).toBe(500);
    db.all = orig;
  });

  it('POST /api/books handles DB error', async () => {
    const orig = db.prepare;
    db.prepare = function() { return { run: (a, cb) => cb(new Error('fail')), finalize: () => {} }; };
    const res = await request(app).post('/api/books').send({ title: 'A', author: 'B', total_copies: 1 });
    expect(res.statusCode).toBe(500);
    db.prepare = orig;
  });

  it('POST /api/members handles DB error', async () => {
    const orig = db.prepare;
    db.prepare = function() { return { run: (a, cb) => cb(new Error('fail')), finalize: () => {} }; };
    const res = await request(app).post('/api/members').send({ name: 'A', email: 'B' });
    expect(res.statusCode).toBe(500);
    db.prepare = orig;
  });

  it('POST /api/borrowings handles DB error', async () => {
    const orig = db.get;
    db.get = function(sql, params, cb) { cb(new Error('fail')); };
    const res = await request(app).post('/api/borrowings').send({ book_id: 1, member_id: 1 });
    expect(res.statusCode).toBe(500);
    db.get = orig;
  });
});
