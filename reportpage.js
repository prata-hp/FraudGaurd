const urlParams = new URLSearchParams(window.location.search);
const suspiciousUrl = urlParams.get("url");
document.getElementById("reportedUrl").textContent = suspiciousUrl;

const tagList = [
  "Phishing", "Banking Fraud", "Fake Login", "Suspicious Redirect",
  "Fake Offers", "Lottery Scam", "Impersonation", "Fake Payment Gateway",
  "Investment Scam", "Crypto Scam", "Online Shopping Fraud", "Impersonating Govt",
  "Ransomware Site", "Fake Tech Support", "Data Harvesting", "Account Stealing",
  "Malicious Popups", "Drive-by Download", "Cookie Theft", "Fake Invoices",
  "SEO Poisoning", "Skimming Site", "Romance Scam", "Job Scam",
  "Clone Website", "Fake NGO", "Social Engineering", "Whaling Attack",
  "Keylogger", "Trojan Distribution", "Email Spoofing", "DNS Spoofing",
  "Hidden Iframes", "Suspicious JavaScript", "Session Hijacking",
  "QR Code Scam", "Ad Fraud", "Mule Recruitment", "Subscription Trap",
  "Dropper Host", "Credential Phishing", "Zero-day Exploit"
];

const tagContainer = document.getElementById("tags");
tagList.forEach(tag => {
  const tagEl = document.createElement("div");
  tagEl.textContent = tag;
  tagEl.className = "tag";
  tagEl.onclick = () => tagEl.classList.toggle("selected");
  tagContainer.appendChild(tagEl);
});

document.getElementById("submitReport").addEventListener("click", () => {
  const description = document.getElementById("description").value;
  const selectedTags = Array.from(document.querySelectorAll(".tag.selected"))
    .map(el => el.textContent);

  if (!description || selectedTags.length === 0) {
    return alert("Please fill in a description and select at least one tag.");
  }

  const reportData = `${suspiciousUrl},${selectedTags.join("|")},"${description.replace(/\"/g, "'")}"\n`;



  // Send to background to store in report.csv
  chrome.runtime.sendMessage({ type: "saveReport", row: reportData });

  // Show confirmation message
  const toast = document.createElement("div");
  toast.innerText = "✅ Report submitted successfully.";
  toast.style.position = "fixed";
  toast.style.bottom = "30px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.backgroundColor = "#e6ffed";
  toast.style.color = "#207d3a";
  toast.style.padding = "14px 24px";
  toast.style.borderRadius = "10px";
  toast.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
  toast.style.zIndex = "9999";
  toast.style.fontSize = "16px";
  toast.style.fontWeight = "500";
  toast.style.transition = "opacity 0.5s ease, transform 0.5s ease";
  toast.style.opacity = "0";
  toast.style.transform = "translateX(-50%) scale(0.95)";
  
  // Add to document and animate in
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) scale(1)";
  }, 50);
  
  // Fade out and redirect after 3s
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) scale(0.95)";
    setTimeout(() => {
      toast.remove();
      chrome.runtime.sendMessage({ action: "goHome" });
    }, 500);
  }, 3000);
  

});
