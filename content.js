const suspiciousPatterns = [
  /@/,                                // @ symbol
  /\d+\.\d+\.\d+\.\d+/,               // IP in URL
  /https?:\/\/(.*)\.(xyz|tk|ml)/,     // Suspicious TLDs
  /.{75,}/,                           // Very long URLs
  /(login|secure|bank|verify).*\.(com|net)/ // Fake login attempts
];

const url = window.location.href;
let isSuspicious = suspiciousPatterns.some(pattern => pattern.test(url));

// Get phishing URL list from background.js
chrome.runtime.sendMessage({ type: "getPhishingList" }, (response) => {
  const isPhishingURL = response.phishingList.some(phishUrl => url.includes(phishUrl));

  if (isSuspicious || isPhishingURL) {
    const reason = isPhishingURL ? "Listed in phishing database." : "Suspicious URL patterns detected.";
    chrome.runtime.sendMessage({ fraudDetected: true, reason });
  }
});