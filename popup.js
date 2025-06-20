document.getElementById("start").addEventListener("click", async () => {
  const source = document.getElementById("source").value;

  const result = await chrome.storage.sync.get(["fps"]);
  const fps = result.fps || 30;

  const url = `window.html?source=${source}&fps=${fps}`;
  chrome.windows.create({
    url,
    type: "popup",
    width: 500,
    height: 400
  });
});

document.getElementById("settings-icon").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
