let phishingURLs = [];

// Load phishing URLs from CSV into memory on startup
fetch(chrome.runtime.getURL("data/phishing-urls.csv"))
  .then((response) => response.text())
  .then((data) => {
    const rows = data.split("\n");
    rows.forEach((row) => {
      const url = row.trim().split(",")[0];
      if (url) phishingURLs.push(url);
    });
  });

// Listen for incoming messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Return the list of phishing URLs
  if (message.type === "getPhishingList") {
    sendResponse({ phishingList: phishingURLs });
  }

  // When fraud is detected
  else if (message.fraudDetected) {
    const detectedUrl = sender.tab?.url || "unknown";

    // Save fraud status in local storage
    chrome.storage.local.set({
      fraudStatus: {
        url: detectedUrl,
        reason: message.reason || "Unknown reason"
      }
    });

    // Optional: send message to other parts if needed
    // Note: popup.js might not be open, but this is harmless
    chrome.runtime.sendMessage({
      fraudDetected: true,
      reason: message.reason,
      url: detectedUrl
    });

    console.warn("🚨 Fraud detected on:", detectedUrl);
    console.warn("Reason:", message.reason);
  }

  // Redirect user to a safe tab
  else if (message.action === "goHome" && sender.tab?.id) {
    chrome.tabs.create({ url: "chrome://newtab" }, () => {
      chrome.tabs.remove(sender.tab.id);
    });
  }
});
