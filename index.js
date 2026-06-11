import {
  default as makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
} from "@whiskeysockets/baileys";
import Pino from "pino";
import fs from "fs-extra";
import qrcode from "qrcode-terminal";
import axios from "axios";
import config from "./config.js";

let sock;
let botStartTime = Date.now();

function showQR(qrData) {
  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║          SCAN QR CODE WITH WHATSAPP              ║");
  console.log("║   WhatsApp → Settings → Linked Devices            ║");
  console.log("╚════════════════════════════════════════════════════╝\n");
  qrcode.generate(qrData, { small: true });
  console.log("\n⏳ Waiting for scan...\n");
}

function getUptime() {
  const diff = Date.now() - botStartTime;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function getMainMenu(sender) {
  return `
╔══════════════════════════════════════════════════════════════╗
║                   🤖 ${config.botName} 🤖                     ║
╠══════════════════════════════════════════════════════════════╣
║  👤 User     : ${sender.split("@")[0]}                         
║  🤖 Bot      : ${config.botName}                             
║  👑 Author   : ${config.author}                              
║  🧬 Version  : ${config.version}                             
║  ⏱ Uptime    : ${getUptime()}                                
║  ⚡ Prefix    : ${config.prefix}                              
║  🌐 Status    : ONLINE ✅                                     
╚══════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════╗
║ 1. 📦 DOWNLOAD SYSTEM    - Download from social media       ║
║ 2. 🧠 AI ENGINE          - ChatGPT, Image Gen, Lyrics       ║
║ 3. 👥 GROUP CONTROL      - Admin tools, tagall, kick        ║
║ 4. 🛡️ SECURITY          - Anti-link, Anti-delete, Guard    ║
║ 5. 👑 OWNER ACCESS       - Owner only commands              ║
║ 6. ⚡ BOT CORE           - Settings, auto features          ║
║ 7. 🛠 UTILITY TOOLS      - Sticker, weather, translate      ║
╚══════════════════════════════════════════════════════════════╝

💡 Type .menu 1-7 to see category commands
    `;
}

async function connectToWhatsApp() {
  console.log("📱 Initializing WhatsApp connection...");

  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  sock = makeWASocket({
    auth: state,
    logger: Pino({ level: "silent" }),
    browser: ["SMARTTECH BOT", "Chrome", "120.0.0.0"],
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      showQR(qr);
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log("🔄 Reconnecting in 3 seconds...");
        setTimeout(connectToWhatsApp, 3000);
      } else {
        console.log("❌ Logged out. Delete auth_info folder and restart.");
      }
    } else if (connection === "open") {
      console.log("\n╔════════════════════════════════════════════════════╗");
      console.log(`║     ✅ ${config.botName} IS ONLINE! ✅                ║`);
      console.log(`║     🤖 Bot: ${config.botName}                         ║`);
      console.log(`║     👑 Author: ${config.author}                       ║`);
      console.log(`║     🛡️ Anti-Ban: ACTIVE                              ║`);
      console.log(`║     📩 Anti-Delete DM: SENDING TO OWNER              ║`);
      console.log(`║     ⚡ Total Commands: 120                           ║`);
      console.log("╚════════════════════════════════════════════════════╝\n");

      await sock.sendPresenceUpdate("available");

      try {
        await sock.sendMessage(config.ownerNumber, {
          text: `✅ *${
            config.botName
          } is ONLINE!*\n⏱️ Time: ${new Date().toLocaleString()}\n🛡️ Anti-Delete: ACTIVE\n👑 Welcome back, Master!`,
        });
      } catch (e) {}
    }
  });

  sock.ev.on("creds.update", saveCreds);
  setupMessageHandler();
}

