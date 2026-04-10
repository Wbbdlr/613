import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { createUser, findUserByUsername, findUserById, listUsers, updateUserAdmin, updateUserSettings, removeUser, listNotes, addNote, editNote, removeNote, listHighlights, addHighlight, removeHighlight, listBookmarks, saveBookmark, removeBookmark, searchTexts, getTextCount } from './storage.js';
import { requireAuth, requireAdmin, JWT_SECRET } from './auth.js';
import { indexAllTexts } from './searchIndex.js';
import { importLibrary, getImportReadiness, getImportStatus } from './importLibrary.js';
import { readTextFile, listBooks, getBook } from '../../legacy/textStore.js';

const app = express();

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

function issueToken(userId, username) {
  const user = findUserById(userId);
  return jwt.sign({ userId, username, isAdmin: Boolean(user?.isAdmin) }, JWT_SECRET, { expiresIn: '7d' });
}

app.use('/auth', authLimiter);
app.post('/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || typeof username !== 'string' || username.trim().length < 2) {
    return res.status(400).json({ error: 'Username must be at least 2 characters' });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  const cleanUsername = username.trim().toLowerCase();
  try {
    const hash = await bcrypt.hash(password, 12);
    const user = createUser(cleanUsername, hash);
    res.status(201).json({ token: issueToken(user.id, user.username), username: user.username, isAdmin: user.isAdmin, settings: user.settings });
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const user = findUserByUsername(username.trim().toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  res.json({ token: issueToken(user.id, user.username), username: user.username, isAdmin: user.isAdmin, settings: user.settings });
});

app.get('/auth/me', (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    const user = findUserById(payload.userId);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' });
    res.json({ userId: user.id, username: user.username, isAdmin: user.isAdmin, settings: user.settings });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

app.get('/settings', requireAuth, (req, res) => {
  res.json({ settings: req.user.settings, isAdmin: req.user.isAdmin, username: req.user.username });
});

app.put('/settings', requireAuth, (req, res) => {
  const { theme, fontSize, readerLanguage } = req.body || {};
  const validThemes = new Set(['light', 'dark', 'sepia']);
  const validFontSizes = new Set(['sm', 'md', 'lg', 'xl']);
  const validLanguages = new Set(['english', 'hebrew', 'bilingual']);

  if (theme && !validThemes.has(theme)) return res.status(400).json({ error: 'Invalid theme' });
  if (fontSize && !validFontSizes.has(fontSize)) return res.status(400).json({ error: 'Invalid font size' });
  if (readerLanguage && !validLanguages.has(readerLanguage)) return res.status(400).json({ error: 'Invalid reader language' });

  const user = updateUserSettings(req.userId, { theme, fontSize, readerLanguage });
  res.json({ settings: user.settings, isAdmin: user.isAdmin, username: user.username });
});

app.get('/texts/books', async (_req, res) => {
  try {
    res.json({ books: await listBooks() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/texts/:book/:chapter', async (req, res) => {
  try {
    const data = await readTextFile(req.params.book, Number(req.params.chapter));
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/texts/:book', async (req, res) => {
  try {
    const data = await getBook(req.params.book);
    if (!data) return res.status(404).json({ error: 'Book not found' });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/search', (req, res) => {
  try {
    const q = req.query.q || '';
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const book = req.query.book ? String(req.query.book) : null;
    const result = searchTexts(q, { limit, offset, book });
    res.json({ query: q, total: result.total, hits: result.hits, indexed: getTextCount() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

let indexing = false;
app.post('/admin/reindex', requireAuth, requireAdmin, async (_req, res) => {
  if (indexing) return res.json({ status: 'already_running' });
  indexing = true;
  res.json({ status: 'started' });
  indexAllTexts().then(() => {
    indexing = false;
  }).catch((error) => {
    indexing = false;
    console.error('Indexing failed:', error);
  });
});

app.get('/admin/reindex/status', requireAuth, requireAdmin, (_req, res) => {
  res.json({ indexing, indexed: getTextCount() });
});

app.get('/admin/import/status', requireAuth, requireAdmin, async (_req, res) => {
  res.json({ ...getImportStatus(), ...(await getImportReadiness()), indexed: getTextCount() });
});

app.post('/admin/import', requireAuth, requireAdmin, async (req, res) => {
  if (getImportStatus().running) {
    return res.json(getImportStatus());
  }
  const readiness = await getImportReadiness();
  if (!readiness.sourceReady) {
    return res.status(409).json({ error: readiness.sourceError, sourcePath: readiness.sourcePath });
  }
  const force = Boolean(req.body?.force);
  res.json({ status: 'started', force, sourcePath: readiness.sourcePath });
  importLibrary({ force }).catch((error) => {
    console.error('Library import failed:', error);
  });
});

app.get('/admin/users', requireAuth, requireAdmin, (_req, res) => {
  res.json({ users: listUsers() });
});

app.put('/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
  const { isAdmin } = req.body || {};
  if (typeof isAdmin !== 'boolean') {
    return res.status(400).json({ error: 'isAdmin boolean required' });
  }
  const users = listUsers();
  const target = users.find((user) => String(user.id) === String(req.params.id));
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (!isAdmin && target.isAdmin) {
    const adminCount = users.filter((user) => user.isAdmin).length;
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'At least one admin is required' });
    }
  }
  res.json({ user: updateUserAdmin(req.params.id, isAdmin) });
});

app.delete('/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
  const users = listUsers();
  const target = users.find((user) => String(user.id) === String(req.params.id));
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.isAdmin && users.filter((user) => user.isAdmin).length <= 1) {
    return res.status(400).json({ error: 'At least one admin is required' });
  }
  removeUser(req.params.id);
  res.status(204).end();
});

app.use('/notes', requireAuth);
app.get('/notes', (req, res) => {
  const ref = req.query.ref;
  if (!ref) return res.status(400).json({ error: 'ref is required' });
  res.json(listNotes(req.userId, ref));
});

app.post('/notes', (req, res) => {
  const { ref, text } = req.body;
  if (!ref || !text) return res.status(400).json({ error: 'ref and text required' });
  res.status(201).json(addNote(req.userId, ref, text));
});

app.put('/notes/:id', (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }
  const updated = editNote(text, req.params.id, req.userId);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

app.delete('/notes/:id', (req, res) => {
  removeNote(req.params.id, req.userId);
  res.status(204).end();
});

app.get('/notes/highlights', (req, res) => {
  const ref = req.query.ref;
  if (!ref) return res.status(400).json({ error: 'ref is required' });
  res.json(listHighlights(req.userId, ref));
});

app.post('/notes/highlights', (req, res) => {
  const { ref, start_word, end_word, color = 'yellow', note = '' } = req.body;
  res.status(201).json(addHighlight(req.userId, ref, start_word, end_word, color, note));
});

app.delete('/notes/highlights/:id', (req, res) => {
  removeHighlight(req.params.id, req.userId);
  res.status(204).end();
});

app.get('/notes/bookmarks', (req, res) => {
  res.json(listBookmarks(req.userId));
});

app.post('/notes/bookmarks', (req, res) => {
  const { ref, label = '' } = req.body;
  res.status(201).json(saveBookmark(req.userId, ref, label));
});

app.delete('/notes/bookmarks/:id', (req, res) => {
  removeBookmark(req.params.id, req.userId);
  res.status(204).end();
});

export default app;