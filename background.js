let activeTabId = null;

// Update active tab ID
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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "titleUpdate" && sender.tab?.id === activeTabId) {
    chrome.storage.local.set({ latestTitle: msg.title });
  }
});
