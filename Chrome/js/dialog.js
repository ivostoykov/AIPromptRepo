function showDialog(message) {
    return new Promise((resolve, reject) => {
        const container = theSideBar.querySelector(".main-container");
        dialogTemplate = theSideBar.querySelector("#dialogTemplate");
        container.appendChild(dialogTemplate.content.cloneNode(true));

        const dialog = theSideBar.querySelector("dialog");
        const yesButton = dialog.querySelector("#yesButton");
        const noButton = dialog.querySelector("#noButton");
        dialog.querySelector('.dialog-content').innerHTML = message;

        const handleYesClick = () => {
            dialog.close();
            container.removeChild(dialog);
            resolve(true);
        };

        const handleNoClick = () => {
            dialog.close();
            container.removeChild(dialog);
            resolve(false);
        };

        yesButton.addEventListener("click", handleYesClick);
        noButton.addEventListener("click", handleNoClick);

        dialog.addEventListener("click", event => {
            if (event.target === dialog) {
                dialog.close();
                container.removeChild(dialog);
                resolve(false);
            }
        });

        dialog.showModal();
    });
}