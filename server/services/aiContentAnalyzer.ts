import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import axios from 'axios';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export interface AnalyzedContent {
  title: string;
  description: string;
  content: string;
  telegramContent: string;
  images: string[];
  tags: string[];
  publishDate?: string;
  isValuable: boolean;
  valueScore: number;
  sourceUrl: string;
}

export interface ParsingProgress {
  status: 'analyzing' | 'extracting' | 'cleaning' | 'formatting' | 'completed' | 'error';
  message: string;
  progress: number;
}

export class AIContentAnalyzer {
  
  async analyzeAndCleanContent(
    url: string,
    htmlContent: string,
    onProgress?: (progress: ParsingProgress) => void
  ): Promise<AnalyzedContent> {
    
    onProgress?.({
      status: 'analyzing',
      message: 'Анализирую контент сайта...',
      progress: 10
    });

    // Parse HTML
    const $ = cheerio.load(htmlContent);
    
    // Remove unnecessary elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads, .cookie-banner').remove();
    
    onProgress?.({
      status: 'extracting',
      message: 'Извлекаю ценную информацию...',
      progress: 30
    });

    // Extract content
    const rawContent = this.extractMainContent($);
    const images = this.extractImages($, url);
    
    onProgress?.({
      status: 'cleaning',
      message: 'Очищаю и анализирую контент с помощью ИИ...',
      progress: 50
    });

    // AI analysis
    const aiAnalysis = await this.performAIAnalysis(rawContent, url);
    
    onProgress?.({
      status: 'formatting',
      message: 'Адаптирую контент для Telegram...',
      progress: 80
    });

    // Format for Telegram
    const telegramContent = await this.formatForTelegram(aiAnalysis.cleanContent, images);
    
    onProgress?.({
      status: 'completed',
      message: 'Анализ завершен!',
      progress: 100
    });

    return {
      title: aiAnalysis.title,
      description: aiAnalysis.description,
      content: aiAnalysis.cleanContent,
      telegramContent,
      images: images.filter(img => aiAnalysis.valuableImages.includes(img)),
      tags: aiAnalysis.tags,
      publishDate: this.extractPublishDate($),
      isValuable: aiAnalysis.isValuable,
      valueScore: aiAnalysis.valueScore,
      sourceUrl: url
    };
  }

  private extractMainContent($: cheerio.CheerioAPI): string {
    // Try different content selectors
    const contentSelectors = [
      'article',
      '.content',
      '.post-content',
      '.entry-content', 
      '.article-content',
      'main',
      '[role="main"]',
      '.main-content',
      'body'
    ];

    for (const selector of contentSelectors) {
      const content = $(selector).first();
      if (content.length && content.text().trim().length > 200) {
        return content.html() || '';
      }
    }

    return $('body').html() || '';
  }

  private extractImages($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const images: string[] = [];
    
    $('img').each((i, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('data-src');
      if (src) {
        try {
          const imageUrl = new URL(src, baseUrl).href;
          const width = parseInt($(elem).attr('width') || '0');
          const height = parseInt($(elem).attr('height') || '0');
          
          // Filter out small images (likely icons/ads)
          if (width > 200 || height > 200 || (!width && !height)) {
            images.push(imageUrl);
          }
        } catch (e) {
          // Skip invalid URLs
        }
      }
    });

    return images.slice(0, 10); // Limit to 10 images
  }

  private extractPublishDate($: cheerio.CheerioAPI): string | undefined {
    const dateSelectors = [
      'time[datetime]',
      '.published-date',
      '.post-date',
      '.article-date',
      '[itemprop="datePublished"]'
    ];

    for (const selector of dateSelectors) {
      const dateEl = $(selector).first();
      if (dateEl.length) {
        return dateEl.attr('datetime') || dateEl.text().trim();
      }
    }

    return undefined;
  }

