import express from 'express';
import cors from 'cors';
import path from 'path';
import { rewriteText } from './copilot-postprocess.js';

// Use non-strict typing for the express app to avoid missing @types during quick prototyping
const app: any = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 靜態檔案
app.use(express.static(path.resolve('./public')));

app.post('/rewrite', async (req: any, res: any) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text) return res.status(400).json({ error: 'text required' });
    const rewritten = await rewriteText(String(text));
    return res.json({ rewritten });
  } catch (error: unknown) {
    console.error('rewrite error', error);
    const msg = (error as any)?.message || String(error);
    return res.status(500).json({ error: msg || 'internal' });
  }
});

app.listen(PORT, () => {
  console.log(`Voice demo server running: http://localhost:${PORT}`);
});
