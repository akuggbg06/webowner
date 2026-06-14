// Sama seperti webhook.js, ini untuk backup
// Tapi kita sudah pakai webhook.js sebagai main
export default async function handler(req, res) {
    return res.status(200).json({ status: 'ok', message: 'Gunakan /api/webhook untuk Telegram' });
}
