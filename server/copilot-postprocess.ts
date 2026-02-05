import { CopilotClient } from '@github/copilot-sdk';

// Connect to remote CLI if COPILOT_CLI_URL is provided, otherwise use local CLI
const cliUrl = process.env.COPILOT_CLI_URL;
const client = new CopilotClient(cliUrl ? { cliUrl } : undefined);
let clientStarted = false;

async function ensureClient() {
  if (!clientStarted) {
    await client.start();
    clientStarted = true;
  }
}

const systemPrompt = `You are a concise transcript editor. Preserve the speaker's meaning. Remove filler words (e.g., '嗯', '啊', 'like'), remove repeated phrases, correct grammar and punctuation, and merge fragments into fluent sentences. Do not invent facts or change numbers/names. Respond in Traditional Chinese (zh-tw) unless asked otherwise.

Decide whether the input is best presented as:
- a single fluent paragraph, or
- multiple paragraphs with appropriate breaks when the content covers different topics, shifts in context, or contains naturally separable sections.

Formatting rules:
- If the content discusses multiple distinct topics or has natural topic shifts, separate them into different paragraphs using double line breaks.
- If the content is cohesive and flows naturally as a single thought, output it as one paragraph.
- Preserve original numbers, names, and factual values exactly. Do not add explanations or meta commentary — output only the formatted transcript.`;

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

      const prompt = `${systemPrompt}\n\nInput:\n${rawText}\n\nInstructions: Decide the best output format (single paragraph or multiple paragraphs). Output only the cleaned and formatted transcript in Traditional Chinese.`;

      // 添加超時機制 (25 秒，給 Zeabur 30 秒超時留下緩衝)
      const TIMEOUT_MS = 25000;

      const result = await Promise.race([
        new Promise<string>((resolve, reject) => {
          let acc = '';

          session.on((event: any) => {
            const t = event?.type;
            if (t === 'assistant.message') {
              acc = event.data?.content || acc;
            } else if (t === 'session.idle') {
              resolve(acc);
            } else if (t === 'error') {
              reject(
                new Error(
                  (event.data && event.data.message) || 'copilot error',
                ),
              );
            }
          });

          session.send({ prompt }).catch(reject);
        }),
        new Promise<string>((_, reject) =>
          setTimeout(
            () => reject(new Error('Copilot API timeout')),
            TIMEOUT_MS,
          ),
        ),
      ]);

      console.log(
        `[rewriteText] Success - input length: ${rawText.length}, output length: ${result.length}`,
      );
      return result;
    } finally {
      if (session) {
        try {
          // 使用 Promise.race 確保 destroy 不會卡住
          await Promise.race([
            session.destroy(),
            new Promise((resolve) => setTimeout(resolve, 2000)),
          ]);
        } catch (e) {
          console.warn('[rewriteText] session destroy failed:', e);
        }
      }
    }
  } catch (err: unknown) {
    const errMsg = (err as any)?.message || String(err);
    console.warn(
      `[rewriteText] Copilot SDK error (${errMsg}), using local fallback for input length: ${rawText.length}`,
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
