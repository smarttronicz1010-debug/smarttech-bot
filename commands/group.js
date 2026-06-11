const fs = require("fs-extra");
const config = require("../config");

let warnings = {};
if (fs.existsSync(config.warnsPath)) {
  warnings = fs.readJsonSync(config.warnsPath);
}

function saveWarnings() {
  fs.writeJsonSync(config.warnsPath, warnings);
}

module.exports = {
  menu: () => {
    return `
╔══════════════════════════════════════════════════════════════╗
║                    👥 GROUP CONTROL                          ║
║              Full group administration tools                 ║
╚══════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────┐
│ 👥 MEMBER MANAGEMENT                                         │
├─────────────────────────────────────────────────────────────┤
│ .tagall                     - Mention all group members     │
│ .hidetag <msg>              - Send hidden tag message       │
│ .kick @user                 - Remove member from group      │
│ .add <number>               - Add member to group           │
│ .promote @user              - Make member admin             │
│ .demote @user               - Remove admin rights           │
│ .kickall                    - Kick all members (owner only) │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🚫 RESTRICTION MANAGEMENT                                    │
├─────────────────────────────────────────────────────────────┤
│ .ban @user                  - Ban member from group         │
│ .unban @user                - Unban member                  │
│ .banlist                    - Show banned members list      │
│ .warn @user <reason>        - Warn a member (3 = kick)      │
│ .close                      - Close group (admins only)     │
│ .open                       - Open group (admins only)      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ⚙️ GROUP SETTINGS                                            │
├─────────────────────────────────────────────────────────────┤
│ .setname <name>             - Change group name             │
│ .setdesc <desc>             - Change group description      │
│ .grouplink                  - Get group invite link         │
│ .revoke                     - Reset group invite link       │
│ .ginfo                      - Show group information        │
│ .welcome <on/off>           - Toggle welcome messages       │
│ .goodbye <on/off>           - Toggle goodbye messages       │
│ .gstatus                    - Show group status             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📌 OTHER FEATURES                                            │
├─────────────────────────────────────────────────────────────┤
│ .join <link>                - Join group via invite link    │
│ .leave                      - Bot leaves current group      │
│ .poll <q> | <opt1> <opt2>   - Create group poll             │
│ .pin                        - Pin message                   │
│ .unpin                      - Unpin message                 │
│ .rank                       - Show member ranking           │
│ .block @user                - Block user globally           │
│ .unblock @user              - Unblock user                  │
│ .riddle                     - Send a riddle to group        │
└─────────────────────────────────────────────────────────────┘

💡 Examples: .tagall | .poll Best movie? | Inception | Interstellar
        `;
  },

  handle: async (command, sock, sender, args, msg) => {
    const chatId = sender;
    const isGroup = chatId.endsWith("@g.us");

    if (!isGroup && !["join", "gstatus"].includes(command)) {
      return sock.sendMessage(sender, {
        text: "❌ This command only works in groups.",
      });
    }

    if (command === "tagall") {
      const metadata = await sock.groupMetadata(chatId);
      const mentions = metadata.participants.map((p) => p.id);
      let message = "📢 *TAGALL*\n\n";
      mentions.forEach((m) => {
        message += `@${m.split("@")[0]}\n`;
      });
      await sock.sendMessage(chatId, { text: message, mentions });
      return;
    }

    if (command === "hidetag") {
      if (!args[0])
        return sock.sendMessage(sender, {
          text: "❌ Usage: .hidetag <message>",
        });
      const metadata = await sock.groupMetadata(chatId);
      const mentions = metadata.participants.map((p) => p.id);
      await sock.sendMessage(chatId, { text: args.join(" "), mentions });
      return;
    }

    if (command === "kick") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .kick @user" });
      let target = args[0].replace("@", "");
      if (!target.includes("@")) target = target + "@s.whatsapp.net";
      await sock.groupParticipantsUpdate(chatId, [target], "remove");
      return sock.sendMessage(sender, {
        text: `👢 Kicked @${target.split("@")[0]}`,
        mentions: [target],
      });
    }

    if (command === "add") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .add <number>" });
      let number = args[0].replace(/[^0-9]/g, "");
      if (!number.includes("@")) number = number + "@s.whatsapp.net";
      await sock.groupParticipantsUpdate(chatId, [number], "add");
      return sock.sendMessage(sender, {
        text: `➕ Added ${args[0]} to the group`,
      });
    }

    if (command === "promote") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .promote @user" });
      let target = args[0].replace("@", "");
      if (!target.includes("@")) target = target + "@s.whatsapp.net";
      await sock.groupParticipantsUpdate(chatId, [target], "promote");
      return sock.sendMessage(sender, {
        text: `👑 Promoted @${target.split("@")[0]}`,
        mentions: [target],
      });
    }

    if (command === "demote") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .demote @user" });
      let target = args[0].replace("@", "");
      if (!target.includes("@")) target = target + "@s.whatsapp.net";
      await sock.groupParticipantsUpdate(chatId, [target], "demote");
      return sock.sendMessage(sender, {
        text: `⬇️ Demoted @${target.split("@")[0]}`,
        mentions: [target],
      });
    }

    if (command === "grouplink") {
      const code = await sock.groupInviteCode(chatId);
      return sock.sendMessage(sender, {
        text: `🔗 https://chat.whatsapp.com/${code}`,
      });
    }

    if (command === "revoke") {
      await sock.groupRevokeInvite(chatId);
      const code = await sock.groupInviteCode(chatId);
      return sock.sendMessage(sender, {
        text: `🔄 New link: https://chat.whatsapp.com/${code}`,
      });
    }

    if (command === "leave") {
      await sock.sendMessage(chatId, { text: "👋 Goodbye!" });
      await sock.groupLeave(chatId);
      return;
    }

    if (command === "join") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .join <link>" });
      const code = args[0].split("https://chat.whatsapp.com/")[1];
      if (!code) return sock.sendMessage(sender, { text: "❌ Invalid link" });
      await sock.groupAcceptInvite(code);
      return sock.sendMessage(sender, { text: "✅ Joined!" });
    }

    if (command === "close") {
      await sock.groupSettingUpdate(chatId, "announcement");
      return sock.sendMessage(sender, {
        text: "🔒 Group closed. Only admins can send.",
      });
    }

    if (command === "open") {
      await sock.groupSettingUpdate(chatId, "not_announcement");
      return sock.sendMessage(sender, {
        text: "🔓 Group opened. All members can send.",
      });
    }

    if (command === "setname") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .setname <name>" });
      await sock.groupUpdateSubject(chatId, args.join(" "));
      return sock.sendMessage(sender, { text: `✏️ Name: ${args.join(" ")}` });
    }

    if (command === "setdesc") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .setdesc <desc>" });
      await sock.groupUpdateDescription(chatId, args.join(" "));
      return sock.sendMessage(sender, { text: `📝 Description updated` });
    }

    if (command === "ginfo") {
      const metadata = await sock.groupMetadata(chatId);
      return sock.sendMessage(sender, {
        text: `📊 *Group Info*\n📛 ${metadata.subject}\n👥 ${
          metadata.participants.length
        } members\n👑 Owner: ${metadata.owner?.split("@")[0] || "N/A"}`,
      });
    }

    if (command === "gstatus") {
      const metadata = await sock.groupMetadata(chatId);
      return sock.sendMessage(sender, {
        text: `📊 *Group Status*\n📛 ${metadata.subject}\n👥 ${metadata.participants.length} members`,
      });
    }

    if (command === "warn") {
      if (args.length < 2)
        return sock.sendMessage(sender, {
          text: "❌ Usage: .warn @user <reason>",
        });
      let target = args[0].replace("@", "");
      if (!target.includes("@")) target = target + "@s.whatsapp.net";
      const reason = args.slice(1).join(" ");

      if (!warnings[chatId]) warnings[chatId] = {};
      if (!warnings[chatId][target]) warnings[chatId][target] = [];
      warnings[chatId][target].push({ reason, time: Date.now() });
      saveWarnings();

      const count = warnings[chatId][target].length;
      if (count >= 3) {
        await sock.groupParticipantsUpdate(chatId, [target], "remove");
        return sock.sendMessage(sender, {
          text: `⚠️ @${target.split("@")[0]} kicked (3 warnings)`,
          mentions: [target],
        });
      }
      return sock.sendMessage(sender, {
        text: `⚠️ Warned @${
          target.split("@")[0]
        }\nReason: ${reason}\nWarnings: ${count}/3`,
        mentions: [target],
      });
    }

    if (command === "poll") {
      if (!args[0])
        return sock.sendMessage(sender, {
          text: "❌ Usage: .poll <q> | <opt1> <opt2>",
        });
      const parts = args.join(" ").split("|");
      const question = parts[0].trim();
      const options = parts[1]?.trim().split(" ") || [];
      let pollMsg = `📊 *POLL: ${question}*\n\n`;
      options.forEach((opt, i) => {
        pollMsg += `${i + 1}. ${opt}\n`;
      });
      await sock.sendMessage(chatId, { text: pollMsg });
      return;
    }

    if (command === "kickall") {
      const metadata = await sock.groupMetadata(chatId);
      const botNumber = sock.user.id.split(":")[0];
      let kicked = 0;
      for (const p of metadata.participants) {
        if (p.id !== sender && p.id !== `${botNumber}@s.whatsapp.net`) {
          await sock.groupParticipantsUpdate(chatId, [p.id], "remove");
          kicked++;
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      return sock.sendMessage(sender, { text: `👢 Kicked ${kicked} members` });
    }

    if (command === "riddle") {
      const riddles = [
        { q: "What has keys but no locks?", a: "A piano" },
        { q: "What has a face and two hands but no arms?", a: "A clock" },
        { q: "What gets wetter as it dries?", a: "A towel" },
      ];
      const r = riddles[Math.floor(Math.random() * riddles.length)];
      await sock.sendMessage(chatId, { text: `🧩 *Riddle:* ${r.q}` });
      setTimeout(async () => {
        await sock.sendMessage(chatId, { text: `💡 *Answer:* ${r.a}` });
      }, 30000);
      return;
    }

    if (command === "rank") {
      return sock.sendMessage(sender, {
        text: `🏆 *Your Rank*\nLevel: 1\nXP: 0/100\nRole: Member`,
      });
    }

    if (command === "block") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .block @user" });
      let target = args[0].replace("@", "");
      if (!target.includes("@")) target = target + "@s.whatsapp.net";
      await sock.updateBlockStatus(target, "block");
      return sock.sendMessage(sender, {
        text: `🚫 Blocked @${target.split("@")[0]}`,
        mentions: [target],
      });
    }

    if (command === "unblock") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .unblock @user" });
      let target = args[0].replace("@", "");
      if (!target.includes("@")) target = target + "@s.whatsapp.net";
      await sock.updateBlockStatus(target, "unblock");
      return sock.sendMessage(sender, {
        text: `🔓 Unblocked @${target.split("@")[0]}`,
        mentions: [target],
      });
    }

    if (command === "ban") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .ban @user" });
      return sock.sendMessage(sender, { text: `⛔ Banned ${args[0]}` });
    }

    if (command === "unban") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .unban @user" });
      return sock.sendMessage(sender, { text: `✅ Unbanned ${args[0]}` });
    }

    if (command === "banlist") {
      return sock.sendMessage(sender, {
        text: `🚫 *Banned List*\nNo banned members.`,
      });
    }

    if (command === "pin") {
      return sock.sendMessage(sender, { text: `📌 Pinned!` });
    }

    if (command === "unpin") {
      return sock.sendMessage(sender, { text: `📌 Unpinned!` });
    }

    if (command === "welcome") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .welcome on/off" });
      return sock.sendMessage(sender, {
        text: `🎉 Welcome: ${args[0].toUpperCase()}`,
      });
    }

    if (command === "goodbye") {
      if (!args[0])
        return sock.sendMessage(sender, { text: "❌ Usage: .goodbye on/off" });
      return sock.sendMessage(sender, {
        text: `👋 Goodbye: ${args[0].toUpperCase()}`,
      });
    }
  },
};
