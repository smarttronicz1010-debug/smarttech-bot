module.exports = {
    menu: () => {
        return `
╔══════════════════════════════════════════════════════════════╗
║                    👑 OWNER ACCESS                           ║
╚══════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────┐
│ 👤 OWNER COMMANDS                                           │
├─────────────────────────────────────────────────────────────┤
│ .owner                      - Show owner information        │
│ .fullpp                     - Get full quality profile pic  │
│ .getpp @user                - Get ANY user's profile pic    │
│ .getpp                      - Get your own profile pic      │
└─────────────────────────────────────────────────────────────┘

💡 Examples:
.getpp @919876543210  - Get someone's profile picture
.getpp                - Get your own profile picture
.fullpp               - Get full quality (no compression)
        `;
    },
    
    handle: async (command, sock, sender, args) => {
        const config = require('../config');
        
        if (command === 'owner') {
            return sock.sendMessage(sender, { text: `👑 *Owner*\n📛 ${config.author}\n🤖 ${config.botName}\n📱 WhatsApp: ${config.ownerNumber.split('@')[0]}` });
        }
        
        if (command === 'fullpp') {
            try {
                const pp = await sock.profilePictureUrl(sender, 'image');
                await sock.sendMessage(sender, { image: { url: pp }, caption: `🖼️ *Full Quality DP*\n👤 ${sender.split('@')[0]}` });
            } catch {
                return sock.sendMessage(sender, { text: '❌ No profile picture found.' });
            }
            return;
        }
        
        // ========== .getpp - GET ANY USER'S PROFILE PICTURE ==========
        if (command === 'getpp') {
            let target = sender;
            
            if (args[0]) {
                let input = args[0].replace('@', '');
                if (/^\d+$/.test(input)) {
                    target = input + '@s.whatsapp.net';
                } else if (input.includes('@')) {
                    target = input;
                } else {
                    target = input + '@s.whatsapp.net';
                }
            }
            
            try {
                const pp = await sock.profilePictureUrl(target, 'image');
                await sock.sendMessage(sender, {
                    image: { url: pp },
                    caption: `👤 *Profile Picture*\n📱 User: ${target.split('@')[0]}\n🖼️ Retrieved: ${new Date().toLocaleString()}`
                });
            } catch (error) {
                return sock.sendMessage(sender, { text: `❌ No profile picture found for "${args[0] || 'yourself'}".\n\nMake sure the number is valid and has a DP.` });
            }
            return;
        }
    }
};