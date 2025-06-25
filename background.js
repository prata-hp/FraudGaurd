// Dev Notes are provided by h.p in the service worker so The Team follows
// Kindly overlook generous amounts of emojis used

//  Generate and store a local UUID once 
function generateUUID() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

//  Create UID at install time
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("fraudguardUID", (result) => {
    if (!result.fraudguardUID) {
      const uuid = generateUUID();
      chrome.storage.local.set({ fraudguardUID: uuid }, () => {
        console.log("🆔 New UID generated on install:", uuid);
      });
    } else {
      console.log("🆔 Existing UID found on install:", result.fraudguardUID);
    }
  });
});

let phishingURLs = [];
const API_KEY = "AIzaSyBzDNAC22xagUlp236sJgfpbEdXZaLhtgU"; // Google Safe Browsing API key
const BACKEND_URL = "https://fraudguard-backend.onrender.com/api/report";
const VT_API_KEY = "523a0c060eab4bcb8195bc8c4e9b92b0eaa7c0e8588b86e6b36af6f12a026fd1";
console.log("✅ Script loaded: background.js");

// ✅ ML backend phishing detection
async function checkURLWithAPI(tabUrl, tabId) {
  try {
    const response = await fetch("http://localhost:5000/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: tabUrl }),
    });

    if (!response.ok) {
      console.error("⚠️ ML backend error:", response.statusText);
      return checkWithVirusTotal(tabUrl, tabId); // fallback
    }

    const result = await response.json();
    console.log("🤖 ML model prediction:", result);

    if (result.prediction === "phishing") {
      chrome.tabs.sendMessage(tabId, {
        type: "show_warning",
        reason: "AI-flagged phishing",
        source: "ml"
      });

      chrome.storage.local.set({
        fraudStatus: {
          url: tabUrl,
          reason: "AI-flagged phishing",
          timestamp: Date.now(),
        },
      });

      postToBackend(tabUrl, "AI-flagged phishing");
      console.warn("🚨 AI model flagged phishing:", tabUrl);
    } else {
      checkWithVirusTotal(tabUrl, tabId);
    }
  } catch (err) {
    console.error("🛑 ML backend request failed:", err);
    checkWithVirusTotal(tabUrl, tabId); // fallback
  }
}

// ✅ VirusTotal detection if Google + ML pass
async function checkWithVirusTotal(tabUrl, tabId) {
  try {
    const res = await fetch("https://www.virustotal.com/api/v3/urls", {
      method: "POST",
      headers: {
        "x-apikey": VT_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `url=${encodeURIComponent(tabUrl)}`,
    });

    const scan = await res.json();
    const scanId = scan.data?.id;
    if (!scanId) return console.error("⚠️ VT scan ID not found");

    const reportRes = await fetch(`https://www.virustotal.com/api/v3/analyses/${scanId}`, {
      headers: { "x-apikey": VT_API_KEY },
    });
    const report = await reportRes.json();
    const stats = report.data?.attributes?.stats;

    if (stats?.malicious > 0) {
      const reason = `Flagged by ${stats.malicious} VirusTotal engine(s)`;

      chrome.tabs.sendMessage(tabId, {
        type: "show_warning",
        reason: reason,
        source: "virustotal"
      });

      chrome.storage.local.set({
        fraudStatus: {
          url: tabUrl,
          reason: reason,
          timestamp: Date.now(),
        },
      });

      postToBackend(tabUrl, reason);
      console.warn("🚨 VT flagged URL:", tabUrl, "| Reason:", reason);
    } else {
      console.log("✅ VirusTotal clean:", tabUrl);
    }
  } catch (err) {
    console.error("🛑 VirusTotal API error:", err);
  }
}

// Load CSV phishing URLs
fetch(chrome.runtime.getURL("data/phishing-urls.csv"))
  .then((response) => response.text())
  .then((data) => {
    const rows = data.split("\n");
    rows.forEach((row) => {
      const url = row.trim().split(",")[0];
      if (url) phishingURLs.push(url);
    });
  });

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getPhishingList") {
    sendResponse({ phishingList: phishingURLs });
  }

  else if (message.type === "check_url" && message.url) {
    const urlToCheck = message.url;

    // Google Safe Browsing
    fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${API_KEY}`, {
      method: "POST",
      body: JSON.stringify({
        client: { clientId: "fraudguard-extension", clientVersion: "1.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url: urlToCheck }]
        }
      }),
      headers: { "Content-Type": "application/json" }
    })
    .then(res => res.json())
    .then(data => {
      if (data?.matches?.length > 0) {
        const reason = data.matches[0].threatType || "Suspicious link";

        chrome.tabs.sendMessage(sender.tab.id, {
          type: "show_warning",
          reason: reason,
          source: "google"
        });

        chrome.storage.local.set({
          fraudStatus: {
            url: urlToCheck,
            reason: reason,
            timestamp: Date.now()
          }
        });

        console.warn("🚨 Google flagged URL:", urlToCheck, "| Reason:", reason);
        postToBackend(urlToCheck, reason);
      } else {
        checkURLWithAPI(urlToCheck, sender.tab.id);
      }
    })
    .catch((error) => {
      console.error("🛑 Google API error:", error);
      checkURLWithAPI(urlToCheck, sender.tab.id);
    });
  }

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
      url: detectedUrl,
      source: message.source || "regex"
    });

    console.warn("🚨 Regex/CSV Fraud detected on:", detectedUrl);
    console.warn("Reason:", message.reason);
    postToBackend(detectedUrl, message.reason);
  }

  else if (message.action === "goHome" && sender.tab?.id) {
    chrome.tabs.create({ url: "chrome://newtab" }, () => {
      chrome.tabs.remove(sender.tab.id);
    });
  }

  // ✅ Manual user-submitted report handler
  else if (message.type === "manualReport") {
    const reason = `User Report: ${message.tags.join(", ")}`;
    postToBackend(message.url, reason);
    console.log("✅ User report submitted with tags:", message.tags);
  }
});

// Backend ping on tab load
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && /^https?:/.test(tab.url)) {
    fetch("https://fraudguard-backend.onrender.com/api/test")
      .then((res) => res.json())
      .then((data) => console.log("🛰️ Backend says:", data.message))
      .catch((err) => console.error("❌ Backend ping error:", err));
  }
});

// Save to backend with UID
function postToBackend(url, reason) {
  chrome.storage.local.get("fraudguardUID", (result) => {
    const userId = result.fraudguardUID || "anonymous";

    fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: url,
        reason: reason,
        timestamp: Date.now(),
        userId: userId
      })
    })
    .then((res) => res.json())
    .then((data) => console.log("✅ Report sent to backend:", data))
    .catch((err) => console.error("❌ Failed to POST to backend:", err));
  });
}
