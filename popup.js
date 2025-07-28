// popup.js

// This button is for manual recording on generic sites
document.getElementById("start").addEventListener("click", () => {
    // isExam is false because this is a manual start
    chrome.runtime.sendMessage({ action: "startRecording", isExam: false });
});

// The stop button is universal
document.getElementById("stop").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "stopRecording" });
});

document.getElementById("settings-icon").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
});
