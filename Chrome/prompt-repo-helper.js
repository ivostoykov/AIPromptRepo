const manifest = chrome.runtime.getManifest();

const storageDataKey = 'repo';
const storageSettingsKey = 'settings';
const storageOptionsKey = 'repoOptions';
const currentPageTitle = Array.from(document.getElementsByTagName('title')).map(el => el.textContent).join(',');
const eventClick = new Event('click', { bubbles: true, cancelable: true });

let timerId;

Array.prototype.loaded = false;

if (document.readyState !== 'loading') {
  init()
    .then(async resp => {
      await initSidebar()
      await populateData();
      iniDrag();
    })
    .catch(e => {
      console.error(`${manifest.name} - [${getLineNumber()}]: Init error:`, e);
    });
} else {
  document.addEventListener('DOMContentLoaded', async e => {
    try {
      await init();
      await initSidebar()
      await populateData();
    } catch {
      console.error(`${manifest.name} - [${getLineNumber()}]: Init error after DOMContentLoaded:`, e);
    };
  });
}

chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
  switch (request.action) {
    case 'optionsChanged':
      await init();
      break;
    default:
      console.log(`${manifest.name} - [${getLineNumber()}]: Unknown action - ${request.action}`);
      break;
  }
});

function getExtURL(resourceRelativePath) {
  return chrome.runtime.getURL(resourceRelativePath)
}

function getStyle(cssFile) {
  const linkElem = document.createElement("link");
  linkElem.setAttribute("rel", "stylesheet");
  if (cssFile) {
    linkElem.setAttribute("href", chrome.runtime.getURL(cssFile));
  }
  return linkElem;
};

async function buildMainButton() {
  const repoOptions = await getOptionsFromStorage();
  const theMainButton = Object.assign(document.createElement('div'), {
    id: "mainButton",
    className: `semi-sphere-button ${repoOptions?.showEmbeddedButton ? '' : 'invisible'}`,
    title: `Open ${manifest.name || "panel"}`,
    "data-max": "1200"
  });

  ['img/robot.svg', 'img/robot_sleep.svg'].forEach((el, i) => {
    const img = document.createElement('img');
    img.width = "0px";
    img.src = chrome.runtime.getURL(el);
    img.classList.add('img-btn');
    if (i === 1) {
      img.classList.add('invisible');
    }
    theMainButton.appendChild(img);
  });

  theMainButton.addEventListener('click', function (e) {
    e.stopPropagation();
    animateMainButton(theMainButton, false);
    swapButtonWithSidebar();
  }, true);

  theMainButton.addEventListener('mouseenter', (e) => {
    animateMainButton(theMainButton, true);
  });

  theMainButton.addEventListener('mouseleave', (e) => {
    animateMainButton(theMainButton, false);
  });

  return theMainButton;
}

async function initSidebar() {
  const theSideBar = getSideBar();
  theSideBar.querySelector('div.version').textContent = `version ${manifest.version}`;
  theSideBar.querySelector('#menuExportData').addEventListener('click', function (e) {
    theSideBar.querySelector('.dropdown-menu')?.classList.add('invisible');
    exportData(e);
  });

  theSideBar.querySelector('#importedData').addEventListener('change', async (e) => {
    theSideBar.querySelector('.dropdown-menu')?.classList.toggle('invisible');
    await importedData(e);
  });

  theSideBar.querySelector('#menuImportData').addEventListener('click', function (e) {
    const input = theSideBar.querySelector('#importedData');
    input.click();
    theSideBar.querySelector('.dropdown-menu')?.classList.toggle('invisible');
  });

  theSideBar.querySelector('#menuOptions').addEventListener('click', function (e) {
    if (!chrome.runtime.id) {
      showMessage('Please reload the tab because has been disconnected.');
      console.debug(`${manifest?.name} - [${getLineNumber()}] - chrome.runtime.id is missing - perhaps an update is  pending or was applied.`);
      return;
    }
    chrome.runtime.sendMessage({ action: "openOptionsPage" });
    theSideBar.querySelector('.dropdown-menu')?.classList.toggle('invisible');
  });

  theSideBar.querySelectorAll('.card-header')?.forEach(el => {
    el.addEventListener('click', onCardHeaderClick);
  });

  const searchBox = theSideBar.querySelector('#searchBox');
  searchBox?.addEventListener('click', e => {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.preventDefault();
  });

  searchBox?.addEventListener('input', e => {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.preventDefault();
    searBoxInputEventHandler(e);
  })

  theSideBar.addEventListener('mouseenter', (e) => {
    animateMainButton(theSideBar.querySelector('.app-icon'), true);
  });
}

