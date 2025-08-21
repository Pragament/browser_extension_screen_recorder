console.log("📌 Content script loaded");

// 🔔 Track title changes and send to background
let lastTitle = document.title;

setInterval(() => {
  const currentTitle = document.title;
  if (currentTitle !== lastTitle) {
    lastTitle = currentTitle;
    chrome.runtime.sendMessage({
      type: "titleUpdate",
      title: currentTitle
    });
  }
}, 500);

// ==========================
// Recording Logic
// ==========================
let mediaRecorder;
let recordedChunks = [];

// Website → Extension
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data.type === "START_SCREEN_RECORDING") {
    console.log("📩 Content → Background: START_SCREEN_RECORDING");
    chrome.runtime.sendMessage({ type: "START_SCREEN_RECORDING" });
  }
});

// Background → Content
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SCREEN_SHARE_ID") {
    console.log("🎥 Got streamId, starting capture...");

    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: msg.streamId
        }
      }
    }).then((stream) => {
      recordedChunks = [];
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        console.log("✅ Recording stopped, sending to background...");

        const blob = new Blob(recordedChunks, { type: "video/webm" });
        const blobUrl = URL.createObjectURL(blob);

        chrome.runtime.sendMessage({
          type: "SAVE_RECORDING",
          blobUrl: blobUrl
        });

        window.postMessage({ type: "RECORDING_STOPPED" }, "*");
      };

      mediaRecorder.start();
      console.log("🔴 Recording started");
    }).catch(err => {
      console.error("❌ Failed to get stream:", err);
    });
  }

  if (msg.type === "STOP_SCREEN_RECORDING") {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
  }
});
