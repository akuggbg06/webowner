import jwt from 'jsonwebtoken';
import FormData from 'form-data';

const JWT_SECRET = process.env.JWT_SECRET;
const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID;

export const config = {
    api: {
        bodyParser: false,
    },
};

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
    
    // Parse file upload
    const busboy = require('busboy');
    const bb = busboy({ headers: req.headers });
    
    let photoBuffer = null;
    let keterangan = '';
    let username = '';
    
    await new Promise((resolve, reject) => {
        bb.on('field', (name, value) => {
            if (name === 'keterangan') keterangan = value;
            if (name === 'userId') userId = parseInt(value);
        });
        
        bb.on('file', (name, file, info) => {
            const chunks = [];
            file.on('data', (data) => chunks.push(data));
            file.on('end', () => {
                photoBuffer = Buffer.concat(chunks);
            });
        });
        
        bb.on('close', resolve);
        bb.on('error', reject);
        req.pipe(bb);
    });
    
    if (!photoBuffer) {
        return res.status(400).json({ success: false, message: 'Tidak ada foto' });
    }
    
    // Upload ke grup Telegram
    const form = new FormData();
    form.append('chat_id', GROUP_CHAT_ID);
    form.append('photo', photoBuffer, { filename: 'bukti.jpg', contentType: 'image/jpeg' });
    
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: form,
        headers: form.getHeaders()
    });
    
    const tgData = await tgRes.json();
    
    if (!tgData.ok) {
        console.error('Telegram error:', tgData);
        return res.status(500).json({ success: false, message: 'Gagal upload ke Telegram' });
    }
    
    // Kirim keterangan juga (sebagai caption atau pesan terpisah)
    if (keterangan) {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: GROUP_CHAT_ID,
                text: `📝 *Keterangan dari User ID ${userId}:*\n\n${keterangan}`,
                parse_mode: 'Markdown'
            })
        });
    }
    
    return res.status(200).json({ success: true, message: 'Bukti terkirim' });
}
