import { GoogleGenAI, Type } from "@google/genai";
import { LottieFile, GeminiAnalysisResult } from "../types";

const parseLottieForPrompt = (json: LottieFile): string => {
  // We create a simplified summary to avoid token limits with massive JSONs
  const summary = {
    name: json.nm,
    width: json.w,
    height: json.h,
    frameRate: json.fr,
    inPoint: json.ip,
    outPoint: json.op,
    totalLayers: json.layers?.length || 0,
    hasAssets: json.assets?.length > 0,
    // Extract names of first 5 layers to give context
    sampleLayers: json.layers?.slice(0, 5).map((l: any) => l.nm || 'Unnamed Layer'),
  };
  return JSON.stringify(summary, null, 2);
};

export const analyzeAnimation = async (lottieData: LottieFile): Promise<GeminiAnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing in environment variables");
  }

  const ai = new GoogleGenAI({ apiKey });
  const simplifiedJson = parseLottieForPrompt(lottieData);

  const prompt = `
    Analyze this summary of a Lottie/Jitter animation JSON file:
    ${simplifiedJson}

    Provide a response in JSON format containing:
    1. 'summary': A brief, professional description of what this animation likely represents based on layer names and metadata.
    2. 'technicalDetails': A string describing duration (calculated from op-ip/fr), resolution, and complexity.
    3. 'creativeSuggestions': Ideas on where this animation would be best used (e.g., loading screen, hero section).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            technicalDetails: { type: Type.STRING },
            creativeSuggestions: { type: Type.STRING },
          },
          required: ["summary", "technicalDetails", "creativeSuggestions"],
        },
      },
    });

    const result = JSON.parse(response.text);
    return result as GeminiAnalysisResult;

  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze animation with Gemini.");
  }
};
