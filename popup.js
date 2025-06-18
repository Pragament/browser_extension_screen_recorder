let mediaRecorder;
let recordedChunks = [];

document.getElementById('start').addEventListener('click', async () => {
  chrome.tabCapture.capture({ audio: true, video: true }, (stream) => {
    if (!stream) {
      alert("Failed to capture tab. Please allow permission.");
      return;
    }

    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

    recordedChunks = [];

    mediaRecorder.ondataavailable = function (event) {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = function () {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const filename = `recording-${Date.now()}.webm`;

      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      });
    };

    mediaRecorder.start();

    document.getElementById('start').disabled = true;
    document.getElementById('stop').disabled = false;
  });
});

document.getElementById('stop').addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }

  document.getElementById('start').disabled = false;
  document.getElementById('stop').disabled = true;
});
