import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { clear, banner, colors, input } from './utils';
import { restoreFromBackup, listBackups } from './backup';
import { readdirSync } from 'fs';
import { join, basename } from 'path';

async function main() {
  clear();
  console.log(banner);
  console.log(`${colors.c}╔═══════════════════════════════════════════════════════════════╗${colors.w}`);
  console.log(`${colors.c}║              ${colors.y}🔄 ВОССТАНОВЛЕНИЕ СЕРВЕРА 🔄${colors.c}                  ║${colors.w}`);
  console.log(`${colors.c}╚═══════════════════════════════════════════════════════════════╝${colors.w}\n`);

  // Получаем токен
  const token = await input(`${colors.y}Токен бота: ${colors.g}`);
  if (!token.trim()) {
    console.log(`${colors.r}Токен не указан!${colors.w}`);
    process.exit(1);
  }

  // Показываем список бэкапов
  const backups = listBackups();
  if (backups.length === 0) {
    console.log(`${colors.r}Нет доступных бэкапов в папке backups/${colors.w}`);
    process.exit(1);
  }

  console.log(`\n${colors.c}Доступные бэкапы:${colors.w}`);
  backups.forEach((backup, index) => {
    console.log(`${colors.g}[${index + 1}]${colors.w} ${basename(backup)}`);
  });

  const backupIndex = parseInt(await input(`\n${colors.y}Выберите номер бэкапа: ${colors.g}`)) - 1;
  if (backupIndex < 0 || backupIndex >= backups.length) {
    console.log(`${colors.r}Неверный номер!${colors.w}`);
    process.exit(1);
  }

  const selectedBackup = backups[backupIndex];
  console.log(`${colors.g}Выбран: ${basename(selectedBackup)}${colors.w}\n`);

  // Подключаемся к Discord
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers
    ]
  });

  client.once('clientReady', async () => {
    console.log(`${colors.g}Bot ${client.user?.tag} connected!${colors.w}\n`);

    const guilds = [...client.guilds.cache.values()];
    if (guilds.length === 0) {
      console.log(`${colors.r}Бот не состоит ни в одном сервере!${colors.w}`);
      process.exit(1);
    }

    console.log(`${colors.c}Доступные серверы:${colors.w}`);
    guilds.forEach((guild) => {
      console.log(`${colors.g}•${colors.w} ${guild.name} ${colors.b}(ID: ${guild.id})${colors.w}`);
    });

    const guildId = await input(`\n${colors.y}Введите Guild ID сервера для восстановления: ${colors.g}`);
    const targetGuild = guilds.find(g => g.id === guildId.trim());
    
    if (!targetGuild) {
      console.log(`${colors.r}Сервер с ID ${guildId} не найден!${colors.w}`);
      process.exit(1);
    }

    // Загружаем полную информацию о сервере
    await targetGuild.fetch();
    await targetGuild.channels.fetch();
    await targetGuild.roles.fetch();

    // Предупреждение
    console.log(`\n${colors.r}╔═══════════════════════════════════════════════════════════════╗${colors.w}`);
    console.log(`${colors.r}║                      ${colors.y}⚠️  ВНИМАНИЕ! ⚠️${colors.r}                        ║${colors.w}`);
    console.log(`${colors.r}╠═══════════════════════════════════════════════════════════════╣${colors.w}`);
    console.log(`${colors.r}║  ${colors.w}Восстановление УДАЛИТ все каналы и роли,${colors.r}                 ║${colors.w}`);
    console.log(`${colors.r}║  ${colors.w}а затем создаст новые из бэкапа.${colors.r}                         ║${colors.w}`);
    console.log(`${colors.r}║  ${colors.w}Это действие необратимо!${colors.r}                                 ║${colors.w}`);
    console.log(`${colors.r}╚═══════════════════════════════════════════════════════════════╝${colors.w}\n`);

    const confirm = await input(`${colors.y}Продолжить восстановление? (yes/no): ${colors.g}`);
    if (confirm.toLowerCase() !== 'yes') {
      console.log(`${colors.y}Отменено.${colors.w}`);
      process.exit(0);
    }

    // Восстанавливаем
    try {
      await restoreFromBackup(targetGuild, selectedBackup);
      console.log(`\n${colors.g}✓ Восстановление завершено успешно!${colors.w}`);
    } catch (error: any) {
      console.log(`\n${colors.r}✗ Ошибка восстановления: ${error.message}${colors.w}`);
    }

    process.exit(0);
  });

  await client.login(token);
}

main().catch(console.error);
