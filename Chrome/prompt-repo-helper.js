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
  switch (request.action){
    case 'optionsChanged':
      await init();
      break;
    default:
      console.log(`${manifest.name} - [${getLineNumber()}]: Unknown action - ${request.action}`);
      break;
  }
});

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

async function buildMainButton(){
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
      if(resource.lastIndexOf('sendto') > -1 && currentPageTitle){
        img.alt = img.alt.replace("current page", `${currentPageTitle}`)
        img.parentElement.title = img.parentElement.title.replace("current page", `${currentPageTitle}`);
      }
      img.addEventListener('click', async e => await onRibbonButtonClick(e));
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

    // await initSidebar();
    return theSideBar;
  } catch (error) {
    return console.error(`${manifest.name} - [${getLineNumber()}]: Error loading the HTML:`, error);
  }
}

function handleInput(e){
  const theSideBar = getSideBar();
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

async function init() {
  document.addEventListener('click', async e => {
    const repoOptions = await getOptionsFromStorage();
    if(!repoOptions?.closeOnClickOut){  return;  }
    if(!theShadowRoot) {  return;  }
    if(!e.composedPath().includes(theShadowRoot.host)){
      await swapSidebarWithButton();
    }
    return;
  });
  const shouldContinue = await checkIfUrlAllowed();
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

async function checkIfUrlAllowed(){
  try {
      const repoOptions = await getOptionsFromStorage();
      const urls = repoOptions?.allowedUrls?.split(/[;,\n]+/)?.filter(Boolean) || [];
      if(urls.length < 1 || urls[0].trim() === '*'){  return true;  }
      return urls.some(el => el.includes(location.hostname) || location.hostname.includes(el));
    } catch (err) {
      console.error(`${manifest.name}: Error`, err);
      return false;
    }
}

function onCardHeaderClick(e) {
  const theSideBar = getSideBar();
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
  const theSideBar = getSideBar();
  const theMainButton = getMainButton();
  theMainButton.classList.add('invisible');
  theSideBar.classList.add('active-sidebar');
}

async function swapSidebarWithButton() {
  const theSideBar = getSideBar();
  const theMainButton = getMainButton();
  if(!theMainButton)  {  return;  }
  const repoOptions = await getOptionsFromStorage()
  if(repoOptions.showEmbeddedButton){
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
      newCard.setAttribute('data-index', `${rec.id}`); // TODO: remove later and use data-id instead
      // newCard.setAttribute('data-id', `${rec.id}`);
      newCard.querySelectorAll('.invisible').forEach(invisible => invisible.classList.remove('invisible'));

      newCard.querySelectorAll('.card-btn')?.forEach(btn => {
          btn.addEventListener('click', async e => await onRibbonButtonClick(e));
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
  // const clickedButton = e.composedPath().find(el => el.classList?.contains("menu-button"));
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
      case 'save':
          await saveEdit(e);
          break;
      case 'skip':
        await skipEdit(e);
        break;
      case 'cancel':
        await cancelEdit(e);
        break;
      case 'newitem':
        await onNewItemClicked(e);
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
  const theSideBar = getSideBar();
  const emptyElement = theSideBar.querySelector('.empty-element');
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
  newCard.classList.remove('draggable');
  newCard.removeAttribute('draggable');
  newCard.querySelector('.expander')?.classList.add('invisible')

  const newCardTitle = newCard.querySelector('.card-title');
  newCardTitle.setAttribute('contenteditable', 'true');
  newCardTitle.classList.add('card-field-editable');
  newCard.querySelector('.card-header').addEventListener('click', onCardHeaderClick); //TODO: Check for problems calling this one

  mainContent.appendChild(newCard);
  // iniDrag();
  theSideBar.querySelector('#editButtons').classList.remove('invisible');
  newCardTitle.focus();
}

async function editCard(e, cardOriginator) {
  if (!cardOriginator) {
      showMessage('Unknown item!', 'error');
      return;
  }

  const repoData = await getRepoData();
  cardOriginator.classList.remove('draggable');
  cardOriginator.querySelector('.expander').classList.add('invisible');
  cardOriginator.querySelectorAll('.invisible:not(.expander)').forEach(el => el.classList.remove('invisible'));

  cardOriginator.classList.add('card-selected', 'card-expanded');
  const cardTitle = cardOriginator.querySelector('.card-title');
  const cardIndex = cardOriginator.dataset.index;
  // const cardIndex = parseInt(cardOriginator.getAttribute('data-index'), 10);
  if(!cardIndex) {
    showMessage(`Can't find the card ${cardIndex}`, 'error');
    return;
  }

  cardOriginator.querySelector('.card-body').classList.add('dimmed');
  cardOriginator.querySelector('.card-body').innerHTML = repoData?.find(el => el.id = cardIndex)?.body.replace(/\n/g, '<br/>');
  cardTitle.setAttribute('contenteditable', 'true');
  cardTitle.classList.add('card-field-editable');
  cardTitle.focus();

  const theSideBar = getSideBar();
  const editRibbon = theSideBar.querySelector('#editButtons');
  editRibbon.classList.remove('edit-buttons-title', 'edit-buttons-body', 'invisible');
  editRibbon.classList.add(cardTitle ? 'edit-buttons-title' : 'edit-buttons-body');
}

async function skipEdit(e){
  await saveEdit(e, true);
}

async function saveEdit(e, skip = false){
  const theSideBar = getSideBar();
  const editRibbon = theSideBar.querySelector('#editButtons');
  const editedCard = theSideBar.querySelector('.card.card-expanded');
  const editedEl = theSideBar.querySelector('.card-field-editable');
  const editedContent = editedEl.innerText;

  if(editedContent.trim() === ''){
    normaliseFieldsAndButtons(editedEl, editRibbon);
    return;
  }

  const repoData = await getRepoData();
  let needsUpdate = false;
  const titleEl = editedEl.closest('.card').querySelector('.card-title');
  const isTitle = editedEl.classList.contains('card-title');
  const promptId = titleEl.getAttribute('data-index');

  if(!skip){
    editedEl.innerHTML = editedContent.replace(/\n/g, '<br/>');
  }
  editedEl.removeAttribute('contenteditable');
  editedEl.classList.remove('card-field-editable')

  if (isTitle && !skip) {
      needsUpdate = true;
      if(promptId) {
        const repoDataRecordIndex = repoData.findIndex(el => el.id === promptId);
        if(repoDataRecordIndex > -1){
          repoData[repoDataRecordIndex].title = editedContent;
        } else {
          showMessage(`Failed to find a record with id ${promptId}`, "error");
        }
      } else {
        const newId = crypto.randomUUID();
        repoData.push({"id": newId, "title": editedContent, "body": ''});
        titleEl.setAttribute('data-index', newId);
      }
  }

  if (!isTitle && promptId && !skip) {
      const repoDataRecordIndex = repoData.findIndex(el => el.id === promptId);
      repoData[repoDataRecordIndex].body = editedContent;
      needsUpdate = true;
      editedEl.setAttribute('data-index', promptId);
  }

    if(needsUpdate && !skip) {
      updateData(repoData, !isTitle);
  }

  if(isTitle){
      prepareNextToEdit(editedEl, editRibbon);
  } else {
      editedCard?.classList.add('draggable');
      editedCard.setAttribute('draggable', true);
      editedCard.dataset.index = promptId
      normaliseFieldsAndButtons(editedEl, editRibbon);
      iniDrag();
  }
  theSideBar.querySelectorAll('.dimmed').forEach(el => el.classList.remove('dimmed'));
}

async function cancelEdit(){
  const theSideBar = getSideBar();
  const editedEl = theSideBar.querySelector('.card-field-editable');
  if(removedAsNew(editedEl.closest('.card'))){
    return;
  }
  const editRibbon = theSideBar.querySelector('#editButtons');
  theSideBar.querySelectorAll('.dimmed').forEach(el => el.classList.remove('dimmed'));

  if(!editedEl){
      editRibbon.classList.remove('edit-buttons-body', 'edit-buttons-title');
      editRibbon.classList.add('invisible');
      return;
  }

  const repoData = await getRepoData();
  const titleEl = editedEl.closest('.card').querySelector('.card-title');
  const promptId = titleEl.dataset.index;
  const repoDataRecord = repoData.find(el => el.id === promptId);

  const isTitle = editedEl.classList.contains('card-title');
  editedEl.innerHTML = repoDataRecord[isTitle ? 'title' : 'body'].replace(/\n/g, '<br/>');
  editedEl.removeAttribute('contenteditable');
  editedEl.classList.remove('card-field-editable');
  if(isTitle){
      prepareNextToEdit(editedEl, editRibbon);
  } else {
      normaliseFieldsAndButtons(editedEl, editRibbon);
  }
}

async function deleteCard(e, cardOriginator) {
  let response;
  try {
    response = showDialog('This is a test dialog message');
    if (!response) {  return;  }
    await onDeleteConfirmation(e, cardOriginator);
  } catch (error) {
    console.error(`${manifest.name} - [${getLineNumber()}] - Error occurred with response`, error, response);
  }
}

async function onDeleteConfirmation(e, cardOriginator){
  if (!cardOriginator) {
    console.error(`${manifest.name} - [${getLineNumber()}] - Error occurred with response`, cardOriginator);
    showMessage('Unknown item!', 'error');
    return;
  }

  // const title = cardOriginator.querySelector('.card-title');
  const promptId = cardOriginator.dataset.index;
  if (!promptId) {
    console.error(`${manifest.name} - [${getLineNumber()}] - Prompt Id is missing or not found (${promptId})!`);
    showMessage(`Prompt Id is missing or not found (${promptId})!`);
    return;
  }

  const repoData = await getRepoData();
  const index = repoData.findIndex(el => el.id === promptId);
  if(index < 0){
    console.log(`${manifest.name} - [${getLineNumber()}] No prompt id with a value ${promptId} was found!`, repoData);
    return;
  }
      repoData.splice(index, 1);
      await updateData(repoData);
}

function removedAsNew(card){
  if(!card) {  return false;  }
  const isNew = card.getAttribute('data-card-type') === 'new';
  if(!isNew) {  return false;  }
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
  const theSideBar = getSideBar();
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
  if(repoOptions && repoOptions.closeOnSendTo){
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
      if (chrome.runtime.lastError) {  console.error(`${manifest.name} - [${getLineNumber()}]: Error saving data`, chrome.runtime.lastError);  }
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
  if (repoDataRecord) {  navigator.clipboard.writeText(repoDataRecord);  }

  const theSideBar = getSideBar();
  var hint = theSideBar.querySelector('#copyHint');
  if (!hint.classList.contains('invisible')) {
      hint.classList.add('invisible');
  }

  const repoOptions = await getOptionsFromStorage();
  if(repoOptions && repoOptions.closeOnCopy){
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
              if(!obj[i]?.id){  obj[i]["id"] = crypto.randomUUID();  }
              data.push(obj[i]);
          }

          if(await setRepoData(data)){
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
  const theSideBar = getSideBar();
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

/// helpers

function getLineNumber() {
    const e = new Error();
    const stackLines = e.stack.split("\n").map(line => line.trim());
    let index = stackLines.findIndex(line => line.includes(getLineNumber.name));

    // return stackLines[index + 1]?.replace(/\s{0,}at\s+/, '') || "Unknown";
    return stackLines[index + 1]
        ?.replace(/\s{0,}at\s+/, '')
        ?.replace(/^.*?\/([^\/]+\/[^\/]+:\d+:\d+)$/, '$1')
        || "Unknown";
}

async function getRepoData(){
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
    return true
  } catch (error) {
    console.error(`${manifest.name} - [${getLineNumber()}] - Failed to get data from ${storageDataKey} local storage!`);
    return false;
  }
}

async function getStorageSettings(){
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
    showMessage(chrome.runtime.lastError.message, 'error');
    return;
  }
}

function getSideBar(){
  return document.querySelector('ai-prompt-repo')?.shadowRoot?.querySelector('#aiPromptRepoSidebar');
}

function getMainButton(){
  return document.querySelector('ai-prompt-repo')?.shadowRoot?.querySelector('#mainButton');
}

function getShadowRoot(){
  return document.querySelector('ai-prompt-repo')?.shadowRoot;
}