let lastTitle = document.title;

setInterval(() => {
  const currentTitle = document.title;
  if (currentTitle !== lastTitle) {
    lastTitle = currentTitle;
    chrome.runtime.sendMessage({//ghh
      type: "titleUpdate",
      title: currentTitle
    });
  }
}, 500);
