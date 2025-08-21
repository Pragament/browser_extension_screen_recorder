// background.js
let recorderTabId = null;
let activeTabId = null;

// Track active tab for title updates
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  activeTabId = tabId;

  chrome.scripting.executeScript({
    target: { tabId },
    func: () => document.title
  }, (results) => {
    if (results?.[0]?.result) {
      chrome.storage.local.set({ latestTitle: results[0].result });
    }
  });
});

// Handle messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "START_SCREEN_RECORDING") {
    console.log("🎬 Background: asking Chrome to capture screen...");

    recorderTabId = sender.tab.id;

    chrome.desktopCapture.chooseDesktopMedia(
      ["screen", "window", "tab"],
      sender.tab,
      (streamId) => {
        if (!streamId) {
          console.error("❌ User canceled screen capture");
          sendResponse({ success: false });
          return;
        }

        chrome.tabs.sendMessage(sender.tab.id, {
          type: "SCREEN_SHARE_ID",
          streamId: streamId
        });

        sendResponse({ success: true });
      }
    );

    return true; // keep sendResponse async
  }

  if (msg.type === "STOP_SCREEN_RECORDING") {
    if (recorderTabId) {
      chrome.tabs.sendMessage(recorderTabId, { type: "STOP_SCREEN_RECORDING" });
      console.log("🛑 Sent STOP to content.js");
    }
    sendResponse({ success: true });
  }

  if (msg.type === "SAVE_RECORDING") {
    console.log("💾 Saving file via downloads API...");

    const blobUrl = msg.blobUrl;
    const filename = `recording_${Date.now()}.webm`;

    chrome.downloads.download({
      url: blobUrl,
      filename: filename,
      saveAs: false   // 👈 auto-save, no dialog
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error("❌ Download failed:", chrome.runtime.lastError);
      } else {
        console.log(`✅ Download started (id: ${downloadId})`);
      }
    });

    sendResponse({ success: true });
  }

  if (msg.type === "titleUpdate" && sender.tab?.id === activeTabId) {
    console.log(`📌 Title updated: ${msg.title}`);
    chrome.storage.local.set({ latestTitle: msg.title });
    sendResponse({ success: true });
  }
});
