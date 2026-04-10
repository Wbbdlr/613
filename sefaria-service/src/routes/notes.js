import { Router } from 'express';
import { pool } from '../db.js';

export const router = Router();

// GET /notes?ref=Genesis+1:1
router.get('/', async (req, res) => {
  const ref = req.query.ref;
  if (!ref) return res.status(400).json({ error: 'ref is required' });
  const { rows } = await pool.query('SELECT * FROM notes WHERE ref = $1 ORDER BY created_at', [ref]);
  res.json(rows);
});

// POST /notes  body: { ref, text }
router.post('/', async (req, res) => {
  const { ref, text } = req.body;
  if (!ref || !text) return res.status(400).json({ error: 'ref and text required' });
  const { rows } = await pool.query(
    'INSERT INTO notes (ref, text) VALUES ($1, $2) RETURNING *',
    [ref, text]
  );
  res.status(201).json(rows[0]);
});

// PUT /notes/:id  body: { text }
router.put('/:id', async (req, res) => {
  const { text } = req.body;
  const { rows } = await pool.query(
    'UPDATE notes SET text = $1, updated_at = now() WHERE id = $2 RETURNING *',
    [text, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// DELETE /notes/:id
router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM notes WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

// --- Highlights ---

// GET /highlights?ref=Genesis+1:1
router.get('/highlights', async (req, res) => {
  const ref = req.query.ref;
  if (!ref) return res.status(400).json({ error: 'ref is required' });
  const { rows } = await pool.query('SELECT * FROM highlights WHERE ref = $1', [ref]);
  res.json(rows);
});

// POST /highlights  body: { ref, start_word, end_word, color, note }
router.post('/highlights', async (req, res) => {
  const { ref, start_word, end_word, color = 'yellow', note = '' } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO highlights (ref, start_word, end_word, color, note) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [ref, start_word, end_word, color, note]
  );
  res.status(201).json(rows[0]);
});

// DELETE /highlights/:id
router.delete('/highlights/:id', async (req, res) => {
  await pool.query('DELETE FROM highlights WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

// --- Bookmarks ---

// GET /bookmarks
router.get('/bookmarks', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM bookmarks ORDER BY created_at DESC');
  res.json(rows);
});

// POST /bookmarks  body: { ref, label }
router.post('/bookmarks', async (req, res) => {
  const { ref, label = '' } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO bookmarks (ref, label) VALUES ($1,$2) ON CONFLICT (ref) DO UPDATE SET label=$2 RETURNING *',
    [ref, label]
  );
  res.status(201).json(rows[0]);
});

// DELETE /bookmarks/:id
router.delete('/bookmarks/:id', async (req, res) => {
  await pool.query('DELETE FROM bookmarks WHERE id = $1', [req.params.id]);
  res.status(204).end();
});
