// Store the URL of the suspicious website and reason passed via query params
const urlParams = new URLSearchParams(window.location.search);
const suspiciousUrl = urlParams.get('url');
const reason = urlParams.get('reason'); // Reason passed from background.js

// Display the suspicious URL on the page (shorten it for better display)
const displayUrl = suspiciousUrl.length > 50 ? suspiciousUrl.substring(0, 50) + '...' : suspiciousUrl;
document.getElementById('suspiciousUrl').textContent = displayUrl;

// Display the reason on the page
document.getElementById('reason').textContent = reason || "No reason provided";

// Countdown logic -- this is commented out for now
// Uncomment to enable countdown
// let seconds = 7;
// const countdown = document.getElementById('countdown');
// const interval = setInterval(() => {
//   seconds--;
//   countdown.innerText = `Redirecting in ${seconds} second${seconds !== 1 ? 's' : ''}...`;
//   if (seconds <= 0) {
//     clearInterval(interval);
//     // Redirect back to the previous page or last known safe page
//     window.history.back();
//   }
// }, 1000);

// Handle the "Go Back to Safety" button click
document.getElementById('goBack').addEventListener('click', () => {
    const toast = document.createElement("div");
    toast.innerText = "Redirecting to safety...";
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.backgroundColor = "#333";
    toast.style.color = "#fff";
    toast.style.padding = "12px 24px";
    toast.style.borderRadius = "8px";
    toast.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
    toast.style.zIndex = "10000";
    toast.style.fontSize = "16px";
    document.body.appendChild(toast);
  
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: "goHome" });
    }, 1500);
  });
  

// // Handle the "Report This Site" button click
// document.getElementById('report').addEventListener('click', () => {
//   // Here, you can implement a mechanism to report the site (e.g., sending it to a server)
//   let reportStatus = document.getElementById('reportStatus');
//   reportStatus.textContent = 'This site has been reported.';
//   reportStatus.style.color = 'green';
//   // Optionally, log it or send to a backend for tracking
//   console.log(`Reported: ${suspiciousUrl}`);
// });

document.getElementById('report').addEventListener('click', () => {
  const reportUrl = chrome.runtime.getURL(
    `reportpage.html?url=${encodeURIComponent(suspiciousUrl)}`
  );
  window.location.href = reportUrl;
});