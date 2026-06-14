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
    // Hanya terima POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
    
    // Cek Authorization header
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
    
    // Cek status owner (ON/OFF)
    const { data: setting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'owner_status')
        .single();
    
    if (setting && setting.value === 'off') {
        return res.status(403).json({ success: false, message: 'Owner sedang offline' });
    }
    
    // Parse multipart form data dengan Promise
    let photoBuffer = null;
    let filename = null;
    let mimetype = null;
    
    try {
        const busboy = require('busboy');
        const bb = busboy({ headers: req.headers });
        
        await new Promise((resolve, reject) => {
            bb.on('file', (name, file, info) => {
                filename = info.filename;
                mimetype = info.mimeType;
                const chunks = [];
                file.on('data', (data) => chunks.push(data));
                file.on('end', () => {
                    photoBuffer = Buffer.concat(chunks);
                });
            });
            
            bb.on('close', () => resolve());
            bb.on('error', (err) => reject(err));
            
            req.pipe(bb);
        });
    } catch (err) {
        console.error('Busboy error:', err);
        return res.status(500).json({ success: false, message: 'Gagal membaca file' });
    }
    
    if (!photoBuffer) {
        return res.status(400).json({ success: false, message: 'Tidak ada foto' });
    }
    
    // Validasi ukuran (max 15MB)
    if (photoBuffer.length > 15 * 1024 * 1024) {
        return res.status(400).json({ success: false, message: 'Ukuran foto maksimal 15MB' });
    }
    
    // Upload ke grup Telegram
    try {
        const form = new FormData();
        form.append('chat_id', GROUP_CHAT_ID);
        form.append('photo', photoBuffer, {
            filename: filename || 'photo.jpg',
            contentType: mimetype || 'image/jpeg'
        });
        
        const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });
        
        const tgData = await tgRes.json();
        
        if (!tgData.ok) {
            console.error('Telegram error:', tgData);
            return res.status(500).json({ success: false, message: 'Gagal upload ke Telegram: ' + (tgData.description || 'Unknown error') });
        }
        
        // Ambil file_id
        let fileId = null;
        if (tgData.result && tgData.result.photo) {
            const photos = tgData.result.photo;
            fileId = photos[photos.length - 1].file_id;
        } else {
            return res.status(500).json({ success: false, message: 'Gagal mendapatkan file_id dari Telegram' });
        }
        
        // Simpan ke database
        const { error: dbError } = await supabase
            .from('messages')
            .insert({
                user_id: userId,
                message: '',
                sender: 'user',
                image_file_id: fileId,
                has_image: true
            });
        
        if (dbError) {
            console.error('DB error:', dbError);
            return res.status(500).json({ success: false, message: 'Gagal simpan ke database' });
        }
        
        // Notifikasi ke owner (tanpa reply markup biar gak error)
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
                text: `📸 FOTO DARI USER\n\nUsername: ${userData?.username || 'unknown'}\nUser ID: ${userId}\n\nBalas pesan ini lalu kirim foto untuk membalas.`
            })
        });
        
        return res.status(200).json({ success: true, fileId });
        
    } catch (err) {
        console.error('Upload error:', err);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan: ' + err.message });
    }
}
