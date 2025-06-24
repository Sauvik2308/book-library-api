const request = require('supertest');
const sqlite3 = require('sqlite3').verbose();
const { createApp } = require('../../server');
let app, server, db;

describe('Books API Integration', () => {
  beforeAll(async () => {
    db = new sqlite3.Database(':memory:');
    app = createApp(db);
    await app.ready;
    server = app.listen(4000);
  });

  afterAll(done => {
    server.close(done);
  });
});
