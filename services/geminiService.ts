import { GoogleGenAI } from "@google/genai";
import { Product, CartItem } from "../types";

// Initialize the client.
// We assume process.env.API_KEY is available as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MODEL_ID = 'gemini-3-flash-preview';

/**
 * Generates a creative product description based on name and category.
 */
export const generateProductDescription = async (name: string, category: string): Promise<string> => {
  if (!process.env.API_KEY) {
    return "API Key missing. Cannot generate description.";
  }

  try {
    const prompt = `Write a sophisticated, sales-oriented description (max 50 words) for a high-end fashion product.
    Product Name: ${name}
    Category: ${category}
    Tone: Luxurious, exclusive, persuasive.`;

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
    });

    return response.text || "No description generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to generate description. Please try again.";
  }
};

/**
 * Suggests cross-selling items or styling tips based on the current cart.
 */
export const getStylingAdvice = async (cartItems: CartItem[]): Promise<string> => {
  if (!process.env.API_KEY) return "AI Styling Assistant offline.";
  if (cartItems.length === 0) return "Add items to cart for styling advice.";

  try {
    const itemsList = cartItems.map(i => `${i.name} (${i.category})`).join(', ');
    const prompt = `I am a personal stylist at a luxury boutique.
    The customer has these items in their cart: ${itemsList}.
    Suggest 1-2 complementary items or a styling tip to complete the look.
    Keep it brief (under 60 words) and helpful.`;

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
    });

    return response.text || "No advice available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Could not retrieve styling advice.";
  }
};

/**
 * Analyzes sales data for insights.
 */
export const analyzeBusinessTrends = async (salesData: string): Promise<string> => {
  if (!process.env.API_KEY) return "AI Analyst offline.";

  try {
    const prompt = `Analyze this sales summary and give 3 key insights for the business owner in bullet points.
    Data: ${salesData}
    Focus on potential inventory actions or marketing focus.`;

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
    });

    return response.text || "Analysis failed.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Could not analyze data.";
  }
};
