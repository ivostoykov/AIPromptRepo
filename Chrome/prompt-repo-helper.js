const manifest = chrome.runtime.getManifest();
var theShadowRoot;
var theMainButton;
var theSideBar;
var repoData = [];
var repoSettings = {};
var repoOptions = {};

const storageDataKey = 'repo';
const storageSettingsKey = 'settings';
const storageOptionsKey = 'repoOptions';
const currentPageTitle = Array.from(document.getElementsByTagName('title')).map(el => el.textContent).join(',');
const eventClick = new Event('click', { bubbles: true, cancelable: true });

let timerId;

Array.prototype.loaded = false;

if (document.readyState !== 'loading') {
  init().catch(e => {
    console.error("Init error:", e);
  });
} else {
  document.addEventListener('DOMContentLoaded', function () {
    init().catch(e => {
      console.error("Init error after DOMContentLoaded:", e);
    });
  });
}

chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
  switch (request.action){
    case 'optionsChanged':
      await init();
      // await getOptionsFromStorage();
      break;
    default:
      console.log(`Unknown action - ${request.action}`);
      break;
  }
});

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
    repoOptions = Object.assign({}, defaults, (opt?.[storageOptionsKey] || {}));
    const result = await chrome.storage.local.get([storageDataKey, storageSettingsKey]);
    if (result) {
      repoData = result?.[storageDataKey] || [];
      repoData.loaded = true;
      repoSettings = result?.[storageSettingsKey] || {};
    }
  } catch (e) {
    showMessage(chrome.runtime.lastError.message, 'error');
    return;
  }
}

function getExtURL(resourceRelativePath){
  return chrome.runtime.getURL(resourceRelativePath)
}

function getStyle(cssFile) {
  const linkElem = document.createElement("link");
  linkElem.setAttribute("rel", "stylesheet");
  if(cssFile)  {
    linkElem.setAttribute("href", chrome.runtime.getURL(cssFile));
  }
    return linkElem;
};

