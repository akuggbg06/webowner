import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'owner_status')
        .single();

    if (error) {
        return res.status(200).json({ status: 'on' });
    }

    return res.status(200).json({ status: data.value });
}