async function buildSidebarAndFetchContent(sidebarLoadedCallback) {
  try {
    const response = await fetch(chrome.runtime.getURL('tmpl/sidebar.html'));
    const data = await response.text();
    const theSideBar = Object.assign(document.createElement('div'), {
      id: 'aiPromptRepoSidebar',
      className: "fixed-parent",
      innerHTML: data
    });

    theSideBar.querySelectorAll('img').forEach(img => {
      const resource = img.getAttribute('data-resource');
      img.src = getExtURL(resource);
      if (resource.lastIndexOf('sendto') > -1 && currentPageTitle) {
        img.alt = img.alt.replace("current page", `${currentPageTitle}`)
        img.parentElement.title = img.parentElement.title.replace("current page", `${currentPageTitle}`);
      }
      img.addEventListener('click', async e => await onRibbonButtonClick(e), true);
    });

    theSideBar.addEventListener('click', function (e) {
      const dropdownMenu = theSideBar.querySelector('.dropdown-menu');
      if (!dropdownMenu.contains(e.target) && !dropdownMenu.classList.contains('invisible')) {
        dropdownMenu.classList.add('invisible');
      }
    }, true);

    if (typeof (sidebarLoadedCallback) === 'function') {
      sidebarLoadedCallback();
    }

    return theSideBar;
  } catch (error) {
    return console.error(`${manifest.name} - [${getLineNumber()}]: Error loading the HTML:`, error);
  }
}

function searBoxInputEventHandler(e) {
  const theSideBar = getSideBar();
  const searchBox = e.target || theSideBar.querySelector('#searchBox');
  if (!searchBox) { return; }
  const cards = theSideBar.querySelectorAll('.card');
  if (cards.length < 1) { return; }

  let searchString = searchBox.value.trim().toLowerCase();
  if (!searchString) {
    cards.forEach(card => card.classList.remove('invisible'));
    return;
  }

  cards.forEach(card => {
    const title = card.querySelector('.card-title');
    const body = card.querySelector('.card-body');
    if (title.textContent.toLowerCase().indexOf(searchString) < 0 && body.textContent.toLowerCase().indexOf(searchString) < 0) {
      card.classList.add('invisible');
    }
  });
}

async function init() {
  document.addEventListener('click', async e => {
    const theShadowRoot = getShadowRoot();
    if (theShadowRoot.querySelector('.dialog-overlay.active')) { return; }
    const repoOptions = await getOptionsFromStorage();
    if (!repoOptions?.closeOnClickOut) { return; }
    if (!theShadowRoot) { return; }
    if (!e.composedPath().includes(theShadowRoot.host)) {
      await swapSidebarWithButton();
    }
    return;
  });
  const shouldContinue = await checkIfUrlAllowed();
  if (shouldContinue) {
    if (document.querySelector('ai-prompt-repo')) { return; }
  } else {
    const aiProptRepo = document.querySelector('ai-prompt-repo');
    if (aiProptRepo) {
      aiProptRepo.remove();
    }
    return;
  }

  try {
    var container = document.createElement('ai-prompt-repo');
    container.classList.add('invisible');
    const theShadowRoot = container.attachShadow({ mode: 'open' });
    theShadowRoot.appendChild(getStyle("/css/button.css"));
    theShadowRoot.appendChild(getStyle("/css/sidebar.css"));
    theShadowRoot.appendChild(await buildMainButton());
    theShadowRoot.appendChild(await buildSidebarAndFetchContent());

    document.body.appendChild(container);
    container.classList.remove('invisible');
  } catch (err) {
    console.error(`${manifest.name} - [${getLineNumber()}]: Error`, err);
  }
}

