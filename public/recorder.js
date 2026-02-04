// recorder.js — START/STOP only; hold and cancel removed
(function () {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const interimEl = document.getElementById('interim');
  const finalEl = document.getElementById('final');
  const rewrittenEl = document.getElementById('rewritten');
  const statusEl = document.getElementById('status');
  const mergeCheckbox = document.getElementById('mergeCheckbox');

  const Recog = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recog) {
    if (interimEl)
      interimEl.textContent = '瀏覽器不支援 Web Speech API，請使用 Chrome。';
    if (startBtn) startBtn.disabled = true;
    return;
  }

  let recognition = null;
  let isHolding = false; // logical 'session active' flag
  let shouldProcessOnEnd = false;
  let buffer = [];
  let lastFinalTimestamp = null;
  const pauseThresholdMs = 500;

  function setStatus(s) {
    // normalize common English statuses to Traditional Chinese for UI
    const map = {
      Idle: '等待語音輸入',
      Recording: '錄音中',
      'Recording (manual)': '錄音中',
      'Processing...': '處理中...',
      Error: '錯誤',
      Stopping: '停止中',
    };
    const out = map[s] ?? s;
    if (statusEl) statusEl.textContent = out;
  }

  // show/hide the small red recording indicator in the Stop button
  function showRecordingIndicator() {
    if (stopBtn) stopBtn.classList.add('recording');
  }
  function hideRecordingIndicator() {
    if (stopBtn) stopBtn.classList.remove('recording');
  }

  // format Date to HH:mm:ss (zero-padded)
  function formatTimeHHMMSS(d) {
    const z = (n) => n.toString().padStart(2, '0');
    return `${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`;
  }

  // show/hide the rewritten output panel
  const rewrittenPanel = document.getElementById('rewrittenPanel');
  function showRewrittenPanel() {
    if (rewrittenPanel) {
      rewrittenPanel.classList.remove('hidden');
      // if placeholder '-' exists, clear it
      if (
        rewrittenEl &&
        rewrittenEl.textContent &&
        rewrittenEl.textContent.trim() === '-'
      )
        rewrittenEl.textContent = '';
    }
  }
  function hideRewrittenPanel() {
    if (rewrittenPanel) rewrittenPanel.classList.add('hidden');
  }

  function buildRecognition() {
    const r = new Recog();
    r.lang = 'zh-TW';
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onresult = (ev) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; ++i) {
        const res = ev.results[i];
        if (res.isFinal) {
          const t = res[0].transcript.trim();
          if (t) {
            const now = Date.now();
            if (lastFinalTimestamp != null) {
              const delta = now - lastFinalTimestamp;
              if (delta > pauseThresholdMs)
                buffer.push(`[[PAUSE:${(delta / 1000).toFixed(2)}s]]`);
            }
            buffer.push(t);
            lastFinalTimestamp = now;
            if (finalEl) {
              const p = document.createElement('div');
              const ts = formatTimeHHMMSS(new Date());
              p.textContent = `[${ts}] ${t}`;
              finalEl.prepend(p);
            }
          }
        } else {
          interim += res[0].transcript;
        }
      }
      if (interimEl) interimEl.textContent = interim || '-';
    };

    r.onerror = (e) => {
      console.error('SpeechRecognition error', e);
      setStatus('Error');
      hideRecordingIndicator();
    };

    r.onend = () => {
      recognition = null;
      if (shouldProcessOnEnd) {
        shouldProcessOnEnd = false;
        setStatus('Processing...');
        const textToSend =
          mergeCheckbox && !mergeCheckbox.checked
            ? buffer.join('\n')
            : buffer.join(' ');
        buffer = [];
        lastFinalTimestamp = null;
        if (textToSend.trim()) {
          fetch('/rewrite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textToSend }),
          })
            .then((r) => r.json())
            .then((j) => {
              if (rewrittenEl) {
                showRewrittenPanel();
                rewrittenEl.prepend(
                  createResultElement(textToSend, j.rewritten || ''),
                );
              }
              setStatus('Idle');
              hideRecordingIndicator();
            })
            .catch((err) => {
              console.error(err);
              setStatus('Error');
            });
        } else setStatus('Idle');
      } else if (isHolding) {
        // ended due to silence but session still active — restart
        setStatus('Recording');
        setTimeout(() => {
          if (isHolding) {
            try {
              recognition = buildRecognition();
              recognition.start();
            } catch (e) {
              console.warn('Failed to restart recognition', e);
              setStatus('Error');
            }
          }
        }, 250);
      } else {
        setStatus('Idle');
        hideRecordingIndicator();
      }
    };

    return r;
  }

  // START behaves like 'press and hold' session — listens until STOP
  if (startBtn)
    startBtn.addEventListener('click', () => {
      isHolding = true;
      shouldProcessOnEnd = false;
      buffer = [];
      lastFinalTimestamp = null;
      // clear previous originals so each session starts fresh
      if (finalEl) finalEl.textContent = '';
      if (!recognition) recognition = buildRecognition();
      if (startBtn) startBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = false;
      showRecordingIndicator();
      setStatus('Recording (manual)');
      try {
        recognition.start();
      } catch (e) {
        console.warn(e);
      }
    });

  // --- Utilities: create result UI with diff highlight + copy button ---
  function createResultElement(originalText, rewrittenText) {
    const container = document.createElement('div');
    container.className = 'result-entry';
    container.style.marginBottom = '10px';
    container.style.padding = '10px';
    container.style.borderRadius = '8px';

    const rewrittenDiv = document.createElement('div');
    rewrittenDiv.className = 'rewritten-text';
    rewrittenDiv.style.fontSize = '16px';
    rewrittenDiv.style.lineHeight = '24px';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-icon';
    copyBtn.title = '複製';
    const copySVG = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
      </svg>`;
    const checkSVG = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>
      </svg>`;
    copyBtn.innerHTML = copySVG;
    copyBtn.addEventListener('click', () => {
      navigator.clipboard?.writeText(rewrittenText).then(() => {
        // show check icon but preserve button size
        copyBtn.innerHTML = checkSVG;
        setTimeout(() => (copyBtn.innerHTML = copySVG), 1200);
      });
    });
    rewrittenDiv.appendChild(copyBtn);

    const content = document.createElement('div');
    content.textContent = rewrittenText || '';
    content.style.whiteSpace = 'pre-wrap';
    rewrittenDiv.appendChild(content);

    container.appendChild(rewrittenDiv);
    return container;
  }

  // STOP ends session and triggers processing
  if (stopBtn)
    stopBtn.addEventListener('click', () => {
      hideRecordingIndicator();
      if (recognition) {
        isHolding = false;
        shouldProcessOnEnd = true;
        try {
          recognition.stop();
        } catch (e) {
          console.warn(e);
        }
      } else {
        isHolding = false;
        shouldProcessOnEnd = false;
        const textToSend =
          mergeCheckbox && !mergeCheckbox.checked
            ? buffer.join('\n')
            : buffer.join(' ');
        buffer = [];
        lastFinalTimestamp = null;
        if (textToSend.trim()) {
          setStatus('Processing...');
          fetch('/rewrite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textToSend }),
          })
            .then((r) => r.json())
            .then((j) => {
              if (rewrittenEl) {
                showRewrittenPanel();
                rewrittenEl.prepend(
                  createResultElement(textToSend, j.rewritten || ''),
                );
              }
              setStatus('Idle');
              hideRecordingIndicator();
            })
            .catch((err) => {
              console.error(err);
              setStatus('Error');
              hideRecordingIndicator();
            });
        } else setStatus('Idle');
      }
      if (startBtn) startBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = true;
      hideRecordingIndicator();
    });
})();
