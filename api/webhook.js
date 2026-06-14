import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_ID;
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(200).send('OK');
    }

    const body = req.body;
    
    // Handle foto dari owner (balasan)
    if (body.message && body.message.photo && body.message.reply_to_message) {
        const chatId = body.message.chat.id;
        
        if (chatId != OWNER_ID && chatId != GROUP_CHAT_ID) {
            return res.status(200).send('OK');
        }
        
        const replyToMessage = body.message.reply_to_message;
        const replyText = replyToMessage.text || '';
        
        // Extract user ID dari pesan yang di-reply
        const match = replyText.match(/🆔 *User ID: (\d+)/);
        if (match) {
            const userId = parseInt(match[1]);
            const fileId = body.message.photo[body.message.photo.length - 1].file_id;
            
            await supabase.from('messages').insert({
                user_id: userId,
                message: '',
                sender: 'owner',
                image_file_id: fileId,
                has_image: true
            });
            
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: OWNER_ID,
                    text: `✅ Foto terkirim ke user ID ${userId}`
                })
            });
        }
        return res.status(200).send('OK');
    }
    
    if (!body.message || !body.message.text) {
        return res.status(200).send('OK');
    }

    const chatId = body.message.chat.id;
    const text = body.message.text;

    if (chatId != OWNER_ID) {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: '❌ Anda tidak memiliki akses ke bot ini.'
            })
        });
        return res.status(200).send('OK');
    }

    if (text.startsWith('/b ')) {
        const parts = text.split(' ');
        const userId = parseInt(parts[1]);
        const replyMessage = parts.slice(2).join(' ');

        if (isNaN(userId) || !replyMessage) {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: OWNER_ID,
                    text: '❌ Format salah! Gunakan: /b [user_id] [pesan]'
                })
            });
            return res.status(200).send('OK');
        }

        const { error: insertError } = await supabase
            .from('messages')
            .insert([
                {
                    user_id: userId,
                    message: replyMessage,
                    sender: 'owner',
                    has_image: false
                }
            ]);

        if (insertError) {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: OWNER_ID,
                    text: `❌ Gagal mengirim pesan ke user ID ${userId}. Error: ${insertError.message}`
                })
            });
            return res.status(200).send('OK');
        }

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: OWNER_ID,
                text: `✅ Pesan terkirim ke user ID ${userId}: "${replyMessage}"`
            })
        });
    }

    else if (text === '/off') {
        await supabase
            .from('settings')
            .upsert({ key: 'owner_status', value: 'off' });

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: OWNER_ID,
                text: '🔴 Layanan dimatikan. User tidak bisa chat. Ketik /on untuk mengaktifkan kembali.'
            })
        });
    }

    else if (text === '/on') {
        await supabase
            .from('settings')
            .upsert({ key: 'owner_status', value: 'on' });

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: OWNER_ID,
                text: '🟢 Layanan dihidupkan. User bisa chat sekarang.'
            })
        });
    }

    else if (text.startsWith('/deluser ')) {
        const parts = text.split(' ');
        const userId = parseInt(parts[1]);

        if (isNaN(userId)) {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: OWNER_ID,
                    text: '❌ Format salah! Gunakan: /deluser [user_id]'
                })
            });
            return res.status(200).send('OK');
        }

        await supabase.from('messages').delete().eq('user_id', userId);
        await supabase.from('users').delete().eq('id', userId);

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: OWNER_ID,
                text: `✅ User ID ${userId} dan semua history chatnya telah dihapus.`
            })
        });
    }

    else {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: OWNER_ID,
                text: `📋 *Command yang tersedia:*\n\n/b [user_id] [pesan] - Balas user\n/off - Matikan layanan\n/on - Hidupkan layanan\n/deluser [user_id] - Hapus user & history\n\nℹ️ Balas pesan user lalu kirim foto untuk membalas dengan foto.`,
                parse_mode: 'Markdown'
            })
        });
    }

    return res.status(200).send('OK');
}
