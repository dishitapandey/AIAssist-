// contentScript.js - full file to extract page memory, show floating UI, and handle highlights

const FLOAT_ID = "aiassist-floating";

// Utility: create floating result box
function createFloatingBox() {
  removeFloatingBox();
  const div = document.createElement("div");
  div.id = FLOAT_ID;
  div.style.position = "fixed";
  div.style.right = "20px";
  div.style.bottom = "20px";
  div.style.zIndex = 2147483647;
  div.style.width = "360px";
  div.style.maxHeight = "60vh";
  div.style.overflow = "auto";
  div.style.background = "white";
  div.style.border = "1px solid #ddd";
  div.style.boxShadow = "0 6px 20px rgba(0,0,0,0.12)";
  div.style.padding = "12px";
  div.style.borderRadius = "8px";
  div.innerHTML = `
    <div style="font-weight:700;margin-bottom:6px">AIAssist</div>
    <div id="aiassist-result">Waiting...</div>
    <div style="display:flex; gap:8px; margin-top:8px">
      <button id="aiassist-copy">Copy</button>
      <button id="aiassist-close">Close</button>
    </div>
  `;
  document.body.appendChild(div);
  document.getElementById("aiassist-close").addEventListener("click", removeFloatingBox);
  document.getElementById("aiassist-copy").addEventListener("click", () => {
    const txt = document.getElementById("aiassist-result").innerText;
    navigator.clipboard.writeText(txt).then(()=> showToast("Copied"));
  });
}

// Remove floating box if present
function removeFloatingBox() {
  const el = document.getElementById(FLOAT_ID);
  if (el) el.remove();
}

// Small toast for feedback
function showToast(msg) {
  let t = document.getElementById('aiassist-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'aiassist-toast';
    t.style.position = 'fixed';
    t.style.left = '50%';
    t.style.top = '20px';
    t.style.transform = 'translateX(-50%)';
    t.style.background = '#111';
    t.style.color = 'white';
    t.style.padding = '8px 12px';
    t.style.borderRadius = '6px';
    t.style.zIndex = 2147483647;
    document.body.appendChild(t);
  }
  t.innerText = msg;
  t.style.opacity = '1';
  setTimeout(()=> t.style.opacity='0', 2000);
}

// Highlight paragraph by index
function highlightParagraph(index) {
  const paras = Array.from(document.querySelectorAll('p'));
  const p = paras[index];
  if (!p) return;
  const prev = p.style.boxShadow;
  p.style.transition = 'box-shadow 0.3s ease';
  p.style.boxShadow = '0 0 0 6px rgba(37,99,235,0.12)';
  p.scrollIntoView({behavior:'smooth', block:'center'});
  setTimeout(()=> p.style.boxShadow = prev, 3500);
}

// Extract page content (paragraphs, headings, images) for Page Memory
function extractPageMemory() {
  const paragraphs = Array.from(document.querySelectorAll('p'))
    .map(p => p.innerText.trim())
    .filter(Boolean);
  const headings = Array.from(document.querySelectorAll('h1,h2,h3'))
    .map(h => ({tag: h.tagName, text: h.innerText.trim()}));
  const images = Array.from(document.querySelectorAll('img'))
    .map(i => ({src: i.src, alt: i.alt || ''}));
  return {
    title: document.title,
    url: location.href,
    paragraphs,
    headings,
    images,
    extractedAt: Date.now()
  };
}

// Send page memory to background for storage
function savePageMemory() {
  const memory = extractPageMemory();
  try {
    chrome.runtime.sendMessage({ type: 'SAVE_PAGE_MEMORY', url: location.href, memory }, (resp) => {
      // optional callback
      // console.log('SAVE_PAGE_MEMORY response', resp);
    });
  } catch (e) {
    console.error('contentScript: failed to send SAVE_PAGE_MEMORY', e);
  }
}

// Listen for messages from background/popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;

  if (msg.type === "AIASSIST_CONTEXT") {
    // Show floating UI and indicate processing state
    createFloatingBox();
    const resultDiv = document.getElementById("aiassist-result");
    resultDiv.innerText = "Processing...";
    // Forward the request to background for API call via chrome.runtime
    chrome.runtime.sendMessage({ type: 'CALL_API', action: msg.action, text: msg.text }, (resp) => {
      // background will stream tokens globally and send final result via runtime messages
      // Nothing needed here; popup listens for STREAM_TOKEN / CALL_API_RESULT
    });
  }

  if (msg.type === 'HIGHLIGHT_PARAGRAPH') {
    highlightParagraph(msg.paraIndex);
  }

  if (msg.type === 'FORCE_SAVE_MEMORY') {
    savePageMemory();
    sendResponse({ saved: true });
    return true; // indicate async
  }
});

// Auto save page memory once on page load (useful for popup "Page Memory")
try {
  // Only attempt on normal http(s) pages
  if (location.protocol.startsWith('http')) {
    // delay a bit so page finishes loading
    setTimeout(() => {
      savePageMemory();
      console.log('contentScript.js loaded on', location.href, '- page memory sent');
    }, 800);
  } else {
    console.log('contentScript.js loaded on (non-http), skipping auto save:', location.href);
  }
} catch (e) {
  console.error('contentScript.js exception', e);
}