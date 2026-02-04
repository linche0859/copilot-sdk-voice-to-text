import { CopilotClient } from '@github/copilot-sdk';

const client = new CopilotClient();
let clientStarted = false;

async function ensureClient() {
  if (!clientStarted) {
    await client.start();
    clientStarted = true;
  }
}

const systemPrompt = `You are a concise transcript editor. Preserve the speaker's meaning. Remove filler words (e.g., '嗯', '啊', 'like'), remove repeated phrases, correct grammar and punctuation, and merge fragments into fluent sentences. Do not invent facts or change numbers/names. Respond in Traditional Chinese (zh-tw) unless asked otherwise.`;

export async function rewriteText(rawText: string) {
  // 嘗試使用 Copilot SDK；若無法啟動則回退到本地簡易處理
  try {
    await ensureClient();

    let session: any = null;
    try {
      session = await client.createSession({
        model: 'gpt-4.1',
        streaming: false,
      });

      const prompt = `${systemPrompt}\n\nInput:\n${rawText}\n\nPlease output a fluent transcript that preserves meaning.`;

      const result = await new Promise<string>((resolve, reject) => {
        let acc = '';

        session.on((event: any) => {
          const t = event?.type;
          if (t === 'assistant.message') {
            acc = event.data?.content || acc;
          } else if (t === 'session.idle') {
            resolve(acc);
          } else if (t === 'error') {
            reject(
              new Error((event.data && event.data.message) || 'copilot error'),
            );
          }
        });

        session.send({ prompt }).catch(reject);
      });

      return result;
    } finally {
      if (session) {
        try {
          await session.destroy();
        } catch (e) {
          console.warn('session destroy failed', e);
        }
      }
    }
  } catch (err: unknown) {
    console.warn(
      'Copilot SDK unavailable, using local fallback:',
      (err as any)?.message || err,
    );
    return fallbackProcess(rawText);
  }
}

function fallbackProcess(text: string) {
  // 簡單去除常見口語贅詞與多餘空白，並嘗試補上標點
  const fillerWords = [
    '嗯',
    '啊',
    '唔',
    '然後',
    '就是',
    '那個',
    '那種',
    'like',
    'you know',
  ];
  let out = text;
  for (const f of fillerWords) {
    const re = new RegExp(`\\b${escapeRegExp(f)}\\b`, 'gi');
    out = out.replace(re, '');
  }
  // 合併多個空白，修正逗號與句號 spacing
  out = out.replace(/\s+/g, ' ').trim();
  out = out.replace(/ ,/g, ',').replace(/ \.{3}/g, '…');
  // 若末尾沒有標點，補上一個句號
  if (!/[。！？\.\?]$/.test(out)) out = out + '。';
  return out;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}