async function checkIfUrlAllowed() {
  try {
    const repoOptions = await getOptionsFromStorage();
    const urls = repoOptions?.allowedUrls?.split(/[;,\n]+/)?.filter(Boolean) || [];
    if (urls.length < 1 || urls[0].trim() === '*') { return true; }
    return urls.some(el => el.includes(location.hostname) || location.hostname.includes(el));
  } catch (err) {
    console.error(`${manifest.name}: Error`, err);
    return false;
  }
}

function onCardHeaderClick(e) {
  const theSideBar = getSideBar();
  if (theSideBar.querySelector('.card-field-editable')) {
    return;
  }
  const card = e.target.closest('.card');
  const cardBody = card.querySelector('.card-body');
  const isCardInVisible = cardBody.classList.contains('invisible');

  colapseAllCardBodies();
  removeCardEditableAttribute();
  if (isCardInVisible) {
    card.classList.add('card-selected', 'card-expanded');
    card.classList.remove('draggable');
    card.removeAttribute('draggable')
    cardBody.classList.remove('invisible');
    card.querySelector('.expander').classList.add('is-open');
  } else {
    card.classList.remove('card-selected', 'card-expanded');
    card.classList.add('draggable');
    card.setAttribute('draggable', 'ture');
    card.querySelector('.expander').classList.remove('is-open');
  }
}

function swapButtonWithSidebar() {
  const theSideBar = getSideBar();
  const theMainButton = getMainButton();
  theMainButton.classList.add('invisible');
  theSideBar.classList.add('active-sidebar');
}

async function swapSidebarWithButton() {
  const theSideBar = getSideBar();
  const theMainButton = getMainButton();
  if (!theMainButton) { return; }
  const repoOptions = await getOptionsFromStorage()
  if (repoOptions.showEmbeddedButton) {
    theMainButton.classList.remove('invisible');
  }
  theSideBar.classList.remove('active-sidebar');
}

async function populateData() {
  const theSideBar = getSideBar();
  const emptyElement = theSideBar.querySelector('.empty-element');
  const cardContainer = theSideBar.querySelector('.main-content');
  let card = cardContainer.querySelector('.card');
  const repoData = await getRepoData();

  if (!card) { return; }

  card = normaliseCard(card.cloneNode(true));
  cardContainer.innerHTML = '';

  if ((repoData || []).length === 0) {
    emptyElement.classList.remove('invisible');
    theSideBar.querySelector('.main-content')?.classList.add('invisible');
    cardContainer.appendChild(card);
    return;
  }

  emptyElement.classList.add('invisible');
  theSideBar.querySelector('.main-content')?.classList.remove('invisible');

  (repoData || []).forEach((rec) => {
    const newCard = card.cloneNode(true);
    newCard.setAttribute('data-index', `${rec.id}`);
    newCard.querySelectorAll('.invisible').forEach(invisible => invisible.classList.remove('invisible'));

    newCard.querySelectorAll('.card-btn')?.forEach(btn => {
      btn.addEventListener('click', async e => await onRibbonButtonClick(e), true);
    });

    const titleEl = newCard.querySelector('.card-title');
    if (titleEl) {
      titleEl.textContent = rec.title || '';
      titleEl.setAttribute('data-index', `${rec.id}`);
    }

    const bodyEl = newCard.querySelector('.card-body');
    if (bodyEl) {
      bodyEl.innerHTML = rec.body?.replace(/\n/g, '<br/>');
      bodyEl.setAttribute('data-index', `${rec.id}`);
      bodyEl.classList.add('invisible');
    }

    cardContainer.appendChild(newCard);
  });
}

