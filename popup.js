// popup.js

// --- 🔥 Firebase config (will be loaded from storage) ---
let firebaseConfig = {
  apiKey: "AIzaSyAbgVydchx_GCMN29TjZg4ATm54sXM8F-E",
  authDomain: "my-screen-recoder.firebaseapp.com",
  projectId: "my-screen-recoder",
  storageBucket: "my-screen-recoder.firebasestorage.app",
  messagingSenderId: "447344017595",
  appId: "1:447344017595:web:086e776b5689810de9699e",
  measurementId: "G-MB2BLCWL1R"
};
function initializePopup() {
  chrome.storage.sync.get(['firebaseConfig'], (result) => {
    if (result.firebaseConfig) {
      firebaseConfig = result.firebaseConfig;
    }
    setupEventListeners();
  });
}

// Ensure DOM is ready before initializing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  initializePopup();
}

// --- Elements ---
let loginBtn, logoutBtn, usernameEl, userInfo, startBtn, stopBtn, stopShareBtn, settingsIcon;

let recorderWindow = null;
let currentUser = null;
let githubToken = null;
let popupActive = true;

function updateAuthUI() {
  if (!usernameEl) usernameEl = document.getElementById("username");
  if (!userInfo) userInfo = document.getElementById("userInfo");
  if (!loginBtn) loginBtn = document.getElementById("loginBtn");
  
  if (currentUser && githubToken) {
    const username = currentUser.displayName || currentUser.email || 'Unknown';
    safeSetText(usernameEl, username);
    safeShow(userInfo, true);
    try {
      if (loginBtn) loginBtn.style.display = "none";
      const usePatBtn = document.getElementById('usePatBtn');
      if (usePatBtn) usePatBtn.style.display = "none";
    } catch(e) {
      console.error('Error updating login button visibility:', e);
    }
  } else {
    safeShow(userInfo, false);
    try {
      if (loginBtn) loginBtn.style.display = "block";
      const usePatBtn = document.getElementById('usePatBtn');
      if (usePatBtn) usePatBtn.style.display = "block";
    } catch(e) {
      console.error('Error showing login buttons:', e);
    }
  }
}

