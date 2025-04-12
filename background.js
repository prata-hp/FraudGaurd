let phishingURLs = [];

fetch(chrome.runtime.getURL('data/phishing-urls.csv'))
  .then(response => response.text())
  .then(data => {
    const rows = data.split('\n');
    rows.forEach(row => {
      const url = row.trim().split(',')[0]; // Get first column
      phishingURLs.push(url);
    });
  });

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === "complete" && tab.url) {
    phishingURLs.forEach(phish => {
      if (tab.url.includes(phish)) {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          function: showRedWarning
        });
      }
    });
  }
});

function showRedWarning() {
  const warning = document.createElement("div");
  warning.innerText = "⚠️ Warning: This site is flagged as fraudulent!";
  warning.style.position = "fixed";
  warning.style.top = "0";
  warning.style.left = "0";
  warning.style.width = "100%";
  warning.style.padding = "1em";
  warning.style.backgroundColor = "red";
  warning.style.color = "white";
  warning.style.fontSize = "20px";
  warning.style.zIndex = "999999";
  document.body.prepend(warning);
}