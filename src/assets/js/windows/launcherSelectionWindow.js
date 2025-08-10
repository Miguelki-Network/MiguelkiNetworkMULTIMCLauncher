/**
 * @author Miguelki Network
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

"use strict";
const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");
const pkg = require(path.join(`${app.getAppPath()}/package.json`));
const os = require("os");
let dev = process.env.DEV_TOOL === 'open';
let launcherSelectionWindow = undefined;

function getWindow() {
    return launcherSelectionWindow;
}

function destroyWindow() {
    if (!launcherSelectionWindow) return;
    launcherSelectionWindow.close();
    launcherSelectionWindow = undefined;
}

function createWindow() {
    destroyWindow();

    launcherSelectionWindow = new BrowserWindow({
        title: "Seleccionar Launcher - Miguelki Network",
        width: 900,
        height: 650,
        resizable: false,
        maximizable: false,
        minimizable: false,
        icon: `./src/assets/images/icon.${os.platform() === "win32" ? "ico" : "png"}`,
        frame: false,
        show: false,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true
        },
    });
    
    Menu.setApplicationMenu(null);
    launcherSelectionWindow.setMenuBarVisibility(false);
    launcherSelectionWindow.loadFile(path.join(`${app.getAppPath()}/src/launcher-selection.html`));
    
    launcherSelectionWindow.once('ready-to-show', () => {
        if (launcherSelectionWindow) {
            if (dev) launcherSelectionWindow.webContents.openDevTools({ mode: 'detach' });
            launcherSelectionWindow.show();
        }
    });
}

module.exports = {
    getWindow,
    createWindow,
    destroyWindow,
};
