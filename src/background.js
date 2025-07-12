const storageDataKey = 'repo';
const storageSettingsKey = 'settings';
const storageOptionsKey = 'repoOptions';
const manifest = chrome.runtime.getManifest();

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "openOptionsPage") {
        chrome.tabs.create({url: chrome.runtime.getURL('options.html')});
    }
});

chrome.runtime.onInstalled.addListener(reinjectContentScripts);


function reinjectContentScripts() {

    console.debug(`>>> ${manifest?.name || 'Unknown'} - [${getLineNumber()}] - starting reinjection`);

    chrome.tabs.query({}, (tabs) => {
        if (!tabs?.length) {
            console.debug(`>>> ${manifest?.name || 'Unknown'} - [${getLineNumber()}] - no tabs found`);
            return;
        }

        tabs.forEach((tab) => {
            if (!tab?.id || !/^http/.test(tab.url)) {
                console.debug(`>>> ${manifest?.name || 'Unknown'} - [${getLineNumber()}] - skipping tab`, tab);
                return;
            }

            console.debug(`>>> ${manifest?.name || 'Unknown'} - [${getLineNumber()}] - injecting into tab ${tab.id}`);

            chrome.tabs.sendMessage(tab.id, { action: "ping" }, (res) => {
                console.debug(`>>> ${manifest?.name || 'Unknown'} - [${getLineNumber()}] - ping response:`, res);
                if (chrome.runtime.lastError || !res?.pong) {
                    injectScriptsToReconnect(tab);
                }
            });
        });
    });
}

function injectScriptsToReconnect(tab) {
    const contentScripts = manifest?.content_scripts?.js || [
        "js/dialog.js",
        "js/drag.js",
        "prompt-repo-helper.js"
    ];
    chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: contentScripts
    }, () => {
        console.debug(`>>> ${manifest?.name || 'Unknown'} - [${getLineNumber()}] - scripts injected into tab ${tab.id}`);

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (name) => window.postMessage({ name, type: 'reconnect' }, '*'),
            args: [manifest?.name || 'Unknown']
        });

        console.debug(`>>> ${manifest?.name || 'Unknown'} - [${getLineNumber()}] - Message sent to tab ${tab.id}`);
    });

}

function getLineNumber() {
    const e = new Error();
    const stackLines = e.stack.split("\n").map(line => line.trim());
    let index = stackLines.findIndex(line => line.includes(getLineNumber.name));

    return stackLines[index + 1]
        ?.replace(/\s{0,}at\s+/, '')
        ?.replace(/^.*?\/([^\/]+\/[^\/]+:\d+:\d+)$/, '$1')
        ?.split('/')?.pop().replace(/\)$/, '')
        || "Unknown";
}