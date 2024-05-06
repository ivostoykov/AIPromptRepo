var draggables;
var container;
var draggedElement = null;

function iniDrag(){
    draggables = theSideBar.querySelectorAll('.draggable');
    container = theSideBar.querySelector('.main-content');
    draggedElement = null;

    draggables.forEach(draggable => {
        draggable.setAttribute('draggable', true);

        draggable.addEventListener('dragstart', function(e) {
            draggedElement = this;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', ''); // Necessary for Firefox compatibility
        });

        draggable.addEventListener('dragover', function(e) {
            if (e.preventDefault) {
                e.preventDefault(); // Necessary. Allows us to drop.
            }
            this.classList.add('over');
            e.dataTransfer.dropEffect = 'move'; // Show a move cursor
            return false;
        });

        draggable.addEventListener('dragleave', function() {
            this.classList.remove('over');
        });

        draggable.addEventListener('drop', function(e) {
            if (e.stopPropagation) {
                e.stopPropagation(); // Stops some browsers from redirecting.
            }

            if (draggedElement !== this) {
                // Reorder elements
                let droppedIndex = Array.from(container.children).indexOf(this);
                let draggedIndex = Array.from(container.children).indexOf(draggedElement);

                if (droppedIndex < draggedIndex) {
                    container.insertBefore(draggedElement, this);
                } else {
                    container.insertBefore(draggedElement, this.nextSibling);
                }
            }

            this.classList.remove('over');
            return false;
        });

        draggable.addEventListener('dragend', function() {
            draggables.forEach(draggable => {
                draggable.classList.remove('over');
            });
        });
    });
}

