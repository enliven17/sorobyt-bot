import { TELEGRAM_BOT_TOKEN } from './config';
import { Telegraf } from 'telegraf';
import { getPools } from './api/soroswap';
import { getPrice } from './api/soroswap';
import { getQuote } from './api/soroswap';
import { getAssetList } from './api/soroswap';
import { getProtocols } from './api/soroswap';
import { getHealth } from './api/soroswap';
import { getSwaps } from './api/soroswap';
import axios from 'axios';
import { fetchRecentSwapsFromDune } from './api/dune';
import { fetchPoolReservesFromDune } from './api/dune';
import { fetchPoolsFromDune } from './api/dune';

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error('Telegram bot token is missing. Please set TELEGRAM_BOT_TOKEN in your environment variables.');
}

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

const alertUsers = new Set<number>();

bot.start((ctx) => ctx.reply(
  `👋 Welcome to Sorobyt!\n\n` +
  `Get real-time DeFi swap alerts and asset info for Stellar.\n\n` +
  `Commands:\n` +
  `  /price XLM — Get the current price of XLM\n` +
  `  /recent — Show last 20 Soroswap swaps\n` +
  `  /reserves — Show latest pool reserves\n` +
  `  /pools — Show latest pools\n` +
  `  /protocols — List supported protocols\n` +
  `  /health — Show Soroswap API health status\n` +
  `  /alerts on|off — Enable or disable all swap alerts` +
  `\n\n🔔 Use /alerts on to get notified for every new swap!`
));

