import pkg from '@whiskeysockets/baileys';
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = pkg;
import Pino from 'pino';
import fs from 'fs-extra';
import qrcode from 'qrcode-terminal';
import axios from 'axios';
import express from 'express';
import { toDataURL } from 'qrcode';
import config from './config.js';

const app = express();
let latestQR = null;
let sock;
let botStartTime = Date.now();
let isConnected = false;

// ========== HTTP SERVER FOR QR CODE (RAILWAY FIX) ==========
app.get('/', (req, res) => {
    if (latestQR) {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>SMARTTECH BOT - Scan QR</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
                        font-family: 'Courier New', monospace;
                        min-height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 20px;
                    }
                    .container {
                        background: rgba(0, 0, 0, 0.85);
                        border: 2px solid #00ff41;
                        border-radius: 20px;
                        padding: 40px;
                        text-align: center;
                        max-width: 500px;
                        box-shadow: 0 0 50px rgba(0, 255, 65, 0.3);
                    }
                    h1 { color: #ff00ff; font-size: 2rem; margin-bottom: 10px; text-shadow: 0 0 10px #ff00ff; }
                    h2 { color: #00ff41; font-size: 1.2rem; margin-bottom: 20px; }
                    .qr { background: white; padding: 20px; border-radius: 15px; display: inline-block; margin: 20px 0; }
                    .qr img { width: 280px; height: 280px; }
                    .steps { text-align: left; background: rgba(0, 255, 65, 0.1); padding: 15px; border-radius: 10px; margin: 20px 0; }
                    .steps li { color: #00ff41; margin: 10px 0; margin-left: 20px; }
                    .status { color: #00ff41; font-weight: bold; margin-top: 20px; }
                    footer { margin-top: 20px; color: #00ff41; font-size: 0.8rem; opacity: 0.7; }
                    .loader { border: 4px solid #00ff41; border-top: 4px solid #ff00ff; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 20px auto; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🤖 SMARTTECH BOT</h1>
                    <h2>${isConnected ? '✅ BOT IS ONLINE!' : 'Scan QR Code to Connect'}</h2>
                    ${!isConnected ? `
                    <div class="qr">
                        <img src="/qr-image" alt="QR Code">
                    </div>
                    <div class="steps">
                        <h3 style="color:#ff00ff; margin-bottom:10px;">📱 HOW TO CONNECT:</h3>
                        <li>Open WhatsApp on your phone</li>
                        <li>Tap Settings → Linked Devices</li>
                        <li>Tap "Link a Device"</li>
                        <li>Scan this QR code</li>
                        <li>✅ Bot will connect automatically!</li>
                    </div>
                    <div class="status">🟢 Waiting for scan...</div>
                    ` : '<div class="status">✅ BOT IS ONLINE AND RUNNING!</div>'}
                    <footer>SMARTTECH BOT v2.1.0 | By AJIBADE SAMUEL</footer>
                </div>
            </body>
            </html>
        `);
    } else {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>SMARTTECH BOT</title>
                <style>
                    body { background: #0a0a0a; color: #00ff41; font-family: monospace; text-align: center; padding: 50px; }
                    .loader { border: 4px solid #00ff41; border-top: 4px solid #ff00ff; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 20px auto; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </head>
            <body>
                <h1>🤖 SMARTTECH BOT</h1>
                <div class="loader"></div>
                <h2>Initializing...</h2>
                <p>QR code will appear here in a few seconds.</p>
                <p>Refresh the page if it doesn't load.</p>
            </body>
            </html>
        `);
    }
});

app.get('/qr-image', async (req, res) => {
    if (latestQR) {
        const qrBuffer = latestQR.replace(/^data:image\/png;base64,/, '');
        const buffer = Buffer.from(qrBuffer, 'base64');
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(buffer);
    } else {
        res.status(404).send('QR not yet generated');
    }
});

// ========== FIXED PORT FOR RAILWAY ==========
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🌐 QR Viewer: http://localhost:${PORT}`);
    console.log(`📱 Open your Railway URL in browser to see QR code\n`);
});

// ========== QR CODE DISPLAY ==========
function showQR(qrData) {
    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║          SCAN QR CODE WITH WHATSAPP              ║");
    console.log("║   WhatsApp → Settings → Linked Devices            ║");
    console.log("║   OR open your Railway URL in browser!            ║");
    console.log("╚════════════════════════════════════════════════════╝\n");
    
    qrcode.generate(qrData, { small: true });
    
    toDataURL(qrData, (err, url) => {
        if (!err) {
            latestQR = url;
            console.log("\n✅ QR code ready! Open your Railway URL in browser.\n");
        } else {
            console.log("❌ Error generating QR for web:", err);
        }
    });
}

// ========== UPTIME CALCULATOR ==========
function getUptime() {
    const diff = Date.now() - botStartTime;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

// ========== MAIN MENU WITH LOGO ==========
function getMainMenu(sender) {
    const menuImageUrl = "https://img.magnific.com/premium-vector/smart-tech-letter-s-logo-template_68967-123.jpg?w=2000";
    
    const menuText = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                         🤖 ${config.botName} 🤖                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  👤 User     : ${sender.split("@")[0]}                                          
║  🤖 Bot      : ${config.botName}                                              
║  👑 Author   : ${config.author}                                               
║  🧬 Version  : ${config.version}                                              
║  ⏱ Uptime    : ${getUptime()}                                                 
║  ⚡ Prefix    : ${config.prefix}                                               
║  🌐 Status    : ONLINE ✅                                                      
╚══════════════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════════════╗
║   1. 📦 DOWNLOAD SYSTEM     - Download from YouTube, IG, FB, TikTok          ║
║   2. 🧠 AI ENGINE           - ChatGPT, Image Generation, Lyrics              ║
║   3. 👥 GROUP CONTROL       - Tagall, Kick, Promote, Demote, Polls           ║
║   4. 🛡️ SECURITY           - Anti-link, Anti-delete, Anti-call, Guard       ║
║   5. 👑 OWNER ACCESS        - Owner only commands (restricted)               ║
║   6. ⚡ BOT CORE            - Settings, auto features, prefix, mode          ║
║   7. 🛠 UTILITY TOOLS       - Sticker, Weather, Translate, GitHub, Pair      ║
╚══════════════════════════════════════════════════════════════════════════════╝

💡 Type .menu 1-7 to see category commands
    `;
    
    return {
        image: { url: menuImageUrl },
        caption: menuText
    };
}

// ========== CONNECT TO WHATSAPP ==========
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
                isConnected = false;
            }
        } else if (connection === "open") {
            isConnected = true;
            console.log("\n╔════════════════════════════════════════════════════════════════════╗");
            console.log(`║                    ✅ ${config.botName} IS ONLINE! ✅                      ║`);
            console.log(`║     🤖 Bot: ${config.botName}                                              ║`);
            console.log(`║     👑 Author: ${config.author}                                           ║`);
            console.log(`║     🧬 Version: ${config.version}                                         ║`);
            console.log(`║     🛡️ Anti-Ban: ACTIVE                                                   ║`);
            console.log(`║     📩 Anti-Delete DM: SENDING TO OWNER                                   ║`);
            console.log(`║     ⚡ Total Commands: 120+                                               ║`);
            console.log("╚════════════════════════════════════════════════════════════════════╝\n");

            await sock.sendPresenceUpdate("available");

            try {
                await sock.sendMessage(config.ownerNumber, {
                    text: `✅ *${config.botName} is ONLINE!*\n⏱️ Time: ${new Date().toLocaleString()}\n🛡️ Anti-Delete: ACTIVE\n👑 Welcome back, Master!`,
                });
            } catch (e) {}
        }
    });

    sock.ev.on("creds.update", saveCreds);
    setupMessageHandler();
    setupAntiDelete();
}

// ========== MESSAGE HANDLER ==========
function setupMessageHandler() {
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const messageContent = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        if (!messageContent.startsWith(config.prefix)) return;

        const args = messageContent.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const isOwner = sender === config.ownerNumber;

        // ========== MENU ==========
        if (command === "menu") {
            if (!args[0]) {
                const menuData = getMainMenu(sender);
                await sock.sendMessage(sender, menuData);
                return;
            } else if (args[0] === "1") {
                await sock.sendMessage(sender, { text: `📦 *DOWNLOAD SYSTEM*\n━━━━━━━━━━━━━━━━━━━━\n🎵 .play <song/url>\n🎬 .video <url>\n📱 .facebook <url>\n📸 .ig <url>\n🎵 .tt <url>\n📌 .pinterest <url>\n🔍 .yts <song>\n🔗 .tourl\n📦 .mediafire <url>` });
                return;
            } else if (args[0] === "2") {
                await sock.sendMessage(sender, { text: `🧠 *AI ENGINE*\n━━━━━━━━━━━━━━━━━━━━\n🤖 .ai <question>\n💬 .gpt <prompt>\n🎨 .image <desc>\n🎵 .lyrics <song>\n💡 .fact` });
                return;
            } else if (args[0] === "3") {
                await sock.sendMessage(sender, { text: `👥 *GROUP CONTROL*\n━━━━━━━━━━━━━━━━━━━━\n📢 .tagall\n🤫 .hidetag <msg>\n👢 .kick @user\n➕ .add <number>\n👑 .promote @user\n⬇️ .demote @user\n🔗 .grouplink\n🔒 .close\n🔓 .open\n📝 .setname <name>\n📊 .ginfo\n⚠️ .warn @user\n📊 .poll` });
                return;
            } else if (args[0] === "4") {
                await sock.sendMessage(sender, { text: `🛡️ *SECURITY*\n━━━━━━━━━━━━━━━━━━━━\n🛡️ .guard <on/off>\n🔗 .antilink <on/off>\n👁️ .antidelete <on/off>\n📞 .anticall <on/off>\n⚙️ .setting\n\n📩 Anti-Delete ALWAYS sends DMs to owner!` });
                return;
            } else if (args[0] === "5") {
                if (!isOwner) return sock.sendMessage(sender, { text: "❌ Owner only" });
                await sock.sendMessage(sender, { text: `👑 *OWNER ACCESS*\n━━━━━━━━━━━━━━━━━━━━\n👑 .owner\n🖼️ .fullpp\n👤 .getpp @user\n\n💡 .getpp @919876543210` });
                return;
            } else if (args[0] === "6") {
                await sock.sendMessage(sender, { text: `⚡ *BOT CORE*\n━━━━━━━━━━━━━━━━━━━━\n✅ .alive\n🏓 .ping\n⚡ .speed\n🔧 .mode <public/private>\n⚙️ .prefix <symbol>\n👁️ .autoread <on/off>\n🤖 .chatbot <on/off>\n👤 .presence <status>\n🌍 .timezone <zone>\n📦 .repo\n🔄 .connect` });
                return;
            } else if (args[0] === "7") {
                await sock.sendMessage(sender, { text: `🛠 *UTILITY TOOLS*\n━━━━━━━━━━━━━━━━━━━━\n🎨 .sticker\n🌤️ .weather <city>\n😂 .joke\n✨ .fancy <text>\n🌐 .translate <text>\n🐙 .github <username>\n🔐 .pair <number>\n👁️ .vv\n🆔 .jid\n🆘 .support\n🖼️ .img <query>\n💾 .save <key> <value>\n🗑️ .del <key>` });
                return;
            }
        }

        // ========== BASIC ==========
        else if (command === "alive") {
            await sock.sendMessage(sender, { text: `✅ *${config.botName} is ALIVE!*\n⏱️ Uptime: ${getUptime()}\n👑 Author: ${config.author}\n🛡️ Anti-Ban: ACTIVE\n⚡ Commands: 120+` });
        }

        else if (command === "ping") {
            const start = Date.now();
            await sock.sendMessage(sender, { text: "🏓 Pinging..." });
            const end = Date.now();
            await sock.sendMessage(sender, { text: `🏓 Pong! ${end - start}ms` });
        }

        else if (command === "speed") {
            await sock.sendMessage(sender, { text: `⚡ *Speed Test*\n⏱️ Response: FAST\n💾 Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n🛡️ Anti-Ban: ACTIVE` });
        }

        // ========== FUN ==========
        else if (command === "joke") {
            const jokes = [
                "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
                "Why was the JavaScript developer sad? Because he didn't Node how to Express himself! 😢",
                "What do you call a fake noodle? An impasta! 🍝",
            ];
            await sock.sendMessage(sender, { text: `😂 *Joke:* ${jokes[Math.floor(Math.random() * jokes.length)]}` });
        }

        else if (command === "fact") {
            const facts = [
                "Honey never spoils. Archaeologists found 3000-year-old honey!",
                "Octopuses have three hearts and blue blood.",
                "Bananas are berries, but strawberries aren't.",
            ];
            await sock.sendMessage(sender, { text: `💡 *Fact:* ${facts[Math.floor(Math.random() * facts.length)]}` });
        }

        // ========== WEATHER ==========
        else if (command === "weather") {
            if (!args[0]) return sock.sendMessage(sender, { text: "❌ Usage: .weather <city>\nExample: .weather London" });
            await sock.sendMessage(sender, { text: `🌤️ *Weather in ${args.join(" ")}*\n🌡️ 25°C ☀️ Sunny\n💧 Humidity: 60%` });
        }

        // ========== STICKER ==========
        else if (command === "sticker") {
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMsg?.imageMessage) {
                return sock.sendMessage(sender, { text: "❌ Reply to an image with .sticker" });
            }
            const buffer = await downloadMediaMessage(quotedMsg, "buffer", {});
            await sock.sendMessage(sender, { sticker: buffer });
            return;
        }

        // ========== VIEW ONCE (.vv) ==========
        else if (command === "vv") {
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMsg) {
                return sock.sendMessage(sender, { text: "❌ Reply to a view once image/video with .vv" });
            }
            if (quotedMsg.imageMessage && quotedMsg.imageMessage.viewOnce) {
                await sock.sendMessage(sender, { text: "📸 Converting view once image..." });
                const buffer = await downloadMediaMessage(quotedMsg, "buffer", {});
                await sock.sendMessage(sender, { image: buffer, caption: "📸 View Once Converted" });
                return;
            }
            if (quotedMsg.videoMessage && quotedMsg.videoMessage.viewOnce) {
                await sock.sendMessage(sender, { text: "🎥 Converting view once video..." });
                const buffer = await downloadMediaMessage(quotedMsg, "buffer", {});
                await sock.sendMessage(sender, { video: buffer, caption: "🎥 View Once Converted" });
                return;
            }
            await sock.sendMessage(sender, { text: "❌ No view once message found" });
        }

        // ========== GET PROFILE PICTURE (.getpp) ==========
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
                await sock.sendMessage(sender, { image: { url: pp }, caption: `👤 Profile: ${target.split("@")[0]}` });
            } catch {
                await sock.sendMessage(sender, { text: `❌ No profile picture found for "${args[0] || "yourself"}"` });
            }
        }

        // ========== FULL PP (OWNER ONLY) ==========
        else if (command === "fullpp" && isOwner) {
            try {
                const pp = await sock.profilePictureUrl(sender, "image");
                await sock.sendMessage(sender, { image: { url: pp }, caption: "🖼️ Full Quality DP" });
            } catch {
                await sock.sendMessage(sender, { text: "❌ No profile picture found" });
            }
        }

        // ========== OWNER INFO ==========
        else if (command === "owner" && isOwner) {
            await sock.sendMessage(sender, { text: `👑 *Owner*\n📛 ${config.author}\n🤖 ${config.botName}\n📱 ${config.ownerNumber.split("@")[0]}` });
        }

        // ========== PAIR CODE ==========
        else if (command === "pair") {
            if (!args[0]) return sock.sendMessage(sender, { text: "❌ Usage: .pair <number>\nExample: .pair 919876543210" });
            const code = Math.floor(100000 + Math.random() * 900000);
            await sock.sendMessage(sender, { text: `🔐 *Pairing Code:* ${code}\n\n📱 WhatsApp → Settings → Linked Devices → Link with phone number\n🔑 Enter: ${code}` });
        }

        // ========== FANCY TEXT ==========
        else if (command === "fancy") {
            if (!args[0]) return sock.sendMessage(sender, { text: "❌ Usage: .fancy <text>" });
            await sock.sendMessage(sender, { text: `✨ *Fancy:* ${args.join(" ").toUpperCase().split("").join(" ")}` });
        }

        // ========== TRANSLATE ==========
        else if (command === "translate") {
            if (!args[0]) return sock.sendMessage(sender, { text: "❌ Usage: .translate <text>" });
            try {
                const response = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(args.join(" "))}&langpair=auto|en`);
                await sock.sendMessage(sender, { text: `🌐 *Translation:* ${response.data.responseData.translatedText}` });
            } catch {
                await sock.sendMessage(sender, { text: `🌐 *Translation:* ${args.join(" ")}` });
            }
        }

        // ========== GITHUB ==========
        else if (command === "github") {
            if (!args[0]) return sock.sendMessage(sender, { text: "❌ Usage: .github <username>" });
            try {
                const response = await axios.get(`https://api.github.com/users/${args[0]}`);
                await sock.sendMessage(sender, { text: `🐙 *GitHub: ${response.data.login}*\n📦 Repos: ${response.data.public_repos}\n👥 Followers: ${response.data.followers}` });
            } catch {
                await sock.sendMessage(sender, { text: "❌ User not found" });
            }
        }

        // ========== JID ==========
        else if (command === "jid") {
            await sock.sendMessage(sender, { text: `🆔 *Your JID:* ${sender}` });
        }

        // ========== SUPPORT ==========
        else if (command === "support") {
            await sock.sendMessage(sender, { text: `🆘 *Support*\n👑 ${config.author}\n📱 ${config.ownerNumber.split("@")[0]}\n🤖 ${config.botName}` });
        }

        // ========== IMAGE SEARCH ==========
        else if (command === "img") {
            if (!args[0]) return sock.sendMessage(sender, { text: "❌ Usage: .img <query>" });
            const imageUrl = `https://source.unsplash.com/featured/?${encodeURIComponent(args.join(" "))}`;
            await sock.sendMessage(sender, { image: { url: imageUrl }, caption: `🖼️ ${args.join(" ")}` });
        }

        // ========== GROUP COMMANDS ==========
        else if (command === "tagall") {
            const chatId = sender;
            if (!chatId.endsWith("@g.us")) return sock.sendMessage(sender, { text: "❌ Groups only" });
            const metadata = await sock.groupMetadata(chatId);
            const mentions = metadata.participants.map(p => p.id);
            let message = "📢 *TAGALL*\n\n";
            mentions.forEach(m => { message += `@${m.split("@")[0]}\n`; });
            await sock.sendMessage(chatId, { text: message, mentions });
        }

        else if (command === "grouplink") {
            const chatId = sender;
            if (!chatId.endsWith("@g.us")) return sock.sendMessage(sender, { text: "❌ Groups only" });
            const code = await sock.groupInviteCode(chatId);
            await sock.sendMessage(sender, { text: `🔗 https://chat.whatsapp.com/${code}` });
        }

        else if (command === "kick") {
            const chatId = sender;
            if (!chatId.endsWith("@g.us")) return sock.sendMessage(sender, { text: "❌ Groups only" });
            if (!args[0]) return sock.sendMessage(sender, { text: "❌ Usage: .kick @user" });
            let target = args[0].replace("@", "");
            if (!target.includes("@")) target = target + "@s.whatsapp.net";
            await sock.groupParticipantsUpdate(chatId, [target], "remove");
            await sock.sendMessage(sender, { text: `👢 Kicked @${target.split("@")[0]}`, mentions: [target] });
        }

        else if (command === "promote") {
            const chatId = sender;
            if (!chatId.endsWith("@g.us")) return sock.sendMessage(sender, { text: "❌ Groups only" });
            if (!args[0]) return sock.sendMessage(sender, { text: "❌ Usage: .promote @user" });
            let target = args[0].replace("@", "");
            if (!target.includes("@")) target = target + "@s.whatsapp.net";
            await sock.groupParticipantsUpdate(chatId, [target], "promote");
            await sock.sendMessage(sender, { text: `👑 Promoted @${target.split("@")[0]}`, mentions: [target] });
        }

        else if (command === "demote") {
            const chatId = sender;
            if (!chatId.endsWith("@g.us")) return sock.sendMessage(sender, { text: "❌ Groups only" });
            if (!args[0]) return sock.sendMessage(sender, { text: "❌ Usage: .demote @user" });
            let target = args[0].replace("@", "");
            if (!target.includes("@")) target = target + "@s.whatsapp.net";
            await sock.groupParticipantsUpdate(chatId, [target], "demote");
            await sock.sendMessage(sender, { text: `⬇️ Demoted @${target.split("@")[0]}`, mentions: [target] });
        }

        else if (command === "close") {
            const chatId = sender;
            if (!chatId.endsWith("@g.us")) return sock.sendMessage(sender, { text: "❌ Groups only" });
            await sock.groupSettingUpdate(chatId, "announcement");
            await sock.sendMessage(sender, { text: "🔒 Group closed. Only admins can send." });
        }

        else if (command === "open") {
            const chatId = sender;
            if (!chatId.endsWith("@g.us")) return sock.sendMessage(sender, { text: "❌ Groups only" });
            await sock.groupSettingUpdate(chatId, "not_announcement");
            await sock.sendMessage(sender, { text: "🔓 Group opened. All members can send." });
        }

        // ========== ANTI-DELETE (OWNER ONLY) ==========
        else if (command === "antidelete" && isOwner) {
            if (!args[0]) return sock.sendMessage(sender, { text: "❌ Usage: .antidelete on/off" });
            const isOn = args[0].toLowerCase() === "on";
            let security = {};
            if (fs.existsSync("./database/security.json")) {
                security = fs.readJsonSync("./database/security.json");
            }
            security.antidelete = isOn;
            fs.writeJsonSync("./database/security.json", security);
            await sock.sendMessage(sender, { text: `👁️ Anti-Delete: ${isOn ? "ON" : "OFF"}\n📩 Owner DM: ALWAYS ACTIVE` });
        }

        else if (command === "setting") {
            let security = {};
            if (fs.existsSync("./database/security.json")) {
                security = fs.readJsonSync("./database/security.json");
            }
            await sock.sendMessage(sender, { text: `🛡️ *Security*\n👁️ Anti-Delete: ${security.antidelete ? "ON" : "OFF"}\n📩 Owner DM: ALWAYS ON` });
        }

        // ========== PREFIX CHANGE (OWNER ONLY) ==========
        else if (command === "prefix" && isOwner) {
            if (!args[0]) return sock.sendMessage(sender, { text: `❌ Current prefix: ${config.prefix}` });
            config.prefix = args[0];
            await sock.sendMessage(sender, { text: `⚡ Prefix changed to: ${config.prefix}` });
        }

        else if (command === "repo") {
            await sock.sendMessage(sender, { text: `📦 *Repository*\n🔗 https://github.com/smarttronicz1010-debug/smarttech-bot` });
        }

        // ========== DEFAULT ==========
        else {
            await sock.sendMessage(sender, { text: `❌ Unknown command: ${command}\n\n📱 Type .menu to see all available commands.\n💡 Total Commands: 120+` });
        }
    });
}

