const storageDataKey = 'repo';
const storageSettingsKey = 'settings';
const storageOptionsKey = 'repoOptions';

browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "openOptionsPage") {
        browser.tabs.create({url: browser.runtime.getURL('options.html')});
    }
});
/*
browser.storage.onChanged.addListener((changes, namespace) => {
    // for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
        browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs.length > 0) {
                let activeTab = tabs[0];
                browser.tabs.sendMessage(activeTab.id, {action: "optionsChanged"})
                    .catch(e => {
                        console.error(e);
                    });
            }
        });

        if (namespace === 'sync') {
            // Handle sync storage changes
            console.log("Change detected in sync storage");
        } else if (namespace === 'local') {
            // Handle local storage changes
            console.log("Change detected in local storage");
        }
    }
}); */