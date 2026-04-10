import express from 'express';
import cors from 'cors';
import { router as textRouter } from './routes/texts.js';
import { router as searchRouter } from './routes/search.js';
import { router as notesRouter } from './routes/notes.js';
import { router as adminRouter } from './routes/admin.js';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/texts', textRouter);
app.use('/search', searchRouter);
app.use('/notes', notesRouter);
app.use('/admin', adminRouter);

app.listen(PORT, () => {
  console.log(`sefaria-service listening on port ${PORT}`);
});
