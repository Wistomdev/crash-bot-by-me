# 🔥 Discord Nuke Bot

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-blue.svg)](https://discord.js.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)

⚠️ **WARNING: This bot is for educational purposes only. Unauthorized use may violate Discord's Terms of Service and local laws. Use at your own risk!**

A powerful Discord bot with multiple operation modes for server management, backup, and automation. Features GUI interface and CLI support.

[Русская версия](./README.ru.md) | **English Version**

---

## 📋 Features

- **Multiple Operation Modes:**
  - `pereezd` - Migration mode (DM members, recreate channels with spam)
  - `full` - Full nuke (ban members, delete all, create voice channels)
  - `light` - Light mode (ban bots, delete channels/roles)
  - `audit` - Audit mode (backup only, no destructive actions)
  
- **Advanced Capabilities:**
  - 🔄 Automatic server backup before actions
  - 📨 Mass DM to all members
  - 🔁 Infinite spam mode in created channels
  - 🎨 Change server name and icon
  - 🖥️ GUI interface (Electron)
  - 💾 Backup & restore system
  - ⚡ High-speed parallel execution
  - 🤫 Invisible mode (stealth)

---

## 🚀 Installation

### Prerequisites
- **Node.js** 18.0.0 or higher ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))
- Discord Bot Token ([How to get](#how-to-get-discord-bot-token))

### Step 1: Clone Repository
```bash
git clone https://github.com/Wistomdev/crash-bot-by-me.git
cd crash-bot-by-me
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` file:
```env
DISCORD_TOKEN_1=your_discord_bot_token_here
CHANNEL_OR_ROLE_NAME=nuked
BOT_MODE=audit
BLOCKED_GUILD_IDS=
```

### Step 4: Build Project
```bash
npm run build
```

---

## ⚙️ Configuration

### Environment Variables (`.env`)

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DISCORD_TOKEN_1` | Discord bot token | **Required** | `MTIzNDU2Nzg5...` |
| `CHANNEL_OR_ROLE_NAME` | Name for created channels/roles | `nuked` | `hacked` |
| `BOT_MODE` | Operation mode | `audit` | `pereezd`, `full`, `light` |
| `BLOCKED_GUILD_IDS` | Server IDs to skip (comma-separated) | - | `123456789,987654321` |

### Operation Modes

#### 🔷 `audit` - Audit Mode (Safe)
- Creates backup of all servers
- No destructive actions
- Perfect for testing and backup

#### 🔷 `pereezd` - Migration Mode
1. Change server name and icon (optional)
2. Send DM to all members
3. Delete all roles
4. Delete all channels
5. Create 200 text channels
6. Infinite spam in all channels

#### 🔷 `full` - Full Nuke Mode
1. Ban all members (except bots)
2. Delete all channels
3. Delete all roles
4. Create 200 voice channels

#### 🔷 `light` - Light Mode
1. Ban all bots (except whitelisted)
2. Delete all channels
3. Delete all roles

---

## 💻 Usage

### CLI Mode (Command Line)

#### Start Bot
```bash
npm start
```

#### Start with Auto-Build
```bash
npm run dev
```

#### Restore from Backup
```bash
npm run restore
```

### GUI Mode (Graphical Interface)

#### Windows
```bash
gui.bat
```
or
```bash
npm run gui
```

#### Linux/Mac
```bash
npm run gui
```

**GUI Features:**
- Visual configuration of all parameters
- Real-time operation monitoring
- Easy backup restore
- No need to edit `.env` file

---

## 🔑 How to Get Discord Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Enter application name and create
4. Go to **"Bot"** section in left menu
5. Click **"Reset Token"** and copy the token
6. Enable **Privileged Gateway Intents:**
   - ✅ PRESENCE INTENT
   - ✅ SERVER MEMBERS INTENT
   - ✅ MESSAGE CONTENT INTENT
7. Go to **"OAuth2"** → **"URL Generator"**
8. Select scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
9. Select bot permissions:
   - ✅ Administrator (or specific permissions)
10. Copy generated URL and open in browser
11. Select server and authorize bot

---

## 📁 Project Structure

```
crash-bot-by-me/
├── src/
│   ├── index.ts          # CLI entry point
│   ├── bot.ts            # Main bot logic
│   ├── actions.ts        # Discord actions (ban, delete, create)
│   ├── backup.ts         # Backup system
│   ├── restore.ts        # Restore from backup
│   ├── electron.ts       # GUI interface
│   └── utils.ts          # Utilities
├── gui/
│   ├── index.html        # GUI interface
│   ├── app.js            # GUI logic
│   ├── styles.css        # GUI styles
│   └── assets/           # Images and resources
├── backups/              # Backup storage (auto-created)
├── dist/                 # Compiled JavaScript (auto-created)
├── .env                  # Configuration (create from .env.example)
├── .env.example          # Configuration template
├── package.json          # Project dependencies
├── tsconfig.json         # TypeScript config
└── README.md             # This file
```

---

## 🛡️ Security Recommendations

1. **Never share your `.env` file** - it contains sensitive tokens
2. **Use `audit` mode first** to test bot functionality
3. **Create backups** before destructive operations
4. **Block important servers** via `BLOCKED_GUILD_IDS`
5. **Use test servers** for testing
6. **Store backups securely** (sensitive data)

---

## 🐛 Troubleshooting

### Bot doesn't connect
- ✅ Check token in `.env`
- ✅ Verify bot is invited to server
- ✅ Check Privileged Intents are enabled

### "Missing Access" errors
- ✅ Verify bot has Administrator permission
- ✅ Bot's role must be higher than target roles
- ✅ Bot cannot manage server owner

### Rate limit errors
- ✅ Reduce `concurrency` in code
- ✅ Increase delays between actions
- ✅ This is normal for large operations

### GUI doesn't start
- ✅ Run `npm run build` first
- ✅ Check Node.js version (18+)
- ✅ Reinstall dependencies: `npm install`

---

## 📝 Advanced Configuration

### Custom Settings in Code

Edit `src/index.ts` to customize behavior:

```typescript
const options: NukeBotOptions = {
  channelName: 'nuked',           // Channel name
  roleName: 'nuked',              // Role name
  messageText: 'Server nuked!',   // Spam message
  mode: 'pereezd',                // Operation mode
  leaveImmediately: false,        // Leave servers immediately
  concurrency: 10,                // Parallel operations (1-50)
  infiniteSpam: true,             // Enable infinite spam
  spamDelayMs: 0,                 // Delay between messages (0 = none)
  createBackup: true,             // Create backup before actions
  dmMembers: true,                // Send DMs to members
  dmDelayMs: 1000,                // Delay between DMs (ms)
  changeServerName: 'NUKED',      // New server name (optional)
  changeServerIcon: 'URL',        // New server icon URL (optional)
};
```

### Concurrency Settings
- `1-5` - Safe, slow
- `10-20` - Balanced
- `30-50` - Fast, may hit rate limits

### Spam Settings
- `spamDelayMs: 0` - Maximum speed (may trigger rate limits)
- `spamDelayMs: 100` - Fast with less rate limits
- `spamDelayMs: 1000` - Safe, 1 message per second

---

## 📜 License

This project is provided for **educational purposes only**. The authors are not responsible for any misuse.

**By using this bot, you agree:**
- To use it only on servers you own or have explicit permission to manage
- To comply with Discord's Terms of Service
- To take full responsibility for your actions
- To not use it for malicious purposes

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📧 Support

- **Issues:** [GitHub Issues](https://github.com/Wistomdev/crash-bot-by-me/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Wistomdev/crash-bot-by-me/discussions)

---

## ⚠️ Disclaimer

This tool is provided "as is" for educational purposes. Unauthorized use of this bot may:
- Violate Discord's Terms of Service
- Result in account termination
- Break local laws regarding computer misuse
- Cause harm to communities

**Use responsibly and ethically.**

---

**Made with ❤️ by Wistomdev**
