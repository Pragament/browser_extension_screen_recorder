// background.js
let recorderTabId = null;
let recorderWindowId = null;
let activeTabId = null;

// Track active tab for title updates
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  activeTabId = tabId;

  // Read the tab URL first; skip restricted schemes (chrome://, chrome-extension://)
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab?.url) {
      return; // Cannot read tab; nothing to do
    }

    try {
      const url = tab.url || "";
      const isHttp = url.startsWith("http://") || url.startsWith("https://");
      if (!isHttp) {
        // Avoid executing scripts in chrome://, chrome-extension://, about:blank, etc.
        return;
      }

      chrome.scripting.executeScript({
        target: { tabId },
        func: () => document.title
      }, (results) => {
        if (chrome.runtime.lastError) {
          // Ignore errors from restricted pages
          return;
        }
        if (results?.[0]?.result) {
          chrome.storage.local.set({ latestTitle: results[0].result });
        }
      });
    } catch (_) {
      // Silently ignore unexpected issues
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

  // Recorder window/tab registers itself so background can forward stop commands
  if (msg.type === "REGISTER_RECORDER") {
    if (sender && sender.tab && sender.tab.id) {
      recorderTabId = sender.tab.id;
      // try to capture windowId if available
      recorderWindowId = sender.tab.windowId || null;
      console.log("📌 Registered recorder tab:", recorderTabId, "window:", recorderWindowId);
      sendResponse({ success: true });
    } else {
      // If no tab info present, still acknowledge
      console.warn("REGISTER_RECORDER received but sender.tab is missing");
      sendResponse({ success: false });
    }
    return true;
  }

  if (msg.type === "RECORDER_STOPPED") {
    // Clear the recorder tab id when recorder stops/closed
    recorderTabId = null;
    recorderWindowId = null;
    console.log("📌 Recorder stopped/cleared");
    sendResponse({ success: true });
    return true;
  }

  if (msg.type === "STOP_SCREEN_RECORDING") {
    if (recorderTabId) {
      chrome.tabs.sendMessage(recorderTabId, { type: "STOP_SCREEN_RECORDING" }, (resp) => {
        // After signalling the recorder to stop, try to bring its window/tab to the front
        if (recorderWindowId) {
          try {
            chrome.windows.update(recorderWindowId, { state: 'normal', focused: true }, (win) => {
              if (chrome.runtime.lastError) {
                console.warn('Could not update recorder window state:', chrome.runtime.lastError.message);
              } else {
                // ensure the tab is active
                try {
                  chrome.tabs.update(recorderTabId, { active: true });
                } catch (e) {
                  // ignore
                }
              }
              sendResponse({ success: true });
            });
          } catch (e) {
            console.warn('Error focusing recorder window:', e);
            sendResponse({ success: true });
          }
        } else {
          // No known window id; just try to activate the tab
          try {
            chrome.tabs.update(recorderTabId, { active: true }, () => sendResponse({ success: true }));
          } catch (e) {
            sendResponse({ success: true });
          }
        }
      });
      console.log("🛑 Sent STOP to recorder tab:", recorderTabId);
    } else {
      console.warn("No recorder tab registered to stop.");
      sendResponse({ success: false, error: "no-recorder-registered" });
    }
    return true;
  }

  // Backwards-compatible: some code used { action: 'stopRecording' }
  if (msg.action === "stopRecording") {
    if (recorderTabId) {
      chrome.tabs.sendMessage(recorderTabId, { type: "STOP_SCREEN_RECORDING" });
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false });
    }
    return true;
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
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log(`✅ Download started (id: ${downloadId})`);
        sendResponse({ success: true, downloadId: downloadId, filename: filename });
      }
    });

    return true; // keep sendResponse async
  }

  if (msg.type === "titleUpdate" && sender.tab?.id === activeTabId) {
    console.log(`📌 Title updated: ${msg.title}`);
    chrome.storage.local.set({ latestTitle: msg.title });
    sendResponse({ success: true });
  }

  if (msg.type === "CREATE_RECORDING_WINDOW") {
    console.log("🎬 Creating recording window...");
    
    // Try creating a tab first, then convert to window
    chrome.tabs.create({
      url: chrome.runtime.getURL(`window.html?fps=${msg.fps}`)
    }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error("❌ Failed to create recording tab:", chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      
      // Convert tab to window
      chrome.windows.create({
        tabId: tab.id,
        type: "popup",
        width: 500,
        height: 400
      }, (window) => {
        if (chrome.runtime.lastError) {
          console.error("❌ Failed to create recording window:", chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log("✅ Recording window created:", window.id);
          sendResponse({ success: true, windowId: window.id });
        }
      });
    });
    
    return true; // keep sendResponse async
  }

});

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed and ready");
});
