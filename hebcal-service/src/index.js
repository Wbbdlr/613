import express from 'express';
import cors from 'cors';
import { router as hebcalRouter } from './routes/hebcal.js';
import { router as zmanimRouter } from './routes/zmanim.js';
import { router as pdfRouter } from './routes/pdf.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/calendar', hebcalRouter);
app.use('/zmanim', zmanimRouter);
app.use('/pdf', pdfRouter);

app.listen(PORT, () => {
  console.log(`hebcal-service listening on port ${PORT}`);
});
