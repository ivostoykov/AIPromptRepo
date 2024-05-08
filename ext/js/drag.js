function iniDrag() {
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
        });
    });

    dropzones.forEach((zone) => {
        zone.addEventListener("dragover", (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(zone, e.clientY);
            const draggable = theSideBar.querySelector(".is-dragging");
            if (afterElement === null) {
                zone.appendChild(draggable);
            } else {
                zone.insertBefore(draggable, afterElement);
            }
        });
    });
}