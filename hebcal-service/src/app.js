import express from 'express';
import cors from 'cors';
import { router as hebcalRouter } from './routes/hebcal.js';
import { router as zmanimRouter } from './routes/zmanim.js';
import { router as pdfRouter } from './routes/pdf.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/calendar', hebcalRouter);
app.use('/zmanim', zmanimRouter);
app.use('/pdf', pdfRouter);

export default app;
