import { TELEGRAM_BOT_TOKEN } from './config';
import { Telegraf } from 'telegraf';
import { getPools } from './api/soroswap';

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error('Telegram bot token is missing. Please set TELEGRAM_BOT_TOKEN in your environment variables.');
}

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

bot.start((ctx) => ctx.reply('Welcome to Sorobyt! 🚀\nYou will receive smart DeFi alerts here.'));

bot.launch();

console.log('Sorobyt Telegram bot is running...');

const LIQUIDITY_THRESHOLD = 1_000_000; // 1 milyon XLM

async function checkPoolsAndAlert() {
  try {
    const pools = await getPools();
    if (!Array.isArray(pools) || pools.length === 0) return;
    // En büyük havuzu bul
    const largestPool = pools.reduce((max, pool) => (pool.liquidity > max.liquidity ? pool : max), pools[0]);
    if (largestPool.liquidity < LIQUIDITY_THRESHOLD) {
      await bot.telegram.sendMessage(
        process.env.TELEGRAM_ALERT_CHAT_ID || largestPool.owner || '',
        `⚠️ Liquidity Alert!\nPool ${largestPool.name || largestPool.id} has low liquidity: ${largestPool.liquidity}`
      );
    }
  } catch (err) {
    console.error('Error checking pools:', err);
  }
}

setInterval(checkPoolsAndAlert, 60 * 1000); // Her 1 dakikada bir kontrol et

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 