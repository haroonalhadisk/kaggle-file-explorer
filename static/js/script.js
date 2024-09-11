let currentPath = '';
let currentView = 'grid';
let selectedFiles = new Set();
let currentImages = [];
let currentImageIndex = 0;
let fileList = [];

function loadFiles(path = '') {
    fetch(`/files?path=${path}`)
        .then(response => response.json())
        .then(data => {
            currentPath = path;
            fileList = data;
            updateBreadcrumb(path);
            renderFileList();
            updateStatusBar(data.length);
        });
}

function renderFileList() {
    const fileListElement = document.getElementById('file-list');
    fileListElement.innerHTML = '';
    fileList.forEach(item => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
        <input type="checkbox">
        <i class="${getItemIcon(item)}"></i>
        <div class="details">
            <span class="name">${item.name}</span>
            <span class="info">${item.size || ''} - ${item.date || ''}</span>
        </div>
    `;
        fileItem.onclick = (e) => handleItemClick(e, item);
        fileItem.ondblclick = () => handleItemDoubleClick(item);
        addDoubleTouchListener(fileItem, () => handleItemDoubleClick(item));
        fileListElement.appendChild(fileItem);
    });
}

function updateBreadcrumb(path) {
    const parts = path.split('/').filter(Boolean);
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = '<li><a href="#" data-path=""><i class="fas fa-home"></i> Root</a></li>';
    let currentPath = '';
    parts.forEach(part => {
        currentPath += '/' + part;
        breadcrumb.innerHTML += `<li><a href="#" data-path="${currentPath}">${part}</a></li>`;
    });
    breadcrumb.querySelectorAll('a').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            loadFiles(e.target.dataset.path);
        };
    });
}

function handleItemClick(e, item) {
    if (e.target.type === 'checkbox') {
        e.target.checked ? selectedFiles.add(item.name) : selectedFiles.delete(item.name);
    } else {
        const checkbox = e.currentTarget.querySelector('input[type="checkbox"]');
        checkbox.checked = !checkbox.checked;
        e.currentTarget.classList.toggle('selected');
        checkbox.checked ? selectedFiles.add(item.name) : selectedFiles.delete(item.name);
    }
    updateStatusBar();
}

function handleItemDoubleClick(item) {
    if (item.is_dir) {
        loadFiles(currentPath ? `${currentPath}/${item.name}` : item.name);
    } else if (item.type && item.type.startsWith('image/')) {
        openImageViewer(item);
    }
}

function openImageViewer(item) {
    const viewer = document.getElementById('image-viewer');
    const img = document.getElementById('viewer-image');
    const nameElement = document.getElementById('image-name');

    currentImages = fileList.filter(file => file.type && file.type.startsWith('image/')).map(file => file.name);
    currentImageIndex = currentImages.indexOf(item.name);

    img.src = `/download?path=${currentPath}/${item.name}`;
    nameElement.textContent = item.name;
    viewer.style.display = 'flex';

    updateImageControls();
}

function updateImageControls() {
    document.getElementById('prev-image').disabled = currentImageIndex === 0;
    document.getElementById('next-image').disabled = currentImageIndex === currentImages.length - 1;
}

document.getElementById('prev-image').onclick = () => {
    if (currentImageIndex > 0) {
        currentImageIndex--;
        const newImage = currentImages[currentImageIndex];
        document.getElementById('viewer-image').src = `/download?path=${currentPath}/${newImage}`;
        document.getElementById('image-name').textContent = newImage;
        updateImageControls();
    }
};

document.getElementById('next-image').onclick = () => {
    if (currentImageIndex < currentImages.length - 1) {
        currentImageIndex++;
        const newImage = currentImages[currentImageIndex];
        document.getElementById('viewer-image').src = `/download?path=${currentPath}/${newImage}`;
        document.getElementById('image-name').textContent = newImage;
        updateImageControls();
    }
};

document.getElementById('close-viewer').onclick = () => {
    document.getElementById('image-viewer').style.display = 'none';
};

let currentZoom = 1;
document.getElementById('zoom-in').onclick = () => {
    currentZoom *= 1.2;
    document.getElementById('viewer-image').style.transform = `scale(${currentZoom})`;
};

document.getElementById('zoom-out').onclick = () => {
    currentZoom /= 1.2;
    document.getElementById('viewer-image').style.transform = `scale(${currentZoom})`;
};

document.addEventListener('keydown', (e) => {
    if (document.getElementById('image-viewer').style.display === 'flex') {
        if (e.key === 'ArrowLeft') document.getElementById('prev-image').click();
        if (e.key === 'ArrowRight') document.getElementById('next-image').click();
        if (e.key === 'Escape') document.getElementById('close-viewer').click();
    }
});

function getItemIcon(item) {
    if (item.is_dir) return 'fas fa-folder';
    if (item.type && item.type.startsWith('image/')) return 'fas fa-image';
    if (item.type && item.type.startsWith('video/')) return 'fas fa-video';
    if (item.type && item.type === 'text/plain') return 'fas fa-file-alt';
    return 'fas fa-file';
}

document.getElementById('back-btn').onclick = () => {
    if (currentPath) {
        const parts = currentPath.split('/');
        parts.pop();
        loadFiles(parts.join('/'));
    }
};

document.getElementById('upload-btn').onclick = () => {
    document.getElementById('file-upload').click();
};

document.getElementById('file-upload').onchange = (e) => {
    const files = e.target.files;
    const formData = new FormData();
    for (let file of files) {
        formData.append('files', file);
    }
    formData.append('path', currentPath);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            loadFiles(currentPath);
        })
        .catch(error => console.error('Error:', error));
};

document.getElementById('delete-btn').onclick = () => {
    if (selectedFiles.size === 0) {
        alert('Please select files to delete.');
        return;
    }
    if (confirm(`Are you sure you want to delete ${selectedFiles.size} item(s)?`)) {
        const formData = new FormData();
        formData.append('path', currentPath);
        formData.append('files', JSON.stringify(Array.from(selectedFiles)));

        fetch('/delete', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                selectedFiles.clear();
                loadFiles(currentPath);
            })
            .catch(error => console.error('Error:', error));
    }
};

document.getElementById('download-btn').onclick = () => {
    if (selectedFiles.size === 0) {
        alert('Please select files to download.');
        return;
    }
    selectedFiles.forEach(file => {
        window.open(`/download?path=${currentPath}/${file}`, '_blank');
    });
};

document.getElementById('grid-view-btn').onclick = () => changeView('grid');
document.getElementById('list-view-btn').onclick = () => changeView('list');

function changeView(view) {
    currentView = view;
    const fileList = document.getElementById('file-list');
    fileList.className = `file-list ${view}`;
}

document.getElementById('sort-select').onchange = (e) => {
    const sortBy = e.target.value;
    fileList.sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'date') return new Date(b.date) - new Date(a.date);
        if (sortBy === 'type') return a.type.localeCompare(b.type);
        if (sortBy === 'size') return parseFloat(b.size) - parseFloat(a.size);
    });
    renderFileList();
};

document.getElementById('search-btn').onclick = () => {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const filteredFiles = fileList.filter(file =>
        file.name.toLowerCase().includes(searchTerm)
    );
    renderFilteredFileList(filteredFiles);
};

document.getElementById('search-input').onkeyup = (e) => {
    if (e.key === 'Enter') {
        document.getElementById('search-btn').click();
    }
};

function renderFilteredFileList(filteredFiles) {
    const fileListElement = document.getElementById('file-list');
    fileListElement.innerHTML = '';
    filteredFiles.forEach(item => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
        <input type="checkbox">
        <i class="${getItemIcon(item)}"></i>
        <div class="details">
            <span class="name">${item.name}</span>
            <span class="info">${item.size || ''} - ${item.date || ''}</span>
        </div>
    `;
        fileItem.onclick = (e) => handleItemClick(e, item);
        fileItem.ondblclick = () => handleItemDoubleClick(item);
        fileListElement.appendChild(fileItem);
    });
    updateStatusBar(filteredFiles.length);
}

function updateStatusBar(totalItems) {
    const statusBar = document.getElementById('status-bar');
    statusBar.textContent = `${totalItems} item(s)${selectedFiles.size ? `, ${selectedFiles.size} selected` : ''}`;
}
function addDoubleTouchListener(element, callback) {
    let lastTap = 0;
    const DOUBLE_TAP_DELAY = 300; // milliseconds

    element.addEventListener('touchend', function (e) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;

        if (tapLength < DOUBLE_TAP_DELAY && tapLength > 0) {
            e.preventDefault();
            callback(e);
        }

        lastTap = currentTime;
    });
}

// Initial load
loadFiles();