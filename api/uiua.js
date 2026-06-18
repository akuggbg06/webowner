import { geolocation, ipAddress } from '@vercel/functions';

const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_ID;

export default async function handler(req, res) {
    try {
        // Ambil IP dan lokasi dari Vercel
        const ip = ipAddress(req) || 'Tidak terdeteksi';
        const geo = geolocation(req);

        // Buat pesan
        let message = '🟢 *ADA USER BUKA WEBSITE!*\n\n';
        message += `🌐 *IP Address:* ${ip}\n`;
        message += `📍 *Negara:* ${geo?.country || 'Tidak diketahui'}\n`;
        message += `🏙️ *Kota:* ${geo?.city || 'Tidak diketahui'}\n`;
        message += `🗺️ *Region:* ${geo?.region || 'Tidak diketahui'}\n`;
        message += `📮 *Kode Pos:* ${geo?.postalCode || 'Tidak diketahui'}\n`;
        message += `📏 *Zona Waktu:* ${geo?.timezone || 'Tidak diketahui'}\n`;
        message += `📱 *User Agent:* ${req.headers['user-agent'] || 'Tidak diketahui'}\n`;
        message += `🕐 *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`;

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

        if (!result.ok) {
            console.error('Telegram error:', result);
        }

        return res.status(200).json({ 
            success: true, 
            telegram: result,
            ip: ip,
            geo: geo
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
