import { Router } from 'express';
import { meili, TEXTS_INDEX } from '../meili.js';

export const router = Router();

// GET /search?q=bereishit&limit=20&offset=0
router.get('/', async (req, res) => {
  const q = req.query.q || '';
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const offset = parseInt(req.query.offset, 10) || 0;
  const bookFilter = req.query.book ? `book = "${req.query.book}"` : undefined;

  try {
    const index = meili.index(TEXTS_INDEX);
    const result = await index.search(q, {
      limit,
      offset,
      filter: bookFilter,
      attributesToHighlight: ['text', 'he'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
    });
    res.json({
      query: q,
      total: result.estimatedTotalHits,
      hits: result.hits,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