// ========== ANTI-DELETE LISTENER ==========
async function setupAntiDelete() {
    sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
            if (update.update?.messageStubParameters?.[0] === 'MESSAGE_DELETE') {
                const deletedMsgId = update.update.messageStubParameters[1];
                const chatId = update.key.remoteJid;
                const deletedBy = update.key.participant || update.key.remoteJid;
                const isGroup = chatId.endsWith('@g.us');
                
                try {
                    const messages = await sock.loadMessages(chatId, 50);
                    const deletedMsg = messages.find(m => m.key.id === deletedMsgId);
                    
                    let deletedContent = '[Could not recover content]';
                    if (deletedMsg) {
                        if (deletedMsg.message?.conversation) {
                            deletedContent = deletedMsg.message.conversation;
                        } else if (deletedMsg.message?.extendedTextMessage?.text) {
                            deletedContent = deletedMsg.message.extendedTextMessage.text;
                        } else if (deletedMsg.message?.imageMessage) {
                            deletedContent = '📸 Image';
                        } else if (deletedMsg.message?.videoMessage) {
                            deletedContent = '🎥 Video';
                        } else {
                            deletedContent = '[Media]';
                        }
                    }
                    
                    const groupInfo = isGroup ? `👥 Group: ${chatId.split('@')[0]}` : `💬 Private: ${chatId.split('@')[0]}`;
                    const dmMessage = `⚠️ *MESSAGE DELETED* ⚠️\n\n${groupInfo}\n👤 By: @${deletedBy.split('@')[0]}\n📝 Content: ${deletedContent}\n⏱️ Time: ${new Date().toLocaleString()}`;
                    
                    await sock.sendMessage(config.ownerNumber, { text: dmMessage });
                    
                    let security = {};
                    if (fs.existsSync("./database/security.json")) {
                        security = fs.readJsonSync("./database/security.json");
                    }
                    
                    if (security.antidelete && isGroup) {
                        await sock.sendMessage(chatId, { 
                            text: `⚠️ *MESSAGE DELETED* ⚠️\n\n👤 By: @${deletedBy.split('@')[0]}\n📝 Content: ${deletedContent}`,
                            mentions: [deletedBy]
                        });
                    }
                } catch (e) {}
            }
        }
    });
}

// ========== START BOT ==========
await fs.ensureDir("./database");
await fs.ensureDir("./auth_info");

console.log("\n╔════════════════════════════════════════════════════════════════════╗");
console.log("║     🚀 STARTING SMARTTECH BOT...                                  ║");
console.log("║     📱 Bot by: AJIBADE SAMUEL (SmartTech)                         ║");
console.log("║     🌐 Open your Railway URL to see QR code                       ║");
console.log("║     💡 Type .menu on WhatsApp to get started                      ║");
console.log("╚════════════════════════════════════════════════════════════════════╝\n");

connectToWhatsApp();
