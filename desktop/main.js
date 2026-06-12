const { app, BrowserWindow, ipcMain } = require('electron')
const { execFile } = require('child_process')
const path = require('path')

let mainWindow

function runGit(args) {
  return new Promise((resolve, reject) => {
    const cwd = process.env.GIT_DIR || path.resolve(__dirname, '..')
    execFile('git', args, { cwd }, (err, stdout, stderr) => {
      if (err) {
        reject(stderr.trim() || err.message)
      } else {
        resolve(stdout.trim())
      }
    })
  })
}

ipcMain.handle('list-branches', async () => {
  const out = await runGit(['branch'])
  return out.split('\n').filter(Boolean).map(line => ({
    name: line.replace(/^\*?\s*/, '').trim(),
    current: line.startsWith('*'),
  }))
})

ipcMain.handle('git-version', async () => {
  return await runGit(['--version'])
})

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    center: true,
    title: 'Quiniela Git Desktop',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'))
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
