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
  const startTime = Date.now();
  try {
    const { text } = req.body as { text?: string };
    if (!text) return res.status(400).json({ error: 'text required' });

    console.log(`[POST /rewrite] Start - input length: ${text.length}`);

    // 添加整體請求超時 (28 秒)
    const rewritten = await Promise.race([
      rewriteText(String(text)),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 28000),
      ),
    ]);

    const duration = Date.now() - startTime;
    console.log(`[POST /rewrite] Success - duration: ${duration}ms`);
    return res.json({ rewritten });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    console.error(`[POST /rewrite] Error after ${duration}ms:`, error);
    const msg = (error as any)?.message || String(error);
    return res.status(500).json({ error: msg || 'internal' });
  }
});

app.listen(PORT, () => {
  console.log(`Voice demo server running: http://localhost:${PORT}`);
});
