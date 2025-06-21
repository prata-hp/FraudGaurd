let phishingURLs = [];
const API_KEY = "AIzaSyBzDNAC22xagUlp236sJgfpbEdXZaLhtgU";
console.log("✅ Script loaded: background.js");

// 0. Custom ML backend phishing detection
async function checkURLWithAPI(tabUrl, tabId) {
  try {
    const response = await fetch("http://localhost:5000/api/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: tabUrl }),
    });

    if (!response.ok) {
      console.error("⚠️ Backend error:", response.statusText);
      return;
    }

    const result = await response.json();
    console.log("🤖 ML model prediction:", result);

    if (result.prediction === "phishing") {
      // Show warning via content.js
      chrome.tabs.sendMessage(tabId, {
        type: "show_warning",
        reason: "AI-flagged phishing",
      });

      // Log locally
      chrome.storage.local.set({
        fraudStatus: {
          url: tabUrl,
          reason: "AI-flagged phishing",
          timestamp: Date.now(),
        },
      });

      console.warn("🚨 AI model flagged phishing:", tabUrl);
    }
  } catch (err) {
    console.error("🛑 ML backend request failed:", err);
  }
}

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

    // 🔍 Google Safe Browsing API
    fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${API_KEY}`,
      {
        method: "POST",
        body: JSON.stringify({
          client: {
            clientId: "fraudguard-extension",
            clientVersion: "1.0",
          },
          threatInfo: {
            threatTypes: [
              "MALWARE",
              "SOCIAL_ENGINEERING",
              "UNWANTED_SOFTWARE",
              "POTENTIALLY_HARMFUL_APPLICATION",
            ],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url: urlToCheck }],
          },
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data && data.matches && data.matches.length > 0) {
          const reason = data.matches[0].threatType || "Suspicious link";

          chrome.tabs.sendMessage(sender.tab.id, {
            type: "show_warning",
            reason: reason,
          });

          chrome.storage.local.set({
            fraudStatus: {
              url: urlToCheck,
              reason: reason,
              timestamp: Date.now(),
            },
          });

          console.warn(
            "🚨 Google flagged URL:",
            urlToCheck,
            "| Reason:",
            reason
          );
        } else {
          // 🔁 If Google did NOT flag it, call your ML backend
          checkURLWithAPI(urlToCheck, sender.tab.id);
        }
      })
      .catch((error) => {
        console.error("🛑 Google Safe Browsing API error:", error);
        // 🔁 Still call ML backend on API failure
        checkURLWithAPI(urlToCheck, sender.tab.id);
      });
  }

  // 2C: Log fraud if sent by content.js
  else if (message.fraudDetected) {
    const detectedUrl = sender.tab?.url || "unknown";

    chrome.storage.local.set({
      fraudStatus: {
        url: detectedUrl,
        reason: message.reason || "Unknown reason",
        timestamp: Date.now(),
      },
    });

    chrome.runtime.sendMessage({
      fraudDetected: true,
      reason: message.reason,
      url: detectedUrl,
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
