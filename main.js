const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

if (process.platform === 'win32') {
    app.setAppUserModelId("YT-Ripper");
}

let mainWindow;

// LOCATE FFMPEG (CRITICAL: Must be in bin/ffmpeg.exe)
const ffmpegPath = app.isPackaged
    ? path.join(process.resourcesPath, 'bin', 'ffmpeg.exe')
    : path.join(__dirname, 'bin', 'ffmpeg.exe');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 550,
        title: "YT-Ripper",
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            devTools: false
        },
        autoHideMenuBar: true,
        resizable: false,
        backgroundColor: '#ffffff'
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    return result.filePaths[0];
});

ipcMain.on('start-download', (event, { url, isAudio, savePath, quality }) => {
    
    // SAFETY CHECK: Ensure FFmpeg exists
    if (!fs.existsSync(ffmpegPath)) {
        mainWindow.webContents.send('download-complete', { 
            status: 'error', 
            message: 'Critical Error: bin/ffmpeg.exe is missing!' 
        });
        return;
    }

    const args = [
        '--newline', 
        '--no-part',
        '--no-mtime',
        '--restrict-filenames',
        '--ffmpeg-location', ffmpegPath, 
        '--merge-output-format', 'mp4'
    ];
    
    const downloadPath = savePath || app.getPath('downloads');
    args.push('-P', downloadPath);
    args.push('-o', '%(title)s.%(ext)s');

    if (isAudio) {
        // AUDIO MODE:
        // Force mp3 conversion so it works on everything
        args.push('-x', '--audio-format', 'mp3');
    } else {
        
        let format = '';

        if (quality === '1080p') {
            // Best MP4 Video (<=1080p) + Best AAC Audio
            format = 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080]';
        } else if (quality === '720p') {
            // Best MP4 Video (<=720p) + Best AAC Audio
            format = 'bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720]';
        } else if (quality === '480p') {
            // Best MP4 Video (<=480p) + Best AAC Audio
            format = 'bv*[height<=480][ext=mp4]+ba[ext=m4a]/b[height<=480]';
        } else {
            // Fallback: Best MP4 Video + Best AAC Audio
            format = 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]';
        }

        args.push('-f', format);
    }

    args.push(url);

    const downloadProcess = spawn('yt-dlp', args);

    downloadProcess.stdout.on('data', (data) => {
        const text = data.toString();
        if (text.includes('%')) {
            try {
                const parts = text.split('%');
                const lastPart = parts[0].trim().split(/\s+/).pop();
                const percent = parseFloat(lastPart);
                if (!isNaN(percent)) {
                    mainWindow.webContents.send('progress-update', percent);
                }
            } catch (e) {}
        }
    });

    downloadProcess.on('close', (code) => {
        if (code === 0) {
            mainWindow.webContents.send('download-complete', { status: 'success', type: isAudio ? 'Audio' : 'Video' });
        } else {
            mainWindow.webContents.send('download-complete', { status: 'error' });
        }
    });
});