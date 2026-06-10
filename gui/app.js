const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, loading banner...');
  
  // Load background image - try multiple paths
  const possiblePaths = [
    path.join(__dirname, 'assets', 'banner.png'),
    path.join(__dirname, '..', 'gui', 'assets', 'banner.png'),
    path.join(process.cwd(), 'gui', 'assets', 'banner.png'),
    'gui/assets/banner.png'
  ];

  let bannerLoaded = false;

  for (const bannerPath of possiblePaths) {
    console.log('Trying path:', bannerPath);
    if (fs.existsSync(bannerPath)) {
      console.log('✅ Banner found at:', bannerPath);
      try {
        const bannerData = fs.readFileSync(bannerPath);
        const base64 = bannerData.toString('base64');
        
        console.log('✅ Banner data loaded, size:', bannerData.length, 'bytes');
        
        // Create background div element
        const bgDiv = document.createElement('div');
        bgDiv.id = 'background-image';
        bgDiv.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          background-image: url('data:image/png;base64,${base64}') !important;
          background-size: cover !important;
          background-position: center !important;
          background-repeat: no-repeat !important;
          filter: blur(5px) brightness(0.2) grayscale(0.3) !important;
          z-index: 0 !important;
          pointer-events: none !important;
        `;
        
        // Insert as first child of body
        document.body.insertBefore(bgDiv, document.body.firstChild);
        
        console.log('✅ Banner loaded successfully!');
        
        bannerLoaded = true;
        break;
      } catch (err) {
        console.error('❌ Error loading banner:', err);
      }
    } else {
      console.log('❌ Not found at:', bannerPath);
    }
  }

  if (!bannerLoaded) {
    console.log('❌ Banner not found in any location');
  }
});

// Window Controls
document.getElementById('minimize-btn').addEventListener('click', () => {
  ipcRenderer.send('minimize-window');
});

document.getElementById('maximize-btn').addEventListener('click', () => {
  ipcRenderer.send('maximize-window');
});

document.getElementById('close-btn').addEventListener('click', () => {
  ipcRenderer.send('close-window');
});

// Tab Navigation
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const tabName = item.dataset.tab;
    
    navItems.forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');
    
    tabContents.forEach(tab => tab.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
  });
});

// Attack Controls
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

startBtn.addEventListener('click', async () => {
  const config = {
    token: document.getElementById('token').value,
    mode: document.getElementById('mode').value,
    concurrency: parseInt(document.getElementById('concurrency').value),
    channelName: document.getElementById('channelName').value,
    roleName: document.getElementById('roleName').value,
    messageText: document.getElementById('messageText').value,
    changeServerName: document.getElementById('serverName').value,
    changeServerIcon: document.getElementById('serverIcon').value,
    infiniteSpam: document.getElementById('infiniteSpam').checked,
    dmMembers: document.getElementById('dmMembers').checked,
    createBackup: document.getElementById('createBackup').checked,
    leaveImmediately: document.getElementById('leaveImmediately').checked,
    spamDelayMs: 0,
    dmDelayMs: 0
  };

  if (!config.token) {
    addLog('ERROR: Bot token is required');
    return;
  }

  startBtn.disabled = true;
  stopBtn.disabled = false;
  updateStatus('running', 'Attack Running');
  
  addLog('Starting attack...');
  addLog(`Mode: ${config.mode}`);
  addLog(`Target channels: ${config.channelName}`);
  
  ipcRenderer.send('start-attack', config);
});

stopBtn.addEventListener('click', () => {
  addLog('🛑 Stopping attack...');
  addLog('📡 Sending Ctrl+C signal...');
  ipcRenderer.send('stop-attack');
  
  startBtn.disabled = false;
  stopBtn.disabled = true;
  updateStatus('ready', 'Ready');
});

// IPC Listeners
ipcRenderer.on('attack-started', (event, data) => {
  addLog('✅ Attack started successfully');
});

ipcRenderer.on('attack-stopped', (event, data) => {
  addLog('✅ Attack stopped successfully');
  addLog('📡 Ctrl+C signal sent to console');
});

ipcRenderer.on('attack-error', (event, data) => {
  addLog(`❌ Error: ${data.error}`);
  startBtn.disabled = false;
  stopBtn.disabled = true;
  updateStatus('error', 'Error');
});

// Utility Functions
function addLog(message) {
  const logsContainer = document.getElementById('logs-container');
  const logEntry = document.createElement('div');
  logEntry.className = 'log-entry';
  
  const time = new Date().toLocaleTimeString();
  logEntry.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="log-message">${message}</span>
  `;
  
  logsContainer.appendChild(logEntry);
  logsContainer.scrollTop = logsContainer.scrollHeight;
}

function updateStatus(status, text) {
  statusText.textContent = text;
  
  statusDot.style.background = {
    'ready': '#10b981',
    'running': '#f59e0b',
    'error': '#ef4444'
  }[status] || '#10b981';
}

// Initialize
addLog('System initialized');
addLog('Ready to launch attack');

// Webhook Spammer
let webhookSpamActive = false;
let webhookSentCount = 0;
let webhookFailedCount = 0;
let webhookStartTime = 0;

const webhookStartBtn = document.getElementById('webhook-start-btn');
const webhookStopBtn = document.getElementById('webhook-stop-btn');

webhookStartBtn.addEventListener('click', async () => {
  const webhookUrl = document.getElementById('webhook-url').value;
  const username = document.getElementById('webhook-username').value;
  const avatarUrl = document.getElementById('webhook-avatar').value;
  const message = document.getElementById('webhook-message').value;
  const count = parseInt(document.getElementById('webhook-count').value);
  const delay = parseInt(document.getElementById('webhook-delay').value);
  const tts = document.getElementById('webhook-tts').checked;
  const infinite = document.getElementById('webhook-infinite').checked;

  if (!webhookUrl) {
    addLog('❌ ERROR: Webhook URL is required');
    return;
  }

  if (!message) {
    addLog('❌ ERROR: Message content is required');
    return;
  }

  webhookSpamActive = true;
  webhookSentCount = 0;
  webhookFailedCount = 0;
  webhookStartTime = Date.now();
  
  webhookStartBtn.disabled = true;
  webhookStopBtn.disabled = false;

  addLog('🔗 Starting webhook spam...');
  addLog(`📡 Target: ${webhookUrl.substring(0, 50)}...`);
  addLog(`📝 Message: ${message.substring(0, 50)}...`);
  addLog(`🔢 Count: ${infinite ? 'Infinite' : count}`);

  const sendWebhook = async () => {
    try {
      const payload = {
        content: message,
        username: username,
        tts: tts
      };

      if (avatarUrl) {
        payload.avatar_url = avatarUrl;
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        webhookSentCount++;
        document.getElementById('webhook-sent').textContent = webhookSentCount;
      } else {
        webhookFailedCount++;
        document.getElementById('webhook-failed').textContent = webhookFailedCount;
        
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          addLog(`⚠️ Rate limited! Retry after ${retryAfter}ms`);
        }
      }

      // Update rate
      const elapsed = (Date.now() - webhookStartTime) / 1000;
      const rate = (webhookSentCount / elapsed).toFixed(1);
      document.getElementById('webhook-rate').textContent = `${rate}/s`;

    } catch (error) {
      webhookFailedCount++;
      document.getElementById('webhook-failed').textContent = webhookFailedCount;
      addLog(`❌ Error: ${error.message}`);
    }
  };

  // Spam loop
  const spamLoop = async () => {
    let sent = 0;
    
    while (webhookSpamActive && (infinite || sent < count)) {
      await sendWebhook();
      sent++;
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (!webhookSpamActive) {
      addLog('🛑 Webhook spam stopped by user');
    } else {
      addLog('✅ Webhook spam completed');
    }

    webhookStartBtn.disabled = false;
    webhookStopBtn.disabled = true;
    webhookSpamActive = false;
  };

  spamLoop();
});

webhookStopBtn.addEventListener('click', () => {
  webhookSpamActive = false;
  addLog('🛑 Stopping webhook spam...');
});

// Auto-update status
setInterval(() => {
  ipcRenderer.send('get-status');
}, 1000);

ipcRenderer.on('status-update', (event, data) => {
  if (data.running && startBtn.disabled === false) {
    startBtn.disabled = true;
    stopBtn.disabled = false;
    updateStatus('running', 'Attack Running');
  }
});
