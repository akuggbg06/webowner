import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
    }

    const { data: users, error } = await supabase
        .from('users')
        .select('id, username, password')
        .eq('username', username);

    if (error || !users || users.length === 0) {
        return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    const user = users[0];

    if (user.password !== password) {
        return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(200).json({
        success: true,
        token: token,
        userId: user.id,
        username: user.username
    });
}
