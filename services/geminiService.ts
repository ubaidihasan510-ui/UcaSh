import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

// NOTE: In a real production app, this call would go through your own backend
// to protect the API key. For this simulation, we access it directly.

export const generateFinancialAdvice = async (
  query: string, 
  transactions: Transaction[],
  currentBalance: number
): Promise<string> => {
  
  if (!process.env.API_KEY) {
    return "API Key is missing. Please configure the environment.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare context from user data
  const recentTx = transactions.slice(0, 10).map(t => 
    `- ${t.type} of $${t.amount} on ${new Date(t.timestamp).toLocaleDateString()} (${t.status})`
  ).join('\n');

  const systemPrompt = `
    You are UcaSh AI, a helpful and friendly financial assistant for the UcaSh wallet app.
    
    User Context:
    - Current Balance: $${currentBalance}
    - Recent Transactions:
    ${recentTx}

    Your goal is to answer the user's question, provide spending insights, or help them draft notes for payments. 
    Keep answers concise (under 100 words), professional, yet conversational.
    If the user asks to perform an action (like "send money"), guide them to use the dashboard buttons.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        systemInstruction: systemPrompt,
      }
    });
    
    return response.text || "I couldn't generate a response at this time.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Sorry, I'm having trouble connecting to the brain right now. Please try again.";
  }
};
