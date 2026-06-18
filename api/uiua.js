export default async function handler(req, res) {
    try {
        const BOT_TOKEN = process.env.BOT_TOKEN;
        const OWNER_ID = process.env.OWNER_ID;

        if (!BOT_TOKEN || !OWNER_ID) {
            return res.status(500).json({ error: 'Missing BOT_TOKEN or OWNER_ID' });
        }

        // Ambil IP dari header (cara manual)
        const ip = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.connection?.remoteAddress || 
                   '0.0.0.0';

        // Ambil lokasi dari header Vercel (cara manual)
        const country = req.headers['x-vercel-ip-country'] || 'unknown';
        const city = req.headers['x-vercel-ip-city'] || 'unknown';
        const region = req.headers['x-vercel-ip-country-region'] || 'unknown';
        const timezone = req.headers['x-vercel-ip-timezone'] || 'unknown';

        // Buat pesan
        const message = `🟢 *ADA USER BUKA WEBSITE!*\n\n` +
            `🌐 *IP Address:* ${ip}\n` +
            `📍 *Negara:* ${country}\n` +
            `🏙️ *Kota:* ${city}\n` +
            `🗺️ *Region:* ${region}\n` +
            `📏 *Zona Waktu:* ${timezone}\n` +
            `📱 *User Agent:* ${req.headers['user-agent'] || 'unknown'}\n` +
            `🕐 *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`;

        // Kirim ke Telegram
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: OWNER_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        const result = await response.json();

        return res.status(200).json({ 
            success: true, 
            ip: ip,
            country: country,
            city: city,
            telegram: result
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
