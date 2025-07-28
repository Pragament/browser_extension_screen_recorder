
---

# 🚀 Smart Screen Recorder — Chrome Extension

**Smart Screen Recorder** is a powerful and versatile Chrome extension designed for both **general-purpose screen recording** across all websites and **smart automation features** on supported platforms (like online exam systems).

This hybrid tool allows users to record screen activity, generate timelapse videos, and automatically log tab interactions as subtitles — making it ideal for documentation, remote assessments, and productivity tracking.

---

## ✨ Key Features

### ✅ General Features (Available on All Websites)

* 🎥 Record:

  * Entire Screen
  * Specific Application Window
  * Individual Browser Tab
* 🎙️ Record audio alongside video
* ⚙️ Customizable frame rate: **5, 10, 15, or 30 FPS**
* ⏩ **Timelapse Generation:** Automatically converts the recording into a compressed `.webm` timelapse
* 📝 **SRT Subtitles:** Generates a timestamped `.srt` file logging tab titles during the session
* 🧩 Simple, intuitive controls available through the extension popup

### 🧠 Smart Features (Auto-Activated on Supported Web Applications)

* 🚦 **Automatic Recording Start:** Begins recording when the user performs a defined action (e.g., clicking “Start Task”)
* 🙈 **Sensitive Content Hiding:** Temporarily hides key content (like questions) until screen sharing starts
* 🔁 **Auto Callback Support:** Triggers webpage actions (like redirection) after recording ends

---

## 📁 Folder Structure

```
Smart-Screen-Recorder/
├── manifest.json           # Extension metadata
├── background.js           # Background service worker
├── content.js              # Injected into all pages
├── injector.js             # Site-specific logic
├── popup.html / popup.js   # Extension popup UI
├── window.html / window.js # Recording control window
├── settings.html / settings.js # Settings UI
└── download.png            # Extension icon
```

---

## 🔧 For Website Developers: Integrate Smart Features

Make your website compatible with Smart Screen Recorder's advanced features using simple event-based communication between your site and the extension.

### 🔹 Triggering Recording from Your Site

Dispatch a custom event to initiate recording:

```javascript
document.getElementById('start-question-button').addEventListener('click', () => {
  window.dispatchEvent(new CustomEvent('start-recording-event'));
});
```

### 🔹 Reacting to Extension Events

#### 📹 `recording-started-event`

Fired once the user grants screen sharing access.

```javascript
window.addEventListener('recording-started-event', () => {
  document.getElementById('exam-question-div').style.display = 'block';
});
```

#### ⏹️ `recording-stopped-event`

Fired after recording ends — perfect for redirecting or cleanup tasks.

```javascript
window.addEventListener('recording-stopped-event', () => {
  alert('Recording complete. Redirecting...');
  showAvailableQuestions(); // Custom function
});
```

---

## 🧪 Installation & Usage

### 🔄 Installation (Developer Mode)

1. **Clone or download** the repository.
2. Open Chrome → visit `chrome://extensions/`
3. Enable **Developer Mode** (top-right toggle).
4. Click **“Load unpacked”** and select the extension folder.

### 🖥️ General Usage (Any Website)

1. Click the extension icon → “**Start Manual Recording**”
2. Choose screen/window/tab → grant permission
3. Click “**Stop Recording**” when done
4. `.webm` and `.srt` files will download automatically

### 📝 Usage on Supported Platforms (e.g., Exam Sites)

1. Open the supported site
2. Click the designated start button (e.g., **“Select This Question”**)
3. Extension prompts for screen sharing → grant access
4. Recording starts and hidden content becomes visible
5. After stopping recording, you are automatically redirected and files are downloaded

---

## 🔐 Permissions Used

```json
"permissions": [
  "downloads",
  "scripting",
  "activeTab",
  "tabs",
  "storage"
]
```

These permissions are required to enable screen capture, communication with web pages, and file downloads.

---

## 📄 License

This project is licensed under the **MIT License** — feel free to use, modify, and distribute it under the terms of the license.

---

