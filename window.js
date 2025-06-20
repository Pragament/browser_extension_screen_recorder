const stopBtn = document.getElementById("stop");
const statusText = document.getElementById("status");

let mediaRecorder;
let recordedChunks = [];

(async () => {
  const params = new URLSearchParams(window.location.search);
  const source = params.get("source");
  const fps = parseInt(params.get("fps")) || 30;

  let stream;
  try {
    if (source === "tab") {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error("No active tab found.");

      stream = await new Promise((resolve, reject) => {
        chrome.tabCapture.capture(
          {
            audio: true,
            video: true,
            videoConstraints: {
              mandatory: {
                minFrameRate: fps,
                maxFrameRate: fps
              }
            }
          },
          (s) => s ? resolve(s) : reject(new Error("Tab capture failed"))
        );
      });
    } else {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: fps },
        audio: true
      });
    }
  } catch (err) {
    statusText.textContent = "Error: " + err.message;
    return;
  }

  recordedChunks = [];

  mediaRecorder = new MediaRecorder(stream, {
    mimeType: "video/webm; codecs=vp8",
    videoBitsPerSecond: 2500000
  });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = async () => {
    const originalBlob = new Blob(recordedChunks, { type: "video/webm" });
    const originalURL = URL.createObjectURL(originalBlob);

    const video = document.createElement("video");
    video.src = originalURL;
    video.muted = true;
    video.playbackRate = 30 / fps;

    let newChunks = [];
    const canvasStream = video.captureStream();
    const newRecorder = new MediaRecorder(canvasStream, {
      mimeType: "video/webm"
    });

    newRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) newChunks.push(e.data);
    };

    newRecorder.onstop = () => {
      const timelapseBlob = new Blob(newChunks, { type: "video/webm" });
      const url = URL.createObjectURL(timelapseBlob);
      const filename = `timelapse-${source}-${fps}fps-${Date.now()}.webm`;

      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          statusText.textContent = "Download failed: " + chrome.runtime.lastError.message;
        } else {
          statusText.textContent = "Timelapse saved successfully.";
        }
      });
    };

    video.onloadedmetadata = async () => {
      try {
        await video.play();
        newRecorder.start();

        video.onended = () => {
          newRecorder.stop();
        };
      } catch (err) {
        console.error("Playback error:", err);
        statusText.textContent = "Playback failed.";
      }
    };
  };

  mediaRecorder.start();
  stopBtn.disabled = false;
  statusText.textContent = "Recording in progress...";

  stopBtn.onclick = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    stopBtn.disabled = true;
  };
})();
