import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID;
const OWNER_ID = process.env.OWNER_ID;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    // Cek token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
    }

    const token = authHeader.split(' ')[1];
    let userId;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId;
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token tidak valid' });
    }

    const { link, keterangan } = req.body;

    if (!link) {
        return res.status(400).json({ success: false, message: 'Link foto tidak boleh kosong' });
    }

    try {
        // Kirim ke grup Telegram
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: GROUP_CHAT_ID,
                text: `📸 *BUKTI PEMBAYARAN*\n\n👤 User ID: ${userId}\n🔗 Link: ${link}\n📝 Keterangan: ${keterangan || '-'}`,
                parse_mode: 'Markdown'
            })
        });

        // Kirim notifikasi ke owner
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: OWNER_ID,
                text: `📸 *Bukti dari User ID ${userId}*\n🔗 ${link}\n📝 ${keterangan || '-'}`,
                parse_mode: 'Markdown'
            })
        });

        return res.status(200).json({ success: true, message: 'Bukti terkirim' });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ success: false, message: 'Gagal mengirim bukti' });
    }
}
