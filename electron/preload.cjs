const { contextBridge, ipcRenderer } = require('electron');

// Expose protected APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Platform info
    platform: process.platform,

    // Future: add printing, file dialogs, etc.
    // printInvoice: (data) => ipcRenderer.invoke('print-invoice', data),
    // openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
});
