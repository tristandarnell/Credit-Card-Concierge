chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["ccc_settings"], (data) => {
    const current = data.ccc_settings || {};
    if (!current.appBaseUrl) {
      chrome.storage.local.set({
        ccc_settings: {
          appBaseUrl: "http://localhost:3000"
        }
      });
    }
  });
});

