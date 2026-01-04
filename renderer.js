const { ipcRenderer } = require('electron');

const urlInput = document.getElementById('urlInput');
const browseBtn = document.getElementById('browseBtn');
const vidBtn = document.getElementById('vidBtn');
const audBtn = document.getElementById('audBtn');
const statusText = document.getElementById('statusText');
const pathDisplay = document.getElementById('pathDisplay');

const qualityModal = document.getElementById('qualityModal');
const qualityBtns = document.querySelectorAll('.quality-btn');
const cancelBtn = document.getElementById('cancelBtn');

let selectedPath = '';
let currentProgress = 0;

browseBtn.addEventListener('click', async () => {
    const path = await ipcRenderer.invoke('select-folder');
    if (path) {
        selectedPath = path;
        const display = path.length > 35 ? '...' + path.slice(-30) : path;
        pathDisplay.innerText = `Save to: ${display}`;
    }
});

function triggerNotification(title, body) {
    new Notification(title, { body: body, icon: 'assets/icon.png' });
}

// 1. Audio Click -> Start Immediately
audBtn.addEventListener('click', () => initiateDownload(true, null));

// 2. Video Click -> Open Modal
vidBtn.addEventListener('click', () => {
    if (!validateInput()) return;
    qualityModal.style.display = 'flex';
});

// 3. Quality Selected -> Start Download
qualityBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const quality = e.target.getAttribute('data-q');
        qualityModal.style.display = 'none';
        initiateDownload(false, quality);
    });
});

cancelBtn.addEventListener('click', () => {
    qualityModal.style.display = 'none';
});

function validateInput() {
    const url = urlInput.value.trim();
    if (!url) {
        statusText.innerText = "Error: Input is empty.";
        shakeInput();
        return false;
    }
    return true;
}

function initiateDownload(isAudio, quality) {
    if (!validateInput()) return;
    const url = urlInput.value.trim();

    toggleInterface(false);
    currentProgress = 0;
    // Show user what is happening
    if (isAudio) {
        statusText.innerText = "Processing Audio...";
    } else {
        statusText.innerText = `Merging Video (${quality})...`;
    }
    statusText.style.color = "#000";

    ipcRenderer.send('start-download', { url, isAudio, savePath: selectedPath, quality });
}

function toggleInterface(enabled) {
    vidBtn.disabled = !enabled;
    audBtn.disabled = !enabled;
    urlInput.disabled = !enabled;
    browseBtn.disabled = !enabled;
}

ipcRenderer.on('progress-update', (event, percent) => {
    if (percent > currentProgress) {
        currentProgress = percent;
        statusText.innerText = `Downloading... ${percent}%`;
    }
});

ipcRenderer.on('download-complete', (event, response) => {
    toggleInterface(true);
    
    if (response.status === 'success') {
        statusText.innerText = "Download Complete.";
        statusText.style.color = "#000";
        triggerNotification("YT-Ripper", "File saved successfully.");
        urlInput.value = "";
    } else {
        // Show specific error message (like missing ffmpeg) if available
        statusText.innerText = response.message || "Error: Download Failed.";
        statusText.style.color = "red";
    }
});

function shakeInput() {
    urlInput.style.borderColor = "red";
    setTimeout(() => {
        urlInput.style.borderColor = "#000";
    }, 500);
}