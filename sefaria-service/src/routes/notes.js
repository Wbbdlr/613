import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const router = Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(limiter);
router.use(requireAuth);

// GET /notes?ref=Genesis+1:1
router.get('/', async (req, res) => {
  const ref = req.query.ref;
  if (!ref) return res.status(400).json({ error: 'ref is required' });
  const { rows } = await pool.query(
    'SELECT * FROM notes WHERE user_id = $1 AND ref = $2 ORDER BY created_at',
    [req.userId, ref]
  );
  res.json(rows);
});

// POST /notes  body: { ref, text }
router.post('/', async (req, res) => {
  const { ref, text } = req.body;
  if (!ref || !text) return res.status(400).json({ error: 'ref and text required' });
  const { rows } = await pool.query(
    'INSERT INTO notes (user_id, ref, text) VALUES ($1, $2, $3) RETURNING *',
    [req.userId, ref, text]
  );
  res.status(201).json(rows[0]);
});

// PUT /notes/:id  body: { text }
router.put('/:id', async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }
  const { rows } = await pool.query(
    'UPDATE notes SET text = $1, updated_at = now() WHERE id = $2 AND user_id = $3 RETURNING *',
    [text, req.params.id, req.userId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// DELETE /notes/:id
router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM notes WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  res.status(204).end();
});

// --- Highlights ---

// GET /highlights?ref=Genesis+1:1
router.get('/highlights', async (req, res) => {
  const ref = req.query.ref;
  if (!ref) return res.status(400).json({ error: 'ref is required' });
  const { rows } = await pool.query(
    'SELECT * FROM highlights WHERE user_id = $1 AND ref = $2',
    [req.userId, ref]
  );
  res.json(rows);
});

// POST /highlights  body: { ref, start_word, end_word, color, note }
router.post('/highlights', async (req, res) => {
  const { ref, start_word, end_word, color = 'yellow', note = '' } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO highlights (user_id, ref, start_word, end_word, color, note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.userId, ref, start_word, end_word, color, note]
  );
  res.status(201).json(rows[0]);
});

// DELETE /highlights/:id
router.delete('/highlights/:id', async (req, res) => {
  await pool.query('DELETE FROM highlights WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  res.status(204).end();
});

// --- Bookmarks ---

// GET /bookmarks
router.get('/bookmarks', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC',
    [req.userId]
  );
  res.json(rows);
});

// POST /bookmarks  body: { ref, label }
router.post('/bookmarks', async (req, res) => {
  const { ref, label = '' } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO bookmarks (user_id, ref, label) VALUES ($1,$2,$3) ON CONFLICT (user_id, ref) DO UPDATE SET label=$3 RETURNING *',
    [req.userId, ref, label]
  );
  res.status(201).json(rows[0]);
});

// DELETE /bookmarks/:id
router.delete('/bookmarks/:id', async (req, res) => {
  await pool.query('DELETE FROM bookmarks WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  res.status(204).end();
});