bot.command('alerts', (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  if (args[0] === 'on') {
    alertUsers.add(ctx.from.id);
    ctx.reply('🔔 Soroswap swap alerts enabled! You will receive notifications for all new swaps.');
  } else if (args[0] === 'off') {
    alertUsers.delete(ctx.from.id);
    ctx.reply('🔕 All swap alerts disabled.');
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

let assetSymbolMap: Record<string, string> = {};
async function updateAssetSymbolMap() {
  try {
    const assets = await getAssetList({ name: 'soroswap' });
    console.log('ASSET LIST RESPONSE:', assets);
    assetSymbolMap = {};
    const assetList = assets.assets || [];
    for (const a of assetList) {
      const symbol = (a.symbol || a.code || a.asset_code)?.toUpperCase();
      const address = a.address || a.issuer || a.asset_issuer;
      if (symbol && address) {
        assetSymbolMap[symbol] = address;
      }
      if (symbol === 'XLM') {
        assetSymbolMap['XLM'] = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
      }
    }
  } catch (e) {
    console.error('ASSET LIST ERROR:', e);
  }
}
updateAssetSymbolMap().then(() => {
  console.log('ASSET SYMBOL MAP (on start):', assetSymbolMap);
});
setInterval(() => {
  updateAssetSymbolMap().then(() => {
    console.log('ASSET SYMBOL MAP (interval):', assetSymbolMap);
  });
}, 10 * 60 * 1000); // 10 dakikada bir güncelle

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

bot.command('swaps', async (ctx) => {
  try {
    const swaps = await getSwaps({ network: 'mainnet', limit: 10 });
    if (!Array.isArray(swaps) || swaps.length === 0) {
      return ctx.reply('No recent swaps found.');
    }
    const swapList = swaps.map((swap: any, i: number) =>
      `${i + 1}. ${swap.assetIn} → ${swap.assetOut}\nAmount: ${swap.amount}\nTx: ${swap.txn || swap.tx || swap.tx_hash || 'N/A'}`
    ).join('\n\n');
    ctx.reply(`Last 10 Soroswap swaps:\n\n${swapList}`);
  } catch (err) {
    ctx.reply('Error fetching recent swaps.');
  }
});

bot.command('recent', async (ctx) => {
  try {
    const swaps = await fetchRecentSwapsFromDune(20);
    if (!Array.isArray(swaps) || swaps.length === 0) {
      return ctx.reply('No recent swaps found.');
    }
    const swapList = swaps.map((swap: any, i: number) =>
      `${i + 1}. ${swap.token_0 || swap.token_in || swap.assetIn} → ${swap.token_1 || swap.token_out || swap.assetOut}\nAmount: ${swap.amount_0 || swap.amount_in || swap.amount}\nTx: ${swap.tx_hash || swap.txn || swap.tx || 'N/A'}\nTime: ${swap.closed_at || swap.block_time || swap.time || ''}`
    ).join('\n\n');
    ctx.reply(`Last 20 Soroswap swaps (via Dune):\n\n${swapList}`);
  } catch (err) {
    ctx.reply('Error fetching recent swaps from Dune.');
  }
});

// assetSymbolMap'i tersine çeviren yardımcı fonksiyon
function getSymbolByAddress(address: string): string {
  for (const [symbol, addr] of Object.entries(assetSymbolMap)) {
    if (addr === address) return symbol;
  }
  return address?.slice(0, 6) + '...' || '-'; // mapping yoksa kısaltılmış adres
}

bot.command('reserves', async (ctx) => {
  try {
    const reserves = await fetchPoolReservesFromDune(10);
    if (!Array.isArray(reserves) || reserves.length === 0) {
      return ctx.reply('No pool reserves found.');
    }
    let msg = '💧 *Latest Pool Reserves (via Dune)*\n\n';
    msg += '`Pool      | Token0 | Reserve0    | Token1 | Reserve1    | Updated`\n';
    msg += '`----------|--------|------------|--------|------------|---------------------`\n';
    reserves.forEach((r: any) => {
      const token0 = getSymbolByAddress(r.token_0);
      const token1 = getSymbolByAddress(r.token_1);
      msg += `[0m${(r.pool_id || '-').toString().padEnd(9)}| ${token0.padEnd(6)}| ${(r.reserve_0 || '-').toString().padEnd(11)}| ${token1.padEnd(6)}| ${(r.reserve_1 || '-').toString().padEnd(11)}| ${(r.updated_at || r.closed_at || r.time || '-').toString().slice(0,19)}\n`;
    });
    msg += '\n_Example: XLM/USDC pool reserves shown as XLM | USDC | ..._';
    ctx.replyWithMarkdownV2('```\n' + msg + '\n```');
  } catch (err) {
    console.error('DUNE RESERVES ERROR:', err);
    ctx.reply('Error fetching pool reserves from Dune.');
  }
});

bot.command('pools', async (ctx) => {
  try {
    const pools = await fetchPoolsFromDune(10);
    if (!Array.isArray(pools) || pools.length === 0) {
      return ctx.reply('No pools found.');
    }
    const poolList = pools.map((p: any, i: number) =>
      `${i + 1}. Pool: ${p.pair || p.pool || p.pool_id || '-'}\nToken0: ${p.token_0 || '-'}\nToken1: ${p.token_1 || '-'}\nCreated: ${p.created_at || p.time || ''}`
    ).join('\n\n');
    ctx.reply(`Latest pools (via Dune):\n\n${poolList}`);
  } catch (err) {
    console.error('DUNE POOLS ERROR:', err);
    ctx.reply('Error fetching pools from Dune.');
  }
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Swap alert logic
let lastSwapId: string | null = null;
async function checkSwapsAndAlert() {
  try {
    const swaps = await getSwaps({ network: 'mainnet', limit: 5 });
    if (!Array.isArray(swaps) || swaps.length === 0) return;
    for (const swap of swaps) {
      if (lastSwapId && swap.id === lastSwapId) break;
      for (const userId of alertUsers) {
        bot.telegram.sendMessage(userId, `⚡️ New Swap!\nFrom: ${swap.assetIn} To: ${swap.assetOut}\nAmount: ${swap.amount}`);
      }
    }
    lastSwapId = swaps[0]?.id || lastSwapId;
  } catch (err) {
    // Sessizce geç
  }
}
setInterval(checkSwapsAndAlert, 30 * 1000); // Her 30 saniyede bir kontrol et

bot.command('price', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length === 0 || args[0].toUpperCase() !== 'XLM') {
    return ctx.reply('Usage: /price XLM');
  }
  try {
    const res = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd');
    const price = res.data?.stellar?.usd;
    if (!price) return ctx.reply('XLM price not found.');
    ctx.reply(`💸 XLM/USD: $${price}`);
  } catch (err) {
    ctx.reply('Error fetching XLM price.');
  }
}); 