async function onRibbonButtonClick(e) {
  e.stopPropagation();
  e.preventDefault();
  const theSideBar = getSideBar();
  const clickedButton = e.composedPath().find(el => el.getAttribute?.("data-type"));
  const type = clickedButton.dataset?.type?.toLowerCase();
  if (!type) { return; }
  switch (type) {
    case 'close':
      animateMainButton(theSideBar.querySelector('.app-icon'), false);
      await swapSidebarWithButton(e);
      break;
    case 'copy':
      await copyDataItemContent(e, clickedButton.closest('.card'));
      break;
    case 'edit':
      await editCard(e, clickedButton.closest('.card'));
      break;
    case 'sendto':
      await sendTo(e, clickedButton.closest('.card'));
      break;
    case 'sendtorun':
      await sendTo(e, clickedButton.closest('.card'), true);
      break;
    case 'delete':
      await deleteCard(e, clickedButton.closest('.card'));
      break;
    case 'newitem':
      onNewItemClicked(e);
      break;
    case 'options':
      theSideBar.querySelector('.dropdown-menu')?.classList.toggle('invisible');
      break;
    case 'search':
      onSearchClick(e);
      break;
    case "expand":
      onCardHeaderClick(e);
      break;
    default:
      showMessage(`Unknown type ${type}`);
  }
}

function onSearchClick(e) {
  e.stopPropagation();
  const theSideBar = getSideBar();
  const clickedEl = (e.currentTarget || e.target);
  const action = clickedEl.tagName === 'IMG' ? 'open' : 'close';
  const searchContainer = theSideBar?.querySelector('#searchBoxContainer');
  const searchBtn = searchContainer.querySelector('img');
  const searchBox = theSideBar?.querySelector('#searchBox');
  const clearBtn = theSideBar?.querySelector('#clearSearchBoxBtn');

  setTimeout(e => theSideBar.querySelector('.app-icon')?.classList.toggle('behind'), 250);

  if (!searchBox || !clearBtn) {
    console.error(`${manifest?.name} - [${getLineNumber()}] - Search elements not found!`, e.target, e.currentTarget);
    return;
  }

  switch (action) {
    case 'open':
      searchBox.classList.add('active');
      searchBox.focus();
      clearBtn?.classList.remove('invisible');
      searchBtn?.classList.add('invisible');
      clearBtn.onclick = (e) => onSearchClick(e);
      searchContainer.classList.add('search-icon-bordered');
      break;
    case 'close':
      searchBox.classList.remove('active');
      searchBox.value = '';
      searchBox.dispatchEvent(new Event('input'));
      clearBtn.classList.add('invisible');
      searchBtn?.classList.remove('invisible');
      clearBtn.onclick = null;
      searchContainer.classList.remove('search-icon-bordered');
      break;

    default:
      console.error(`${manifest?.name} - [${getLineNumber()}] - Unknkown action - ${action}!`, e.target, e.currentTarget);
      break;
  }
}

function onNewItemClicked(e) {
  showRecordDialog({
    id: null,
    title: null,
    content: null,
    onSave: async (data) => {
      await saveEdit(data);
    }
  });
}

function createNewCard(card) {
  const { id, title, body } = card;
  const theSideBar = getSideBar();
  const emptyElement = theSideBar.querySelector('.empty-element');
  if (!emptyElement.classList.contains('invisible')) {
    emptyElement.classList.add('invisible');
  }

  const mainContent = theSideBar.querySelector('.main-content');
  if (mainContent.classList.contains('invisible')) {
    mainContent.classList.remove('invisible');
  }

  const cardTemplate = mainContent?.querySelector('.card');
  if (!cardTemplate) {
    showMessage('No card found', 'error');
    return;
  }

  const newCard = normaliseCard(cardTemplate.cloneNode(true));
  newCard.dataset.index = id;

  const newCardTitle = newCard.querySelector('.card-title');
  newCardTitle.dataset.index = id;
  newCardTitle.textContent = title;

  const newCardBody = newCard.querySelector('.card-body');
  newCardBody.textContent = body;
  newCardBody.dataset.index = id;

  mainContent.appendChild(newCard);
  newCardTitle.focus();
}

async function editCard(e, cardOriginator) {
  if (!cardOriginator) {
    showMessage('Unknown item!', 'error');
    return;
  }

  const cardIndex = cardOriginator?.dataset?.index;
  if (!cardIndex) {
    console.error(`${manifest?.name} - [${getLineNumber()}]: card index is empty or not found!`, cardOriginator);
    showMessage('Missing card index!', 'error');
    return;
  }

  const repoData = await getRepoData();
  const theCard = repoData.find(el => el.id === cardIndex);
  showRecordDialog({
    id: cardIndex,
    title: theCard?.title,
    content: theCard.body,
    onSave: async (data) => {
      await saveEdit(data);
    }
  });

  return;
}

