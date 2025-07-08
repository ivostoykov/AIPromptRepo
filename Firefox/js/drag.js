function iniDrag() {
    const theSideBar = getSideBar();
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

        draggable.addEventListener("dragend", async e => {
            draggable.classList.remove("is-dragging");
            draggable.classList.add('drag-completed');
            await reorderRepoData();
            setTimeout(() => draggable.classList.remove('drag-completed'), 1050);
        });
    });

    dropzones.forEach((zone) => {
        zone.addEventListener("dragover", (e) => {
            e.preventDefault();

            const afterElement = getDragAfterElement(zone, e.clientY);
            const theSideBar = getSideBar();
            const draggable = theSideBar.querySelector(".is-dragging");
            if(!draggable) {  return;  }

            if (afterElement === null) {
                zone.appendChild(draggable);
            } else {
                zone.insertBefore(draggable, afterElement);
            }
        });
    });
}

async function reorderRepoData() {
  const theSideBar = getSideBar();
  const repoData = await getRepoData();
    const newOrder = [];

  theSideBar.querySelectorAll(".main-content .card").forEach(card => {
    const id = card.getAttribute("data-index");
    const item = repoData.find(el => el.id === id);
    if (item) {  newOrder.push(item);  }
  });

  await updateData(newOrder, false);
}
