const { app, BrowserWindow } = require('electron')
const path = require("path");

app.whenReady().then(()=>{
    createWindow();
});
const createWindow = ()=>{
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.resolve(__dirname, "preload.js"),
            webSecurity: false,
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            devTools: true,
            nativeWindowOpen: true,
        }
    })
    // win.webContents.openDevTools();
    win.loadURL("data:text/html;charset=utf-8");
}