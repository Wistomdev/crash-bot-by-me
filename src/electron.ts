import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { NukeBot, NukeMode } from './bot';

let mainWindow: BrowserWindow | null = null;
let activeBots: NukeBot[] = [];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../gui/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Обработка Ctrl+C
process.on('SIGINT', async () => {
  console.log('\n[SIGINT] Received Ctrl+C signal');
  
  if (activeBots.length > 0) {
    console.log('[SIGINT] Stopping all bots...');
    await Promise.all(activeBots.map(bot => bot.stop()));
    activeBots = [];
    console.log('[SIGINT] All bots stopped');
  }
  
  app.quit();
});

// IPC Handlers
ipcMain.on('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.on('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('close-window', () => {
  mainWindow?.close();
});

ipcMain.on('start-attack', async (event, config) => {
  try {
    if (activeBots.length > 0) {
      await Promise.all(activeBots.map(bot => bot.stop()));
      activeBots = [];
    }

    const bot = new NukeBot(config.token, {
      channelName: config.channelName,
      roleName: config.roleName,
      messageText: config.messageText,
      mode: config.mode as NukeMode,
      leaveImmediately: config.leaveImmediately,
      concurrency: config.concurrency,
      infiniteSpam: config.infiniteSpam,
      spamDelayMs: config.spamDelayMs,
      createBackup: config.createBackup,
      dmMembers: config.dmMembers,
      dmDelayMs: config.dmDelayMs,
      changeServerName: config.changeServerName,
      changeServerIcon: config.changeServerIcon
    });

    activeBots.push(bot);
    
    bot.start(0).catch(err => {
      event.reply('attack-error', { error: err.message });
    });
    
    event.reply('attack-started', { success: true });
  } catch (error: any) {
    event.reply('attack-error', { error: error.message });
  }
});

ipcMain.on('stop-attack', async (event) => {
  try {
    console.log('Stopping all bots...');
    
    await Promise.all(activeBots.map(bot => bot.stop()));
    activeBots = [];
    
    process.emit('SIGINT' as any);
    
    console.log('All bots stopped');
    event.reply('attack-stopped', { success: true });
  } catch (error: any) {
    console.error('Error stopping bots:', error);
    event.reply('attack-error', { error: error.message });
  }
});

ipcMain.on('get-status', (event) => {
  event.reply('status-update', {
    activeBots: activeBots.length,
    running: activeBots.length > 0
  });
});
