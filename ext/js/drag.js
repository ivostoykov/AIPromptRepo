const draggables = document.querySelectorAll('.draggable');
let draggedElement = null;

draggables.forEach(draggable => {
    draggable.addEventListener('dragstart', function(e) {
        draggedElement = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    });

    draggable.addEventListener('dragover', function(e) {
        if (e.preventDefault) {
            e.preventDefault(); // Necessary. Allows us to drop.
        }
        this.classList.add('over');
        e.dataTransfer.dropEffect = 'move';  // See the section on the DataTransfer object.
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
            draggedElement.innerHTML = this.innerHTML;
            this.innerHTML = e.dataTransfer.getData('text/html');
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