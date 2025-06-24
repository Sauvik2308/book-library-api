const sqlite3 = require('sqlite3').verbose();
const { createApp } = require('../../server');
const request = require('supertest');
let app;

beforeAll(async () => {
  const db = new sqlite3.Database(':memory:');
  app = createApp(db);
  await app.ready;
});
