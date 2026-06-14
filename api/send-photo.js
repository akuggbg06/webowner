// api/send-photo.js
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import FormData from 'form-data';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const JWT_SECRET = process.env.JWT_SECRET;
const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID;

// === VERCEL CONFIG: MATIKAN BODY PARSER BAWAAN ===
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // 1. Validasi Method
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Validasi Header Authorization
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
  const token = authHeader.split(' ')[1];
  let userId;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    userId = decoded.userId;
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  // 3. Parsing file upload
  const busboy = require('busboy');
  const bb = busboy({ headers: req.headers });
  
  let fileBuffer = null;
  let fileMime = null;

  // Gunakan Promise untuk menunggu proses busboy selesai
  await new Promise((resolve, reject) => {
    bb.on('file', (name, file, info) => {
      fileMime = info.mimeType;
      const chunks = [];
      file.on('data', (data) => chunks.push(data));
      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });
    bb.on('close', () => resolve());
    bb.on('error', (err) => reject(err));
    req.pipe(bb);
  });

  if (!fileBuffer) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  // 4. Kirim ke Group Telegram
  try {
    const formDataToSend = new FormData();
    formDataToSend.append('chat_id', GROUP_CHAT_ID);
    formDataToSend.append('photo', fileBuffer, {
      filename: 'photo.jpg',
      contentType: fileMime || 'image/jpeg',
    });

    const tgResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: formDataToSend,
      headers: formDataToSend.getHeaders(),
    });
    const tgResult = await tgResponse.json();

    if (!tgResult.ok) {
      console.error('Telegram API Error:', tgResult);
      return res.status(502).json({ error: `Telegram Error: ${tgResult.description}` });
    }

    const fileId = tgResult.result.photo[tgResult.result.photo.length - 1].file_id;
    
    // 5. Simpan ke Database
    const { error: dbError } = await supabase.from('messages').insert({
      user_id: userId,
      message: '',
      sender: 'user',
      image_file_id: fileId,
      has_image: true,
    });

    if (dbError) throw new Error(dbError.message);

    // 6. Notifikasi ke Owner (Opsional)
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.OWNER_ID,
        text: `📸 *New Photo from User ID:* ${userId}`,
        parse_mode: 'Markdown',
      }),
    });

    return res.status(200).json({ success: true, fileId });
  } catch (error) {
    console.error('Upload or DB error:', error);
    return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}