function setupEventListeners() {
  loginBtn = document.getElementById("loginBtn");
  logoutBtn = document.getElementById("logoutBtn");
  usernameEl = document.getElementById("username");
  userInfo = document.getElementById("userInfo");
  startBtn = document.getElementById("start");
  stopBtn = document.getElementById("stopRecordingBtn");
  stopShareBtn = document.getElementById("stopShare");
  settingsIcon = document.getElementById("settings-icon");

  // ---------- 🔐 GITHUB LOGIN ----------
  // Primary login flow: OAuth Device Flow using a configured GitHub OAuth App client_id
  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      try {
      const storageResult = await new Promise(res => chrome.storage.sync.get(['githubClientIds'], res));
      const clientIds = storageResult.githubClientIds || [];
      let clientId = null;

      if (clientIds.length === 0) {
        if (!confirm('No GitHub OAuth Client ID configured.\n\nWould you like to:\n- Configure a Client ID in Settings (recommended)\n- Or use a Personal Access Token instead?')) {
          // Open settings so admin can configure client id
          chrome.runtime.openOptionsPage();
          return;
        }
        // Fallback: ask for PAT
        await signInWithPAT();
        return;
      } else if (clientIds.length === 1) {
        clientId = clientIds[0];
      } else {
        // Ask user to pick a client id (simple prompt list)
        const pick = prompt('Multiple GitHub OAuth Client IDs configured. Enter the index (1..' + clientIds.length + ') to choose or cancel to use PAT:\n' + clientIds.map((c, i) => `${i+1}: ${c}`).join('\n'));
        if (!pick) {
          clientId = null;
        } else {
          const idx = parseInt(pick, 10) - 1;
          if (isNaN(idx) || idx < 0 || idx >= clientIds.length) {
            safeAlert('Invalid selection. Falling back to PAT.');
            clientId = null;
          } else {
            clientId = clientIds[idx];
          }
        }
      }

      if (!clientId) {
        // User cancelled or invalid selection, offer PAT
        await signInWithPAT();
        return;
      }

      // Start Device Flow
      await signInWithDeviceFlow(clientId);
      } catch (error) {
        console.error("GitHub login failed:", error);
    safeAlert("\u274c Login failed. Check console for details.");
      }
    });
  }

  // Optional: allow entering PAT directly
  const usePatBtn = document.getElementById('usePatBtn');
  if (usePatBtn) {
    usePatBtn.addEventListener('click', async () => {
      await signInWithPAT();
    });
  }

  logoutBtn.addEventListener("click", async () => {
    currentUser = null;
    githubToken = null;
    
    // Clear stored user data
    chrome.storage.local.remove(['currentUser', 'githubToken']);
    
    // Update UI to show logged-out state
    updateAuthUI();
    
  safeAlert("🔒 Logged out successfully.");
  });

  // Check for existing auth state on load
  chrome.storage.local.get(['currentUser', 'githubToken'], (result) => {
    if (result.currentUser && result.githubToken) {
      currentUser = result.currentUser;
      githubToken = result.githubToken;
      // Use setTimeout to ensure DOM is fully ready
      setTimeout(() => {
        updateAuthUI();
      }, 50);
      updateAuthUI();
    } else {
      updateAuthUI(); // Ensure UI is in logged-out state
    }
  });
  
  // Listen for storage changes (in case login happens in another tab/popup instance)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && (changes.currentUser || changes.githubToken)) {
      chrome.storage.local.get(['currentUser', 'githubToken'], (result) => {
        if (result.currentUser && result.githubToken) {
          currentUser = result.currentUser;
          githubToken = result.githubToken;
          updateAuthUI();
        }
      });
    }
  });

  // ---------- 🎥 SCREEN RECORDING ----------
  startBtn.addEventListener("click", () => {
    chrome.storage.sync.get(["fps"], (res) => {
      const fps = res.fps || 30;
      // Send message to background script to create window
      chrome.runtime.sendMessage({
        type: "CREATE_RECORDING_WINDOW",
        fps: fps
      }, (response) => {
        if (response && response.success) {
          recorderWindow = { id: response.windowId };
          console.log("Recording window created with ID:", response.windowId);
        } else {
          console.error("Failed to create recording window:", response?.error);
    safeAlert("\u274c Failed to open recording window. Please try again.");
        }
      });
    });
  });

  stopShareBtn.addEventListener("click", () => {
    // Use the unified message type so background can route the stop to the recorder window/tab
    chrome.runtime.sendMessage({ type: "STOP_SCREEN_RECORDING" }, (res) => {
  safeAlert(res?.success ? "Recording stopped." : "No active recording.");
    });
  });

  stopBtn.addEventListener("click", async () => {
    // Stop the recording (fire-and-forget)
    chrome.runtime.sendMessage({ type: "STOP_SCREEN_RECORDING" });

    // Ask user if they want to upload to GitHub. If yes, open the file picker immediately
    // inside this user click handler so the browser allows the file chooser.
    if (currentUser && githubToken) {
      const upload = confirm("Do you want to upload the recording to your GitHub repository 'my_screen_recordings'?");
      if (upload) {
        // Create a file input and open it synchronously (user activation)
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.webm';
        fileInput.style.display = 'none';

        fileInput.addEventListener('change', async (event) => {
          const file = event.target.files[0];
          if (!file) {
            safeAlert('No file selected. Upload cancelled.');
            return;
          }

          try {
            await uploadToGitHub(file);
          } catch (err) {
            console.error('Upload failed:', err);
            safeAlert('Upload failed. See console for details.');
          }
        });

        // Add to DOM so click works in some browsers, then trigger
        document.body.appendChild(fileInput);
        fileInput.click();
        // Remove the element after a short delay to allow file dialog to open
        setTimeout(() => fileInput.remove(), 1000);
      }
    }
  });

  settingsIcon.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  chrome.windows.onRemoved.addListener((windowId) => {
    if (recorderWindow && recorderWindow.id === windowId) {
      recorderWindow = null;
    }
  });
}

// Track popup visibility so long-running async tasks can stop if the popup closes
document.addEventListener('visibilitychange', () => {
  if (document.hidden) popupActive = false;
});
window.addEventListener('beforeunload', () => { popupActive = false; });

