module.exports = {
    menu: () => {
        return `
╔══════════════════════════════════════════════════════════════╗
║                    📦 DOWNLOAD SYSTEM                        ║
╚══════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────┐
│ 🎵 MUSIC & VIDEO                                             │
├─────────────────────────────────────────────────────────────┤
│ .play <song/url>          - Download audio from YouTube     │
│ .video <url>              - Download video from YouTube     │
│ .yts <song name>          - Search & download from YouTube  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📱 SOCIAL MEDIA                                              │
├─────────────────────────────────────────────────────────────┤
│ .facebook <url> / .fbdl    - Download Facebook video        │
│ .ig <url>                  - Download Instagram reel/post   │
│ .tt <url> / .tiktok        - Download TikTok video (no WM)  │
│ .pinterest <url>           - Download Pinterest images/vid  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🔗 OTHER DOWNLOADS                                           │
├─────────────────────────────────────────────────────────────┤
│ .tourl                      - Convert media to direct link  │
│ .mediafire <url>            - Download from MediaFire       │
└─────────────────────────────────────────────────────────────┘

💡 Examples: .play Shape of You | .ig https://instagram.com/reel/xxx
        `;
    },
    
    handle: async (command, sock, sender, args, msg) => {
        if (!args[0]) {
            return sock.sendMessage(sender, { text: `❌ Usage: .${command} <url/song name>` });
        }
        
        const responses = {
            'play': '🎵 Downloading audio from YouTube',
            'video': '🎬 Downloading video from YouTube',
            'facebook': '📱 Downloading Facebook video',
            'fbdl': '📱 Downloading Facebook video',
            'ig': '📸 Downloading Instagram content',
            'instagram': '📸 Downloading Instagram content',
            'tt': '🎵 Downloading TikTok video (no watermark)',
            'tiktok': '🎵 Downloading TikTok video (no watermark)',
            'pinterest': '📌 Downloading Pinterest media',
            'yts': '🔍 Searching YouTube',
            'tourl': '🔗 Converting media to direct link',
            'mediafire': '📦 Downloading from MediaFire'
        };
        
        await sock.sendMessage(sender, { text: `${responses[command] || '⏳ Processing'}...\n📝 ${args.join(' ')}` });
        
        setTimeout(async () => {
            await sock.sendMessage(sender, { text: `✅ *Download Ready!*\n\n📁 File: ${args.join(' ')}\n📊 Size: ~4MB\n\n⚠️ Add actual download API keys for production use.\n\n💡 For real downloads:\n- YouTube: Add ytdl-core\n- Instagram: Use instagram-downloader API\n- TikTok: Use tiktok-downloader API` });
        }, 2000);
    }
};