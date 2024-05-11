const storageDataKey = 'repo';
const storageDataBackupKey = 'repoBackup';
const storageOptionsKey = 'repoOptions';
const manifest = browser.runtime.getManifest();

document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('repoOptionsForm').addEventListener('submit', saveSettings);
document.querySelector('#importedData').addEventListener('change', importedData);
document.getElementById('cancelButton').addEventListener('click', cancelOptions);
["backup", "import", "export", "exportBackup"].forEach(id => {
    document.getElementById(id).addEventListener('click', extraButtonClick);
});

function saveSettings(e) {
    e.preventDefault();

    const optionsData = {};
    const elements = this.elements;

    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if(['checkbox', 'input', 'textarea'].indexOf(element.type) < 0){
            continue;
        }
        optionsData[element.id || i] = element.type === 'checkbox' ? element?.checked || false : element?.value || '';
    }

    browser.storage.sync.set({[storageOptionsKey]: optionsData}, function() {
        showMessage('Settings saved', 'success');
    });
}

function loadSettings() {
    setTitle();
    animateMainButton();
    const defaults = {
        "allowedUrls": `chatgpt.com
        gemini.google.com
        you.com`,
        "closeOnClickOut": true,
        "closeOnCopy": true,
        "closeOnSendTo": false
    };

    browser.storage.sync.get([storageOptionsKey], function(obj) {
        // const formData = obj[storageOptionsKey] || {};
        const formData = Object.assign({}, defaults, (obj?.[storageOptionsKey] || {}));
        Object.keys(formData).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = formData[key];
                } else {
                    element.value = formData[key];
                }
            }
        });
    });
}

function showMessage(message, type){
    const msg = document.querySelector('.message-box');
    msg.innerHTML = message;
    msg.classList.remove('invisible', 'success', 'error', 'warning', 'info');
    msg.classList.add(type || 'info');
    setTimeout(() => msg.classList.add('invisible'), 3000);
}

function cancelOptions() {
    window.close(); // Closes the options page
}

let box = document.getElementById('box'),
    btn = document.querySelector('button'),
    loop = false;

btn.addEventListener('click', function () {
  loop = !loop;
  animateMainButton();
}, false);


function animateMainButton(){
    const img = document.querySelectorAll('img.icon-button');
    img.forEach(i => i.classList.toggle('invisible'));
    const tic = img[1].classList.contains('invisible') ? Math.floor(Math.random() * (1500 - 300 + 1)) + 300 : 300;

    setTimeout(()=>{
        animateMainButton();
    }, tic);
}

function setTitle(){
    document.querySelector('#extName').textContent = document.title = `${manifest.name} version ${manifest.version}`;
}

function extraButtonClick(e) {
    switch (e.target.id || '') {
        case "backup":
            exportData(e, storageDataKey, createBackup);
            break;
        case "import":
            importData(e);
            break;
        case "export":
            exportData(e, storageDataKey, doExport);
            break;
        case "exportBackup":
            exportData(e, storageDataBackupKey, doExport);
            break;
        default:
            showMessage('Invalid acton', 'error');
            break;
    }
}

function importData(e){
    document.querySelector('#importedData').click();
}

function importedData(e) {
    if (e.target.files === 0) {
        showMessage('No file uploaded!', 'error');
        return;
    }

    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            const obj = JSON.parse(event.target.result);
            if (!Array.isArray(obj)) {
                showMessage('Unexpected format!', 'error');
                return false;
            }
            var data = [];
            for (let i = 0; i < obj.length; i++) {
                let oKeys = Object.keys(obj[i]);
                // let rec = {};
                if (oKeys.length === 0) { continue; }
                data.push({ "title": obj[i]?.title || `title ${i}`, "body": obj[i]?.body || `body ${i}` });
            }

            browser.storage.local.set({ [storageDataKey]: data }, function() {
              if (browser.runtime.lastError) {
                  showMessage(`Error saving data: ${browser.runtime.lastError}`, 'error');
              } else {
                  showMessage('Data imported successfully.', 'success');
              }
          });
        } catch (error) {
            showMessage(`Error parsing JSON: ${error.message}`, 'error');
        }
    };
    reader.readAsText(file);
}

function exportData(e, storageKey, callback) {
    const isBackup = storageKey.toLowerCase().indexOf('backup') > -1;
    browser.storage.local.get([storageKey], result => {
        if(browser.runtime?.lastError?.message){
            showMessage(browser.runtime.lastError.message, 'error');
            return;
        }
        if (result) {
            if(typeof(callback) === 'function'){
                callback(result?.[storageKey] || [], isBackup);
            }
        }
    });
}

function doExport(repoData, isBackup){
    if (Object.keys(repoData).length === 0) {
        showMessage(`No ${isBackup ? 'Backup ' : ' '}data found for export.`, 'warning')
        return;
    }

    const exportFileName = `${manifest.name.replace(/\t/g, '_')}_${manifest.version}_${isBackup ? 'Backup' : ''}_export_${(new Date()).toISOString().split('.')[0].replace(/\D/g, '')}.json`;
    const result = JSON.stringify(repoData);
    const url = URL.createObjectURL(new Blob([result], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = exportFileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

function createBackup(repoData, isBackup){
    isBackup = true;
    browser.storage.local.set({ [storageDataBackupKey]: repoData }, function() {
        if (browser.runtime.lastError) {
            showMessage(`Error saving data: ${browser.runtime.lastError}`);
        } else {
            showMessage('Data backup was successful.', 'success');
        }
    });
}