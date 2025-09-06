import { translationService } from './server/services/translationService.js';

async function testTranslation() {
  console.log('🧪 Testing translation service...');
  
  try {
    // Test English text
    const englishText = "Hello world! This is a test message in English that should be translated to Russian.";
    console.log('📝 Original text:', englishText);
    
    const result = await translationService.translateToRussian(englishText);
    
    console.log('🔍 Detection result:', result.detectedLanguage);
    console.log('✅ Was translated:', result.wasTranslated);
    console.log('🌐 Translated text:', result.translatedText);
    
    // Test Russian text
    console.log('\n--- Testing Russian text ---');
    const russianText = "Привет мир! Это тестовое сообщение на русском языке.";
    console.log('📝 Original text:', russianText);
    
    const result2 = await translationService.translateToRussian(russianText);
    
    console.log('🔍 Detection result:', result2.detectedLanguage);
    console.log('✅ Was translated:', result2.wasTranslated);
    console.log('🌐 Text result:', result2.translatedText);
    
  } catch (error) {
    console.error('❌ Translation test failed:', error);
  }
}

testTranslation();