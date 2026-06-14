import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_ID;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(200).send('OK');
    }

    const body = req.body;
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
            return res.status(200
