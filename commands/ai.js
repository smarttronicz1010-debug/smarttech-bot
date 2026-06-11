const axios = require('axios');

module.exports = {
    menu: () => {
        return `
╔══════════════════════════════════════════════════════════════╗
║                      🧠 AI ENGINE                            ║
║                   Powered by OpenAI/Gemini                   ║
╚══════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────┐
│ 🤖 CHAT & TEXT AI                                            │
├─────────────────────────────────────────────────────────────┤
│ .ai <question>              - Ask anything to AI            │
│ .gpt <prompt>               - ChatGPT powered responses     │
│ .fact                       - Get random interesting fact   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🎨 IMAGE & MEDIA AI                                          │
├─────────────────────────────────────────────────────────────┤
│ .image <description>        - Generate AI image (DALL-E)    │
│ .lyrics <song name>         - Find song lyrics              │
└─────────────────────────────────────────────────────────────┘

💡 Examples: .ai What is AI? | .image a beautiful sunset
        `;
    },
    
    handle: async (command, sock, sender, args) => {
        if (command === 'fact') {
            const facts = [
                "🐝 Honey never spoils. Archaeologists found 3000-year-old honey!",
                "🐙 Octopuses have three hearts and blue blood.",
                "🍌 Bananas are berries, but strawberries aren't.",
                "🪐 A day on Venus is longer than a year on Venus.",
                "🐘 Elephants are the only mammals that can't jump.",
                "💧 Hot water freezes faster than cold water (Mpemba effect)."
            ];
            return sock.sendMessage(sender, { text: `💡 *Random Fact*\n\n${facts[Math.floor(Math.random() * facts.length)]}` });
        }
        
        if (command === 'image') {
            if (!args[0]) return sock.sendMessage(sender, { text: '❌ Usage: .image <description>' });
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(args.join(' '))}`;
            await sock.sendMessage(sender, { image: { url: imageUrl }, caption: `🎨 *AI Generated: ${args.join(' ')}` });
            return;
        }
        
        if (command === 'lyrics') {
            if (!args[0]) return sock.sendMessage(sender, { text: '❌ Usage: .lyrics <song name>' });
            try {
                const response = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(args.join(' '))}`);
                const lyrics = response.data.lyrics;
                if (!lyrics) throw new Error();
                const truncated = lyrics.length > 2000 ? lyrics.substring(0, 2000) + '\n\n... (truncated)' : lyrics;
                return sock.sendMessage(sender, { text: `🎵 *Lyrics: ${args.join(' ')}*\n\n${truncated}` });
            } catch {
                return sock.sendMessage(sender, { text: `❌ Lyrics not found for "${args.join(' ')}"` });
            }
        }
        
        if (!args[0]) {
            return sock.sendMessage(sender, { text: `❌ Usage: .${command} <question>\nExample: .${command} What is AI?` });
        }
        
        const question = args.join(' ');
        try {
            const response = await axios.get(`https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(question)}`);
            return sock.sendMessage(sender, { text: `🤖 *AI Response*\n\n❓ You: ${question}\n\n✅ Bot: ${response.data.response}` });
        } catch {
            return sock.sendMessage(sender, { text: `🤖 *AI Response*\n\n❓ You: ${question}\n\n✅ Add OpenAI API key to config.js for real responses.\n\n💡 Get key: platform.openai.com` });
        }
    }
};