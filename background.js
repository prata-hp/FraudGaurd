let phishingURLs = [];

// Load phishing URLs from CSV into memory
fetch(chrome.runtime.getURL("data/phishing-urls.csv"))
  .then((response) => response.text())
  .then((data) => {
    const rows = data.split("\n");
    rows.forEach((row) => {
      const url = row.trim().split(",")[0];
      if (url) phishingURLs.push(url);
    });
  });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Return the phishing URL list
  if (message.type === "getPhishingList") {
    sendResponse({ phishingList: phishingURLs });
  }

  // Log detected fraud
  else if (message.fraudDetected) {
    console.log("⚠️ Fraud detected on tab:", sender.tab?.url);
    console.log("Reason:", message.reason);
  }

  // Handle "Go Back to Safety"
  else if (message.action === "goHome" && sender.tab?.id) {
    chrome.tabs.create({ url: "chrome://newtab" }, () => {
      chrome.tabs.remove(sender.tab.id);
    });
  }

  
});