function buildMainButton(){
  theMainButton = Object.assign(document.createElement('div'), {
    id: "mainButton",
    className: `semi-sphere-button ${repoOptions.showEmbeddedButton ? '' : 'invisible'}`,
    title: `Open ${manifest.name || "panel"}`,
    "data-max": "1200"
  });

  ['img/robot.svg', 'img/robot_sleep.svg'].forEach((el, i) => {
    const img = document.createElement('img');
    img.width = "0px";
    img.src = chrome.runtime.getURL(el);
    img.classList.add('img-btn');
    if(i === 1){
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
    // if(!timerId){
      animateMainButton(theMainButton, true);
    // }
  });

  theMainButton.addEventListener('mouseleave', (e) => {
      animateMainButton(theMainButton, false);
  });

  return theMainButton;
}

function initSidebar() {
  theSideBar.querySelector('div.version').textContent = `version ${manifest.version}`;
  theSideBar.querySelector('#menuExportData').addEventListener('click', function (e) {
    theSideBar.querySelector('.dropdown-menu')?.classList.toggle('invisible');
    exportData(e);
  });

  theSideBar.querySelector('#importedData').addEventListener('change', function (e) {
    theSideBar.querySelector('.dropdown-menu')?.classList.toggle('invisible');
    importedData(e);
  });

  theSideBar.querySelector('#menuImportData').addEventListener('click', function (e) {
    const input = theSideBar.querySelector('#importedData');
    input.click();
    theSideBar.querySelector('.dropdown-menu')?.classList.toggle('invisible');
  });

  theSideBar.querySelector('#menuOptions').addEventListener('click', function(e) {
    chrome.runtime.sendMessage({action: "openOptionsPage"});
    theSideBar.querySelector('.dropdown-menu')?.classList.toggle('invisible');
  });

  theSideBar.querySelectorAll('.card-header')?.forEach(el => {
      el.addEventListener('click', onCardHeaderClick);
  });

  theSideBar.querySelector('#searchBoxContainer img')?.addEventListener('click', function(e) {
      e.stopPropagation();
      const searchContainer = theSideBar.querySelector('#searchBoxContainer');
      var searchBox = theSideBar.querySelector('#searchBox');
      if (!searchBox) {  return;  }
      if (searchBox.classList.contains('active')) {
        searchBox.classList.remove('active');
        searchBox.value = '';
        searchBox.dispatchEvent( new Event('input'));
        searchContainer.classList.remove('search-icon-bordered');
      } else {
        searchBox.classList.add('active');
        searchBox.focus();
        searchContainer.classList.add('search-icon-bordered');
      }
  });

  theSideBar.querySelector('#searchBox').addEventListener('input', (e) => {
    handleInput(e);
  })

  theSideBar.addEventListener('mouseenter', (e) => {
      animateMainButton(theSideBar.querySelector('.app-icon'), true);
  });

/*   theSideBar.addEventListener('mouseleave', (e) => {
    animateMainButton(theSideBar.querySelector('.app-icon'), false);

  }); */
}

async function buildSidebarAndFetchContent(sidebarLoadedCallback) {
  try {
    const response = await fetch(chrome.runtime.getURL('tmpl/sidebar.html'));
    const data = await response.text();
    theSideBar = Object.assign(document.createElement('div'), {
      id: 'aiPromptRepoSidebar',
      className: "fixed-parent",
      innerHTML: data
    });

    theSideBar.querySelectorAll('img').forEach(img => {
      const resource = img.getAttribute('data-resource');
      img.src = getExtURL(resource);
      if(resource.lastIndexOf('sendto') > -1 && currentPageTitle){
        img.alt = img.alt.replace("current page", `${currentPageTitle}`)
        img.parentElement.title = img.parentElement.title.replace("current page", `${currentPageTitle}`);
      }
      img.addEventListener('click', onRibbonButtonClick);
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

    initSidebar();
    return theSideBar;
  } catch (error) {
    return console.error('Error loading the HTML:', error);
  }
}

function handleInput(e){
  const searchBox = e.target || theSideBar.querySelector('#searchBox');
  if(!searchBox){  return;  }
  const cards = theSideBar.querySelectorAll('.card');
  if(cards.length < 1){  return;  }

  let searchString = searchBox.value.trim().toLowerCase();
  if(!searchString){
    cards.forEach(card => card.classList.remove('invisible'));
    return;
  }

  cards.forEach(card => {
    const title = card.querySelector('.card-title');
    const body = card.querySelector('.card-body');
    if(title.textContent.toLowerCase().indexOf(searchString) < 0 && body.textContent.toLowerCase().indexOf(searchString) < 0){
      card.classList.add('invisible');
    }
  });
}

function populateDataHelper(){
  if(!theSideBar || !repoData || !repoData.loaded){
    setTimeout(populateDataHelper, 1000);
    return;
  }

  populateData();
}

async function init() {
  document.addEventListener('click', e => {
    if(!repoOptions?.closeOnClickOut){  return;  }
    if(!theShadowRoot) {  return;  }
    if(!e.composedPath().includes(theShadowRoot.host)){
      swapSidebarWithButton();
    }
    return;
  });
  await getOptionsFromStorage();
  const shouldContinue = checkIfUrlAllowed();
  if(shouldContinue){
    if (document.querySelector('ai-prompt-repo')) {  return;  }
  } else {
    const aiProptRepo = document.querySelector('ai-prompt-repo');
    if(aiProptRepo){
      aiProptRepo.remove();
    }
    return;
  }

  try {
    // manifest = chrome.runtime.getManifest();
    var container = document.createElement('ai-prompt-repo');
    container.classList.add('invisible');
    theShadowRoot = container.attachShadow({ mode: 'open' });
    theShadowRoot.appendChild(getStyle("/css/button.css"));
    theShadowRoot.appendChild(getStyle("/css/sidebar.css"));
    theShadowRoot.appendChild(buildMainButton());
    theShadowRoot.appendChild(await buildSidebarAndFetchContent());

    document.body.appendChild(container);
    container.classList.remove('invisible');
    populateDataHelper();
    iniDrag();
  } catch (err) {
    console.error(err);
  }
}

function checkIfUrlAllowed(){
  try {
      const urls = repoOptions?.allowedUrls?.split(/[;,\n]+/)?.filter(Boolean) || [];
      if(urls.length < 1 || urls[0].trim() === '*'){  return true;  }
      return urls.some(el => el.includes(location.hostname) || location.hostname.includes(el));
    } catch (err) {
      console.error(err);
      return false;
    }
}

function onCardHeaderClick(e) {
  if(theSideBar.querySelector('.card-field-editable')){
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
  theMainButton.classList.add('invisible');
  theSideBar.classList.add('active-sidebar');
}

function swapSidebarWithButton() {
  if(!theMainButton)  {  return;  }
  if(repoOptions.showEmbeddedButton){
    theMainButton.classList.remove('invisible');
  }
  theSideBar.classList.remove('active-sidebar');
}

function populateData() {
  const emptyElement = theSideBar.querySelector('.empty-element');
  const cardContainer = theSideBar.querySelector('.main-content');
  let card = cardContainer.querySelector('.card');

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

  (repoData || []).forEach((el, idx) => {
      const newCard = card.cloneNode(true);
      newCard.setAttribute('data-index', `${idx}`);
      newCard.querySelectorAll('.invisible').forEach(invisible => invisible.classList.remove('invisible'));

      newCard.querySelectorAll('.card-btn')?.forEach(btn => {
          btn.addEventListener('click', onRibbonButtonClick);
      });

      const titleEl = newCard.querySelector('.card-title');
      if (titleEl) {
          titleEl.textContent = el.title || '';
          titleEl.setAttribute('data-index', `${idx}`);
      }

      const bodyEl = newCard.querySelector('.card-body');
      if (bodyEl) {
          bodyEl.innerHTML = el.body?.replace(/\n/g, '<br/>');
          bodyEl.setAttribute('data-index', `${idx}`);
          bodyEl.classList.add('invisible');
      }

      cardContainer.appendChild(newCard);
  });
}

function onRibbonButtonClick(e) {
  e.stopPropagation();
  e.preventDefault();
  const clickedButton = this || e.target;
  const type = (clickedButton.getAttribute('data-type') || clickedButton.parentElement.getAttribute('data-type'))?.toLowerCase();
  if (!type) { return; }
  switch (type) {
      case 'close':
        animateMainButton(theSideBar.querySelector('.app-icon'), false);
        swapSidebarWithButton();
        break;
      case 'copy':
          copyDataItemContent(e, clickedButton.closest('.card'));
          break;
      case 'edit':
          editCard(e, clickedButton.closest('.card'));
          break;
      case 'sendto':
          sendTo(e, clickedButton.closest('.card'));
          break;
      case 'sendtorun':
          sendTo(e, clickedButton.closest('.card'), true);
          break;
      case 'delete':
          deleteCard(e, clickedButton.closest('.card'));
          break;
      case 'save':
          saveEdit();
          break;
      case 'skip':
        skipEdit();
        break;
      case 'cancel':
        cancelEdit();
        break;
      case 'newitem':
        onNewItemClicked(e);
        break;
      case 'options':
        theSideBar.querySelector('.dropdown-menu')?.classList.toggle('invisible');
        break;
      case 'search':
        setTimeout(e => theSideBar.querySelector('.app-icon')?.classList.toggle('behind'), 250);
        break;
      case "expand":
        onCardHeaderClick(e);
        break;
      default:
        showMessage(`Unknown type ${type}`);
  }
}

function onNewItemClicked(e) {
  const emptyElement = theSideBar.querySelector('.empty-element');
  // const areCardsEmpty = Object.keys(repoData).length < 1;
  if (!emptyElement.classList.contains('invisible')) {
    emptyElement.classList.add('invisible');
  }

  const mainContent = theSideBar.querySelector('.main-content');
  if (mainContent.classList.contains('invisible')) {
    mainContent.classList.remove('invisible');
  }

  const card = mainContent?.querySelector('.card');
  if (!card) {
    showMessage('No card found', 'error');
    return;
  }

  const newCard = normaliseCard(card.cloneNode(true));
  newCard.classList.add('card-selected', 'card-expanded');
  newCard.setAttribute('data-card-type', 'new');

  const newCardTitle = newCard.querySelector('.card-title');
  newCardTitle.setAttribute('contenteditable', 'true');
  newCardTitle.classList.add('card-field-editable');
  newCard.querySelector('.card-header').addEventListener('click', onCardHeaderClick);

  mainContent.appendChild(newCard);
  theSideBar.querySelector('#editButtons').classList.remove('invisible');
  newCardTitle.focus();
}

function editCard(e, cardOriginator) {
  if (!cardOriginator) {
      showMessage('Unknown item!', 'error');
      return;
  }

  cardOriginator.classList.remove('draggable');
  cardOriginator.querySelector('.expander').classList.add('invisible');
  cardOriginator.querySelectorAll('.invisible:not(.expander)').forEach(el => el.classList.remove('invisible'));

  // cardOriginator.querySelectorAll('.invisible').forEach(el => el.classList.remove('invisible'));
  cardOriginator.classList.add('card-selected', 'card-expanded');
  const cardTitle = cardOriginator.querySelector('.card-title');
  const cardIndex = parseInt(cardOriginator.getAttribute('data-index'), 10);
  if(isNaN(cardIndex) || cardIndex < 0) {
    showMessage(`Can't find the card ${cardIndex}`, 'error');
    return;
  }

  cardOriginator.querySelector('.card-body').classList.add('dimmed');
  cardOriginator.querySelector('.card-body').innerHTML = repoData[cardIndex].body.replace(/\n/g, '<br/>');
  cardTitle.setAttribute('contenteditable', 'true');
  cardTitle.classList.add('card-field-editable');
  cardTitle.focus();
  const editRibbon = theSideBar.querySelector('#editButtons');
  editRibbon.classList.remove('edit-buttons-title', 'edit-buttons-body', 'invisible');
  editRibbon.classList.add(cardTitle ? 'edit-buttons-title' : 'edit-buttons-body');
}

function skipEdit(){
  saveEdit(true);
}

function saveEdit(skip = false){
  const editRibbon = theSideBar.querySelector('#editButtons');
  const editedEl = theSideBar.querySelector('.card-field-editable');
  const editedContent = editedEl.innerText;

  if(editedContent.trim() === ''){
      normaliseFieldsAndButtons(editedEl, editRibbon);
      return;
  }


  let needsUpdate = false;
  const titleEl = editedEl.closest('.card').querySelector('.card-title');
  const isTitle = editedEl.classList.contains('card-title');
  const index = titleEl.getAttribute('data-index') || -1;

  if(!skip){
    editedEl.innerHTML = editedContent.replace(/\n/g, '<br/>');
  }
  editedEl.removeAttribute('contenteditable');
  editedEl.classList.remove('card-field-editable')

  if (isTitle && !skip) {
      needsUpdate = true;
      if(index < 0) {
        repoData.push({"title": editedContent, "body": ''});
        titleEl.setAttribute('data-index', repoData.length -1);
      } else {
        repoData[index].title = editedContent;
      }
  }

  if (!isTitle && index > -1 && !skip) {
      repoData[index].body = editedContent;
      needsUpdate = true;
      editedEl.setAttribute('data-index', index);
  }

    if(needsUpdate && !skip) {
      updateData(repoData, !isTitle);
  }

  if(isTitle){
      prepareNextToEdit(editedEl, editRibbon);
  } else {
      editedEl.closest('.card')?.classList.add('draggable');
      normaliseFieldsAndButtons(editedEl, editRibbon);
  }
  theSideBar.querySelectorAll('.dimmed').forEach(el => el.classList.remove('dimmed'));
}

function cancelEdit(){
  const editedEl = theSideBar.querySelector('.card-field-editable');
  if(removedAsNew(editedEl.closest('.card'))){
    return;
  }
  const editRibbon = theSideBar.querySelector('#editButtons');
  theSideBar.querySelectorAll('.dimmed').forEach(el => el.classList.remove('dimmed'));
  console.log(`>>> ${theSideBar.querySelectorAll('.dimmed').length} dimmed elements found`);

  if(!editedEl){
      editRibbon.classList.remove('edit-buttons-body', 'edit-buttons-title');
      editRibbon.classList.add('invisible');
      return;
  }

  const titleEl = editedEl.closest('.card').querySelector('.card-title');
  const index = titleEl.getAttribute('data-index');
  const isTitle = editedEl.classList.contains('card-title');
  editedEl.innerHTML = repoData[index][isTitle ? 'title' : 'body'].replace(/\n/g, '<br/>');
  editedEl.removeAttribute('contenteditable');
  editedEl.classList.remove('card-field-editable');
  if(isTitle){
      prepareNextToEdit(editedEl, editRibbon);
  } else {
      normaliseFieldsAndButtons(editedEl, editRibbon);
  }
}

function deleteCard(e, cardOriginator) {
  showDialog('This is a test dialog message')
  .then(response => {
      if (!response) {
        return;
      }
      onDeleteConfirmation(e, cardOriginator);
  })
  .catch(error => {
      console.error('Error occurred:', error);
  });
}

function onDeleteConfirmation(e, cardOriginator){
  if (!cardOriginator) {
      showMessage('Unknown item!', 'error');
      return;
  }

  const title = cardOriginator.querySelector('.card-title');
  const index = parseInt(title.getAttribute('data-index'), 10);
  if (index < repoData.length) {
      repoData.splice(index, 1);
      updateData(repoData);
  } else {
      showMessage(`Index (${index.toString()}) is out of bound (${repoData.length})`);
  }
}

function removedAsNew(card){
  if(!card) {  return false;  }
  const isNew = card.getAttribute('data-card-type') === 'new';
  if(!isNew) {  return false;  }
  theSideBar.querySelector('#editButtons').classList.add('invisible');

  return card.remove(card) !== null;
}

function updateData(objData, rebuild = true) {
  chrome.storage.local.set({ [storageDataKey]: objData }, function () {
    if (chrome.runtime.lastError) {
      showMessage(chrome.runtime.lastError.message, 'error');
    } else {
      repoData = Array.from(objData);
      showMessage('Data saved.', 'success');
      if(rebuild) {
        populateDataHelper();
      }
    }
  });
}

function prepareNextToEdit(editedEl, editRibbon){
  editRibbon.classList.remove('edit-buttons-title', 'edit-buttons-body', 'invisible');
  editRibbon.classList.add('edit-buttons-body');
  const nextToEdit = editedEl.closest('.card').querySelector('.card-body');
  nextToEdit.classList.remove('invisible');
  nextToEdit.setAttribute('contenteditable', 'true');
  nextToEdit.classList.add('card-field-editable')
  nextToEdit.focus();
}

function normaliseFieldsAndButtons(editedEl, editRibbon){
  theSideBar.querySelectorAll('.card-expanded').forEach(el => el.classList.remove('card-expanded'));
  theSideBar.querySelectorAll('.card-selected').forEach(el => el.classList.remove('card-selected'));
  theSideBar.querySelectorAll('.card-body').forEach(el => el.classList.add('invisible'));
  editedEl.classList.add('invisible');
  editRibbon.classList.remove('edit-buttons-body');
  editRibbon.classList.add('invisible');
  editedEl.closest('.card').querySelector('.expander').classList.remove('invisible');
}

function getInputElement(){
  let receiver = document.querySelector('#prompt-textarea') || document.querySelector('div.textarea') || document.querySelector('textarea');
  if(!receiver){
    receiver = document.activeElement;
    if (!receiver || !(receiver.tagName === 'INPUT' ||
        receiver.tagName === 'TEXTAREA' || receiver.isContentEditable)) {
          receiver = false;
    }
  }
  return receiver;
}

function sendTo(e, cardOriginator, run = false) {
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
  const index = parseInt(body.getAttribute('data-index'), 10);
  if (index < repoData.length) {
      if (promptTextarea) {
        injectPromptBody(promptTextarea, index, run);

        if (run) {
          runPrompt();
        }
      }
  } else {
      showMessage(`Index (${index.toString()}) is out of bound (${repoData.length})`);
  }

  if(repoOptions && repoOptions.closeOnSendTo){
      swapSidebarWithButton();
  }
}

function injectPromptBody(promptTextarea, index) {
  if (promptTextarea.tagName.toLowerCase() === 'textarea') {
    promptTextarea.value = repoData[index].body;
    dispatchInputEvent(promptTextarea, repoData[index].body);
  } else {
    promptTextarea.textContent = repoData[index].body;
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

function dispatchInputEvent(originator, data = ''){
  if(!originator)  {  return;  }
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

function dispatchMouseClickEvent(originator){
  if(!originator)  {  return;  }
  const rect = originator.getBoundingClientRect();
  console.log(rect.top, rect.right, rect.bottom, rect.left);
  const x  = Math.floor(Math.random() * (rect.right - rect.left + 1)) + rect.left;
  const y  = Math.floor(Math.random() * (rect.bottom - rect.top + 1)) + rect.top;

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
  theSideBar.querySelectorAll('.card-body')?.forEach((b) => {
      if (!b.classList.contains('invisible')) {
          b.classList.add('invisible');
      }
  });
}

function removeCardEditableAttribute() {
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

  return card;
}


function copyDataItemContent(e, cardOriginator) {
  if (!cardOriginator) {
      showMessage('Unknown item!', 'error');
      return;
  }

  const title = cardOriginator.querySelector('.card-title');
  const index = parseInt(title.getAttribute('data-index'), 10);
  if (index > repoData.length) {
      showMessage(`Index (${index.toString()}) is out of bound (${repoData.length})`);
  }

  var hint = theSideBar.querySelector('#copyHint');
  if (!hint.classList.contains('invisible')) {
      hint.classList.add('invisible');
  }
  const data = repoData[index].body;
  if (data) {
      navigator.clipboard.writeText(data);
  }

  if(repoOptions && repoOptions.closeOnCopy){
      swapSidebarWithButton();
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

function exportData(e) {
  if (Object.keys(repoData).length === 0) {
      showMessage('No data found for export.', 'warning')
      theSideBar.querySelector('.dropdown-menu')?.classList.toggle('invisible');
      return;
  }

  const exportFileName = `${manifest.name.replace(/\t/g, '_')}_${manifest.version}_export_${(new Date()).toISOString().split('.')[0].replace(/\D/g, '')}.json`;
  const result = JSON.stringify(repoData);
  const url = URL.createObjectURL(new Blob([result], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = exportFileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  theSideBar.querySelector('.dropdown-menu')?.classList.toggle('invisible');
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

          chrome.storage.local.set({ [storageDataKey]: data }, function() {
            if (chrome.runtime.lastError) {
                console.error("Error saving data:", chrome.runtime.lastError);
            } else {
                repoData = [...data];
                repoData.loaded = true;
                showMessage('Data imported successfully.', 'success');
                populateDataHelper();
            }
        });
      } catch (error) {
          showMessage(`Error parsing JSON: ${error.message}`, 'error');
      }
  };
  reader.readAsText(file);
}

function showMessage(message, type) {
  let msg = theSideBar.querySelector('#feedbackMessage');
  if ((type || 'info')?.indexOf('') !== 0) {
    type = `${type}`;
  }

  if (msg.classList.contains('feedback-message-slide')) {
    msg.classList.remove('feedback-message-slide');
    setTimeout(() => { showMessage(message, type); }, 250);
    return;
  }

  msg.innerHTML = message;
  msg.classList.remove('success', 'error', 'info', 'warning');
  msg.classList.add('feedback-message-slide', type || 'info');
  setTimeout(() => {
    msg.classList.remove('feedback-message-slide');
  }, 3000);
}

function animateMainButton(container, loop = false) {
  clearTimeout(timerId);
  const img = container.querySelectorAll('img');
  if(!img || img.length < 2)  {  return;  }
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

