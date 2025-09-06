import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const DEFAULT_MODEL = "gpt-5";

class TranslationService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required for translation service");
    }
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Detects the language of the given text and translates it to Russian if needed
   * @param text - The text to analyze and potentially translate
   * @returns Object containing original text, detected language, translated text (if needed), and whether translation was performed
   */
  async translateToRussian(text: string): Promise<{
    originalText: string;
    detectedLanguage: string;
    translatedText: string;
    wasTranslated: boolean;
  }> {
    if (!text || text.trim().length === 0) {
      return {
        originalText: text,
        detectedLanguage: 'unknown',
        translatedText: text,
        wasTranslated: false
      };
    }

    try {
      // First, detect the language and determine if translation is needed
      const detectionResponse = await this.openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a language detection expert. Analyze the given text and determine its primary language. 
            
            Rules:
            1. If the text is already in Russian, respond with "russian"
            2. If the text is in another language, respond with the language name in English (e.g., "english", "spanish", "french", etc.)
            3. If you can't determine the language or it's mixed, respond with "unknown"
            4. Only respond with the language name, nothing else.`
          },
          {
            role: "user",
            content: text
          }
        ],
        max_completion_tokens: 200
      });

      console.log('🔍 Full OpenAI response:', JSON.stringify(detectionResponse, null, 2));
      
      const detectedLanguage = detectionResponse.choices[0]?.message?.content?.toLowerCase().trim() || 'unknown';
      
      console.log('🔍 Raw OpenAI detection response:', JSON.stringify(detectionResponse.choices[0]?.message?.content));
      console.log('🔍 Processed detected language:', detectedLanguage);

      // If already Russian or language unknown, return as is
      if (detectedLanguage === 'russian' || detectedLanguage === 'unknown') {
        return {
          originalText: text,
          detectedLanguage,
          translatedText: text,
          wasTranslated: false
        };
      }

      // Translate to Russian
      const translationResponse = await this.openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the given text from ${detectedLanguage} to Russian.
            
            Important rules:
            1. Preserve the original meaning, tone, and style
            2. Keep formatting, line breaks, and structure intact
            3. Don't add explanations or comments
            4. If the text contains URLs, keep them unchanged
            5. If text contains @ mentions or hashtags, preserve them
            6. Maintain the emotional tone and context
            7. For specialized terms or brand names, use appropriate Russian transliterations
            8. Only provide the translated text, nothing else.`
          },
          {
            role: "user",
            content: text
          }
        ],
        max_completion_tokens: Math.max(1000, Math.floor(text.length * 1.5))
      });

      const translatedText = translationResponse.choices[0]?.message?.content?.trim() || text;

      console.log(`🌐 Translation: ${detectedLanguage} → Russian (${text.substring(0, 50)}...)`);

      return {
        originalText: text,
        detectedLanguage,
        translatedText,
        wasTranslated: true
      };

    } catch (error) {
      console.error('❌ Translation error:', error);
      // Return original text if translation fails
      return {
        originalText: text,
        detectedLanguage: 'error',
        translatedText: text,
        wasTranslated: false
      };
    }
  }

  /**
   * Batch translate multiple texts efficiently
   * @param texts - Array of texts to translate
   * @returns Array of translation results
   */
  async batchTranslate(texts: string[]): Promise<{
    originalText: string;
    detectedLanguage: string;
    translatedText: string;
    wasTranslated: boolean;
  }[]> {
    const results = [];
    
    // Process in batches to avoid rate limits
    for (const text of texts) {
      const result = await this.translateToRussian(text);
      results.push(result);
      
      // Small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  /**
   * Check if text is likely in Russian (simple heuristic)
   * @param text - Text to check
   * @returns true if text appears to be in Russian
   */
  isRussianText(text: string): boolean {
    // Simple check: if more than 50% of characters are Cyrillic
    const cyrillicChars = text.match(/[а-яё]/gi);
    const totalLetters = text.match(/[a-zA-Zа-яёА-ЯЁ]/g);
    
    if (!totalLetters || totalLetters.length < 10) {
      // For short texts, be more conservative
      return false;
    }
    
    const cyrillicRatio = cyrillicChars ? cyrillicChars.length / totalLetters.length : 0;
    return cyrillicRatio > 0.5;
  }
}

// Export singleton instance
export const translationService = new TranslationService();
export default translationService;