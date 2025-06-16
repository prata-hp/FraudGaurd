let phishingURLs = [];
const API_KEY = "A"; // Google Safe Browsing API key
const BACKEND_URL = "https://fraudguard-backend.onrender.com/api/report";

console.log("✅ Script loaded: background.js");

// 1. To Load phishing URLs from CSV on extension startup
fetch(chrome.runtime.getURL("data/phishing-urls.csv"))
  .then((response) => response.text())
  .then((data) => {
    const rows = data.split("\n");
    rows.forEach((row) => {
      const url = row.trim().split(",")[0];
      if (url) phishingURLs.push(url);
    });
  });

// 2. Listen for messages from content.js or popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 2A: Send phishing list from local CSV
  if (message.type === "getPhishingList") {
    sendResponse({ phishingList: phishingURLs });
  }

  // 2B: Check via Google Safe Browsing API
  else if (message.type === "check_url" && message.url) {
    const urlToCheck = message.url;

    fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${API_KEY}`, {
      method: "POST",
      body: JSON.stringify({
        client: {
          clientId: "fraudguard-extension",
          clientVersion: "1.0"
        },
        threatInfo: {
          threatTypes: [
            "MALWARE",
            "SOCIAL_ENGINEERING",
            "UNWANTED_SOFTWARE",
            "POTENTIALLY_HARMFUL_APPLICATION"
          ],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url: urlToCheck }]
        }
      }),
      headers: {
        "Content-Type": "application/json"
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.matches && data.matches.length > 0) {
          const reason = data.matches[0].threatType || "Suspicious link";

          // Show warning
          chrome.tabs.sendMessage(sender.tab.id, {
            type: "show_warning",
            reason: reason
          });

          // Save to local
          chrome.storage.local.set({
            fraudStatus: {
              url: urlToCheck,
              reason: reason,
              timestamp: Date.now()
            }
          });

          console.warn("🚨 Google flagged URL:", urlToCheck, "| Reason:", reason);

          // ✅ Send to backend
          postToBackend(urlToCheck, reason);
        }
      })
      .catch((error) => console.error("🛑 Google API error:", error));
  }

  // 2C: Handle Regex/CSV matches from content.js
  else if (message.fraudDetected) {
    const detectedUrl = sender.tab?.url || "unknown";

    chrome.storage.local.set({
      fraudStatus: {
        url: detectedUrl,
        reason: message.reason || "Unknown reason",
        timestamp: Date.now()
      }
    });

    chrome.runtime.sendMessage({
      fraudDetected: true,
      reason: message.reason,
      url: detectedUrl
    });

    console.warn("🚨 Regex/CSV Fraud detected on:", detectedUrl);
    console.warn("Reason:", message.reason);

    // ✅ Send to backend
    postToBackend(detectedUrl, message.reason);
  }

  // 2D: Close tab if user clicks "Go Home"
  else if (message.action === "goHome" && sender.tab?.id) {
    chrome.tabs.create({ url: "chrome://newtab" }, () => {
      chrome.tabs.remove(sender.tab.id);
    });
  }
});

// 3. Ping backend on tab load (optional)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && /^https?:/.test(tab.url)) {
    fetch("https://fraudguard-backend.onrender.com/api/test")
      .then((res) => res.json())
      .then((data) => console.log("🛰️ Backend says:", data.message))
      .catch((err) => console.error("❌ Backend ping error:", err));
  }
});

// 🔁 Backend submission logic
function postToBackend(url, reason) {
  fetch(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: url,
      reason: reason,
      timestamp: Date.now()
    })
  })
    .then((res) => res.json())
    .then((data) => console.log("✅ Sent to Firebase via backend:", data))
    .catch((err) => console.error("❌ Failed to POST to backend:", err));
}
