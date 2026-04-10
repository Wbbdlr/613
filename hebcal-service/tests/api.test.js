import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'http';
import app from '../src/app.js';

let server;
let baseUrl;

describe('hebcal-service API', () => {
  before(async () => {
    server = createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  it('GET /health returns ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
  });

  it('GET /calendar/events returns events array', async () => {
    const res = await fetch(`${baseUrl}/calendar/events?year=2024&month=3`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.events));
    assert.equal(body.year, 2024);
    assert.equal(body.month, 3);
    assert.ok(body.events.length > 0, 'expected at least one event in March 2024');
  });

  it('GET /calendar/parsha returns parsha data', async () => {
    const res = await fetch(`${baseUrl}/calendar/parsha?date=2024-03-16`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.date, '2024-03-16');
    assert.ok('parsha' in body);
  });

  it('GET /calendar/dafyomi returns daf data', async () => {
    const res = await fetch(`${baseUrl}/calendar/dafyomi?date=2024-03-15`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.date, '2024-03-15');
    assert.ok('display' in body);
  });

  it('GET /calendar/nach returns nach data', async () => {
    const res = await fetch(`${baseUrl}/calendar/nach?date=2024-03-15`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.date, '2024-03-15');
    assert.ok('display' in body);
  });

  it('GET /calendar/holidays returns holidays array', async () => {
    const res = await fetch(`${baseUrl}/calendar/holidays?year=2024`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.events));
    assert.equal(body.year, 2024);
    assert.ok(body.events.length > 0, 'expected holidays in 2024');
  });

  it('GET /zmanim with city returns zmanim data', async () => {
    const res = await fetch(`${baseUrl}/zmanim?city=New+York&date=2024-03-15`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok('sunrise' in body, 'expected sunrise field');
    assert.ok('sunset' in body, 'expected sunset field');
    assert.ok('chatzot' in body, 'expected chatzot field');
  });

  it('GET /zmanim with lat/lon returns zmanim data', async () => {
    const res = await fetch(
      `${baseUrl}/zmanim?lat=40.67&lon=-73.94&tzid=America%2FNew_York&date=2024-03-15`
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok('sunrise' in body);
    assert.equal(body.lat, 40.67);
  });

  it('GET /zmanim without params returns 400', async () => {
    const res = await fetch(`${baseUrl}/zmanim`);
    assert.equal(res.status, 400);
  });

  it('GET /calendar/events with il=true returns Israel mode events', async () => {
    const res = await fetch(`${baseUrl}/calendar/events?year=2024&month=4&il=true`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.events));
    assert.equal(body.il, true);
  });
});
