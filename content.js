console.log("✅ Script loaded: content.js");

const suspiciousPatterns = [
  { pattern: /@/, reason: "URL contains '@' symbol." },
  { pattern: /\d+\.\d+\.\d+\.\d+/, reason: "IP address used instead of domain." },
  { pattern: /https?:\/\/(.*)\.(xyz|tk|ml)/, reason: "Suspicious TLD (.xyz, .tk, .ml)." },
  { pattern: /.{75,}/, reason: "Unusually long URL." },
  { pattern: /(login|secure|bank|verify).*\.(com|net)/, reason: "Login-related keywords in domain." },
];

const url = window.location.href;
let matchedReason = "";

// 1. Check URL against regex patterns
suspiciousPatterns.forEach((entry) => {
  if (entry.pattern.test(url)) {
    matchedReason = entry.reason;
  }
});

// 2. Ask background to check via Google Safe Browsing API
chrome.runtime.sendMessage({ type: "check_url", url: url });

// 3. Also check phishing list from local CSV (if implemented)
chrome.runtime.sendMessage({ type: "getPhishingList" }, (response) => {
  const isPhishingURL = response?.phishingList?.some((phishUrl) => url.includes(phishUrl));

  if (isPhishingURL || matchedReason) {
    const reason = isPhishingURL ? "Listed in phishing database." : matchedReason;

    saveFraudStatusAndShow(reason);
  }
});

// 4. Receive Google API result and show banner if needed
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "show_warning" && msg.reason) {
    saveFraudStatusAndShow(msg.reason);
  }
});

// 5. Save to localStorage and show banner
function saveFraudStatusAndShow(reason) {
  chrome.storage.local.set({
    fraudStatus: {
      url: url,
      reason: reason,
      timestamp: Date.now()
    }
  });

  chrome.runtime.sendMessage({ fraudDetected: true, reason: reason });
  showRedWarning(reason);
}

// 6. Show banner
function showRedWarning(reason) {
  const style = document.createElement("style");
  style.textContent = `
    .fraud-banner {
      position: fixed;
      top: 0;
      left: 0;
      width: 97%;
      background: linear-gradient(90deg, #8e0000, #cc0000);
      color: white;
      padding: 1rem 2rem;
      font-family: 'Segoe UI', sans-serif;
      font-size: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      z-index: 999999;
    }
    .fraud-banner button {
      background: white;
      border: none;
      color: #cc0000;
      font-weight: bold;
      padding: 0.5rem 1rem;
      margin-left: 0.5rem;
      border-radius: 5px;
      cursor: pointer;
      transition: background 0.3s;
    }
    .fraud-banner button:hover {
      background: #ffe5e5;
    }
    .fraud-banner small {
      font-size: 14px;
      color: #ffdede;
    }
  `;
  document.head.appendChild(style);

  const banner = document.createElement("div");
  banner.className = "fraud-banner";
  banner.innerHTML = `
    <div>
      ⚠️ <strong>Warning:</strong> This site may be fraudulent<br>
      <small>Reason: ${reason}</small>
    </div>
    <div>
      <button id="continueBtn">Continue</button>
      <button id="learnBtn">Why is this suspicious?</button>
    </div>
  `;
  document.body.prepend(banner);

  document.getElementById("continueBtn").onclick = () => banner.remove();

  document.getElementById("learnBtn").onclick = () => {
    const redirectUrl = chrome.runtime.getURL(
      `explanation.html?reason=${encodeURIComponent(reason)}&url=${encodeURIComponent(url)}`
    );
    window.location.href = redirectUrl;
  };

  setTimeout(() => {
    if (document.body.contains(banner)) banner.remove();
  }, 20000);
}
