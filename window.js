// window.js

const stopBtn = document.getElementById("stop");
const statusText = document.getElementById("status");

let mediaRecorder;
let streamActive = false;

function stopRecording() {
    if (streamActive && mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        streamActive = false;
    }
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'initiateStop') {
        stopRecording();
    }
});

(async () => {
    let stream;
    try {
        stream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: 30 },
            audio: true
        });
        streamActive = true;
        chrome.runtime.sendMessage({ action: "recordingActuallyStarted" });
        stream.getVideoTracks()[0].onended = () => stopRecording();
    } catch (err) {
        statusText.textContent = "Sharing cancelled or error occurred.";
        setTimeout(() => window.close(), 2000);
        return;
    }

    const recordedChunks = [];
    const subtitleLog = [];
    let lastStoredTitle = "";
    let startTime = Date.now();
    
    // --- THIS IS THE REVERTED, CORRECT LOGIC ---
    // Get the initial title when recording starts
    const { latestTitle } = await chrome.storage.local.get(["latestTitle"]);
    if (latestTitle) {
        subtitleLog.push({ time: 0, title: latestTitle });
        lastStoredTitle = latestTitle;
    } else {
        // Add a default entry if no title is found initially
        subtitleLog.push({ time: 0, title: "Recording Started" });
        lastStoredTitle = "Recording Started";
    }

    // Poll storage every 500ms for new titles. This is reliable.
    const titleInterval = setInterval(async () => {
        const { latestTitle } = await chrome.storage.local.get(["latestTitle"]);
        if (latestTitle && latestTitle !== lastStoredTitle) {
            const now = Date.now() - startTime;
            subtitleLog.push({ time: now, title: latestTitle });
            lastStoredTitle = latestTitle;
        }
    }, 500);

    mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        clearInterval(titleInterval);
        statusText.textContent = "Processing video...";
        handleTimelapseAndSrt(recordedChunks, subtitleLog, startTime);
    };

    mediaRecorder.start();
    stopBtn.disabled = false;
    statusText.textContent = "Recording...";
    stopBtn.onclick = () => stopRecording();
})();


function handleTimelapseAndSrt(chunks, log, recordingStartTime) {
    const totalDuration = Date.now() - recordingStartTime;
    const baseName = `recording-${Date.now()}`;
    const originalBlob = new Blob(chunks, { type: "video/webm" });
    const video = document.createElement("video");
    video.src = URL.createObjectURL(originalBlob);
    video.muted = true;
    video.playbackRate = 1;

    const canvasStream = video.captureStream();
    const timelapseRecorder = new MediaRecorder(canvasStream, { mimeType: "video/webm" });
    const timelapseChunks = [];
    timelapseRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) timelapseChunks.push(e.data);
    };

    timelapseRecorder.onstop = () => {
        const timelapseBlob = new Blob(timelapseChunks, { type: "video/webm" });
        chrome.downloads.download({
            url: URL.createObjectURL(timelapseBlob),
            filename: `${baseName}-timelapse.webm`,
            saveAs: true
        });

        const srtContent = generateSRT(log, totalDuration);
        const srtBlob = new Blob([srtContent], { type: "text/plain" });
        chrome.downloads.download({
            url: URL.createObjectURL(srtBlob),
            filename: `${baseName}.srt`,
            saveAs: true
        });

        statusText.textContent = "Downloads started. This window will close.";
        setTimeout(() => window.close(), 3000);
    };

    video.onloadedmetadata = async () => {
        try {
            await video.play();
            timelapseRecorder.start();
            video.onended = () => timelapseRecorder.stop();
        } catch (err) {
            console.error("Playback error:", err);
            statusText.textContent = "Error processing video.";
            setTimeout(() => window.close(), 3000);
        }
    };
}

function generateSRT(log, totalDuration) {
    const formatTime = (ms) => {
        const d = new Date(ms);
        return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')},${String(d.getUTCMilliseconds()).padStart(3, '0')}`;
    };
    if (log.length === 0) return ""; // Should not happen with new logic, but safe to keep
    let srt = "";
    for (let i = 0; i < log.length; i++) {
        const start = log[i].time;
        const end = (i < log.length - 1) ? log[i + 1].time : totalDuration;
        srt += `${i + 1}\n${formatTime(start)} --> ${formatTime(end)}\n${log[i].title}\n\n`;
    }
    return srt.trim();
}
