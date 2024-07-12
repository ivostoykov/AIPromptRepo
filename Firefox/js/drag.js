function iniDrag() {
    var zoneIndex = -1;
    const dropzones = [...theSideBar.querySelectorAll(".main-content")];
    const draggables = [...theSideBar.querySelectorAll(".draggable")];

    function getDragAfterElement(container, y) {
        const draggableElements = [
            ...container.querySelectorAll(".draggable:not(.is-dragging)")
        ];

        return draggableElements.reduce(
            (closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;

                if (offset < 0 && offset > closest.offset) {
                    return {
                        offset,
                        element: child
                    };
                } else {
                    return closest;
                }
            },
            { offset: Number.NEGATIVE_INFINITY }
        ).element;
    }

    draggables.forEach((draggable) => {
        draggable.addEventListener("dragstart", (e) => {
            draggable.classList.add("is-dragging");
        });

        draggable.addEventListener("dragend", (e) => {
            draggable.classList.remove("is-dragging");
            draggable.classList.add('drag-completed');
            reorderRepoData(parseInt(draggable.dataset.index, 10), zoneIndex);
            zoneIndex = undefined;
            setTimeout(() => draggable.classList.remove('drag-completed'), 1050);
        });
    });

    dropzones.forEach((zone) => {
        zone.addEventListener("dragover", (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(zone, e.clientY);
            const draggable = theSideBar.querySelector(".is-dragging");
            if (afterElement === null) {
                zone.appendChild(draggable);
                zoneIndex = undefined;
            } else {
                zone.insertBefore(draggable, afterElement);
                zoneIndex = parseInt(afterElement.dataset.index, 10);
            }
        });
    });
}

function reorderRepoData(fromIndex, moveBeforeIndex){
    const el = repoData.splice(fromIndex, 1);
    if(el.length < 1){
        showMessage(`Element not found on position ${fromIndex}!`);
        return;
    }

    if(typeof(moveBeforeIndex) !== 'number'){
        repoData.push(el[0]);
    } else {
        repoData.splice(moveBeforeIndex, 0, el[0]);
    }

    updateData(repoData, false);
    updateChildrenIndex();
}

function updateChildrenIndex(){
    const cards = theSideBar.querySelectorAll ('.card');
    if(!cards) {  return;  }
    cards.forEach((card, idx) => {
        card.setAttribute('data-index', idx);
    });
}