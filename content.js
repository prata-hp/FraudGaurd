console.log("✅ Script loaded: content.js");

const suspiciousPatterns = [
  { pattern: /@/, reason: "URL contains '@' symbol." },
  { pattern: /\d+\.\d+\.\d+\.\d+/, reason: "IP address used instead of domain." },
  { pattern: /https?:\/\/(.*)\.(xyz|tk|ml)/, reason: "Suspicious TLD (.xyz, .tk, .ml)." },
  { pattern: /.{999,}/, reason: "Unusually long URL." },
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
  })

  chrome.runtime.sendMessage({ fraudDetected: true, reason: reason });
  showRedWarning(reason);
}

// 6. Show banner
function showRedWarning(reason, source = "general") {
  const style = document.createElement("style");
  const backgroundColors = {
    google: "#8e0000",        // Deep red
    ml: "#b30086",            // Purple
    virustotal: "#004080",    // Blue
    regex: "#804000",         // Brown
    csv: "#660000",           // Maroon
    general: "#550000"        // Fallback
  };
  const bgColor = backgroundColors[source] || backgroundColors.general;

  style.textContent = `
    .fraud-fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: ${bgColor};
      color: white;
      font-family: 'Segoe UI', 'Helvetica Neue', sans-serif;
      font-size: 18px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      padding: 2rem;
      box-sizing: border-box;
      text-align: center;
      box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.6);
    }

    .fraud-fullscreen h1 {
      font-size: 2.8rem;
      margin-bottom: 1rem;
      color: white;
      text-shadow: 1px 1px 2px black;
    }

    .fraud-fullscreen small {
      font-size: 1.2rem;
      color: #ffdede;
      margin-bottom: 2rem;
      display: block;
    }

    .fraud-fullscreen button {
      font-size: 1rem;
      padding: 0.7rem 1.4rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      margin: 0 0.5rem;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .fraud-fullscreen #continueBtn {
      background: white;
      color: ${bgColor};
      font-weight: bold;
    }

    .fraud-fullscreen #learnBtn {
      background: transparent;
      color: white;
      border: 2px solid white;
    }

    .fraud-fullscreen #continueBtn:hover {
      background: #ffe5e5;
      transform: scale(1.05);
    }

    .fraud-fullscreen #learnBtn:hover {
      background: white;
      color: ${bgColor};
      transform: scale(1.05);
    }

    .fraud-fullscreen .button-group {
      display: flex;
      flex-direction: row;
      gap: 1rem;
    }
  `;
  document.head.appendChild(style);

  const banner = document.createElement("div");
  banner.className = "fraud-fullscreen";
  banner.innerHTML = `
    <h1>⚠️ This website may be fraudulent</h1>
    <small>Reason: ${reason}</small>
    <div class="button-group">
      <button id="continueBtn">Continue Anyway</button>
      <button id="learnBtn">Why is this suspicious?</button>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById("continueBtn").onclick = () => banner.remove();

  document.getElementById("learnBtn").onclick = () => {
    const redirectUrl = chrome.runtime.getURL(
      "explanation.html?reason=" + encodeURIComponent(reason) +
      "&url=" + encodeURIComponent(window.location.href)
    );
    window.location.href = redirectUrl;
  };
}