async function saveEdit(card) {
  const { id, title, body } = card;
  let repoData = await getRepoData();
  const recIndex = repoData.findIndex(el => el.id === id);
  if (recIndex < 0) {
    repoData.push({ id, title, body });
  } else {
    repoData[recIndex] = { id, title, body };
  }

  const res = await setRepoData(repoData);
  if (res) {
    showMessage(`${title} saved.`, 'success');
    updateCardElement(card);
    console.log(`${manifest?.name} - [${getLineNumber()}]: Saved`, id, title);
  } else {
    showMessage(`Failed to save ${title}!`, 'error');
    console.log(`${manifest?.name} - [${getLineNumber()}]: NOT Saved`, id, title);
  }
}

function updateCardElement(card) {
  const { id, title, body } = card;
  const theSideBar = getSideBar();
  const theCardEl = theSideBar.querySelector(`[data-index="${id}"]`);
  if (!theCardEl) { return createNewCard(card); }

  try {
    theCardEl.querySelector('.card-title').textContent = title;
    theCardEl.querySelector('.card-body').textContent = body;
  } catch (err) {
    console.error(`${manifest?.name} - [${getLineNumber()}]: ${err.message}`, err);
  }
}

async function deleteCard(e, cardOriginator) {
  e.preventDefault();
  e.stopPropagation();
  let response;
  const title = cardOriginator.querySelector('.card-title')?.textContent || 'this card';
  try {
    response = await showDialog(`Delete ${title}?`);
    if (!response) { return; }
    await onDeleteConfirmation(e, cardOriginator);
  } catch (error) {
    console.error(`${manifest.name} - [${getLineNumber()}] - Error occurred with response`, error, response);
  }
}

async function onDeleteConfirmation(e, cardOriginator) {
  if (!cardOriginator) {
    console.error(`${manifest.name} - [${getLineNumber()}] - Error occurred with response`, cardOriginator);
    showMessage('Unknown item!', 'error');
    return;
  }

  const promptId = cardOriginator.dataset.index;
  if (!promptId) {
    console.error(`${manifest.name} - [${getLineNumber()}] - Prompt Id is missing or not found (${promptId})!`);
    showMessage(`Prompt Id is missing or not found (${promptId})!`);
    return;
  }

  const repoData = await getRepoData();
  const index = repoData.findIndex(el => el.id === promptId);
  if (index < 0) {
    console.log(`${manifest.name} - [${getLineNumber()}] No prompt id with a value ${promptId} was found!`, repoData);
    return;
  }

  repoData.splice(index, 1);
  await updateData(repoData);
}

function removedAsNew(card) {
  if (!card) { return false; }
  const isNew = card.getAttribute('data-card-type') === 'new';
  if (!isNew) { return false; }
  const theSideBar = getSideBar();
  theSideBar.querySelector('#editButtons').classList.add('invisible');

  return card.remove(card) !== null;
}

async function updateData(objData, rebuild = true) {
  try {
    await chrome.storage.local.set({ [storageDataKey]: objData });
    showMessage('Data saved.', 'success');
    if (rebuild) {
      await populateData();
    }
  } catch (err) {
    showMessage(chrome.runtime.lastError?.message || err.message, 'error');
  }
}

function prepareNextToEdit(editedEl, editRibbon) {
  editRibbon.classList.remove('edit-buttons-title', 'edit-buttons-body', 'invisible');
  editRibbon.classList.add('edit-buttons-body');
  const nextToEdit = editedEl.closest('.card').querySelector('.card-body');
  nextToEdit.classList.remove('invisible');
  nextToEdit.setAttribute('contenteditable', 'true');
  nextToEdit.classList.add('card-field-editable')
  nextToEdit.focus();
}

