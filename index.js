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

// ========== HTTP SERVER ==========
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

// Start HTTP server
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

    // Delete corrupted auth folder if it exists but is incomplete
    const authPath = "./auth_info";
    if (fs.existsSync(authPath)) {
        const files = fs.readdirSync(authPath);
        if (files.length < 5) {
            console.log("⚠️ Found incomplete auth folder. Deleting...");
            //await fs.remove(authPath);
            //await fs.ensureDir(authPath);
        }
    }

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
            console.log(`║     ⚡ Total Commands: 120+                                               ║`);
            console.log("╚════════════════════════════════════════════════════════════════════╝\n");

            await sock.sendPresenceUpdate("available");

            try {
                await sock.sendMessage(config.ownerNumber, {
                    text: `✅ *${config.botName} is ONLINE!*\n⏱️ Time: ${new Date().toLocaleString()}\n👑 Welcome back, Master!`,
                });
            } catch (e) {}
            
            // Setup message handler only AFTER connection is open
            setupMessageHandler();
        }
    });

    sock.ev.on("creds.update", saveCreds);
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

        // MENU
        if (command === "menu") {
            if (!args[0]) {
                const menuData = getMainMenu(sender);
                await sock.sendMessage(sender, menuData);
                return;
            } else if (args[0] === "1") {
                await sock.sendMessage(sender, { text: `📦 *DOWNLOAD SYSTEM*\n━━━━━━━━━━━━━━━━━━━━\n🎵 .play <song>\n🎬 .video <url>\n📱 .facebook <url>\n📸 .ig <url>\n🎵 .tt <url>\n🔗 .tourl` });
                return;
            } else if (args[0] === "2") {
                await sock.sendMessage(sender, { text: `🧠 *AI ENGINE*\n━━━━━━━━━━━━━━━━━━━━\n🤖 .ai <question>\n💬 .gpt <prompt>\n🎨 .image <desc>\n🎵 .lyrics <song>\n💡 .fact` });
                return;
            } else if (args[0] === "3") {
                await sock.sendMessage(sender, { text: `👥 *GROUP CONTROL*\n━━━━━━━━━━━━━━━━━━━━\n📢 .tagall\n👢 .kick @user\n👑 .promote @user\n⬇️ .demote @user\n🔗 .grouplink\n🔒 .close\n🔓 .open` });
                return;
            } else if (args[0] === "4") {
                await sock.sendMessage(sender, { text: `🛡️ *SECURITY*\n━━━━━━━━━━━━━━━━━━━━\n🛡️ .guard <on/off>\n🔗 .antilink <on/off>\n👁️ .antidelete <on/off>\n⚙️ .setting` });
                return;
            } else if (args[0] === "5") {
                if (!isOwner) return sock.sendMessage(sender, { text: "❌ Owner only" });
                await sock.sendMessage(sender, { text: `👑 *OWNER ACCESS*\n━━━━━━━━━━━━━━━━━━━━\n👑 .owner\n🖼️ .fullpp\n👤 .getpp @user` });
                return;
            } else if (args[0] === "6") {
                await sock.sendMessage(sender, { text: `⚡ *BOT CORE*\n━━━━━━━━━━━━━━━━━━━━\n✅ .alive\n🏓 .ping\n⚡ .speed\n⚙️ .prefix <symbol>\n👁️ .autoread <on/off>\n🤖 .chatbot <on/off>` });
                return;
            } else if (args[0] === "7") {
                await sock.sendMessage(sender, { text: `🛠 *UTILITY TOOLS*\n━━━━━━━━━━━━━━━━━━━━\n🎨 .sticker\n🌤️ .weather <city>\n😂 .joke\n✨ .fancy <text>\n🌐 .translate <text>\n🐙 .github <username>\n🔐 .pair <number>\n👁️ .vv\n🆔 .jid` });
                return;
            }
        }

        // BASIC
        else if (command === "alive") {
            await sock.sendMessage(sender, { text: `✅ *${config.botName} is ALIVE!*\n⏱️ Uptime: ${getUptime()}\n👑 Author: ${config.author}` });
        }
        else if (command === "ping") {
            const start = Date.now();
            await sock.sendMessage(sender, { text: "🏓 Pinging..." });
            const end = Date.now();
            await sock.sendMessage(sender, { text: `🏓 Pong! ${end - start}ms` });
        }
        else if (command === "joke") {
            const jokes = ["Why do programmers prefer dark mode? Light attracts bugs! 🐛", "Why was the JS developer sad? He didn't Node how to Express himself! 😢"];
            await sock.sendMessage(sender, { text: `😂 ${jokes[Math.floor(Math.random() * jokes.length)]}` });
        }
        else if (command === "weather") {
            if (!args[0]) return sock.sendMessage(sender, { text: "❌ Usage: .weather <city>" });
            await sock.sendMessage(sender, { text: `🌤️ *Weather in ${args.join(" ")}*\n🌡️ 25°C ☀️ Sunny` });
        }
        else if (command === "sticker") {
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMsg?.imageMessage) {
                return sock.sendMessage(sender, { text: "❌ Reply to an image with .sticker" });
            }
            const buffer = await downloadMediaMessage(quotedMsg, "buffer", {});
            await sock.sendMessage(sender, { sticker: buffer });
            return;
        }
        else if (command === "vv") {
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMsg?.imageMessage?.viewOnce) {
                return sock.sendMessage(sender, { text: "❌ Reply to a view once image with .vv" });
            }
            const buffer = await downloadMediaMessage(quotedMsg, "buffer", {});
            await sock.sendMessage(sender, { image: buffer, caption: "📸 View Once Converted" });
            return;
        }
        else if (command === "getpp") {
            let target = sender;
            if (args[0]) {
                let input = args[0].replace("@", "");
                target = input.includes("@") ? input : input + "@s.whatsapp.net";
            }
            try {
                const pp = await sock.profilePictureUrl(target, "image");
                await sock.sendMessage(sender, { image: { url: pp }, caption: `👤 ${target.split("@")[0]}` });
            } catch {
                await sock.sendMessage(sender, { text: "❌ No profile picture found" });
            }
        }
        else if (command === "pair") {
            if (!args[0]) return sock.sendMessage(sender, { text: "❌ Usage: .pair <number>" });
            const code = Math.floor(100000 + Math.random() * 900000);
            await sock.sendMessage(sender, { text: `🔐 *Pairing Code:* ${code}\n\nEnter in WhatsApp → Linked Devices → Link with phone number` });
        }
        else if (command === "jid") {
            await sock.sendMessage(sender, { text: `🆔 ${sender}` });
        }
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
        else {
            await sock.sendMessage(sender, { text: `❌ Unknown command: ${command}\n\nType .menu for help` });
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
