import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import FormData from 'form-data';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
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
    
    // Cek status owner
    const { data: setting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'owner_status')
        .single();
    
    if (setting && setting.value === 'off') {
        return res.status(403).json({ success: false, message: 'Owner sedang offline' });
    }
    
    // Parse multipart form data
    const busboy = require('busboy');
    const { Readable } = require('stream');
    
    let photoBuffer = null;
    let filename = null;
    
    await new Promise((resolve, reject) => {
        const bb = busboy({ headers: req.headers });
        
        bb.on('file', (name, file, info) => {
            filename = info.filename;
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
    form.append('photo', photoBuffer, { filename: filename || 'photo.jpg' });
    
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: form
    });
    const tgData = await tgRes.json();
    
    if (!tgData.ok) {
        console.error('Telegram error:', tgData);
        return res.status(500).json({ success: false, message: 'Gagal upload ke Telegram: ' + tgData.description });
    }
    
    const fileId = tgData.result.photo[tgData.result.photo.length - 1].file_id;
    
    // Simpan ke database
    const { error } = await supabase
        .from('messages')
        .insert({
            user_id: userId,
            message: '',
            sender: 'user',
            image_file_id: fileId,
            has_image: true
        });
    
    if (error) {
        console.error('DB error:', error);
        return res.status(500).json({ success: false, message: 'Gagal simpan ke database' });
    }
    
    // Notifikasi ke owner
    const { data: userData } = await supabase
        .from('users')
        .select('username')
        .eq('id', userId)
        .single();
    
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: process.env.OWNER_ID,
            text: `📸 *Foto dari User*\n\n👤 *Username:* ${userData?.username || 'unknown'}\n🆔 *User ID:* ${userId}`,
            parse_mode: 'Markdown'
        })
    });
    
    return res.status(200).json({ success: true, fileId });
}