function normaliseFieldsAndButtons(editedEl, editRibbon) {
  const theSideBar = getSideBar();
  theSideBar.querySelectorAll('.card-expanded').forEach(el => el.classList.remove('card-expanded'));
  theSideBar.querySelectorAll('.card-selected').forEach(el => el.classList.remove('card-selected'));
  theSideBar.querySelectorAll('.card-body').forEach(el => el.classList.add('invisible'));
  editedEl.classList.add('invisible');
  editRibbon.classList.remove('edit-buttons-body');
  editRibbon.classList.add('invisible');
  editedEl.closest('.card').querySelector('.expander').classList.remove('invisible');
}

function getInputElement() {
  let receiver = document.querySelector('#prompt-textarea') || document.querySelector('div.textarea') || document.querySelector('textarea');
  if (!receiver) {
    receiver = document.activeElement;
    if (!receiver || !(receiver.tagName === 'INPUT' ||
      receiver.tagName === 'TEXTAREA' || receiver.isContentEditable)) {
      receiver = false;
    }
  }
  return receiver;
}

async function sendTo(e, cardOriginator, run = false) {
  if (!cardOriginator) {
    showMessage('Unknown item!', 'error');
    return;
  }

  const promptTextarea = getInputElement();
  if (!promptTextarea) {
    showMessage('Failed to find where to send data to.', 'error');
    return;
  }

  const body = cardOriginator.querySelector('.card-body');
  const promptId = body.getAttribute('data-index');
  if (!promptId) {
    showMessage(`Prompt Id is missing or empty (${promptId.toString()})!`);
    return;
  }
  if (promptTextarea) {
    await injectPromptBody(promptTextarea, promptId);

    if (run) {
      runPrompt();
    }
  }

  const repoOptions = await getOptionsFromStorage();
  if (repoOptions && repoOptions.closeOnSendTo) {
    await swapSidebarWithButton();
  }
}

async function injectPromptBody(promptTextarea, promptId) {
  const repoData = await getRepoData();
  const repoDataReord = repoData.find(el => el.id === promptId);

  if (promptTextarea.tagName.toLowerCase() === 'textarea') {
    promptTextarea.value = repoDataReord?.body;
    dispatchInputEvent(promptTextarea, repoDataReord?.body);
  } else {
    promptTextarea.textContent = repoDataReord?.body;
  }

  promptTextarea.style.height = 'auto';

  if (promptTextarea.scrollHeight > promptTextarea.clientHeight) {
    promptTextarea.style.height = promptTextarea.scrollHeight + 'px';
  }

}

function runPrompt() {
  const attrValues = ['click_send', 'submit_button', 'send-button'];
  const promptButton = Array.from(document.querySelectorAll('button'))
    .map(el => Array.from(el.attributes)
      .filter(a => attrValues.includes(a.value) || attrValues.some(el => a.value.indexOf(el) > -1))
    )
    .filter(attrs => attrs.length > 0)
    .map(attrs => attrs[0].ownerElement);
  if (promptButton.length > 0) {
    promptButton[0].disabled = false;
    setTimeout(() => {
      dispatchMouseClickEvent(promptButton[0]);
    }, Math.floor(Math.random() * (1500 - 500 + 1)) + 500);
  } else {
    showMessage('No button found to execute. Run manually.', 'warning');
  }
}

function dispatchInputEvent(originator, data = '') {
  if (!originator) { return; }
  const inputEvent = new InputEvent('input', {
    bubbles: true,
    cancelable: true,
    composed: true,
    data: data,
    inputType: 'insertFromPaste',
    isComposing: false
  });

  originator.dispatchEvent(inputEvent);
}

function dispatchMouseClickEvent(originator) {
  if (!originator) { return; }
  const rect = originator.getBoundingClientRect();
  const x = Math.floor(Math.random() * (rect.right - rect.left + 1)) + rect.left;
  const y = Math.floor(Math.random() * (rect.bottom - rect.top + 1)) + rect.top;

  const eventMouseClick = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: rect.left + x,
    clientY: rect.top + y,
    button: 0 // 0 indicates the left mouse button
  });

  originator.dispatchEvent(eventMouseClick);
}

function colapseAllCardBodies() {
  const theSideBar = getSideBar();
  theSideBar.querySelectorAll('.card-body')?.forEach((b) => {
    if (!b.classList.contains('invisible')) {
      b.classList.add('invisible');
    }
  });
}

