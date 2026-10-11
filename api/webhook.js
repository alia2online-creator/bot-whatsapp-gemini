import axios from 'axios';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'mapple_token_123';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

export default async function handler(req, res) {
  // 1. Verificación obligatoria para Meta Developers
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Token no coincide');
  }

  // 2. Recepción de mensajes de WhatsApp
  if (req.method === 'POST') {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    const message = changes?.messages?.[0];

    if (message && message.type === 'text') {
      const from = message.from;
      const userText = message.text.body;

      try {
        // Consulta a Gemini
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Eres el asistente de atención al cliente de Mapple Store. Responde de forma amable, clara y breve al siguiente mensaje:\n\n"${userText}"`,
        });

        const replyText = response.text;

        // Envío de la respuesta al cliente
        await axios.post(
          `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: 'whatsapp',
            to: from,
            text: { body: replyText }
          },
          {
            headers: {
              Authorization: `Bearer ${WHATSAPP_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (error) {
        console.error('Error enviando respuesta:', error.response?.data || error.message);
      }
    }
    return res.status(200).send('EVENT_RECEIVED');
  }

  return res.status(405).send('Método no permitido');
}
