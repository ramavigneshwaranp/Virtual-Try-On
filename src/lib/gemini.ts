import { GoogleGenAI, Type } from "@google/genai";
import { UserAnalysis, DressSuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeUserImage(base64Image: string): Promise<UserAnalysis> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image,
        },
      },
      {
        text: "Analyze this person for a virtual fashion try-on. Identify their: 1. Body structure (Petite, Tall, Athletic, Curvy, Rectangular, Pear, or Apple) 2. Facial structure (Oval, Round, Square, Heart, Diamond, or Long) 3. Skin tone description 4. General style profile 5. key physical traits. Return ONLY a JSON object.",
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          bodyType: { type: Type.STRING },
          faceShape: { type: Type.STRING },
          skinTone: { type: Type.STRING },
          styleProfile: { type: Type.STRING },
          physicalTraits: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["bodyType", "faceShape", "skinTone", "styleProfile", "physicalTraits"],
      },
    },
  });

  return JSON.parse(response.text || "{}") as UserAnalysis;
}

export async function getDressSuggestions(analysis: UserAnalysis): Promise<DressSuggestion[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Based on this user analysis:
    Body Type: ${analysis.bodyType}
    Face Shape: ${analysis.faceShape}
    Skin Tone: ${analysis.skinTone}
    Style Profile: ${analysis.styleProfile}
    Physical Traits: ${analysis.physicalTraits.join(", ")}

    Suggest 3 unique dress styles that would look amazing on them. For each dress, provide:
    - Name
    - Detailed description
    - Style category
    - Recommended base color
    - Recommended fabric
    - Reasoning why it suits their anatomy and features.
    Return ONLY a JSON array of objects.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            style: { type: Type.STRING },
            baseColor: { type: Type.STRING },
            recommendedFabric: { type: Type.STRING },
            reasoning: { type: Type.STRING },
          },
          required: ["id", "name", "description", "style", "baseColor", "recommendedFabric", "reasoning"],
        },
      },
    },
  });

  return JSON.parse(response.text || "[]") as DressSuggestion[];
}

export async function visualizeTryOn(base64Image: string, dressPrompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image,
            mimeType: "image/jpeg",
          },
        },
        {
          text: `Apply this dress to the person in the image. The person's face and identity must be preserved exactly. The dress should be: ${dressPrompt}. Make it look like a high-quality, realistic photograph of the person wearing that specific dress. The lighting and environment should match the original photo.`,
        },
      ],
    },
    config: {
        imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
        }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("Failed to generate visualization");
}