function removeCardEditableAttribute() {
  const theSideBar = getSideBar();
  [...theSideBar.querySelectorAll('.card-field-editable')].forEach(el => {
    el.removeAttribute('contenteditable');
    el.classList.remove('card-field-editable');
  });
}


function normaliseCard(card) {
  if (!card) {
    showMessage('Wrong card!', error);
    return card;
  }

  card.querySelectorAll('.card-title, .card-body').forEach(el => {
    el.innerHTML = '';
    el.removeAttribute('data-index');
  });
  card.setAttribute('data-index', '');

  return card;
}

function normaliseRepoData(data) {
  const origDatta = [...data];
  let isDirty = false;
  try {
    (data || [])?.forEach(el => {
      if (!el?.id) {
        el["id"] = crypto.randomUUID();
        isDirty = true;
      }
    });

    chrome.storage.local.set({ [storageDataKey]: data }, function () {
      if (chrome.runtime.lastError) { console.error(`${manifest.name} - [${getLineNumber()}]: Error saving data`, chrome.runtime.lastError); }
    });
    return data;
  } catch (error) {
    console.error(`${manifest.name} - [${getLineNumber()}]: Error saving data`, chrome.runtime.lastError);
    return origDatta;
  }
}


async function copyDataItemContent(e, cardOriginator) {
  if (!cardOriginator) {
    showMessage('Unknown item!', 'error');
    return;
  }

  const promptId = cardOriginator?.dataset?.index;
  if (!promptId) {
    showMessage(`Prompt Id is missing or empty - (${promptId.toString()}!`);
    return;
  }

  const repoData = await getRepoData();
  const repoDataRecord = repoData.find(el => el.id === promptId)?.body;
  if (repoDataRecord) { navigator.clipboard.writeText(repoDataRecord); }

  const theSideBar = getSideBar();
  var hint = theSideBar.querySelector('#copyHint');
  if (!hint.classList.contains('invisible')) {
    hint.classList.add('invisible');
  }

  const repoOptions = await getOptionsFromStorage();
  if (repoOptions && repoOptions.closeOnCopy) {
    await swapSidebarWithButton();
  }

  hint.style.right = '';
  hint.style.left = '';

  var hintWidth = hint.offsetWidth;
  var viewportWidth = window.innerWidth;

  if (viewportWidth - e.clientX < hintWidth + 20) {
    hint.style.right = (viewportWidth - e.clientX) + 'px';
  } else {
    hint.style.left = e.clientX + 'px';
  }

  hint.style.top = e.clientY + 'px';
  hint.classList.remove('invisible');
  setTimeout(() => hint.style.opacity = 1, 10);

  setTimeout(function () {
    hint.style.opacity = 0;
    setTimeout(() => hint.classList.add('invisible'), 500);
  }, 2000);
}