// Safe UI helpers to avoid errors when the popup is closed or context invalidated
function safeSetText(el, text) {
  try {
    if (el && typeof el.textContent !== 'undefined') {
      el.textContent = text;
    } else {
      // Try to find element again
      const usernameElRetry = document.getElementById('username');
      if (usernameElRetry && text) {
        usernameElRetry.textContent = text;
      }
    }
  } catch (e) {
    console.warn('safeSetText failed:', e);
  }
}

function safeShow(el, shouldShow) {
  try {
    if (el && typeof el.style !== 'undefined') {
      el.style.display = shouldShow ? 'block' : 'none';
    } else {
      // Try to find element again
      const userInfoRetry = document.getElementById('userInfo');
      if (userInfoRetry) {
        userInfoRetry.style.display = shouldShow ? 'block' : 'none';
      }
    }
  } catch (e) {
    console.warn('safeShow failed:', e);
  }
}

function safeAlert(msg) {
  try { alert(msg); } catch (e) { console.warn('safeAlert failed (likely popup closed):', e); }
}

// Debug function - can be called from console: window.debugAuth()
window.debugAuth = function() {
  console.log('=== AUTH DEBUG INFO ===');
  console.log('currentUser:', currentUser);
  console.log('githubToken:', githubToken ? `exists (${githubToken.length} chars)` : 'missing');
  
  chrome.storage.local.get(['currentUser', 'githubToken'], (result) => {
    console.log('Storage currentUser:', result.currentUser);
    console.log('Storage githubToken:', result.githubToken ? `exists (${result.githubToken.length} chars)` : 'missing');
    
    // If storage has auth but variables don't, sync them
    if (result.currentUser && result.githubToken && (!currentUser || !githubToken)) {
      currentUser = result.currentUser;
      githubToken = result.githubToken;
      updateAuthUI();
    }
  });
  
  console.log('=== END DEBUG INFO ===');
};

// Force refresh UI from storage - can be called from console: window.refreshAuth()
window.refreshAuth = function() {
  chrome.storage.local.get(['currentUser', 'githubToken'], (result) => {
    if (result.currentUser && result.githubToken) {
      currentUser = result.currentUser;
      githubToken = result.githubToken;
      updateAuthUI();
    } else {
      currentUser = null;
      githubToken = null;
      updateAuthUI();
    }
  });
};

// ---------- 🔍 GITHUB REPOSITORY CHECKING ----------
async function checkUserRepository() {
  if (!githubToken) {
    console.error("No GitHub token available");
    return false;
  }

  try {
    const response = await fetch('https://api.github.com/user/repos', {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const repos = await response.json();
    const hasRequiredRepo = repos.some(repo => repo.name === 'my_screen_recordings');
    
    if (!hasRequiredRepo) {
    safeAlert("⚠️ Please create a repository named 'my_screen_recordings' in your GitHub account to upload recordings.");
    }
    
    return hasRequiredRepo;
  } catch (error) {
    console.error("Error checking repositories:", error);
  safeAlert("❌ Failed to check GitHub repositories. Please try again.");
    return false;
  }
}

// ---------- 📤 GITHUB UPLOAD ----------
// Accept an optional File selected by the user. If provided, use it directly.
async function uploadToGitHub(selectedFile) {
  if (!githubToken) {
  safeAlert("❌ No GitHub token available. Please login again.");
    return;
  }

  try {
    // Check if repository exists
    const repoExists = await checkUserRepository();
    if (!repoExists) {
      return;
    }

    // If a File was passed (from a user file picker), read and upload it.
    if (selectedFile) {
      const filename = selectedFile.name || `recording_${Date.now()}.webm`;
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Content = e.target.result.split(',')[1];
          await uploadFileToGitHubBase64(base64Content, filename);
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
            safeAlert('❌ Upload failed. Please try again.');
        }
      };
      reader.readAsDataURL(selectedFile);
      return;
    }

    // Fallback: keep previous behavior (may be blocked if not triggered by user gesture)
    chrome.storage.local.get(['latestRecordingId', 'latestRecordingFilename'], (result) => {
      if (!result || !result.latestRecordingId) {
    safeAlert("❌ No recording found to upload. Please record something first.");
        return;
      }

      chrome.downloads.search({ id: result.latestRecordingId }, (recordings) => {
        if (!recordings || recordings.length === 0) {
          safeAlert("❌ Recording file not found. Please try recording again.");
          return;
        }

        const filename = result.latestRecordingFilename || `recording_${Date.now()}.webm`;
  safeAlert(`Please select the recording file to upload. Look for a file named "${filename}" in your Downloads folder.`);

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.webm';
        fileInput.onchange = (event) => {
          const file = event.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
              try {
                const base64Content = e.target.result.split(',')[1];
                await uploadFileToGitHubBase64(base64Content, filename);
              } catch (uploadError) {
                console.error('Upload error:', uploadError);
                safeAlert('❌ Upload failed. Please try again.');
              }
            };
            reader.readAsDataURL(file);
          }
        };
        fileInput.click();
      });
    });
  } catch (error) {
    console.error("Upload error:", error);
  safeAlert("❌ Upload failed. Please check console for details.");
  }
}

