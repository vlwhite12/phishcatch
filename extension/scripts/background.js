const API_URL_KEY = "phishcatch_api_url";
const DEFAULT_API_URL = "https://phishcatch-ginz.vercel.app";

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANALYZE_EMAIL") {
    analyzeEmail(message.data).then(sendResponse).catch((err) => {
      sendResponse({ error: err.message });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === "GET_SCAN_HISTORY") {
    chrome.storage.local.get(["scanHistory"], (result) => {
      sendResponse(result.scanHistory || []);
    });
    return true;
  }

  if (message.type === "SET_API_URL") {
    chrome.storage.sync.set({ [API_URL_KEY]: message.url }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

async function getApiUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([API_URL_KEY], (result) => {
      resolve(result[API_URL_KEY] || DEFAULT_API_URL);
    });
  });
}

async function analyzeEmail(emailData) {
  const apiUrl = await getApiUrl();

  const response = await fetch(`${apiUrl}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(emailData),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `API error: ${response.status}`);
  }

  const result = await response.json();

  // Save to history
  const historyEntry = {
    ...result,
    subject: emailData.subject,
    sender: emailData.sender,
    timestamp: Date.now(),
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };

  chrome.storage.local.get(["scanHistory"], (stored) => {
    const history = stored.scanHistory || [];
    history.unshift(historyEntry);
    // Keep last 50 scans
    chrome.storage.local.set({ scanHistory: history.slice(0, 50) });
  });

  return result;
}
