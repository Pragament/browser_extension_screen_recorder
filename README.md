### ✅ `README.md`

```markdown
# Flexible Screen Recorder (Chrome Extension)

A Chrome extension to record your **entire screen**, **application window**, or **browser tab** with customizable **frame rate (FPS)**. Includes an admin settings page for better control.

---

## 🚀 Features

- Record Screen / Window / Tab
- Set custom Frame Rate (5, 10, 15, 30 FPS)
- Admin Settings page to control defaults
- Supports audio recording
- Automatically prompts to download `.webm` video
- Simple & user-friendly interface

---

## 📦 Folder Structure

```

/Flexible-Screen-Recorder
├── manifest.json
├── popup.html
├── popup.js
├── window\.html
├── window\.js
├── settings.html
├── settings.js
├── download.png

````

---

## 🛠️ Installation (Build & Run)

1. **Clone or Download** the repository:
   ```bash
   git clone https://github.com/Pragament/browser_extension_screen_recorder.git
````

2. **Open Chrome** and go to:

   ```
   chrome://extensions/
   ```

3. **Enable Developer Mode** (top right)

4. Click on **“Load unpacked”** and select the project folder.

5. The extension should now appear in your Chrome toolbar.

---

## ⚙️ Usage

1. Click the **extension icon** from the Chrome toolbar.
2. Choose the **recording source** (screen, window, tab).
3. Click **“Open Recorder”**.
4. Grant screen sharing permissions.
5. Click **“Stop Recording”** once done.
6. The video will be automatically downloaded in `.webm` format.

---

## 🧩 Settings Page

1. Click the **gear icon ⚙️** in the popup (top-right).
2. Choose your desired **frame rate (FPS)**.
3. Click **Save Settings**.
4. This FPS will be used as default for all recordings.

---

## 🔐 Permissions Used

```json
"permissions": [
  "tabCapture",
  "downloads",
  "storage"
]
```

---

## 📄 License

This project is licensed under the MIT License.
