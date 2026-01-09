const stopBtn = document.getElementById("stop");
const statusText = document.getElementById("status");

let mediaRecorder;
let recordedChunks = [];
let subtitleLog = [];
let lastStoredTitle = "";
let startTime = 0;
let titleInterval;

(async () => {
  const fps = parseInt(new URLSearchParams(location.search).get("fps")) || 30;
  const playbackFPS = 30; // For timelapse effect

  // Initialize subtitle tracking
  chrome.storage.local.get(["latestTitle"], ({ latestTitle }) => {
    if (latestTitle) {
      subtitleLog.push({ time: 0, title: latestTitle });
      lastStoredTitle = latestTitle;
    }
  });

  startTime = Date.now();
  subtitleLog = [];

  // Track title changes every 500ms
  titleInterval = setInterval(() => {
    const now = Date.now() - startTime;
    chrome.storage.local.get(["latestTitle"], ({ latestTitle }) => {
      if (latestTitle && latestTitle !== lastStoredTitle) {
        subtitleLog.push({ time: now, title: latestTitle });
        lastStoredTitle = latestTitle;
      }
    });
  }, 500);

  // Start recording screen
  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: fps },
      audio: true
    });

    stream.getVideoTracks()[0].onended = () => {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        statusText.textContent = "Recording stopped.";
      }
    };
  } catch (err) {
    statusText.textContent = "Error: " + err.message;
    clearInterval(titleInterval);
    return;
  }

  mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  mediaRecorder.onstop = async () => {
    clearInterval(titleInterval);
    const totalDuration = Date.now() - startTime;
    const baseName = `recording-${Date.now()}`;

    // Create original video blob
    const originalBlob = new Blob(recordedChunks, { type: "video/webm" });
    const originalUrl = URL.createObjectURL(originalBlob);

    // Save the original recording first
    chrome.runtime.sendMessage({
      type: "SAVE_RECORDING",
      blobUrl: originalUrl
    }, (response) => {
      if (response && response.success) {
        console.log("✅ Original recording saved with ID:", response.downloadId);
        // Store the download ID for later upload
        chrome.storage.local.set({ 
          latestRecordingId: response.downloadId,
          latestRecordingFilename: response.filename 
        });
      } else {
        console.error("❌ Failed to save recording:", response?.error);
      }
    });

    // Playback at faster rate using <video> and captureStream
    const video = document.createElement("video");
    video.src = originalUrl;
    video.muted = true;
    video.playbackRate = playbackFPS / fps;

    const canvasStream = video.captureStream();
    const timelapseChunks = [];

    const timelapseRecorder = new MediaRecorder(canvasStream, {
      mimeType: "video/webm"
    });

    timelapseRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) timelapseChunks.push(e.data);
    };

    timelapseRecorder.onstop = () => {
      // Timelapse download
      const timelapseBlob = new Blob(timelapseChunks, { type: "video/webm" });
      const timelapseUrl = URL.createObjectURL(timelapseBlob);

      const videoDownload = document.createElement("a");
      videoDownload.href = timelapseUrl;
      videoDownload.download = `${baseName}-timelapse.webm`;
      videoDownload.click(); // ✅ This triggers save dialog

      // SRT download
      const srtContent = generateSRT(subtitleLog, totalDuration);
      const srtBlob = new Blob([srtContent], { type: "text/plain" });
      const srtUrl = URL.createObjectURL(srtBlob);

      const srtDownload = document.createElement("a");
      srtDownload.href = srtUrl;
      srtDownload.download = `${baseName}.srt`;
      srtDownload.click(); // ✅ This triggers save dialog

      statusText.textContent = "Timelapse & subtitles saved.";

      // Cleanup
      setTimeout(() => {
        URL.revokeObjectURL(timelapseUrl);
        URL.revokeObjectURL(srtUrl);
        URL.revokeObjectURL(originalUrl);
        // Notify background that recorder has finished/closed
        try {
          chrome.runtime.sendMessage({ type: "RECORDER_STOPPED" }, () => {});
        } catch (e) {
          // ignore
        }
      }, 1500);
    };

    // Wait for metadata then play and record
    video.onloadedmetadata = async () => {
      try {
        await video.play();
        timelapseRecorder.start();
        video.onended = () => timelapseRecorder.stop();
      } catch (err) {
        console.error("Playback error:", err);
        statusText.textContent = "Timelapse generation failed.";
      }
    };
  };

  mediaRecorder.start();
  // Register this recorder window/tab with the background script so global stop commands can reach it
  try {
    chrome.runtime.sendMessage({ type: "REGISTER_RECORDER" }, (res) => {
      // optional: log registration result
      if (res && res.success) console.log("Recorder registered with background.");
    });
  } catch (e) {
    console.warn("Could not register recorder with background:", e);
  }
  stopBtn.disabled = false;
  statusText.textContent = "Recording...";

  stopBtn.onclick = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      stopBtn.disabled = true;
    }
  };

  // Listen for stop messages from other parts of the extension (popup/background)
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === "STOP_SCREEN_RECORDING") {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        stopBtn.disabled = true;
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: "no-active-recorder" });
      }
    }
  });
})();

function generateSRT(log, totalDuration) {
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    const milliseconds = String(ms % 1000).padStart(3, '0');
    return `${hours}:${minutes}:${seconds},${milliseconds}`;
  };

  if (log.length === 0) return "";

  let srt = "";
  for (let i = 0; i < log.length; i++) {
    const start = log[i].time;
    const end = (i < log.length - 1) ? log[i + 1].time : totalDuration;
    srt += `${i + 1}\n${formatTime(start)} --> ${formatTime(end)}\n${log[i].title}\n\n`;
  }

  return srt.trim();
}
