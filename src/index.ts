import { TELEGRAM_BOT_TOKEN } from './config';
import { Telegraf } from 'telegraf';
import { getPools } from './api/soroswap';
import { getPrice } from './api/soroswap';
import { getQuote } from './api/soroswap';
import { getAssetList } from './api/soroswap';
import { getProtocols } from './api/soroswap';
import { getHealth } from './api/soroswap';
import { getSwaps } from './api/soroswap';

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error('Telegram bot token is missing. Please set TELEGRAM_BOT_TOKEN in your environment variables.');
}

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

const alertUsers = new Set<number>();

bot.start((ctx) => ctx.reply(
  `👋 Welcome to Sorobyt!\n\n` +
  `This bot provides real-time DeFi alerts and Soroswap analytics on Stellar.\n\n` +
  `You can:\n` +
  `• Get live asset prices\n` +
  `• Get swap quotes\n` +
  `• Track pool liquidity\n` +
  `• List all Soroswap assets\n` +
  `• See supported protocols\n` +
  `• Check API health\n` +
  `• \uD83D\uDD14 Get XLM swap alerts with /alerts on\n\n` +
  `Available commands:\n` +
  `  /price <asset> — Get the current price of an asset\n` +
  `  /quote <assetIn> <assetOut> <amount> — Get a swap quote\n` +
  `  /liquidity <tokenA> <tokenB> — Show pool liquidity\n` +
  `  /assets — List all Soroswap assets\n` +
  `  /protocols — List supported protocols\n` +
  `  /health — Show Soroswap API health status\n` +
  `  /alerts on|off — Enable or disable XLM swap alerts`
));

bot.command('alerts', (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  if (args[0] === 'on') {
    alertUsers.add(ctx.from.id);
    ctx.reply('🔔 XLM swap alerts enabled! You will receive notifications for XLM swaps.');
  } else if (args[0] === 'off') {
    alertUsers.delete(ctx.from.id);
    ctx.reply('🔕 XLM swap alerts disabled.');
  } else {
    ctx.reply('Usage: /alerts on|off');
  }
});

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

bot.command('health', async (ctx) => {
  try {
    const health = await getHealth();
    const mainnet = health?.status?.indexer?.mainnet?.join(', ') || 'N/A';
    const testnet = health?.status?.indexer?.testnet?.join(', ') || 'N/A';
    const reachable = health?.status?.reachable ? '✅' : '❌';
    ctx.reply(
      `Soroswap API is reachable: ${reachable}\n` +
      `Mainnet protocols: ${mainnet}\n` +
      `Testnet protocols: ${testnet}`
    );
  } catch (err) {
    ctx.reply('Error fetching API health status.');
  }
});

bot.command('price', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length === 0) {
    return ctx.reply('Usage: /price <asset>\nExample: /price XLM');
  }
  const asset = args[0];
  try {
    const priceData = await getPrice({ network: 'mainnet', asset });
    if (!priceData || !priceData.price) {
      return ctx.reply('Price not found for this asset.');
    }
    ctx.reply(`💸 Price for ${asset}: ${priceData.price} USD`);
  } catch (err) {
    ctx.reply('Error fetching price.');
  }
});

bot.command('quote', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 3) {
    return ctx.reply('Usage: /quote <assetIn> <assetOut> <amount>\nExample: /quote XLM USDC 100000000');
  }
  const [assetIn, assetOut, amount] = args;
  try {
    const body = {
      assetIn,
      assetOut,
      amount,
      tradeType: 'EXACT_IN',
      protocols: ['soroswap', 'phoenix', 'aqua'],
    };
    const quote = await getQuote(body, 'mainnet');
    if (!quote || !quote.trade || !quote.trade.expectedAmountOut) {
      return ctx.reply('No quote found for this swap.');
    }
    ctx.reply(
      `🔄 Swap Quote\n` +
      `From: ${assetIn}\nTo: ${assetOut}\nAmount: ${amount}\nExpected out: ${quote.trade.expectedAmountOut}`
    );
  } catch (err) {
    ctx.reply('Error fetching quote.');
  }
});

