let phishingURLs = [];
const API_KEY = ""; 
console.log("✅ Script loaded: background.js");

// 1. Load phishing URLs from CSV on extension startup
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

  // 2B: Handle real-time fraud detection using Google Safe Browsing API
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

        // Send message to content.js to show the warning banner
        chrome.tabs.sendMessage(sender.tab.id, {
          type: "show_warning",
          reason: reason
        });

        // Also save to local storage for reference
        chrome.storage.local.set({
          fraudStatus: {
            url: urlToCheck,
            reason: reason,
            timestamp: Date.now()
          }
        });

        console.warn("🚨 Google flagged URL:", urlToCheck, "| Reason:", reason);
      }
    })
    .catch((error) => console.error("🛑 Google Safe Browsing API error:", error));
  }

  // 2C: Log fraud if sent by content.js
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
  }

  // 2D: Optionally close tab or redirect to newtab
  else if (message.action === "goHome" && sender.tab?.id) {
    chrome.tabs.create({ url: "chrome://newtab" }, () => {
      chrome.tabs.remove(sender.tab.id);
    });
  }
});
