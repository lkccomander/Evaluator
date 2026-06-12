const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('gitAPI', {
  listBranches: () => ipcRenderer.invoke('list-branches'),
  gitVersion: () => ipcRenderer.invoke('git-version'),
})
