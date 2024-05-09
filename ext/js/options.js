const storageOptionsKey = 'repoOptions';
const manifest = chrome.runtime.getManifest();

document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('repoOptionsForm').addEventListener('submit', sbeSaveSettings);
document.getElementById('cancelButton').addEventListener('click', cancelOptions);

function sbeSaveSettings(e) {
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

    chrome.storage.sync.set({[storageOptionsKey]: optionsData}, function() {
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

    chrome.storage.sync.get([storageOptionsKey], function(obj) {
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