// popup.js - complete popup logic for AIAssist+
// Place this file in the root of your extension alongside popup.html/popup.css
// Assumes personas.json, sample_responses.json, and chrome.storage.local keys as used elsewhere.

const opSelect = document.getElementById('operation');
const input = document.getElementById('input');
const runBtn = document.getElementById('run');
const optionsBtn = document.getElementById('options');
const historyBtn = document.getElementById('history');
const memoryBtn = document.getElementById('memory');
const streamArea = document.getElementById('streamArea');
const resultDiv = document.getElementById('result');
const evidenceDiv = document.getElementById('evidence');
const personaSelect = document.getElementById('personaSelect');
const statusSpan = document.getElementById('status');

let currentActionId = null;
let streamBuffer = "";

// Load persona definitions from personas.json and populate selector
async function loadPersonas() {
  try {
    const res = await fetch(chrome.runtime.getURL('personas.json'));
    const data = await res.json();
    // Add a default option at top
    const defOpt = document.createElement('option');
    defOpt.value = '';
    defOpt.innerText = '(default)';
    personaSelect.appendChild(defOpt);

    Object.keys(data).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.innerText = data[key].label || key;
      personaSelect.appendChild(opt);
    });

    // Load any saved persona
    chrome.storage.local.get(['aiassist_persona'], (res) => {
      if (res.aiassist_persona) personaSelect.value = res.aiassist_persona;
    });
  } catch (e) {
    console.warn('Could not load personas.json', e);
  }
}

// Update demo mode status shown in popup
function updateStatus() {
  chrome.storage.local.get(['aiassist_demo'], (res) => {
    const demoOn = (res.aiassist_demo === 'true' || res.aiassist_demo === true);
    statusSpan.innerText = 'Demo Mode: ' + (demoOn ? 'ON' : 'OFF');
  });
}

// Utilities for history
function saveHistory(item) {
  getHistory().then(hist => {
    hist = hist || [];
    hist.unshift(item);
    hist = hist.slice(0, 10);
    chrome.storage.local.set({ aiassist_history: hist });
  });
}

function getHistory() {
  return new Promise(resolve => {
    chrome.storage.local.get('aiassist_history', (res) => {
      resolve(res.aiassist_history || []);
    });
  });
}

// Handle Run button click
runBtn.addEventListener('click', async () => {
  const operation = opSelect.value;
  const text = input.value.trim();

  if (!text && operation !== 'summarize') {
    streamArea.innerText = "Please provide input text or select a page to summarize.";
    return;
  }
  streamArea.innerText = "";
  resultDiv.style.display = 'none';
  evidenceDiv.innerHTML = '';
  streamBuffer = "";
  currentActionId = null;

  // Save selected persona key
  const personaKey = personaSelect.value || '';
  chrome.storage.local.set({ aiassist_persona: personaKey });

  // Send CALL_API to background -> will return actionId; streaming messages will arrive via runtime.onMessage
  chrome.runtime.sendMessage({ type: 'CALL_API', action: operation, text }, (resp) => {
    if (!resp || !resp.actionId) {
      streamArea.innerText = "No response. Please ensure API keys are configured in Options or enable Demo Mode.";
      return;
    }
    currentActionId = resp.actionId;
    streamBuffer = "";
    // show a small placeholder until streaming tokens arrive
    streamArea.innerText = "Waiting for response...";
  });
});

// Open options page
optionsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Show history
historyBtn.addEventListener('click', async () => {
  const hist = await getHistory();
  if (!hist || hist.length === 0) {
    streamArea.innerText = "No history yet.";
    return;
  }
  streamArea.innerText = hist.map(h => `${new Date(h.time).toLocaleString()} — ${h.op}\nIN:\n${h.input}\nOUT:\n${h.output}\n\n`).join("\n----------\n");
  resultDiv.style.display = 'none';
  evidenceDiv.innerHTML = '';
});