  private async performAIAnalysis(htmlContent: string, url: string) {
    try {
      const prompt = `
Проанализируй HTML контент веб-страницы. Если это НЕ реклама, навигация или техническая информация, то считай контент ценным.

ЦЕННЫЙ КОНТЕНТ (80+ баллов):
- Статьи, новости, блог-посты
- Образовательный контент
- Инструкции и руководства
- Обзоры и аналитика
- Любая полезная информация для читателей

НЕ ЦЕННЫЙ КОНТЕНТ (менее 40 баллов):
- Только навигация или меню
- Только реклама
- Ошибки 404
- Технические страницы без контента

HTML контент:
${htmlContent.substring(0, 8000)}

URL: ${url}

ОТВЕЧАЙ ЛИБЕРАЛЬНО! Если есть текстовый контент больше 100 символов - это уже ценно.

Отвечай в формате JSON:
{
  "isValuable": boolean,
  "valueScore": number (0-100, будь щедрым!),
  "title": "заголовок статьи",
  "description": "краткое описание",
  "cleanContent": "очищенный текст статьи",
  "tags": ["тег1", "тег2"],
  "valuableImages": ["url1", "url2"],
  "contentType": "article|news|blog|other"
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "Ты либеральный эксперт по анализу веб-контента. БОЛЬШИНСТВО контента с текстом ценно для Telegram! Давай высокие оценки (70-90 баллов) любому контенту со статьями, новостями, постами. Низкие оценки только для чистой рекламы или технических страниц."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        isValuable: analysis.isValuable || false,
        valueScore: analysis.valueScore || 0,
        title: analysis.title || 'Без заголовка',
        description: analysis.description || '',
        cleanContent: analysis.cleanContent || '',
        tags: analysis.tags || [],
        valuableImages: analysis.valuableImages || [],
        contentType: analysis.contentType || 'other'
      };

    } catch (error) {
      console.error('AI analysis error:', error);
      // Fallback basic analysis
      const $ = cheerio.load(htmlContent);
      const title = $('h1').first().text() || $('title').text() || 'Без заголовка';
      const content = $('p').map((i, el) => $(el).text()).get().join('\n\n');
      
      // Более щедрый fallback анализ
      const wordCount = content.split(/\s+/).filter(word => word.length > 2).length;
      const hasStructure = content.includes('\n') || title.length > 10;
      
      let score = 40; // базовая оценка
      if (wordCount > 50) score += 20;
      if (wordCount > 100) score += 15;
      if (wordCount > 200) score += 10;
      if (hasStructure) score += 10;
      if (title.length > 20) score += 5;
      
      return {
        isValuable: content.length > 100, // понижен минимум
        valueScore: Math.min(score, 95), // максимум 95 баллов
        title,
        description: content.substring(0, 200),
        cleanContent: content,
        tags: [],
        valuableImages: [],
        contentType: 'other'
      };
    }
  }

  private async formatForTelegram(content: string, images: string[]): Promise<string> {
    try {
      const prompt = `
Адаптируй контент для публикации в Telegram:

1. Убери лишнее форматирование HTML
2. Сделай текст читаемым и структурированным
3. Добавь подходящие эмодзи для разделения разделов
4. Ограничь длину до 4000 символов
5. Сохрани основную информацию

Оригинальный контент:
${content.substring(0, 6000)}

Отформатируй для Telegram, сохранив суть и сделав текст привлекательным.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system", 
            content: "Ты эксперт по созданию контента для Telegram. Делай тексты читаемыми, структурированными и привлекательными. Используй эмодзи умеренно и по делу."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.4
      });

      let telegramContent = response.choices[0].message.content || content;
      
      // Add images if any
      if (images.length > 0) {
        telegramContent += '\n\n📸 Изображения:\n';
        images.slice(0, 3).forEach((img, i) => {
          telegramContent += `${i + 1}. ${img}\n`;
        });
      }

      return telegramContent.substring(0, 4000);

    } catch (error) {
      console.error('Telegram formatting error:', error);
      // Fallback simple cleaning
      return this.simpleCleanForTelegram(content);
    }
  }

  private simpleCleanForTelegram(content: string): string {
    // Simple text cleaning
    return content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n{3,}/g, '\n\n') // Limit line breaks
      .trim()
      .substring(0, 4000);
  }

  async downloadImage(imageUrl: string): Promise<Buffer | null> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ContentParser/1.0)'
        }
      });
      
      return Buffer.from(response.data);
    } catch (error) {
      console.error('Error downloading image:', error);
      return null;
    }
  }
}

export const aiContentAnalyzer = new AIContentAnalyzer();