document.addEventListener("DOMContentLoaded", () => {
  const fpsSelect = document.getElementById("fps");
  const sourceSelect = document.getElementById("source");
  
  // Firebase config elements
  const apiKeyInput = document.getElementById("apiKey");
  const authDomainInput = document.getElementById("authDomain");
  const projectIdInput = document.getElementById("projectId");
  const storageBucketInput = document.getElementById("storageBucket");
  const messagingSenderIdInput = document.getElementById("messagingSenderId");
  const appIdInput = document.getElementById("appId");
  const measurementIdInput = document.getElementById("measurementId");

  // Default Firebase config
  const defaultFirebaseConfig = {
    apiKey: "AIzaSyAbgVydchx_GCMN29TjZg4ATm54sXM8F-E",
    authDomain: "my-screen-recoder.firebaseapp.com",
    projectId: "my-screen-recoder",
    storageBucket: "my-screen-recoder.firebasestorage.app",
    messagingSenderId: "447344017595",
    appId: "1:447344017595:web:086e776b5689810de9699e",
    measurementId: "G-MB2BLCWL1R"
  };

  // Load stored settings
  const clientListDiv = document.getElementById('github-client-list');
  const newClientInput = document.getElementById('newGithubClientId');
  // clientIds is shared across handlers
  let clientIds = [];

  function renderClientList() {
    if (!clientListDiv) return;
    clientListDiv.innerHTML = '';
    clientIds.forEach((id, idx) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.marginTop = '6px';
      const span = document.createElement('span');
      span.textContent = id;
      span.style.flex = '1';
      span.style.wordBreak = 'break-all';
      const btn = document.createElement('button');
      btn.textContent = 'Remove';
      btn.style.marginLeft = '8px';
      btn.addEventListener('click', () => {
        clientIds.splice(idx, 1);
        renderClientList();
      });
      row.appendChild(span);
      row.appendChild(btn);
      clientListDiv.appendChild(row);
    });
  }

  // Load stored settings
  chrome.storage.sync.get(["fps", "source", "firebaseConfig", "githubClientIds"], (result) => {
    fpsSelect.value = result.fps || "30";
    sourceSelect.value = result.source || "screen";

    // Load Firebase config
    const firebaseConfig = result.firebaseConfig || defaultFirebaseConfig;
    apiKeyInput.value = firebaseConfig.apiKey || "";
    authDomainInput.value = firebaseConfig.authDomain || "";
    projectIdInput.value = firebaseConfig.projectId || "";
    storageBucketInput.value = firebaseConfig.storageBucket || "";
    messagingSenderIdInput.value = firebaseConfig.messagingSenderId || "";
    appIdInput.value = firebaseConfig.appId || "";
    measurementIdInput.value = firebaseConfig.measurementId || "";

    clientIds = result.githubClientIds || [];
    renderClientList();
  });

  document.getElementById('addGithubClient').addEventListener('click', () => {
    const val = newClientInput.value.trim();
    if (!val) return alert('Please provide a Client ID');
    if (clientIds.includes(val)) return alert('This Client ID is already added');
    clientIds.push(val);
    newClientInput.value = '';
    renderClientList();
  });

  // Save settings
  document.getElementById("save").addEventListener("click", () => {
    const fps = fpsSelect.value;
    const source = sourceSelect.value;
    
    // Get Firebase config
    const firebaseConfig = {
      apiKey: apiKeyInput.value,
      authDomain: authDomainInput.value,
      projectId: projectIdInput.value,
      storageBucket: storageBucketInput.value,
      messagingSenderId: messagingSenderIdInput.value,
      appId: appIdInput.value,
      measurementId: measurementIdInput.value
    };

    // Validate Firebase config
    if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
      alert("Please fill in at least API Key, Auth Domain, and Project ID for Firebase configuration.");
      return;
    }

    chrome.storage.sync.set({ 
      fps,
      source,
      firebaseConfig,
      githubClientIds: clientIds
    }, () => {
      alert("Settings saved! The extension will use the new Firebase configuration on next restart.");
    });
  });

  // Reset to default
  document.getElementById("reset").addEventListener("click", () => {
    if (confirm("Are you sure you want to reset all settings to default?")) {
      apiKeyInput.value = defaultFirebaseConfig.apiKey;
      authDomainInput.value = defaultFirebaseConfig.authDomain;
      projectIdInput.value = defaultFirebaseConfig.projectId;
      storageBucketInput.value = defaultFirebaseConfig.storageBucket;
      messagingSenderIdInput.value = defaultFirebaseConfig.messagingSenderId;
      appIdInput.value = defaultFirebaseConfig.appId;
      measurementIdInput.value = defaultFirebaseConfig.measurementId;
      
      fpsSelect.value = "30";
      sourceSelect.value = "screen";
      
      chrome.storage.sync.set({ 
        fps: "30", 
        source: "screen", 
        firebaseConfig: defaultFirebaseConfig 
      }, () => {
        alert("Settings reset to default!");
      });
      // Clear client IDs as well
      clientIds = [];
      renderClientList();
      chrome.storage.sync.set({ githubClientIds: clientIds });
    }
  });
});
