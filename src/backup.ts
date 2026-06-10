import { Guild, TextChannel, VoiceChannel, CategoryChannel, Role, PermissionOverwrites, ChannelType, REST, Routes } from 'discord.js';
import { writeFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { colors } from './utils';

export interface GuildBackup {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  ownerId: string;
  createdAt: string;
  channels: ChannelBackup[];
  roles: RoleBackup[];
  emojis: EmojiBackup[];
  timestamp: string;
}

export interface ChannelBackup {
  id: string;
  name: string;
  type: number;
  position: number;
  parentId: string | null;
  topic: string | null;
  nsfw: boolean;
  rateLimitPerUser: number | null;
  permissions: PermissionBackup[];
}

export interface RoleBackup {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  mentionable: boolean;
}

export interface EmojiBackup {
  id: string | null;
  name: string | null;
  animated: boolean;
}

export interface PermissionBackup {
  id: string;
  type: number;
  allow: string;
  deny: string;
}

/**
 * Создаёт резервную копию структуры сервера в JSON формате
 */
export async function createBackup(guild: Guild): Promise<string> {
  try {
    console.log(`${colors.c}[BACKUP] Creating backup for ${guild.name}...${colors.w}`);

    // Загружаем все данные
    await Promise.all([
      guild.channels.fetch(),
      guild.roles.fetch(),
      guild.emojis.fetch()
    ]);

    // Собираем данные о каналах
    const channels: ChannelBackup[] = [];
    for (const [, channel] of guild.channels.cache) {
      if (!channel) continue;
      
      // Пропускаем треды
      if (channel.isThread()) continue;

      const permissions: PermissionBackup[] = [];
      if ('permissionOverwrites' in channel) {
        for (const [, overwrite] of channel.permissionOverwrites.cache) {
          permissions.push({
            id: overwrite.id,
            type: overwrite.type,
            allow: overwrite.allow.bitfield.toString(),
            deny: overwrite.deny.bitfield.toString()
          });
        }
      }

      channels.push({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        position: 'position' in channel ? channel.position : 0,
        parentId: channel.parentId,
        topic: 'topic' in channel ? channel.topic : null,
        nsfw: 'nsfw' in channel ? channel.nsfw : false,
        rateLimitPerUser: 'rateLimitPerUser' in channel ? (channel.rateLimitPerUser ?? 0) : 0,
        permissions
      });
    }

    // Собираем данные о ролях
    const roles: RoleBackup[] = [];
    for (const [, role] of guild.roles.cache) {
      if (role.id === guild.id) continue; // Пропускаем @everyone

      roles.push({
        id: role.id,
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        position: role.position,
        permissions: role.permissions.bitfield.toString(),
        mentionable: role.mentionable
      });
    }

    // Собираем данные об эмодзи
    const emojis: EmojiBackup[] = [];
    for (const [, emoji] of guild.emojis.cache) {
      emojis.push({
        id: emoji.id,
        name: emoji.name,
        animated: emoji.animated || false
      });
    }

    // Формируем объект бэкапа
    const backup: GuildBackup = {
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      description: guild.description,
      ownerId: guild.ownerId,
      createdAt: guild.createdAt.toISOString(),
      channels,
      roles,
      emojis,
      timestamp: new Date().toISOString()
    };

    // Создаём папку backups если её нет
    const backupDir = join(process.cwd(), 'backups');
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    // Сохраняем в файл
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${guild.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    const filepath = join(backupDir, filename);

    writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf-8');

    console.log(`${colors.g}[BACKUP] ✓ Saved to: ${filename}${colors.w}`);
    console.log(`${colors.b}  Channels: ${channels.length}, Roles: ${roles.length}, Emojis: ${emojis.length}${colors.w}`);

    return filepath;
  } catch (error: any) {
    console.log(`${colors.r}[BACKUP] ✗ Failed: ${error.message}${colors.w}`);
    throw error;
  }
}

/**
 * Создаёт бэкапы для всех серверов
 */
export async function backupAllGuilds(guilds: Guild[]): Promise<string[]> {
  const backupPaths: string[] = [];
  
  console.log(`${colors.c}[BACKUP] Starting backup for ${guilds.length} guilds...${colors.w}\n`);

  for (const guild of guilds) {
    try {
      const path = await createBackup(guild);
      backupPaths.push(path);
    } catch (error) {
      console.log(`${colors.r}[BACKUP] Skipped ${guild.name} due to error${colors.w}`);
    }
  }

  console.log(`\n${colors.g}[BACKUP] Completed! ${backupPaths.length}/${guilds.length} backups created${colors.w}\n`);
  
  return backupPaths;
}

/**
 * Восстанавливает сервер из JSON бэкапа
 */
export async function restoreFromBackup(guild: Guild, backupPath: string): Promise<void> {
  try {
    // Загружаем полную информацию о сервере
    await guild.fetch();
    
    console.log(`${colors.c}[RESTORE] Starting restore for ${guild.name}...${colors.w}`);
    
    // Проверяем права бота
    const botMember = await guild.members.fetchMe();
    if (!botMember.permissions.has('Administrator')) {
      console.log(`${colors.r}[RESTORE] ⚠️  WARNING: Bot doesn't have Administrator permission!${colors.w}`);
      console.log(`${colors.y}[RESTORE] Some operations may fail. Grant Administrator role for best results.${colors.w}`);
    }

    // Читаем файл бэкапа
    if (!existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    const backupData: GuildBackup = JSON.parse(readFileSync(backupPath, 'utf-8'));
    console.log(`${colors.b}[RESTORE] Loaded backup: ${backupData.name} (${backupData.timestamp})${colors.w}`);

    // ===== ШАГ 0: БЫСТРАЯ ОЧИСТКА СЕРВЕРА =====
    console.log(`${colors.r}[RESTORE] Deleting existing channels and roles...${colors.w}`);
    
    await guild.channels.fetch();
    await guild.roles.fetch();

    // Удаляем все каналы параллельно
    const deleteChannelPromises = guild.channels.cache.map(channel => {
      if (channel && 'deletable' in channel && channel.deletable) {
        return channel.delete().catch(() => {});
      }
      return Promise.resolve();
    });

    // Удаляем все роли параллельно (кроме @everyone)
    const deleteRolePromises = guild.roles.cache.map(role => {
      if (role.editable && role.id !== guild.id) {
        return role.delete().catch(() => {});
      }
      return Promise.resolve();
    });

    // Ждём завершения удаления
    await Promise.all([...deleteChannelPromises, ...deleteRolePromises]);
    console.log(`${colors.g}[RESTORE] ✓ Server cleared${colors.w}`);

    // ===== ШАГ 1: СОЗДАНИЕ РОЛЕЙ =====
    console.log(`${colors.y}[RESTORE] Creating roles...${colors.w}`);
    const roleMap = new Map<string, string>(); // старый ID -> новый ID
    
    // Сортируем роли по позиции (снизу вверх)
    const sortedRoles = [...backupData.roles].sort((a, b) => a.position - b.position);
    console.log(`${colors.b}[RESTORE] Total roles to create: ${sortedRoles.length}${colors.w}`);
    
    // Создаём роли батчами по 5 параллельно
    const BATCH_SIZE = 5;
    const BATCH_DELAY = 2000; // 2 секунды между батчами
    
    for (let i = 0; i < sortedRoles.length; i += BATCH_SIZE) {
      const batch = sortedRoles.slice(i, i + BATCH_SIZE);
      console.log(`${colors.c}[${i + 1}-${Math.min(i + BATCH_SIZE, sortedRoles.length)}/${sortedRoles.length}] Creating batch...${colors.w}`);
      
      await Promise.all(batch.map(async (roleData) => {
        try {
          const newRole = await guild.roles.create({
            name: roleData.name,
            color: roleData.color,
            hoist: roleData.hoist,
            permissions: BigInt(roleData.permissions),
            mentionable: roleData.mentionable
          });
          roleMap.set(roleData.id, newRole.id);
          console.log(`${colors.g}  ✓ ${roleData.name}${colors.w}`);
        } catch (error: any) {
          console.log(`${colors.r}  ✗ ${roleData.name}: ${error.message}${colors.w}`);
        }
      }));
      
      // Задержка между батчами
      if (i + BATCH_SIZE < sortedRoles.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }
    
    console.log(`${colors.g}[RESTORE] Roles created: ${roleMap.size}/${sortedRoles.length}${colors.w}`);

    // Если не создалось ни одной роли - останавливаемся
    if (roleMap.size === 0 && sortedRoles.length > 0) {
      throw new Error('Failed to create any roles. Check bot permissions (needs Administrator).');
    }

    // ===== ШАГ 2: СОЗДАНИЕ КАТЕГОРИЙ =====
    // ===== ШАГ 2: СОЗДАНИЕ КАТЕГОРИЙ =====
    console.log(`${colors.y}[RESTORE] Creating categories...${colors.w}`);
    const channelMap = new Map<string, string>(); // старый ID -> новый ID
    const categories = backupData.channels.filter(ch => ch.type === ChannelType.GuildCategory);
    
    // Создаём категории батчами по 3
    const CAT_BATCH_SIZE = 3;
    for (let i = 0; i < categories.length; i += CAT_BATCH_SIZE) {
      const batch = categories.slice(i, i + CAT_BATCH_SIZE);
      
      await Promise.all(batch.map(async (catData) => {
        try {
          const newCat = await guild.channels.create({
            name: catData.name,
            type: ChannelType.GuildCategory,
            position: catData.position
          });
          channelMap.set(catData.id, newCat.id);
          console.log(`${colors.g}  ✓ ${catData.name}${colors.w}`);
        } catch (error: any) {
          console.log(`${colors.r}  ✗ ${catData.name}: ${error.message}${colors.w}`);
        }
      }));
      
      if (i + CAT_BATCH_SIZE < categories.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // ===== ШАГ 3: СОЗДАНИЕ КАНАЛОВ =====
    // ===== ШАГ 3: СОЗДАНИЕ КАНАЛОВ =====
    console.log(`${colors.y}[RESTORE] Creating channels...${colors.w}`);
    const regularChannels = backupData.channels.filter(
      ch => ch.type !== ChannelType.GuildCategory
    );

    // Создаём каналы последовательно с задержкой
    for (const chData of regularChannels) {
      try {
        const channelOptions: any = {
          name: chData.name,
          type: chData.type,
          position: chData.position,
          parent: chData.parentId ? channelMap.get(chData.parentId) : undefined
        };

        // Добавляем специфичные для текстовых каналов опции
        if (chData.type === ChannelType.GuildText) {
          channelOptions.topic = chData.topic;
          channelOptions.nsfw = chData.nsfw;
          channelOptions.rateLimitPerUser = chData.rateLimitPerUser || 0;
        }

        const newChannel = await guild.channels.create(channelOptions);
        channelMap.set(chData.id, newChannel.id);
        
        // Восстанавливаем права доступа
        if (chData.permissions.length > 0 && 'permissionOverwrites' in newChannel) {
          for (const perm of chData.permissions) {
            try {
              const targetId = perm.type === 0 ? roleMap.get(perm.id) || perm.id : perm.id;
              await newChannel.permissionOverwrites.create(targetId, {
                Allow: perm.allow,
                Deny: perm.deny
              } as any);
            } catch {}
          }
        }

        console.log(`${colors.g}  ✓ Created channel: ${chData.name}${colors.w}`);
        
        // Задержка 300ms между каналами
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error: any) {
        console.log(`${colors.r}  ✗ Failed to create channel ${chData.name}: ${error.message}${colors.w}`);
        if (error.code === 429) {
          console.log(`${colors.y}  ⏳ Rate limited, waiting 5 seconds...${colors.w}`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }

    console.log(`${colors.g}[RESTORE] ✓ Restore completed!${colors.w}`);
    console.log(`${colors.b}  Roles: ${roleMap.size}/${backupData.roles.length}${colors.w}`);
    console.log(`${colors.b}  Channels: ${channelMap.size}/${backupData.channels.length}${colors.w}`);

  } catch (error: any) {
    console.log(`${colors.r}[RESTORE] ✗ Failed: ${error.message}${colors.w}`);
    throw error;
  }
}

/**
 * Показывает список доступных бэкапов
 */
export function listBackups(): string[] {
  const backupDir = join(process.cwd(), 'backups');
  
  if (!existsSync(backupDir)) {
    return [];
  }

  const files = readdirSync(backupDir).filter(f => f.endsWith('.json'));
  return files.map(f => join(backupDir, f));
}
