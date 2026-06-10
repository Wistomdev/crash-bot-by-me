import { execSync } from 'child_process';
import readline from 'readline';

// Цвета для консоли
export const colors = {
  r: '\x1b[91m', // red
  g: '\x1b[92m', // green
  b: '\x1b[94m', // blue
  m: '\x1b[95m', // magenta
  c: '\x1b[96m', // cyan
  y: '\x1b[93m', // yellow
  w: '\x1b[0m'   // reset
};

export const clear = (): void => {
  try {
    const isWin = process.platform === 'win32';
    if (isWin) {
      execSync('cls', { stdio: 'inherit' });
    } else {
      execSync('clear', { stdio: 'inherit' });
    }
  } catch {
    // если не получилось очистить, просто выводим много новых строк
    console.log('\n'.repeat(50));
  }
};

export const input = (prompt: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close();
      resolve(answer);
    });
  });
};

export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

// Баннер
export const banner = `
${colors.r} _   _       _       ${colors.m}____        _   
${colors.r}| \\ | |_   _| | _____${colors.m}| __ )  ___ | |_ 
${colors.r}|  \\| | | | | |/ / _ ${colors.m}\\\\  _ \\ / _ \\| __|
${colors.r}| |\\  | |_| |   <  __${colors.m}/ |_) | (_) | |_ 
${colors.r}|_| \\_|\\__,_|_|\\_\\___${colors.m}|____/ \\___/ \\__|
${colors.y}Made by: ${colors.g}Terractov
`;
