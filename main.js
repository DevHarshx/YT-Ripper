const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');

if (process.platform === 'win32') {
    app.setAppUserModelId("YT-Ripper");
}

let mainWindow;

// --- CROSS-PLATFORM BINARY HELPERS ---
function binName(base) {
    return process.platform === 'win32' ? `${base}.exe` : base;
}

function bundledBinaryPath(base) {
    // packaged: resourcesPath/bin/<name>
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'bin', binName(base));
    }
    // dev: <projectRoot>/bin/<name>
    return path.join(__dirname, 'bin', binName(base));
}

function commandExists(cmd) {
    // If cmd is a path that exists, return true
    try {
        if (fs.existsSync(cmd)) return true;
    } catch (e) {}
    // Otherwise check PATH via 'which' / 'command -v'
    try {
        const res = spawnSync('which', [cmd], { encoding: 'utf8' });
        return res.status === 0 && res.stdout && res.stdout.trim().length > 0;
    } catch (e) {
        return false;
    }
}

function resolveBinary(base) {
    const bundled = bundledBinaryPath(base);
    if (fs.existsSync(bundled)) return bundled;
    // fall back to system name (assume in PATH)
    return base;
}

// --- PATH CONFIGURATION ---
const ffmpegPath = resolveBinary('ffmpeg');
const ytDlpPath = resolveBinary('yt-dlp');

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

    // SAFETY CHECK 1: Ensure FFmpeg exists (bundled or system)
    if (!commandExists(ffmpegPath)) {
        mainWindow.webContents.send('download-complete', {
            status: 'error',
            message: `Critical Error: ffmpeg not found. Expected bundled at ${ffmpegPath} or system 'ffmpeg' in PATH.`
        });
        return;
    }

    // SAFETY CHECK 2: Ensure yt-dlp exists
    if (!commandExists(ytDlpPath)) {
        mainWindow.webContents.send('download-complete', {
            status: 'error',
            message: `Critical Error: yt-dlp not found. Expected bundled at ${ytDlpPath} or system 'yt-dlp' in PATH.`
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
        // AUDIO MODE: Force mp3 conversion
        args.push('-x', '--audio-format', 'mp3');
    } else {
        // VIDEO MODE:
        let format = '';

        if (quality === '1080p') {
            format = 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080]';
        } else if (quality === '720p') {
            format = 'bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720]';
        } else if (quality === '480p') {
            format = 'bv*[height<=480][ext=mp4]+ba[ext=m4a]/b[height<=480]';
        } else {
            format = 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]';
        }

        args.push('-f', format);
    }

    args.push(url);

    // EXECUTE DOWNLOAD
    const downloadProcess = spawn(ytDlpPath, args);

    downloadProcess.stdout.on('data', (data) => {
        const text = data.toString();
        // Parse progress percentage
        if (text.includes('%')) {
            try {
                const parts = text.split('%');
                const lastPart = parts[0].trim().split(/\s+/).pop();
                const percent = parseFloat(lastPart);
                if (!isNaN(percent)) {
                    mainWindow.webContents.send('progress-update', percent);
                }
            } catch (e) { }
        }
    });

    downloadProcess.stderr.on('data', (data) => {
        // Log errors to console just in case
        console.error(`stderr: ${data}`);
    });

    downloadProcess.on('close', (code) => {
        if (code === 0) {
            mainWindow.webContents.send('download-complete', { status: 'success', type: isAudio ? 'Audio' : 'Video' });
        } else {
            mainWindow.webContents.send('download-complete', { status: 'error', message: "Download Failed (Check URL or Network)" });
        }
    });
});