const fs = require("fs-extra");
const config = require("../config");

let securitySettings = {
  guard: false,
  antilink: false,
  antidelete: false,
  anticall: false,
  antispam: true,
};

if (fs.existsSync(config.securityPath)) {
  securitySettings = fs.readJsonSync(config.securityPath);
}

function saveSettings() {
  fs.writeJsonSync(config.securityPath, securitySettings);
}

module.exports = {
  menu: () => {
    return `
╔══════════════════════════════════════════════════════════════╗
║                      🛡️ SECURITY                             ║
╚══════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────┐
│ 🛡️ PROTECTION SYSTEMS                                       │
├─────────────────────────────────────────────────────────────┤
│ .guard <on/off>             - Toggle security guard         │
│ .antilink <on/off>          - Block links in group          │
│ .antidelete <on/off>        - Detect deleted messages       │
│ .anticall <on/off>          - Block incoming calls          │
│ .setting                    - Show all security settings    │
└─────────────────────────────────────────────────────────────┘

📩 NOTE: Anti-Delete ALWAYS sends deleted messages to owner's DM!
        `;
  },

  handle: async (command, sock, sender, args) => {
    if (command === "setting") {
      const status = (val) => (val ? "🟢 ON" : "🔴 OFF");
      return sock.sendMessage(sender, {
        text: `
╔══════════════════════════════════════════════════════════════╗
║                    🛡️ SECURITY SETTINGS                      ║
╠══════════════════════════════════════════════════════════════╣
║  🛡️ Guard        : ${status(
          securitySettings.guard
        )}                                      
║  🔗 Anti-Link    : ${status(
          securitySettings.antilink
        )}                                      
║  👁️ Anti-Delete  : ${status(
          securitySettings.antidelete
        )}                                      
║  📞 Anti-Call    : ${status(
          securitySettings.anticall
        )}                                      
║  🚫 Anti-Spam    : ${status(
          securitySettings.antispam
        )}                                      
╚══════════════════════════════════════════════════════════════╝

📩 Anti-Delete: Owner DM is ALWAYS enabled!
            `,
      });
    }

    if (!args[0]) {
      return sock.sendMessage(sender, { text: `❌ Usage: .${command} on/off` });
    }

    const isOn = args[0].toLowerCase() === "on";
    securitySettings[command] = isOn;
    saveSettings();

    const messages = {
      guard: `🛡️ Guard: ${isOn ? "ON ✅" : "OFF ❌"}`,
      antilink: `🔗 Anti-Link: ${isOn ? "ON ✅" : "OFF ❌"}`,
      antidelete: `👁️ Anti-Delete: ${
        isOn ? "ON ✅" : "OFF ❌"
      }\n📩 Owner DM: ALWAYS ACTIVE`,
      anticall: `📞 Anti-Call: ${isOn ? "ON ✅" : "OFF ❌"}`,
    };

    await sock.sendMessage(sender, {
      text: messages[command] || `✅ ${command}: ${args[0].toUpperCase()}`,
    });
  },

  getSettings: () => securitySettings,
};