async function uploadFileToGitHub(fileContent, filename) {
  try {
    // Check file size (GitHub has a 100MB limit)
    const fileSizeMB = fileContent.byteLength / (1024 * 1024);
    if (fileSizeMB > 100) {
  safeAlert(`❌ File too large (${fileSizeMB.toFixed(1)}MB). GitHub has a 100MB limit for individual files.`);
      return;
    }
    
    console.log(`Uploading file: ${filename} (${fileSizeMB.toFixed(1)}MB)`);
    
    // Convert ArrayBuffer to base64 using a more robust method
    const uint8Array = new Uint8Array(fileContent);
    
    // Use a safer approach for large files
    let base64Content = '';
    const chunkSize = 1024; // Smaller chunks to avoid issues
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      // Convert chunk to string safely
      let binaryString = '';
      for (let j = 0; j < chunk.length; j++) {
        binaryString += String.fromCharCode(chunk[j]);
      }
      base64Content += btoa(binaryString);
    }

    await uploadFileToGitHubBase64(base64Content, filename);
  } catch (error) {
    console.error("Upload error:", error);
  safeAlert(`❌ Upload failed: ${error.message}`);
  }
}

async function uploadFileToGitHubBase64(base64Content, filename) {
  try {
    // Validate base64 content
    if (!base64Content || typeof base64Content !== 'string') {
      throw new Error('Invalid base64 content');
    }
    
    // Check if base64 is valid
    try {
      atob(base64Content.substring(0, 100)); // Test first 100 chars
    } catch (e) {
      throw new Error('Invalid base64 encoding');
    }
    
    console.log(`Uploading file: ${filename} (base64 length: ${base64Content.length})`);

    // Upload to GitHub
    const uploadResponse = await fetch(`https://api.github.com/repos/${currentUser.displayName}/my_screen_recordings/contents/${filename}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Upload screen recording - ${new Date().toISOString()}`,
        content: base64Content
      })
    });

    if (uploadResponse.ok) {
  safeAlert("✅ Recording uploaded to GitHub successfully!");
    } else {
      const error = await uploadResponse.json();
      console.error("Upload failed:", error);
  safeAlert(`❌ Failed to upload to GitHub: ${error.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error("Upload error:", error);
  safeAlert(`❌ Upload failed: ${error.message}`);
  }
}

// ---------- GitHub Sign-in helpers ----------
async function signInWithPAT() {
  const token = prompt("Please enter your GitHub Personal Access Token (PAT):\n\n1. Go to https://github.com/settings/tokens\n2. Generate new token with 'repo' scope\n3. Paste it here:");
  
  if (!token) {
    safeAlert('\u274c No token provided.');
    return;
  }

  try {
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!userResponse.ok) throw new Error(`HTTP ${userResponse.status}`);
    
    const userData = await userResponse.json();

    currentUser = {
      uid: userData.id,
      displayName: userData.login,
      email: userData.email,
      photoURL: userData.avatar_url
    };
    githubToken = token;
    
    // Save to storage
    await new Promise((resolve) => {
      chrome.storage.local.set({ currentUser, githubToken }, resolve);
    });
    
    // Update UI to show logged-in state
    updateAuthUI();
    
    // Force a small delay and update again to ensure it sticks
    setTimeout(() => {
      updateAuthUI();
    }, 100);

    await checkUserRepository();
    safeAlert('\u2705 Login successful (PAT)');
    
    // One more UI update after alert
    setTimeout(() => {
      updateAuthUI();
    }, 200);
  } catch (err) {
    console.error('PAT sign-in failed:', err);
    safeAlert('\u274c Invalid token or network error');
  }
}

async function signInWithDeviceFlow(clientId) {
  try {
    // Step 1: create device code
    const params = new URLSearchParams({ client_id: clientId, scope: 'repo' });
    const resp = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: params.toString()
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Failed to get device code (status ${resp.status}) ${text}`);
    }
    const data = await resp.json();

    // Show instructions and open the verification page to help the user
    const message = `To sign in, open: ${data.verification_uri}\nEnter code: ${data.user_code}\n\nA new tab will open to the verification page. After authorizing, come back and click OK to finish.`;
    safeAlert(message);
    try {
      // Use chrome.tabs.create so extension can open the verification page reliably
      chrome.tabs.create({ url: data.verification_uri }, () => {});
    } catch (e) {
      console.warn('Could not open verification URL via chrome.tabs, falling back to window.open', e);
      try { window.open(data.verification_uri, '_blank'); } catch (ee) { /* ignore */ }
    }

    // Limited polling: avoid long-running loops in the popup. Let user authorize then poll a few times.
    const interval = data.interval || 5; // seconds
    const maxAttempts = Math.max(3, Math.floor((data.expires_in || 600) / Math.max(5, interval)));

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Give user time to authorize (first wait before first check)
      await new Promise(r => setTimeout(r, interval * 1000));

      if (!popupActive) {
        console.warn('Popup closed; stopping device flow polling');
        safeAlert('Popup closed before device flow completed. You can try logging in again or use a Personal Access Token (PAT) instead.');
        return;
      }

      try {
        const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: clientId, device_code: data.device_code, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' })
        });

        if (!tokenResp.ok) {
          const txt = await tokenResp.text().catch(() => '');
          console.warn('Token endpoint returned non-OK:', tokenResp.status, txt);
          // Try again later until attempts exhausted
          continue;
        }

        const tokenData = await tokenResp.json();
        if (tokenData.error) {
          if (tokenData.error === 'authorization_pending') {
            // Not yet authorized; continue polling
            continue;
          }
          // Other errors (slow down) - break and fallback
          throw new Error(tokenData.error_description || tokenData.error);
        }

        if (tokenData.access_token) {
          githubToken = tokenData.access_token;

          // Fetch user
          const userResponse = await fetch('https://api.github.com/user', {
            headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' }
          });
          if (!userResponse.ok) throw new Error('Failed to fetch user after obtaining token');
          const userData = await userResponse.json();

          currentUser = {
            uid: userData.id,
            displayName: userData.login,
            email: userData.email,
            photoURL: userData.avatar_url
          };

          chrome.storage.local.set({ currentUser, githubToken });
          
          // Update UI to show logged-in state
          updateAuthUI();
          
          // Force a small delay and update again to ensure it sticks
          setTimeout(() => {
            updateAuthUI();
          }, 100);

          await checkUserRepository();
          safeAlert('\u2705 Login successful (Device Flow)');
          
          // One more UI update after alert
          setTimeout(() => {
            updateAuthUI();
          }, 200);
          return;
        }
      } catch (innerErr) {
        console.error('Error polling token endpoint:', innerErr);
        // continue to next attempt; if it's a network/CORS error, break to fallback
        if (innerErr && /Failed to fetch|NetworkError|TypeError/i.test(String(innerErr))) {
          break; // likely CORS or network issue — fallback to PAT
        }
      }
    }

    // If we reach here, polling failed or timed out
  safeAlert('Device Flow did not complete. Please try again or use a Personal Access Token (PAT) as a fallback.');
  } catch (err) {
    console.error('Device flow initiation error:', err);
    // Differentiate likely causes
    if (err instanceof TypeError || /NetworkError|Failed to fetch/i.test(String(err))) {
      console.error('Device flow fetch likely blocked by network/CORS. Some GitHub endpoints may not allow CORS from extension pages.');
  safeAlert(`Could not contact GitHub Device Flow endpoint (network or CORS issue).
You can:
1) Use a Personal Access Token (PAT) (recommended fallback), or
2) Configure a small backend to perform the Device Flow on behalf of the extension.`);
    } else {
      safeAlert('Failed to get device code or start Device Flow. You can try logging in again or use a Personal Access Token (PAT) as a fallback.');
    }
  }
}
