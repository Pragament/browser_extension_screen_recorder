document.addEventListener("DOMContentLoaded", () => {
  const fpsSelect = document.getElementById("fps");

  chrome.storage.sync.get(["fps"], (result) => {
    fpsSelect.value = result.fps || "30";
  });

  document.getElementById("save").addEventListener("click", () => {
    const fps = fpsSelect.value;
    chrome.storage.sync.set({ fps }, () => {
      alert("Settings saved!");
    });
  });
});
