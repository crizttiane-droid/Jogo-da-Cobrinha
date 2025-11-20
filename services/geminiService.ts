import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

try {
  // Initialize safe referencing of the API key
  if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
} catch (error) {
  console.error("Failed to initialize Gemini client:", error);
}

export const getGameOverCommentary = async (score: number, highScore: number): Promise<string> => {
  if (!ai) {
    return "Fim de Jogo! (IA indisponível)";
  }

  try {
    const model = 'gemini-2.5-flash';
    const isNewRecord = score > highScore && score > 0;
    
    const systemInstruction = `Você é uma personalidade sarcástica de uma máquina de arcade retrô (tipo a GLaDOS, mas para o jogo da Cobrinha). 
    Responda sempre em Português do Brasil.
    Mantenha sua resposta extremamente curta (máx 1 frase). 
    Se a pontuação for baixa (< 5), zombe brutalmente do jogador. 
    Se a pontuação for razoável (5-20), faça um elogio duvidoso ou sarcástico.
    Se a pontuação for alta (> 20), fique impressionado a contragosto.
    ${isNewRecord ? "O JOGADOR ACABOU DE BATER O RECORDE! Mencione isso gritando." : ""}`;

    const response = await ai.models.generateContent({
      model,
      contents: `O jogador morreu com uma pontuação de ${score}.`,
      config: {
        systemInstruction,
        maxOutputTokens: 60,
        temperature: 1.0,
      },
    });

    return response.text || "Fim de Jogo!";
  } catch (error) {
    console.error("Error fetching Gemini commentary:", error);
    return "Fim de Jogo! (Conexão perdida)";
  }
};