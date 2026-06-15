import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Route for Snarky comments or hints
  app.post('/api/ai/comment', async (req, res) => {
    try {
      const { prompt, context } = req.body;
      const themeDetail = context?.theme === 'mechanic' ? 'Usa bromas, rimas o comentarios graciosos sobre autos, talleres mecánicos, chatarra, grasa de motor o piezas no funcionando.' :
                          context?.theme === 'cartoon' ? 'Usa bromas, rimas o analogías loquísimas de dibujos animados, caricaturas, caer por acantilados, yunques, o personajes ridículos.' : '';
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: {
          systemInstruction: `Eres un comentarista de IA sarcástico, burlón y súper divertido dentro de un juego de Sudoku. El jugador está en dificultad: ${context?.difficulty}. El tema visual es ${context?.theme || 'normal'}. 
          ${themeDetail}
          Suelta un comentario muy corto (máx 15 a 20 palabras) en ESPAÑOL basado en su acción. Sé cruel, loco, pero muy divertido y limpio (sin groserías, no ofender). Inventa expresiones únicas según te parezca la situación. Usa chistes, rimas o insultos sutiles sobre su nivel intelectual o la lentitud que tienen en pensar.`,
          temperature: 0.9,
        }
      });
      
      res.json({ text: response.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'AI failed to comment' });
    }
  });

  app.post('/api/ai/hint', async (req, res) => {
    try {
      const { grid, theme } = req.body;
      const themeDetail = theme === 'mechanic' ? 'Usa analogías de autos, motores o piezas.' :
                          theme === 'cartoon' ? 'Usa analogías de dibujos animados, yunques, y explosiones chistosas.' : 'acertijo cósmico o una burla sarcástica';
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `Aquí hay un Sudoku (0 es vacío). Da una pista útil pero súper misteriosa, loca y divertida en ESPAÑOL sin dar el número exacto, guiando a la persona a la celda correcta. Inventa palabras o expresiones divertidas, rimas o analogías loquísimas pero aptas para todo público. Enmárcalo como ${themeDetail}. Máximo 20 palabras.\n\nGrid:\n${JSON.stringify(grid)}`,
        config: {
          temperature: 0.9,
        }
      });
      
      res.json({ text: response.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'AI hint failed' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
