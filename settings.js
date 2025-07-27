document.addEventListener("DOMContentLoaded", () => {
  const fpsSelect = document.getElementById("fps");
  const sourceSelect = document.getElementById("source");

  // Load stored settings
  chrome.storage.sync.get(["fps", "source"], (result) => {
    fpsSelect.value = result.fps || "30";
    sourceSelect.value = result.source || "screen";
  });

  // Save both settings
  document.getElementById("save").addEventListener("click", () => {
    const fps = fpsSelect.value;
    const source = sourceSelect.value;

    chrome.storage.sync.set({ fps, source }, () => {
      alert("Settings saved!");
    });
  });
});
