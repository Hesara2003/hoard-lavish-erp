const { contextBridge, ipcRenderer } = require('electron');

// Expose protected APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Platform info
    platform: process.platform,

    // Auto-updater APIs
    onUpdateAvailable: (callback) => {
        ipcRenderer.on('update-available', (_event, data) => callback(data));
    },
    onUpdateNotAvailable: (callback) => {
        ipcRenderer.on('update-not-available', (_event, data) => callback(data));
    },
    onUpdateDownloadProgress: (callback) => {
        ipcRenderer.on('update-download-progress', (_event, data) => callback(data));
    },
    onUpdateDownloaded: (callback) => {
        ipcRenderer.on('update-downloaded', (_event, data) => callback(data));
    },
    onUpdateError: (callback) => {
        ipcRenderer.on('update-error', (_event, data) => callback(data));
    },
    installUpdate: () => {
        ipcRenderer.send('install-update');
    },
    checkForUpdates: () => {
        ipcRenderer.send('check-for-updates');
    },
    removeUpdateListeners: () => {
        ipcRenderer.removeAllListeners('update-available');
        ipcRenderer.removeAllListeners('update-not-available');
        ipcRenderer.removeAllListeners('update-download-progress');
        ipcRenderer.removeAllListeners('update-downloaded');
        ipcRenderer.removeAllListeners('update-error');
    },

    // Future: add printing, file dialogs, etc.
    // printInvoice: (data) => ipcRenderer.invoke('print-invoice', data),
    // openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
});
