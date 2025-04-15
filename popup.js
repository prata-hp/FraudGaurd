chrome.storage.local.get("fraudDetails", (data) => {
  const status = document.getElementById("status");
  if (data.fraudDetails) {
    status.style.background = "#ff4c4c";
    status.textContent = "Warning: " + data.fraudDetails.reason + " (" + data.fraudDetails.source + ")";
  } else {
    status.style.background = "#4CAF50";
    status.textContent = "This website appears safe.";
  }
});

document.getElementById("report").addEventListener("click", () => {
  alert("This site has been reported.");
});