async function exportData(e) {
  let repoData = await getRepoData();
  repoData.forEach(item => delete item.id);
  if (repoData.length === 0) {
    showMessage('No data found for export.', 'warning')
    return;
  }

  const exportFileName = `${manifest.name.replace(/\t/g, '_')}_${manifest.version}_export_${(new Date()).toISOString().split('.')[0].replace(/\D/g, '')}.json`;
  const result = JSON.stringify(repoData, null, '    ');
  const url = URL.createObjectURL(new Blob([result], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = exportFileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

async function importedData(e) {
  if (e.target.files === 0) {
    showMessage('No file uploaded!', 'error');
    return;
  }

  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const obj = JSON.parse(event.target.result);
      if (!Array.isArray(obj)) {
        showMessage('Unexpected format!', 'error');
        return false;
      }
      var data = [];
      for (let i = 0, l = obj.length; i < l; i++) {
        if (Object.keys(obj[i])?.length === 0) { continue; }
        if (!obj[i]?.id) { obj[i]["id"] = crypto.randomUUID(); }
        data.push(obj[i]);
      }

      if (await setRepoData(data)) {
        showMessage('Data imported successfully.', 'success');
        await populateData();
      }
    } catch (error) {
      showMessage(`Error parsing JSON: ${error.message}`, 'error');
    }
  };
  reader.readAsText(file);
}

function showMessage(message, type) {
  if (!message) { return; }
  const theSideBar = getSideBar();
  let msg = theSideBar.querySelector('#feedbackMessage');
  if (!msg) {
    console.error(`${manifest?.name} - [${getLineNumber()}]: #feedbackMessage element not found!`);
    return;
  }
  if ((type || 'info')?.indexOf('') !== 0) { type = `${type}`; }

  if (msg.classList.contains('feedback-message-slide')) {
    msg.classList.remove('feedback-message-slide');
    setTimeout(() => { showMessage(message, type); }, 250);
    return;
  }

  msg.innerHTML = message;
  msg.classList.remove('success', 'error', 'info', 'warning');
  msg.classList.add('feedback-message-slide', type || 'info');
  setTimeout(() => { msg.classList.remove('feedback-message-slide'); }, 3000);
}

function animateMainButton(container, loop = false) {
  clearTimeout(timerId);
  if (!container) { return; }
  const img = container.querySelectorAll('img');
  if (!img || img.length < 2) { return; }
  if (!loop) {
    img[0].classList.remove('invisible');
    img[1].classList.add('invisible');

    return;
  }

  img.forEach(i => i.classList.toggle('invisible'));

  const max = parseInt(container.getAttribute("data-max") || "1200", 10);
  const min = 300;
  const tic = img[1].classList.contains('invisible') ? Math.floor(Math.random() * (max - min + 1)) + min : min;

  timerId = setTimeout(() => {
    animateMainButton(container, loop);
  }, tic);
}

/// helpers

function getLineNumber() {
  const e = new Error();
  const stackLines = e.stack.split("\n").map(line => line.trim());
  let index = stackLines.findIndex(line => line.includes(getLineNumber.name));

  return stackLines[index + 1]
    ?.replace(/\s{0,}at\s+/, '')
    ?.replace(/^.*?\/([^\/]+\/[^\/]+:\d+:\d+)$/, '$1')
    || "Unknown";
}

async function getRepoData() {
  try {
    const result = await chrome.storage.local.get([storageDataKey]);
    const data = result?.[storageDataKey] || [];
    data.loaded = true;
    return data;
  } catch (error) {
    console.error(`${manifest.name} - [${getLineNumber()}] - Failed to get data from ${storageDataKey} local storage!`);
    return [];
  }
}

async function setRepoData(data) {
  try {
    await chrome.storage.local.set({ [storageDataKey]: data });
    if (chrome.runtime.lastError) {
      console.error(`${manifest.name} - [${getLineNumber()}] - Error saving data:`, chrome.runtime.lastError);
    }
    return true;
  } catch (error) {
    console.error(`${manifest.name} - [${getLineNumber()}] - Failed to get data from ${storageDataKey} local storage!`);
    return false;
  }
}

async function getStorageSettings() {
  try {
    const result = await chrome.storage.local.get([storageSettingsKey]);
    const data = result?.[storageSettingsKey] || [];
    return data;
  } catch (error) {
    console.error(`${manifest.name} - [${getLineNumber()}] - Failed to get data from ${storageSettingsKey} local storage!`);
    return [];
  }
}

async function getOptionsFromStorage() {
  const defaults = {
    "allowedUrls": `chatgpt.com
    gemini.google.com
    you.com`,
    "closeOnClickOut": true,
    "closeOnCopy": true,
    "closeOnSendTo": false
  };

  try {
    const opt = await chrome.storage.sync.get([storageOptionsKey]);
    return Object.assign({}, defaults, (opt?.[storageOptionsKey] || {}));
  } catch (e) {
    console.error(`${manifest.name} - [${getLineNumber()}] - ${e.message}`, e);
    showMessage(chrome.runtime.lastError?.message, 'error');
    return;
  }
}

function getSideBar() {
  return document.querySelector('ai-prompt-repo')?.shadowRoot?.querySelector('#aiPromptRepoSidebar');
}

function getMainButton() {
  return document.querySelector('ai-prompt-repo')?.shadowRoot?.querySelector('#mainButton');
}

function getShadowRoot() {
  return document.querySelector('ai-prompt-repo')?.shadowRoot;
}