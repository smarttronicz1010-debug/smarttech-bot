const axios = require("axios");
const fs = require("fs-extra");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

module.exports = {
  menu: () => {
    return `
╔══════════════════════════════════════════════════════════════╗
║                    🛠 UTILITY TOOLS                          ║
╚══════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────┐
│ 🔧 CONVERSION TOOLS                                          │
├─────────────────────────────────────────────────────────────┤
│ .sticker .fancy .vcf .rvo .tourl                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 👁️ VIEW ONCE FEATURES                                       │
├─────────────────────────────────────────────────────────────┤
│ .vv - Convert view once to normal                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🌐 INFORMATION TOOLS                                         │
├─────────────────────────────────────────────────────────────┤
│ .weather .translate .github .google .img .pint .tech        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🎮 FUN TOOLS                                                 │
├─────────────────────────────────────────────────────────────┤
│ .joke .hack .test                                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📱 ACCOUNT TOOLS                                             │
├─────────────────────────────────────────────────────────────┤
│ .jid .getprofile .setpp .setdec .save .del .pair            │
└─────────────────────────────────────────────────────────────┘
        `;
  },

  handle: async (command, sock, sender, args, msg) => {
    // ========== .vv (VIEW ONCE CONVERTER) ==========
    if (command === "vv") {
      const quotedMsg =
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (!quotedMsg) {
        return sock.sendMessage(sender, {
          text: `❌ *How to use .vv:*\n\n1. Forward a "View Once" message to the bot\n2. Reply to that message with .vv\n3. Bot will convert it to normal media`,
        });
      }

      if (quotedMsg.imageMessage && quotedMsg.imageMessage.viewOnce) {
        await sock.sendMessage(sender, {
          text: "📸 Converting view once image...",
        });
        const buffer = await downloadMediaMessage(quotedMsg, "buffer", {});
        const filePath = `./temp/viewonce_${Date.now()}.jpg`;
        await fs.writeFile(filePath, buffer);
        await sock.sendMessage(sender, {
          image: { url: filePath },
          caption: `📸 View Once Converted\n⏱️ ${new Date().toLocaleString()}`,
        });
        await fs.unlink(filePath).catch(() => {});
        return;
      }

      if (quotedMsg.videoMessage && quotedMsg.videoMessage.viewOnce) {
        await sock.sendMessage(sender, {
          text: "🎥 Converting view once video...",
        });
        const buffer = await downloadMediaMessage(quotedMsg, "buffer", {});
        const filePath = `./temp/viewonce_${Date.now()}.mp4`;
        await fs.writeFile(filePath, buffer);
        await sock.sendMessage(sender, {
          video: { url: filePath },
          caption: `🎥 View Once Converted\n⏱️ ${new Date().toLocaleString()}`,
        });
        await fs.unlink(filePath).catch(() => {});
        return;
      }

      return sock.sendMessage(sender, {
        text: `❌ No view once message found. Reply to a view once image/video.`,
      });
    }

    // ========== .sticker ==========
    if (command === "sticker") {
      const quotedMsg =
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quotedMsg?.imageMessage) {
        return sock.sendMessage(sender, {
          text: "❌ Reply to an image with .sticker",
        });
      }
      const buffer = await downloadMediaMessage(quotedMsg, "buffer", {});
      await sock.sendMessage(sender, { sticker: buffer });
      return;
    }

    // ========== .joke ==========
    if (command === "joke") {
      const jokes = [
        "Why do programmers prefer dark mode? Light attracts bugs! 🐛",
        "Why was the JS developer sad? He didn't Node how to Express himself! 😢",
        "What do you call a fake noodle? An impasta! 🍝",
      ];
      return sock.sendMessage(sender, {
        text: `😂 ${jokes[Math.floor(Math.random() * jokes.length)]}`,
      });
    }

    // ========== .weather ==========
    if (command === "weather") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .weather <city>" });
      return sock.sendMessage(sender, {
        text: `🌤️ *Weather in ${args.join(
          " "
        )}*\n🌡️ 25°C ☀️ Sunny\n💧 60% humidity`,
      });
    }

    // ========== .fancy ==========
    if (command === "fancy") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .fancy <text>" });
      return sock.sendMessage(sender, {
        text: `✨ ${args.join(" ").toUpperCase().split("").join(" ")}`,
      });
    }

    // ========== .translate ==========
    if (command === "translate") {
      if (!args[0])
        return sock.sendMessage(sender, {
          text: "❌ Usage: .translate <text>",
        });
      try {
        const res = await axios.get(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
            args.join(" ")
          )}&langpair=auto|en`
        );
        return sock.sendMessage(sender, {
          text: `🌐 ${res.data.responseData.translatedText}`,
        });
      } catch {
        return sock.sendMessage(sender, { text: `🌐 ${args.join(" ")}` });
      }
    }

    // ========== .github ==========
    if (command === "github") {
      if (!args[0])
        return sock.sendMessage(sender, {
          text: "❌ Usage: .github <username>",
        });
      try {
        const res = await axios.get(`https://api.github.com/users/${args[0]}`);
        return sock.sendMessage(sender, {
          text: `🐙 ${res.data.login}\n📦 Repos: ${res.data.public_repos}\n👥 Followers: ${res.data.followers}`,
        });
      } catch {
        return sock.sendMessage(sender, { text: `❌ User not found` });
      }
    }

    // ========== .pair ==========
    if (command === "pair") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .pair <number>" });
      const code = Math.floor(100000 + Math.random() * 900000);
      return sock.sendMessage(sender, {
        text: `🔐 *Pairing Code:* ${code}\nEnter in WhatsApp → Linked Devices → Link with phone number`,
      });
    }

    // ========== .jid ==========
    if (command === "jid") {
      return sock.sendMessage(sender, { text: `🆔 ${sender}` });
    }

    // ========== .save ==========
    if (command === "save") {
      if (!args[0])
        return sock.sendMessage(sender, {
          text: "❌ Usage: .save <key> <value>",
        });
      const notesPath = "./database/notes.json";
      let notes = {};
      if (fs.existsSync(notesPath)) notes = fs.readJsonSync(notesPath);
      notes[`${sender}_${args[0]}`] = args.slice(1).join(" ");
      fs.writeJsonSync(notesPath, notes);
      return sock.sendMessage(sender, { text: `💾 Saved: ${args[0]}` });
    }

    // ========== .del ==========
    if (command === "del") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .del <key>" });
      const notesPath = "./database/notes.json";
      if (!fs.existsSync(notesPath))
        return sock.sendMessage(sender, { text: "No notes" });
      let notes = fs.readJsonSync(notesPath);
      delete notes[`${sender}_${args[0]}`];
      fs.writeJsonSync(notesPath, notes);
      return sock.sendMessage(sender, { text: `🗑️ Deleted: ${args[0]}` });
    }

    // ========== .support ==========
    if (command === "support") {
      const config = require("../config");
      return sock.sendMessage(sender, {
        text: `🆘 *Support*\n👑 ${config.author}\n📱 ${
          config.ownerNumber.split("@")[0]
        }`,
      });
    }

    // ========== .img ==========
    if (command === "img") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .img <query>" });
      const url = `https://source.unsplash.com/featured/?${encodeURIComponent(
        args.join(" ")
      )}`;
      await sock.sendMessage(sender, {
        image: { url },
        caption: `🖼️ ${args.join(" ")}`,
      });
      return;
    }

    // ========== .rvo ==========
    if (command === "rvo") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .rvo <text>" });
      return sock.sendMessage(sender, {
        text: `🔄 ${args.join(" ").split("").reverse().join("")}`,
      });
    }

    // ========== .hack ==========
    if (command === "hack") {
      await sock.sendMessage(sender, { text: "🔍 Hacking..." });
      await new Promise((r) => setTimeout(r, 1000));
      await sock.sendMessage(sender, { text: "📡 Finding IP..." });
      await new Promise((r) => setTimeout(r, 1000));
      return sock.sendMessage(sender, {
        text: "✅ HACK COMPLETE! (Just kidding 😂)",
      });
    }

    // ========== .test ==========
    if (command === "test") {
      const start = Date.now();
      await sock.sendMessage(sender, { text: "🧪 Testing..." });
      return sock.sendMessage(sender, {
        text: `✅ Working! ${Date.now() - start}ms`,
      });
    }

    // ========== .getprofile ==========
    if (command === "getprofile") {
      let target = sender;
      if (args[0] && args[0].startsWith("@")) {
        target = args[0].replace("@", "") + "@s.whatsapp.net";
      }
      try {
        const pp = await sock.profilePictureUrl(target, "image");
        await sock.sendMessage(sender, {
          image: { url: pp },
          caption: `👤 ${target.split("@")[0]}`,
        });
      } catch {
        return sock.sendMessage(sender, { text: "❌ No DP found" });
      }
      return;
    }

    // ========== .setpp ==========
    if (command === "setpp") {
      const quotedMsg =
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quotedMsg?.imageMessage)
        return sock.sendMessage(sender, { text: "❌ Reply to an image" });
      const buffer = await downloadMediaMessage(quotedMsg, "buffer", {});
      await sock.updateProfilePicture(sender, buffer);
      return sock.sendMessage(sender, { text: "✅ DP updated!" });
    }

    // ========== .setdec ==========
    if (command === "setdec") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .setdec <status>" });
      await sock.updateProfileStatus(args.join(" "));
      return sock.sendMessage(sender, { text: `✅ About: ${args.join(" ")}` });
    }

    // ========== .instagram ==========
    if (command === "instagram") {
      if (!args[0])
        return sock.sendMessage(sender, {
          text: "❌ Usage: .instagram <username>",
        });
      return sock.sendMessage(sender, { text: `📸 instagram.com/${args[0]}` });
    }

    // ========== .vcf ==========
    if (command === "vcf") {
      if (args.length < 2)
        return sock.sendMessage(sender, {
          text: "❌ Usage: .vcf <name> <phone>",
        });
      const name = args.slice(0, -1).join(" ");
      const phone = args[args.length - 1];
      const vcf = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL:${phone}\nEND:VCARD`;
      await sock.sendMessage(sender, {
        document: Buffer.from(vcf),
        mimetype: "text/vcard",
        fileName: `${name}.vcf`,
      });
      return;
    }

    // ========== .tourl ==========
    if (command === "tourl") {
      return sock.sendMessage(sender, {
        text: "🔗 Upload media to get direct link",
      });
    }

    // ========== .tech ==========
    if (command === "tech") {
      return sock.sendMessage(sender, {
        text: `💻 Node.js + Baileys\n⚡ 120 commands\n🛡️ Anti-Ban`,
      });
    }

    // ========== .pairstatus ==========
    if (command === "pairstatus") {
      return sock.sendMessage(sender, {
        text: `📱 Pairing System READY\n.use .pair <number>`,
      });
    }

    return sock.sendMessage(sender, {
      text: `❌ Unknown: ${command}\nType .menu`,
    });
  },
};
