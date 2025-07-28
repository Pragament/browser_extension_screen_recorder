// background.js

let recorderState = {
    windowId: null,
    examTabId: null,
};

// --- THIS IS THE NEW, RELIABLE TITLE TRACKING LOGIC ---

// Function to update the stored title
function updateTitle(tabId) {
    if (!chrome.runtime?.id) return; // Check if extension is active
    chrome.tabs.get(tabId, (tab) => {
        // Only update if the tab is fully loaded and has a title
        if (tab && tab.status === 'complete' && tab.title) {
            chrome.storage.local.set({ latestTitle: tab.title });
        }
    });
}

// Listen for when the user switches to a different tab
chrome.tabs.onActivated.addListener((activeInfo) => {
    updateTitle(activeInfo.tabId);
});

// Listen for when a tab is updated (e.g., new page loads in the same tab)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // We only care if the title changes on the active tab
    if (tab.active && changeInfo.title) {
        chrome.storage.local.set({ latestTitle: changeInfo.title });
    }
});


// --- The rest of the message handling logic is the same ---

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    switch (msg.action) {
        case "startRecording":
            if (recorderState.windowId) {
                chrome.windows.update(recorderState.windowId, { focused: true });
                return true;
            }
            if (msg.isExam) {
                recorderState.examTabId = sender.tab?.id;
            }
            chrome.windows.create({
                url: `window.html`,
                type: "popup", width: 500, height: 400
            }, (win) => {
                if (win) recorderState.windowId = win.id;
            });
            break;

        case "recordingActuallyStarted":
            if (recorderState.examTabId) {
                chrome.tabs.sendMessage(recorderState.examTabId, { action: "recordingStarted" });
            }
            break;

        case "stopRecording":
            if (recorderState.windowId) {
                chrome.runtime.sendMessage({ action: "initiateStop" });
            }
            break;
    }
    sendResponse({success: true});
    return true; 
});

chrome.windows.onRemoved.addListener((windowId) => {
    if (recorderState.windowId && recorderState.windowId === windowId) {
        if (recorderState.examTabId) {
             try {
                chrome.tabs.sendMessage(recorderState.examTabId, { action: "recordingStoppedCallback" });
             } catch (error) {
                console.log("Could not send callback to exam tab.", error);
             }
        }
        recorderState.windowId = null;
        recorderState.examTabId = null;
    }
});
//did minor changes