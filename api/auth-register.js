import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
    }

    if (password.length < 4) {
        return res.status(400).json({ success: false, message: 'Password minimal 4 karakter' });
    }

    const { data: existing, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username);

    if (existing && existing.length > 0) {
        return res.status(400).json({ success: false, message: 'Username sudah digunakan' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([
            {
                username: username,
                password: password,
                ip_address: ip
            }
        ])
        .select();

    if (insertError) {
        console.error('Register error:', insertError);
        return res.status(500).json({ success: false, message: 'Gagal mendaftar, coba lagi' });
    }

    return res.status(200).json({
        success: true,
        message: 'Pendaftaran berhasil'
    });
}
