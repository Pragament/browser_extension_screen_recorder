// content.js

// This script is now much simpler. Its only job is to handle the exam site logic.
// All title tracking has been moved to the background script for reliability.

const examSiteUrls = [
    'https://pragament.github.io/javascript_exam_maker/',
    'http://localhost',
    'http://127.0.0.1'
];

const isExamSite = examSiteUrls.some(url => window.location.href.startsWith(url));

if (isExamSite) {
    console.log("Exam site detected. Activating special features.");

    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('injector.js');
    s.onload = function() { this.remove(); };
    (document.head || document.documentElement).appendChild(s);

    window.addEventListener('start-recording-event', () => {
        chrome.runtime.sendMessage({ action: 'startRecording', isExam: true });
    });

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (!chrome.runtime?.id) return;
        switch (msg.action) {
            case 'recordingStarted':
                window.dispatchEvent(new CustomEvent('recording-started-event'));
                break;
            case 'recordingStoppedCallback':
                window.dispatchEvent(new CustomEvent('recording-stopped-event'));
                break;
        }
        sendResponse({ success: true });
        return true;
    });
}
