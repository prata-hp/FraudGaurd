const urlParams = new URLSearchParams(window.location.search);
const suspiciousUrl = urlParams.get("url");
document.getElementById("reportedUrl").textContent = suspiciousUrl;

// Predefined tags
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

// Render tags
const tagContainer = document.getElementById("tags");
tagList.forEach(tag => {
  const tagEl = document.createElement("div");
  tagEl.textContent = tag;
  tagEl.className = "tag";
  tagEl.onclick = () => tagEl.classList.toggle("selected");
  tagContainer.appendChild(tagEl);
});

// Create and attach the custom tag input and add button
const customTagInput = document.createElement("input");
customTagInput.id = "customTagInput";
customTagInput.placeholder = "Add custom tag";
customTagInput.style.marginTop = "10px";
customTagInput.style.padding = "6px";
customTagInput.style.borderRadius = "5px";
customTagInput.style.border = "1px solid #aaa";
customTagInput.style.width = "200px";

const addTagBtn = document.createElement("button");
addTagBtn.textContent = "➕";
addTagBtn.style.marginLeft = "8px";
addTagBtn.style.padding = "6px 12px";
addTagBtn.onclick = () => {
  const value = customTagInput.value.trim();
  if (value) {
    const tagEl = document.createElement("div");
    tagEl.textContent = value;
    tagEl.className = "tag selected";
    tagEl.onclick = () => tagEl.classList.toggle("selected");
    tagContainer.appendChild(tagEl);
    customTagInput.value = "";
  }
};
tagContainer.appendChild(customTagInput);
tagContainer.appendChild(addTagBtn);

// Submit Report
document.getElementById("submitReport").addEventListener("click", () => {
  const description = document.getElementById("description").value.trim();
  const selectedTags = Array.from(document.querySelectorAll(".tag.selected"))
    .map(el => el.textContent);

  if (!description || selectedTags.length === 0) {
    return alert("Please fill in a description and select at least one tag.");
  }

  // 1. Send to background to save in backend
  chrome.runtime.sendMessage({
    type: "manualReport",
    url: suspiciousUrl,
    tags: selectedTags,
    description: description
  });

  // 2. Also save as CSV in local report (optional)
  const reportData = `${suspiciousUrl},${selectedTags.join("|")},"${description.replace(/\"/g, "'")}"\n`;
  chrome.runtime.sendMessage({ type: "saveReport", row: reportData });

  // 3. Show confirmation toast
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
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) scale(1)";
  }, 50);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) scale(0.95)";
    setTimeout(() => {
      toast.remove();
      chrome.runtime.sendMessage({ action: "goHome" });
    }, 500);
  }, 3000);
});
