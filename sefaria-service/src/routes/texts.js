import { Router } from 'express';
import { readTextFile, listBooks, getBook } from '../textStore.js';

export const router = Router();

// GET /texts/books – list all available books
router.get('/books', async (_req, res) => {
  try {
    const books = await listBooks();
    res.json({ books });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /texts/:book – get metadata + chapter list for a book
router.get('/:book', async (req, res) => {
  try {
    const data = await getBook(req.params.book);
    if (!data) return res.status(404).json({ error: 'Book not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /texts/:book/:chapter – get chapter text (Hebrew + English)
router.get('/:book/:chapter', async (req, res) => {
  try {
    const data = await readTextFile(req.params.book, Number(req.params.chapter));
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
