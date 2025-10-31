// options.js
document.addEventListener('DOMContentLoaded', () => {
  const apiBase = document.getElementById('apiBase');
  const apiKey = document.getElementById('apiKey');
  const demoMode = document.getElementById('demoMode');
  const saveBtn = document.getElementById('save');
  const clearMemory = document.getElementById('clearMemory');
  const exportMemory = document.getElementById('exportMemory');

  // Load saved settings
  chrome.storage.local.get(['aiassist_apiBase', 'aiassist_apiKey', 'aiassist_demo'], (res) => {
    apiBase.value = res.aiassist_apiBase || '';
    apiKey.value = res.aiassist_apiKey || '';
    demoMode.value = res.aiassist_demo === 'true' ? 'true' : 'false';
  });

  // Save new settings
  saveBtn.addEventListener('click', () => {
    chrome.storage.local.set({
      aiassist_apiBase: apiBase.value.trim(),
      aiassist_apiKey: apiKey.value.trim(),
      aiassist_demo: demoMode.value
    }, () => {
      alert('✅ Settings saved successfully!');
    });
  });

  // (optional memory buttons)
  clearMemory?.addEventListener('click', () => {
    chrome.storage.local.clear(() => {
      alert('🧹 All saved memory and settings cleared.');
    });
  });

  exportMemory?.addEventListener('click', () => {
    chrome.storage.local.get(null, (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aiassist-memory-export.json';
      a.click();
    });
  });
});
