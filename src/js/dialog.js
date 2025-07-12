function showDialog(message) {
    return new Promise((resolve, reject) => {
        const theSideBar = getSideBar();
        const container = theSideBar.querySelector(".main-container");
        dialogTemplate = theSideBar.querySelector("#dialogTemplate");
        container.appendChild(dialogTemplate.content.cloneNode(true));

        const dialog = theSideBar.querySelector("dialog");
        const yesButton = dialog.querySelector("#yesButton");
        const noButton = dialog.querySelector("#noButton");
        dialog.querySelector('.dialog-content').innerHTML = message;

        const handleYesClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dialog.close();
            container.removeChild(dialog);
            resolve(true);
        };

        const handleNoClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dialog.close();
            container.removeChild(dialog);
            resolve(false);
        };

        yesButton.addEventListener("click", handleYesClick);
        noButton.addEventListener("click", handleNoClick);

        dialog.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            if (e.target === dialog) {
                dialog.close();
                container.removeChild(dialog);
                resolve(false);
            }
        });

        dialog.show();
        // dialog.showModal();
    });
}

function showRecordDialog({ id = null, title = '', content = '', onSave = () => { }, onCancel = () => { } }) {
    const theSideBar = getSideBar();
    const template = theSideBar.querySelector('#recordDialogTemplate');
    const clone = template.content.cloneNode(true);
    const overlay = clone.querySelector('.dialog-overlay');
    // const box = clone.querySelector('.dialog-box');
    const header = clone.querySelector('.dialog-header');
    const promptTitle = header.querySelector('.dialog-prompt-title');
    const textarea = clone.querySelector('.dialog-body');
    const saveBtn = clone.querySelector('.js-save-btn');
    const cancelBtn = clone.querySelector('.js-cancel-btn');

    promptTitle.value = title;
    textarea.value = content;
    overlay.classList.add('active');

    saveBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onSave({ id: id || crypto.randomUUID(), title: promptTitle?.value, body: textarea?.value });
        theSideBar.removeEventListener('keydown', escListener);
        overlay.remove();
    };

    cancelBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        theSideBar.removeEventListener('keydown', escListener);
        overlay.classList.remove('active');
        overlay.remove();
    };
    const escListener = (e) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
            onCancel();
            overlay.remove();
            overlay.classList.remove('active');
            theSideBar.removeEventListener('keydown', escListener);
        }
    };

    theSideBar.addEventListener('keydown', escListener, true);
    theSideBar.appendChild(clone);
}
