import express from 'express';
import cors from 'cors';
import { router as authRouter } from './routes/auth.js';
import { router as textRouter } from './routes/texts.js';
import { router as searchRouter } from './routes/search.js';
import { router as notesRouter } from './routes/notes.js';
import { router as adminRouter } from './routes/admin.js';

const app = express();

// Trust the first proxy (Caddy) so rate limiting and IP detection work correctly
// when the stack is exposed via Cloudflare Tunnel or another reverse proxy
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRouter);
app.use('/texts', textRouter);
app.use('/search', searchRouter);
app.use('/notes', notesRouter);
app.use('/admin', adminRouter);

export default app;
