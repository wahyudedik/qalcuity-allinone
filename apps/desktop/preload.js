const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Platform info
    platform: process.platform,

    // App info
    getVersion: () => ipcRenderer.invoke('app:version'),

    // Window controls
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),

    // Notifications
    showNotification: (title, body) => {
        if (Notification.permission === 'granted') {
            new Notification(title, { body });
        }
    },

    // File operations (if needed in the future)
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    saveFile: (data) => ipcRenderer.invoke('dialog:saveFile', data),
});