// Page Memory preview for current tab
memoryBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) {
      streamArea.innerText = 'No active tab';
      return;
    }
    chrome.runtime.sendMessage({ type: 'REQUEST_PAGE_MEMORY', url: tabs[0].url }, (mem) => {
      if (!mem) {
        streamArea.innerText = "No page memory found for this page. Open the page and reload the extension to capture memory.";
        return;
      }
      const preview = [
        `Title: ${mem.title}`,
        `Paragraphs: ${Math.min(5, (mem.paragraphs || []).length)} (saved ${new Date(mem.extractedAt).toLocaleString()})`,
        '',
        'Top paragraphs:',
        ...(mem.paragraphs.slice(0,4).map((p,i)=>`${i+1}. ${p.slice(0,140)}`))
      ].join('\n\n');
      streamArea.innerText = preview;
      resultDiv.style.display = 'none';
      evidenceDiv.innerHTML = '';
    });
  });
});

// Listen for streaming tokens and final results (background sends STREAM_TOKEN and CALL_API_RESULT)
chrome.runtime.onMessage.addListener((msg) => {
  if (!msg) return;

  // Streaming token messages
  if (msg.type === 'STREAM_TOKEN' && msg.actionId && msg.actionId === currentActionId) {
    // Append token chunk to the stream buffer and update UI
    streamBuffer += msg.token;
    // Replace placeholder text when first token arrives
    if (streamArea.innerText === "Waiting for response..." || streamArea.innerText === "") {
      streamArea.innerText = "";
    }
    streamArea.innerText = streamBuffer;
  }

  // Final result for the action
  if (msg.type === 'CALL_API_RESULT' && msg.actionId && msg.actionId === currentActionId) {
    // Reset currentActionId - result arrived
    currentActionId = null;

    if (msg.error) {
      streamArea.innerText = `Error: ${msg.error}`;
      resultDiv.style.display = 'none';
      evidenceDiv.innerHTML = '';
      return;
    }

    const output = (typeof msg.output === 'string') ? msg.output : JSON.stringify(msg.output, null, 2);
    // If we had streaming text, keep that as-is and also show final in resultDiv
    resultDiv.innerText = output;
    resultDiv.style.display = 'block';
    // Save history
    const op = opSelect.value;
    const inputText = input.value.trim();
    saveHistory({ op, input: inputText, output, time: Date.now() });

    // If model returned structured JSON with evidence, display chips
    try {
      const parsed = (typeof msg.output === 'string') ? JSON.parse(msg.output) : msg.output;
      if (parsed && parsed.evidence && Array.isArray(parsed.evidence)) {
        evidenceDiv.innerHTML = parsed.evidence.map((ev, i) => {
          const snippet = (ev.snippet || '').slice(0,120).replace(/\n/g,' ');
          const paraIndex = ev.paraIndex || 0;
          const conf = Math.round((ev.confidence || 0) * 100);
          return `<div class="evidence-chip" data-para="${paraIndex}">${snippet} — ${conf}%</div>`;
        }).join('');
        // attach click handlers to chips
        Array.from(evidenceDiv.querySelectorAll('.evidence-chip')).forEach(ch => {
          ch.addEventListener('click', () => {
            const paraIndex = parseInt(ch.getAttribute('data-para'));
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (!tabs || !tabs[0]) return;
              chrome.tabs.sendMessage(tabs[0].id, { type: 'HIGHLIGHT_PARAGRAPH', paraIndex });
            });
          });
        });
      } else {
        evidenceDiv.innerHTML = '';
      }
    } catch (e) {
      // Not JSON or no evidence field - ignore
      evidenceDiv.innerHTML = '';
    }
  }
});

// Try to pre-fill input with selection from active tab and initialize UI
document.addEventListener('DOMContentLoaded', async () => {
  await loadPersonas();
  updateStatus();

  // Pre-fill input if user has a selection on current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) return;
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => window.getSelection().toString()
    }, (results) => {
      if (results && results[0] && results[0].result) {
        input.value = results[0].result;
      }
    });
  });
});
