let phishingURLs = [];

// Fetch the phishing URLs from the CSV file and store them in an array
// This is done in the background script to avoid CORS issues and to keep the content script clean
fetch(chrome.runtime.getURL("data/phishing-urls.csv"))
  .then((response) => response.text())
  .then((data) => {
    const rows = data.split("\n");
    rows.forEach((row) => {
      const url = row.trim().split(",")[0];
      if (url) phishingURLs.push(url);
    });
  });

// Unified message handler there were two separate listeners for the same purpose
// and it was causing confusion. This one handles all messages in one place.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getPhishingList") {
    sendResponse({ phishingList: phishingURLs });
  }

  else if (message.fraudDetected) {
    console.log("⚠️ Fraud detected on tab:", sender.tab?.url);
    console.log("Reason:", message.reason);
  }

  else if (message.action === "goHome" && sender.tab?.id) {
    chrome.tabs.create({ url: "chrome://newtab" }, () => {
      chrome.tabs.remove(sender.tab.id);
    });
  }
});

