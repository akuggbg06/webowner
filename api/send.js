import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const JWT_SECRET = process.env.JWT_SECRET;
const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_ID;

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

    const { userId: bodyUserId, message } = req.body;
    if (bodyUserId != userId) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (!message || message.trim() === '') {
        return res.status(400).json({ success: false, message: 'Pesan tidak boleh kosong' });
    }

    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('username')
        .eq('id', userId)
        .single();

    if (userError || !userData) {
        return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    const { data: setting, error: settingError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'owner_status')
        .single();

    if (setting && setting.value === 'off') {
        return res.status(403).json({ success: false, message: 'Owner sedang offline' });
    }

    const { error: insertError } = await supabase
        .from('messages')
        .insert([
            {
                user_id: userId,
                message: message,
                sender: 'user'
            }
        ]);

    if (insertError) {
        console.error('Send message error:', insertError);
        return res.status(500).json({ success: false, message: 'Gagal menyimpan pesan' });
    }

    const textToOwner = `📨 *Pesan dari User*\n\n👤 *Username:* ${userData.username}\n🆔 *User ID:* ${userId}\n💬 *Pesan:* ${message}`;

    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: OWNER_ID,
                text: textToOwner,
                parse_mode: 'Markdown'
            })
        });
    } catch (err) {
        console.error('Gagal kirim notif ke owner:', err);
    }

    return res.status(200).json({ success: true, message: 'Pesan terkirim' });
}
