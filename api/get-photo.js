const BOT_TOKEN = process.env.BOT_TOKEN;

export default async function handler(req, res) {
    const { file_id } = req.query;
    
    if (!file_id) {
        return res.status(400).json({ error: 'file_id required' });
    }
    
    try {
        // Dapatkan file path dari Telegram
        const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${file_id}`);
        const fileData = await fileRes.json();
        
        if (!fileData.ok) {
            return res.status(500).json({ error: 'Failed to get file from Telegram' });
        }
        
        const filePath = fileData.result.file_path;
        const photoUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
        
        // Redirect ke URL foto
        res.redirect(302, photoUrl);
    } catch (err) {
        console.error('Get photo error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}
