const suspiciousPatterns = [
  { pattern: /@/, reason: "URL contains '@' symbol." },
  {
    pattern: /\d+\.\d+\.\d+\.\d+/,
    reason: "IP address used instead of domain.",
  },
  {
    pattern: /https?:\/\/(.*)\.(xyz|tk|ml)/,
    reason: "Suspicious top-level domain (.xyz, .tk, .ml).",
  },
  { pattern: /.{75,}/, reason: "Unusually long URL." },
  {
    pattern: /(login|secure|bank|verify).*\.(com|net)/,
    reason: "Fake login-related keywords in domain.",
  },
];

const url = window.location.href;
let matchedReason = "";

suspiciousPatterns.forEach((entry) => {
  if (entry.pattern.test(url)) {
    matchedReason = entry.reason;
  }
});

chrome.runtime.sendMessage({ type: "getPhishingList" }, (response) => {
  const isPhishingURL = response.phishingList.some((phishUrl) =>
    url.includes(phishUrl)
  );
  if (matchedReason || isPhishingURL) {
    const reason = isPhishingURL
      ? "Listed in phishing database."
      : matchedReason;
    chrome.runtime.sendMessage({ fraudDetected: true, reason });
    showRedWarning(reason);
  }
});

function showRedWarning(reason) {
  const style = document.createElement("style");
  style.textContent = `
    .fraud-banner {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
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
      `explanation.html?reason=${encodeURIComponent(
        reason
      )}&url=${encodeURIComponent(url)}`
    );
    window.location.href = redirectUrl;
  };

  setTimeout(() => {
    if (document.body.contains(banner)) banner.remove();
  }, 10000);
}
