import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
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

    const { userId: queryUserId, after } = req.query;
    if (queryUserId != userId) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    let query = supabase
        .from('messages')
        .select('id, message, sender, created_at, image_file_id, has_image')
        .eq('user_id', userId)
        .order('id', { ascending: true });

    if (after && !isNaN(parseInt(after))) {
        query = query.gt('id', parseInt(after));
    }

    const { data: messages, error } = await query;

    if (error) {
        console.error('History error:', error);
        return res.status(500).json({ success: false, message: 'Gagal mengambil history' });
    }

    return res.status(200).json({ success: true, messages: messages || [] });
}