let assetSymbolMap: Record<string, string> = {};
async function updateAssetSymbolMap() {
  try {
    const assets = await getAssetList({ name: 'soroswap' });
    assetSymbolMap = {};
    for (const a of assets) {
      const symbol = (a.symbol || a.code || a.asset_code)?.toUpperCase();
      const address = a.address || a.issuer || a.asset_issuer;
      if (symbol && address) {
        assetSymbolMap[symbol] = address;
      }
      // XLM için özel durum
      if (symbol === 'XLM') {
        assetSymbolMap['XLM'] = 'native';
      }
    }
  } catch {}
}
updateAssetSymbolMap();
setInterval(updateAssetSymbolMap, 10 * 60 * 1000); // 10 dakikada bir güncelle

bot.command('liquidity', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 2) {
    return ctx.reply('Usage: /liquidity <tokenA> <tokenB>\nExample: /liquidity XLM USDC');
  }
  let [tokenA, tokenB] = args;
  // Sembol ise adrese çevir
  tokenA = assetSymbolMap[tokenA.toUpperCase()] || tokenA;
  tokenB = assetSymbolMap[tokenB.toUpperCase()] || tokenB;
  try {
    const params = { network: 'mainnet', protocol: 'soroswap' };
    const pools = await getPools(params);
    const pool = pools.find((p: any) =>
      (p.tokenA === tokenA && p.tokenB === tokenB) || (p.tokenA === tokenB && p.tokenB === tokenA)
    );
    if (!pool) {
      return ctx.reply('No pool found for these tokens.');
    }
    ctx.reply(
      `💧 Pool Liquidity\n` +
      `Pool: ${pool.tokenA} / ${pool.tokenB}\n` +
      `Liquidity: ${pool.liquidity}`
    );
  } catch (err) {
    ctx.reply('Error fetching liquidity.');
  }
});

bot.command('assets', async (ctx) => {
  try {
    const assets = await getAssetList({ name: 'soroswap' });
    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return ctx.reply('No assets found.');
    }
    const assetList = assets.map((a: any) => `${a.symbol || a.code || a.asset_code}`).join(', ');
    ctx.reply(`📋 Soroswap assets:\n${assetList}`);
  } catch (err) {
    ctx.reply('Error fetching asset list.');
  }
});

bot.command('protocols', async (ctx) => {
  try {
    const protocols = await getProtocols({ network: 'mainnet' });
    if (!protocols || !Array.isArray(protocols) || protocols.length === 0) {
      return ctx.reply('No protocols found.');
    }
    const protocolList = protocols.map((p: any) => p.name || p.id || p).join(', ');
    ctx.reply(`🛠 Supported protocols: ${protocolList}`);
  } catch (err) {
    ctx.reply('Error fetching protocols.');
  }
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 

// Swap alert logic
let lastSwapId: string | null = null;
async function checkXlmSwapsAndAlert() {
  try {
    // Swapları çek (örnek endpoint, gerekirse güncelle)
    const swaps = await getSwaps({ network: 'mainnet', limit: 5 });
    if (!Array.isArray(swaps) || swaps.length === 0) return;
    // Sadece yeni swaplar için kontrol
    for (const swap of swaps) {
      if (lastSwapId && swap.id === lastSwapId) break;
      // XLM asset kodu: "native" veya "XLM" olabilir, endpoint'e göre kontrol et
      if (swap.assetIn === 'native' || swap.assetOut === 'native' || swap.assetIn === 'XLM' || swap.assetOut === 'XLM') {
        for (const userId of alertUsers) {
          bot.telegram.sendMessage(userId, `⚡️ New XLM Swap!\nFrom: ${swap.assetIn} To: ${swap.assetOut}\nAmount: ${swap.amount}`);
        }
      }
    }
    lastSwapId = swaps[0]?.id || lastSwapId;
  } catch (err) {
    // Sessizce geç
  }
}
setInterval(checkXlmSwapsAndAlert, 30 * 1000); // Her 30 saniyede bir kontrol et 