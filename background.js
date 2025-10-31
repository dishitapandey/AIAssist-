// background.js – core background logic for AIAssist+
// Handles context menus, API calls (real or demo), and streaming

let actionCounter = 0;

// Context menu setup
chrome.runtime.onInstalled.addListener(() => {
  const contexts = ["selection"];
  const actions = [
    { id: "summarize", title: "Summarize selection" },
    { id: "rewrite", title: "Rewrite selection" },
    { id: "translate", title: "Translate selection" },
    { id: "proofread", title: "Proofread selection" }
  ];
  actions.forEach(a => {
    chrome.contextMenus.create({
      id: a.id,
      title: "AIAssist: " + a.title,
      contexts
    });
  });
});

// When user right-clicks and chooses an action
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.selectionText) return;
  const action = info.menuItemId;
  const text = info.selectionText;
  const msg = { type: 'CALL_API', action, text };
  chrome.tabs.sendMessage(tab.id, msg);
});

// Handle incoming messages from popup/content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  if (msg.type === 'CALL_API') {
    const actionId = ++actionCounter;
    handleApiRequest(msg.action, msg.text, actionId);
    sendResponse({ actionId });
    return true; // async
  }

  if (msg.type === 'REQUEST_PAGE_MEMORY') {
    chrome.storage.local.get(['aiassist_memory'], (res) => {
      const memory = (res.aiassist_memory || {})[msg.url];
      sendResponse(memory);
    });
    return true;
  }
});

// Function to handle both demo + real API calls
async function handleApiRequest(action, text, actionId) {
  chrome.storage.local.get(['aiassist_demo', 'aiassist_apiBase', 'aiassist_apiKey'], async (res) => {
    const demo = (res.aiassist_demo === 'true' || res.aiassist_demo === true);

    // DEMO MODE → Simulated streaming output
    if (demo) {
      console.log('🧩 Demo mode active — streaming fake response');
      const fakeText = await getDemoResponse(action, text);
      const tokens = fakeText.split(' ');
      for (let i = 0; i < tokens.length; i++) {
        await delay(80);
        chrome.runtime.sendMessage({ type: 'STREAM_TOKEN', token: tokens[i] + ' ', actionId });
      }
      chrome.runtime.sendMessage({ type: 'CALL_API_RESULT', output: fakeText, actionId });
      return;
    }

    // REAL MODE → use real API call
    const apiBase = res.aiassist_apiBase || '';
    const apiKey = res.aiassist_apiKey || '';
    if (!apiBase || !apiKey) {
      chrome.runtime.sendMessage({
        type: 'CALL_API_RESULT',
        error: 'Missing API credentials. Configure them in Options or enable Demo Mode.',
        actionId
      });
      return;
    }

    try {
      const endpoint = `${apiBase}/prompt`;
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          input: text,
          operation: action
        })
      });

      const data = await resp.json();
      const resultText = data.output || data.result || JSON.stringify(data);
      chrome.runtime.sendMessage({ type: 'CALL_API_RESULT', output: resultText, actionId });
    } catch (err) {
      chrome.runtime.sendMessage({
        type: 'CALL_API_RESULT',
        error: err.message,
        actionId
      });
    }
  });
}

// Demo mode: load sample responses
async function getDemoResponse(action, text) {
  try {
    const res = await fetch(chrome.runtime.getURL('sample_responses.json'));
    const data = await res.json();
    const options = data[action] || data['default'];
    const choice = options[Math.floor(Math.random() * options.length)];
    return choice.replace('{input}', text.slice(0, 100));
  } catch (e) {
    return "Demo mode active, but could not load sample_responses.json. " + e.message;
  }
}

// Delay helper
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
