import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { createServer } from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pgContainer;
let server;
let baseUrl;
let pool;  // saved so after() can drain connections before stopping the container

describe('sefaria-service notes API', { timeout: 120_000 }, () => {
  before(async () => {
    console.log('Starting PostgreSQL container…');
    pgContainer = await new PostgreSqlContainer('postgres:16-alpine')
      .withUsername('sefaria')
      .withPassword('sefaria')
      .withDatabase('sefaria')
      .start();

    // Set env vars BEFORE any dynamic imports so pg.Pool picks them up
    process.env.DATABASE_URL = pgContainer.getConnectionUri();
    process.env.MEILI_HOST = 'http://localhost:7700';
    process.env.MEILI_MASTER_KEY = 'masterKey';
    process.env.SEFARIA_DATA_DIR = path.join(__dirname, 'fixtures');

    // Apply DB schema
    const dbModule = await import('../src/db.js');
    pool = dbModule.pool;
    const initSql = await fs.readFile(
      path.join(__dirname, '../../db/init.sql'),
      'utf8'
    );
    await pool.query(initSql);

    // Start the Express app in-process
    const { default: app } = await import('../src/app.js');
    server = createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    console.log(`Server listening at ${baseUrl}`);
  });

  after(async () => {
    await new Promise((resolve) => server?.close(resolve));
    await pool?.end();
    await pgContainer?.stop();
  });

  // ── Health ────────────────────────────────────────────────────────────────

  it('GET /health returns ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
  });

  // ── Notes ─────────────────────────────────────────────────────────────────

  it('GET /notes returns 400 when ref is missing', async () => {
    const res = await fetch(`${baseUrl}/notes`);
    assert.equal(res.status, 400);
  });

  it('GET /notes returns empty array when no notes exist', async () => {
    const res = await fetch(`${baseUrl}/notes?ref=Genesis+1:1`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body));
    assert.equal(body.length, 0);
  });

  it('POST /notes creates a note', async () => {
    const res = await fetch(`${baseUrl}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'Genesis 1:1', text: 'In the beginning' }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.ref, 'Genesis 1:1');
    assert.equal(body.text, 'In the beginning');
    assert.ok(typeof body.id === 'number');
  });

  it('GET /notes returns the created note', async () => {
    await fetch(`${baseUrl}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'Exodus 1:1', text: 'These are the names' }),
    });
    const res = await fetch(`${baseUrl}/notes?ref=Exodus+1:1`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.length >= 1);
    assert.equal(body[0].ref, 'Exodus 1:1');
    assert.equal(body[0].text, 'These are the names');
  });

  it('POST /notes returns 400 when fields are missing', async () => {
    const res = await fetch(`${baseUrl}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'Genesis 1:1' }),
    });
    assert.equal(res.status, 400);
  });

  it('PUT /notes/:id updates note text', async () => {
    const create = await fetch(`${baseUrl}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'Leviticus 1:1', text: 'Original text' }),
    });
    const created = await create.json();

    const update = await fetch(`${baseUrl}/notes/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Updated text' }),
    });
    assert.equal(update.status, 200);
    const updated = await update.json();
    assert.equal(updated.text, 'Updated text');
    assert.equal(updated.id, created.id);
  });

  it('PUT /notes/:id returns 404 for unknown id', async () => {
    const res = await fetch(`${baseUrl}/notes/99999999`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'text' }),
    });
    assert.equal(res.status, 404);
  });

  it('DELETE /notes/:id removes the note', async () => {
    const create = await fetch(`${baseUrl}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'Numbers 1:1', text: 'To delete' }),
    });
    const created = await create.json();

    const del = await fetch(`${baseUrl}/notes/${created.id}`, { method: 'DELETE' });
    assert.equal(del.status, 204);

    const check = await fetch(`${baseUrl}/notes?ref=Numbers+1:1`);
    const remaining = await check.json();
    assert.ok(remaining.every((n) => n.id !== created.id));
  });

  // ── Bookmarks ─────────────────────────────────────────────────────────────

  it('GET /notes/bookmarks returns an array', async () => {
    const res = await fetch(`${baseUrl}/notes/bookmarks`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body));
  });

  it('POST /notes/bookmarks creates a bookmark', async () => {
    const res = await fetch(`${baseUrl}/notes/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'Genesis 1', label: 'Creation' }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.ref, 'Genesis 1');
    assert.equal(body.label, 'Creation');
    assert.ok(typeof body.id === 'number');
  });

  it('POST /notes/bookmarks is idempotent (upsert)', async () => {
    await fetch(`${baseUrl}/notes/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'Exodus 1', label: 'First label' }),
    });
    const res = await fetch(`${baseUrl}/notes/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'Exodus 1', label: 'Updated label' }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.label, 'Updated label');
  });

  it('DELETE /notes/bookmarks/:id removes bookmark', async () => {
    const create = await fetch(`${baseUrl}/notes/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'Leviticus 1', label: 'Temp' }),
    });
    const created = await create.json();

    const del = await fetch(`${baseUrl}/notes/bookmarks/${created.id}`, {
      method: 'DELETE',
    });
    assert.equal(del.status, 204);
  });

  // ── Highlights ────────────────────────────────────────────────────────────

  it('GET /notes/highlights returns 400 when ref is missing', async () => {
    const res = await fetch(`${baseUrl}/notes/highlights`);
    assert.equal(res.status, 400);
  });

  it('POST /notes/highlights creates a highlight', async () => {
    const res = await fetch(`${baseUrl}/notes/highlights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref: 'Genesis 1:1',
        start_word: 0,
        end_word: 3,
        color: 'yellow',
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.ref, 'Genesis 1:1');
    assert.equal(body.color, 'yellow');
  });

  it('GET /notes/highlights returns created highlights', async () => {
    await fetch(`${baseUrl}/notes/highlights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'Exodus 2:1', start_word: 0, end_word: 5, color: 'blue' }),
    });
    const res = await fetch(`${baseUrl}/notes/highlights?ref=Exodus+2:1`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.length >= 1);
    assert.equal(body[0].color, 'blue');
  });

  // ── Texts (no data seeded) ────────────────────────────────────────────────

  it('GET /texts/books returns empty array when no data is seeded', async () => {
    const res = await fetch(`${baseUrl}/texts/books`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.books));
    assert.equal(body.books.length, 0);
  });

  it('GET /texts/:book returns 404 when book not found', async () => {
    const res = await fetch(`${baseUrl}/texts/NonexistentBook`);
    assert.equal(res.status, 404);
  });
});
