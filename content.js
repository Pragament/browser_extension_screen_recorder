let lastTitle = document.title;

setInterval(() => {
  const currentTitle = document.title;
  if (currentTitle !== lastTitle) {
    lastTitle = currentTitle;
    chrome.runtime.sendMessage({
      type: "titleUpdate",
      title: currentTitle
    });
  }
}, 500);
