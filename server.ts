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
      const safePrompt = String(prompt).slice(0, 500);
      const themeDetail = context?.theme === 'mechanic' ? 'Usa bromas, rimas o comentarios graciosos sobre autos, talleres mecánicos, chatarra, grasa de motor o piezas no funcionando.' :
                          context?.theme === 'cartoon' ? 'Usa bromas, rimas o analogías loquísimas de dibujos animados, caricaturas, caer por acantilados, yunques, o personajes ridículos.' : '';
      
      if (!process.env.GEMINI_API_KEY) {
        return res.json({ text: "Ups, la IA cósmica está apagada (Falta GEMINI_API_KEY)" });
      }
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: safePrompt,
        config: {
          systemInstruction: `Eres un comentarista de IA sarcástico, burlón y súper divertido dentro de un juego de Sudoku. El jugador está en dificultad: ${context?.difficulty}. El tema visual es ${context?.theme || 'normal'}. 
          ${themeDetail}
          Suelta un comentario muy corto (máx 15 a 20 palabras) en ESPAÑOL basado en su acción. Sé cruel, loco, pero muy divertido y limpio (sin groserías, no ofender). Inventa expresiones únicas según te parezca la situación. Usa chistes, rimas o insultos sutiles sobre su nivel intelectual o la lentitud que tienen en pensar.`,
          temperature: 0.9,
        }
      });
      
      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Gemini API Error:', error?.message || error);
      // Fallback response for 503 high demand or other errors
      res.json({ text: "IA temporalmente ocupada recargando inteligencia cósmica. ¡Sigue jugando!" });
    }
  });

  app.post('/api/ai/hint', async (req, res) => {
    try {
      const { grid, theme, difficulty } = req.body;
      const themeDetail = theme === 'mechanic' ? 'Usa analogías de autos, motores o piezas.' :
                          theme === 'cartoon' ? 'Usa analogías de dibujos animados, yunques, y explosiones chistosas.' : 'acertijo cósmico o una burla sarcástica';
      
      const strategyGuide = difficulty === 'easy' ? 'Hidden singles, Naked singles (casillas con una sola opción).' :
                            difficulty === 'medium' ? 'Naked pairs o Hidden pairs, y bloqueos de fila/columna.' :
                            difficulty === 'hard' ? 'Técnicas avanzadas como X-Wing, Y-Wing o Swordfish.' :
                            'Cadenas complejas, Forcing Chains, XYZ-Wing. Explica la técnica como el gran maestro absoluto.';

      if (!process.env.GEMINI_API_KEY) {
        return res.json({ text: "Ups, mi cerebro está desconectado (Falta GEMINI_API_KEY)." });
      }

      // Defensive limit
      const gridString = JSON.stringify(grid).slice(0, 1000);

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Aquí hay un Sudoku (0 es vacío). Da una pista estratégica útil ("Strategic Tip") explicando UNA técnica de resolución aplicable a la dificultad de este jugador: ${difficulty} (ej: ${strategyGuide}) en ESPAÑOL y guiándolo sin decirle exactamente qué número va dónde. Inventa palabras o expresiones divertidas, rimas o analogías loquísimas pero aptas para todo público. Enmárcalo como ${themeDetail}. Máximo 25 palabras.\n\nGrid:\n${gridString}`,
        config: {
          temperature: 0.9,
        }
      });
      
      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Gemini API Error (Hint):', error?.message || error);
      res.json({ text: "Los astros están nublados, no puedo ver una pista clara ahora mismo. ¡Tú puedes hacerlo!" });
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
