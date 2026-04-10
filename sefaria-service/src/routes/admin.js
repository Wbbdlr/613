import { Router } from 'express';
import { indexAllTexts } from '../indexer.js';

export const router = Router();

let indexing = false;

// POST /admin/reindex – trigger a full re-index of Sefaria data
router.post('/reindex', async (_req, res) => {
  if (indexing) {
    return res.json({ status: 'already_running' });
  }
  indexing = true;
  res.json({ status: 'started' });
  indexAllTexts()
    .then(() => { indexing = false; console.log('Indexing complete'); })
    .catch((err) => { indexing = false; console.error('Indexing failed:', err); });
});

// GET /admin/reindex/status
router.get('/reindex/status', (_req, res) => {
  res.json({ indexing });
});
