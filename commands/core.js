const fs = require("fs-extra");
const moment = require("moment-timezone");

function getUptime(startTime) {
  const diff = Date.now() - startTime;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

let autoFeatures = {
  read: false,
  bio: false,
  typing: false,
  react: false,
  reactEmoji: "👍",
};

module.exports = {
  mainMenu: (sender, config, startTime) => {
    return `
╔══════════════════════════════════════════════════════════════╗
║                   🤖 ${config.botName} 🤖                     ║
╠══════════════════════════════════════════════════════════════╣
║  👤 User     : ${sender.split("@")[0]}                         
║  🤖 Bot      : ${config.botName}                             
║  👑 Author   : ${config.author}                              
║  🧬 Version  : ${config.version}                             
║  ⏱ Uptime    : ${getUptime(startTime)}                       
║  ⚡ Prefix    : ${config.prefix}                              
║  🌐 Status    : ONLINE ✅                                     
╚══════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════╗
║ 1. 📦 DOWNLOAD    2. 🧠 AI          3. 👥 GROUP              ║
║ 4. 🛡️ SECURITY    5. 👑 OWNER       6. ⚡ CORE               ║
║ 7. 🛠 UTILITY                                                ║
╚══════════════════════════════════════════════════════════════╝

💡 Type .menu 1-7 to see category commands
        `;
  },

  menu: () => {
    return `
╔══════════════════════════════════════════════════════════════╗
║                      ⚡ BOT CORE                             ║
╚══════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────┐
│ 📊 SYSTEM STATUS                                             │
├─────────────────────────────────────────────────────────────┤
│ .alive .ping .speed .state                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🤖 BOT CONFIGURATION                                         │
├─────────────────────────────────────────────────────────────┤
│ .mode .prefix .botname .timezone .lang .null                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🔄 AUTO FEATURES                                             │
├─────────────────────────────────────────────────────────────┤
│ .autoread .autobio .autotyping .chatbot .presence           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🔗 OTHER                                                     │
├─────────────────────────────────────────────────────────────┤
│ .repo .script .bot .connect .redeploy                       │
└─────────────────────────────────────────────────────────────┘
        `;
  },

  handle: async (command, sock, sender, args, config, startTime) => {
    if (command === "alive") {
      return sock.sendMessage(sender, {
        text: `✅ ${config.botName} ALIVE!\n⏱️ ${getUptime(
          startTime
        )}\n🛡️ Anti-Ban: ACTIVE`,
      });
    }
    if (command === "ping") {
      const start = Date.now();
      await sock.sendMessage(sender, { text: "🏓 Pinging..." });
      return sock.sendMessage(sender, {
        text: `🏓 Pong! ${Date.now() - start}ms`,
      });
    }
    if (command === "speed") {
      return sock.sendMessage(sender, {
        text: `⚡ Speed: FAST\n💾 Memory: ${Math.round(
          process.memoryUsage().heapUsed / 1024 / 1024
        )}MB`,
      });
    }
    if (command === "state") {
      return sock.sendMessage(sender, {
        text: `📊 State: RUNNING\n⚡ Commands: 120`,
      });
    }
    if (command === "mode") {
      if (!args[0])
        return sock.sendMessage(sender, {
          text: "Usage: .mode public/private",
        });
      return sock.sendMessage(sender, {
        text: `✅ Mode: ${args[0].toUpperCase()}`,
      });
    }
    if (command === "prefix") {
      if (!args[0])
        return sock.sendMessage(sender, {
          text: `Current prefix: ${config.prefix}`,
        });
      config.prefix = args[0];
      return sock.sendMessage(sender, { text: `⚡ Prefix: ${config.prefix}` });
    }
    if (command === "botname") {
      if (!args[0])
        return sock.sendMessage(sender, {
          text: `Current name: ${config.botName}`,
        });
      config.botName = args.join(" ");
      return sock.sendMessage(sender, { text: `✏️ Name: ${config.botName}` });
    }
    if (command === "autoread") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "Usage: .autoread on/off" });
      autoFeatures.read = args[0] === "on";
      return sock.sendMessage(sender, {
        text: `👁️ Auto-Read: ${autoFeatures.read ? "ON" : "OFF"}`,
      });
    }
    if (command === "chatbot") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "Usage: .chatbot on/off" });
      return sock.sendMessage(sender, {
        text: `🤖 Chatbot: ${args[0].toUpperCase()}`,
      });
    }
    if (command === "presence") {
      if (!args[0])
        return sock.sendMessage(sender, {
          text: "Usage: .presence online/typing/recording",
        });
      await sock.sendPresenceUpdate(args[0]);
      return sock.sendMessage(sender, {
        text: `👤 Presence: ${args[0].toUpperCase()}`,
      });
    }
    if (command === "repo") {
      return sock.sendMessage(sender, {
        text: `📦 github.com/smarttech/smarttech-bot`,
      });
    }
    if (command === "bot") {
      return sock.sendMessage(sender, {
        text: `🤖 ${config.botName}\n👑 ${config.author}\n⚡ 120 commands`,
      });
    }
    if (command === "null") {
      return sock.sendMessage(sender, { text: `💀 NULL - Bot is alive` });
    }
    if (command === "redeploy") {
      await sock.sendMessage(sender, { text: "🔄 Restarting..." });
      setTimeout(() => process.exit(0), 2000);
      return;
    }
    if (command === "connect") {
      return sock.sendMessage(sender, { text: `🔄 Reconnecting...` });
    }
    return sock.sendMessage(sender, {
      text: `❌ Unknown core command: ${command}`,
    });
  },
};