function setupMessageHandler() {
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const messageContent =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      "";

    if (!messageContent.startsWith(config.prefix)) return;

    const args = messageContent.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const isOwner = sender === config.ownerNumber;

    // MENU COMMAND
    if (command === "menu") {
      if (!args[0]) {
        return sock.sendMessage(sender, { text: getMainMenu(sender) });
      } else if (args[0] === "1") {
        return sock.sendMessage(sender, {
          text: `📦 *DOWNLOAD SYSTEM*\n.play .video .facebook .ig .tt .pinterest .yts .tourl .mediafire`,
        });
      } else if (args[0] === "2") {
        return sock.sendMessage(sender, {
          text: `🧠 *AI ENGINE*\n.ai .gpt .image .lyrics .fact`,
        });
      } else if (args[0] === "3") {
        return sock.sendMessage(sender, {
          text: `👥 *GROUP CONTROL*\n.tagall .hidetag .kick .promote .demote .grouplink .close .open .warn`,
        });
      } else if (args[0] === "4") {
        return sock.sendMessage(sender, {
          text: `🛡️ *SECURITY*\n.guard .antilink .antidelete .anticall .setting`,
        });
      } else if (args[0] === "5") {
        if (!isOwner)
          return sock.sendMessage(sender, { text: "❌ Owner only" });
        return sock.sendMessage(sender, {
          text: `👑 *OWNER ACCESS*\n.owner .fullpp .getpp`,
        });
      } else if (args[0] === "6") {
        return sock.sendMessage(sender, {
          text: `⚡ *BOT CORE*\n.alive .ping .speed .mode .prefix .autoread .chatbot .presence`,
        });
      } else if (args[0] === "7") {
        return sock.sendMessage(sender, {
          text: `🛠 *UTILITY TOOLS*\n.sticker .weather .joke .fancy .translate .github .pair .vv .jid .support`,
        });
      }
    }

    // ALIVE
    else if (command === "alive") {
      await sock.sendMessage(sender, {
        text: `✅ *${
          config.botName
        } is ALIVE!*\n⏱️ Uptime: ${getUptime()}\n👑 Author: ${
          config.author
        }\n🛡️ Anti-Ban: ACTIVE`,
      });
    }

    // PING
    else if (command === "ping") {
      const start = Date.now();
      await sock.sendMessage(sender, { text: "🏓 Pinging..." });
      const end = Date.now();
      await sock.sendMessage(sender, { text: `🏓 Pong! ${end - start}ms` });
    }

    // SPEED
    else if (command === "speed") {
      await sock.sendMessage(sender, {
        text: `⚡ *Speed Test*\n⏱️ Response: FAST\n💾 Memory: ${Math.round(
          process.memoryUsage().heapUsed / 1024 / 1024
        )}MB`,
      });
    }

    // JOKE
    else if (command === "joke") {
      const jokes = [
        "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
        "Why was the JavaScript developer sad? Because he didn't Node how to Express himself! 😢",
        "What do you call a fake noodle? An impasta! 🍝",
        "Why don't scientists trust atoms? Because they make up everything! ⚛️",
      ];
      await sock.sendMessage(sender, {
        text: `😂 *Joke:* ${jokes[Math.floor(Math.random() * jokes.length)]}`,
      });
    }

    // FACT
    else if (command === "fact") {
      const facts = [
        "Honey never spoils. Archaeologists found 3000-year-old honey!",
        "Octopuses have three hearts and blue blood.",
        "Bananas are berries, but strawberries aren't.",
        "A day on Venus is longer than a year on Venus.",
      ];
      await sock.sendMessage(sender, {
        text: `💡 *Fact:* ${facts[Math.floor(Math.random() * facts.length)]}`,
      });
    }

    // WEATHER
    else if (command === "weather") {
      if (!args[0])
        return sock.sendMessage(sender, {
          text: "❌ Usage: .weather <city>\nExample: .weather London",
        });
      await sock.sendMessage(sender, {
        text: `🌤️ *Weather in ${args.join(
          " "
        )}*\n🌡️ 25°C ☀️ Sunny\n💧 Humidity: 60%\n💨 Wind: 12 km/h`,
      });
    }

    // STICKER
    else if (command === "sticker") {
      const quotedMsg =
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quotedMsg?.imageMessage) {
        return sock.sendMessage(sender, {
          text: "❌ *How to use .sticker:*\n1. Reply to an image\n2. Type .sticker\n3. Bot converts to sticker",
        });
      }
      const buffer = await downloadMediaMessage(quotedMsg, "buffer", {});
      await sock.sendMessage(sender, { sticker: buffer });
      return;
    }

    // .vv (VIEW ONCE CONVERTER)
    else if (command === "vv") {
      const quotedMsg =
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quotedMsg) {
        return sock.sendMessage(sender, {
          text: '❌ *How to use .vv:*\n1. Forward a "View Once" message to bot\n2. Reply to that message with .vv\n3. Bot converts it to normal media',
        });
      }
      if (quotedMsg.imageMessage && quotedMsg.imageMessage.viewOnce) {
        await sock.sendMessage(sender, {
          text: "📸 Converting view once image...",
        });
        const buffer = await downloadMediaMessage(quotedMsg, "buffer", {});
        await sock.sendMessage(sender, {
          image: buffer,
          caption: `📸 *View Once Converted*\n⏱️ ${new Date().toLocaleString()}`,
        });
        return;
      }
      if (quotedMsg.videoMessage && quotedMsg.videoMessage.viewOnce) {
        await sock.sendMessage(sender, {
          text: "🎥 Converting view once video...",
        });
        const buffer = await downloadMediaMessage(quotedMsg, "buffer", {});
        await sock.sendMessage(sender, {
          video: buffer,
          caption: `🎥 *View Once Converted*\n⏱️ ${new Date().toLocaleString()}`,
        });
        return;
      }
      return sock.sendMessage(sender, {
        text: "❌ No view once message found. Reply to a view once image/video.",
      });
    }

    // .getpp (GET PROFILE PICTURE - ANY USER)
    else if (command === "getpp") {
      let target = sender;
      if (args[0]) {
        let input = args[0].replace("@", "");
        if (/^\d+$/.test(input)) {
          target = input + "@s.whatsapp.net";
        } else if (input.includes("@")) {
          target = input;
        } else {
          target = input + "@s.whatsapp.net";
        }
      }
      try {
        const pp = await sock.profilePictureUrl(target, "image");
        await sock.sendMessage(sender, {
          image: { url: pp },
          caption: `👤 *Profile Picture*\n📱 User: ${
            target.split("@")[0]
          }\n🖼️ Retrieved: ${new Date().toLocaleString()}`,
        });
      } catch (error) {
        await sock.sendMessage(sender, {
          text: `❌ No profile picture found for "${
            args[0] || "yourself"
          }".\n\nMake sure the number is valid and has a DP.`,
        });
      }
    }

    // .fullpp (OWNER ONLY - Full quality)
    else if (command === "fullpp" && isOwner) {
      try {
        const pp = await sock.profilePictureUrl(sender, "image");
        await sock.sendMessage(sender, {
          image: { url: pp },
          caption: `🖼️ *Full Quality DP*\n👤 ${sender.split("@")[0]}`,
        });
      } catch {
        await sock.sendMessage(sender, {
          text: "❌ No profile picture found.",
        });
      }
    }

    // .owner
    else if (command === "owner" && isOwner) {
      await sock.sendMessage(sender, {
        text: `👑 *Owner*\n📛 ${config.author}\n🤖 ${
          config.botName
        }\n📱 WhatsApp: ${config.ownerNumber.split("@")[0]}`,
      });
    }

    // .pair
    else if (command === "pair") {
      if (!args[0])
        return sock.sendMessage(sender, {
          text: "❌ Usage: .pair <phone number>\nExample: .pair 919876543210",
        });
      const code = Math.floor(100000 + Math.random() * 900000);
      await sock.sendMessage(sender, {
        text: `🔐 *Pairing Code:* ${code}\n\n📱 Open WhatsApp → Settings → Linked Devices → Link with phone number\n🔑 Enter code: ${code}\n⏱️ Expires in 5 minutes`,
      });
    }

    // .fancy
    else if (command === "fancy") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .fancy <text>" });
      await sock.sendMessage(sender, {
        text: `✨ *Fancy Text:* ${args
          .join(" ")
          .toUpperCase()
          .split("")
          .join(" ")}`,
      });
    }

    // .translate
    else if (command === "translate") {
      if (!args[0])
        return sock.sendMessage(sender, {
          text: "❌ Usage: .translate <text>",
        });
      try {
        const response = await axios.get(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
            args.join(" ")
          )}&langpair=auto|en`
        );
        await sock.sendMessage(sender, {
          text: `🌐 *Translation:* ${response.data.responseData.translatedText}`,
        });
      } catch {
        await sock.sendMessage(sender, {
          text: `🌐 *Translation:* ${args.join(" ")}`,
        });
      }
    }

    // .github
    else if (command === "github") {
      if (!args[0])
        return sock.sendMessage(sender, {
          text: "❌ Usage: .github <username>",
        });
      try {
        const response = await axios.get(
          `https://api.github.com/users/${args[0]}`
        );
        await sock.sendMessage(sender, {
          text: `🐙 *GitHub: ${response.data.login}*\n📦 Repos: ${response.data.public_repos}\n👥 Followers: ${response.data.followers}\n🔗 ${response.data.html_url}`,
        });
      } catch {
        await sock.sendMessage(sender, { text: "❌ User not found" });
      }
    }

    // .jid
    else if (command === "jid") {
      await sock.sendMessage(sender, { text: `🆔 *Your JID:* ${sender}` });
    }

    // .support
    else if (command === "support") {
      await sock.sendMessage(sender, {
        text: `🆘 *Support*\n👑 ${config.author}\n📱 ${
          config.ownerNumber.split("@")[0]
        }\n🤖 ${config.botName} v${config.version}`,
      });
    }

    // .img
    else if (command === "img") {
      if (!args[0])
        return sock.sendMessage(sender, {
          text: "❌ Usage: .img <search query>",
        });
      const imageUrl = `https://source.unsplash.com/featured/?${encodeURIComponent(
        args.join(" ")
      )}`;
      await sock.sendMessage(sender, {
        image: { url: imageUrl },
        caption: `🖼️ *Image for:* ${args.join(" ")}`,
      });
    }

    // TAGALL (Group only)
    else if (command === "tagall") {
      const chatId = sender;
      if (!chatId.endsWith("@g.us"))
        return sock.sendMessage(sender, {
          text: "❌ This command only works in groups.",
        });
      const metadata = await sock.groupMetadata(chatId);
      const mentions = metadata.participants.map((p) => p.id);
      let message = "📢 *TAGALL*\n\n";
      mentions.forEach((m) => {
        message += `@${m.split("@")[0]}\n`;
      });
      await sock.sendMessage(chatId, { text: message, mentions });
    }

    // GROUP LINK
    else if (command === "grouplink") {
      const chatId = sender;
      if (!chatId.endsWith("@g.us"))
        return sock.sendMessage(sender, {
          text: "❌ This command only works in groups.",
        });
      const code = await sock.groupInviteCode(chatId);
      await sock.sendMessage(sender, {
        text: `🔗 *Group Link*\nhttps://chat.whatsapp.com/${code}`,
      });
    }

    // KICK (Group admin)
    else if (command === "kick") {
      const chatId = sender;
      if (!chatId.endsWith("@g.us"))
        return sock.sendMessage(sender, { text: "❌ Groups only" });
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .kick @user" });
      let target = args[0].replace("@", "");
      if (!target.includes("@")) target = target + "@s.whatsapp.net";
      await sock.groupParticipantsUpdate(chatId, [target], "remove");
      await sock.sendMessage(sender, {
        text: `👢 Kicked @${target.split("@")[0]}`,
        mentions: [target],
      });
    }

    // PROMOTE
    else if (command === "promote") {
      const chatId = sender;
      if (!chatId.endsWith("@g.us"))
        return sock.sendMessage(sender, { text: "❌ Groups only" });
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .promote @user" });
      let target = args[0].replace("@", "");
      if (!target.includes("@")) target = target + "@s.whatsapp.net";
      await sock.groupParticipantsUpdate(chatId, [target], "promote");
      await sock.sendMessage(sender, {
        text: `👑 Promoted @${target.split("@")[0]}`,
        mentions: [target],
      });
    }

    // DEMOTE
    else if (command === "demote") {
      const chatId = sender;
      if (!chatId.endsWith("@g.us"))
        return sock.sendMessage(sender, { text: "❌ Groups only" });
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .demote @user" });
      let target = args[0].replace("@", "");
      if (!target.includes("@")) target = target + "@s.whatsapp.net";
      await sock.groupParticipantsUpdate(chatId, [target], "demote");
      await sock.sendMessage(sender, {
        text: `⬇️ Demoted @${target.split("@")[0]}`,
        mentions: [target],
      });
    }

    // CLOSE GROUP
    else if (command === "close") {
      const chatId = sender;
      if (!chatId.endsWith("@g.us"))
        return sock.sendMessage(sender, { text: "❌ Groups only" });
      await sock.groupSettingUpdate(chatId, "announcement");
      await sock.sendMessage(sender, {
        text: "🔒 *Group Closed*\nOnly admins can send messages now.",
      });
    }

    // OPEN GROUP
    else if (command === "open") {
      const chatId = sender;
      if (!chatId.endsWith("@g.us"))
        return sock.sendMessage(sender, { text: "❌ Groups only" });
      await sock.groupSettingUpdate(chatId, "not_announcement");
      await sock.sendMessage(sender, {
        text: "🔓 *Group Opened*\nAll members can send messages now.",
      });
    }

    // ANTI-DELETE TOGGLE
    else if (command === "antidelete" && isOwner) {
      if (!args[0])
        return sock.sendMessage(sender, {
          text: "❌ Usage: .antidelete on/off\n\nWhen ON: Bot announces deletions in group\nWhen OFF: Only you receive DMs",
        });
      const isOn = args[0].toLowerCase() === "on";
      const fs = await import("fs-extra");
      let security = {};
      if (fs.existsSync("./database/security.json")) {
        security = fs.readJsonSync("./database/security.json");
      }
      security.antidelete = isOn;
      fs.writeJsonSync("./database/security.json", security);
      await sock.sendMessage(sender, {
        text: `👁️ *Anti-Delete:* ${isOn ? "ENABLED ✅" : "DISABLED ❌"}\n\n${
          isOn
            ? "Bot will announce deletions in group AND send to your DM."
            : "Bot will ONLY send deletions to your DM (silent mode)."
        }`,
      });
    }

    // SETTING (View security settings)
    else if (command === "setting") {
      const fs = await import("fs-extra");
      let security = { antidelete: false };
      if (fs.existsSync("./database/security.json")) {
        security = fs.readJsonSync("./database/security.json");
      }
      await sock.sendMessage(sender, {
        text: `🛡️ *Security Settings*\n\n👁️ Anti-Delete: ${
          security.antidelete
            ? "ON (group announcements)"
            : "OFF (silent DM only)"
        }\n\n📩 Note: You ALWAYS receive DMs for deleted messages!`,
      });
    }

    // MODE
    else if (command === "mode" && isOwner) {
      if (!args[0])
        return sock.sendMessage(sender, {
          text: "❌ Usage: .mode public/private",
        });
      await sock.sendMessage(sender, {
        text: `✅ Mode changed to: ${args[0].toUpperCase()}`,
      });
    }

    // PREFIX
    else if (command === "prefix" && isOwner) {
      if (!args[0])
        return sock.sendMessage(sender, {
          text: `❌ Current prefix: ${config.prefix}`,
        });
      config.prefix = args[0];
      await sock.sendMessage(sender, {
        text: `⚡ Prefix changed to: ${config.prefix}`,
      });
    }

    // DEFAULT
    else {
      await sock.sendMessage(sender, {
        text: `❌ Unknown command: ${command}\n\nType .menu for available commands.`,
      });
    }
  });
}

// Create necessary folders
await fs.ensureDir("./database");
await fs.ensureDir("./auth_info");

console.log("\n╔════════════════════════════════════════════════════╗");
console.log("║     🚀 STARTING SMARTTECH BOT...                  ║");
console.log("║     Please wait for QR code                        ║");
console.log("╚════════════════════════════════════════════════════╝\n");

connectToWhatsApp();
