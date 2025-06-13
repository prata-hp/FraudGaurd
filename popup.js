console.log("✅ Script loaded: popup.js");

// Logo click – redirect
// Open external FraudGuard site when logo is clicked
document.getElementById("logo").addEventListener("click", () => {
  window.open("options.html", "_blank");
});

// Open report page with current URL
document.getElementById("report-btn").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const url = tabs[0].url;
    chrome.tabs.create({
      url: chrome.runtime.getURL(`reportpage.html?url=${encodeURIComponent(url)}`)
    });
  });
});

// DOM ready fallback (set to safe after 1.5s if no status update)
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const statusText = document.getElementById("status-text");
    if (statusText.textContent === "Checking...") {
      document.getElementById("status-dot").style.backgroundColor = "green";
      statusText.textContent = "Safe";
      statusText.style.color = "green";
    }
  }, 1500);
});

// Query storage to reflect fraud status based on current tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentUrl = tabs[0].url;

  chrome.storage.local.get("fraudStatus", (data) => {
    const status = data.fraudStatus;

    const statusDot = document.getElementById("status-dot");
    const statusText = document.getElementById("status-text");

    if (status && currentUrl.includes(status.url)) {
      statusDot.style.backgroundColor = "red";
      statusText.textContent = "Unsafe";
      statusText.style.color = "red";
    } else {
      statusDot.style.backgroundColor = "green";
      statusText.textContent = "Safe";
      statusText.style.color = "green";
    }
  });
});

// This message listener is still valid for runtime messages, fallback or expansion
chrome.runtime.onMessage.addListener((message) => {
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");

  if (message.fraudDetected === true) {
    statusDot.style.backgroundColor = "red";
    statusText.textContent = "Unsafe";
    statusText.style.color = "red";
  } else if (message.fraudDetected === false) {
    statusDot.style.backgroundColor = "green";
    statusText.textContent = "Safe";
    statusText.style.color = "green";
  }
});
