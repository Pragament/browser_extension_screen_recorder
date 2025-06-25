let recorderWindow = null;

document.getElementById("start").addEventListener("click", async () => {
  const { fps = 30 } = await chrome.storage.sync.get(["fps"]);
  recorderWindow = await chrome.windows.create({
    url: `window.html?fps=${fps}`,
    type: "popup",
    width: 500,
    height: 400
  });
});

document.getElementById("stopShare").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "stopRecording" }, (res) => {
    alert(res?.success ? "Recording stopped." : "No active recording.");
  });
});

document.getElementById("settings-icon").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (recorderWindow && recorderWindow.id === windowId) {
    recorderWindow = null;
  }
});