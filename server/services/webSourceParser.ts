import axios from 'axios';
import * as cheerio from 'cheerio';
import { storage } from '../storage';
import { translationService } from './translationService';
import { db } from '../db';
import { webSources } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import type { WebSource } from '../../shared/schema';
import { webSocketService } from './websocketService';

interface ParsedWebItem {
  id: string;
  title: string;
  content: string;
  url?: string;
  publishedDate: Date;
  images: string[];
}

export class WebSourceParserService {
  private parsingInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  async startParsing(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🌍 Starting web source parsing service...');
    
    // Parse web sources every 5 minutes
    this.parsingInterval = setInterval(async () => {
      await this.parseAllWebSources();
    }, 300000);
    
    // Initial parse after 15 seconds
    setTimeout(() => this.parseAllWebSources(), 15000);
  }

  async stopParsing(): Promise<void> {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.parsingInterval) {
      clearInterval(this.parsingInterval);
      this.parsingInterval = null;
    }
    
    console.log('🛑 Web source parsing service stopped');
  }

  private async parseAllWebSources(): Promise<void> {
    try {
      const webSources = await storage.getWebSources();
      const activeWebSources = webSources.filter(source => source.isActive);
      
      console.log(`🌍 Parsing ${activeWebSources.length} active web sources...`);
      
      for (const source of activeWebSources) {
        await this.parseWebSource(source);
        // Add delay between sources to be polite
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Error in parseAllWebSources:', errorMessage);
    }
  }

  async parseWebSource(webSource: WebSource): Promise<void> {
    try {
      console.log(`🔍 Parsing web source: ${webSource.name} (${webSource.type})`);
      
      // Notify WebSocket clients that parsing started
      webSocketService.webParsingStarted(webSource.id, webSource.name, webSource.type as 'rss' | 'html');
      
      let items: ParsedWebItem[] = [];
      
      if (webSource.type === 'rss') {
        items = await this.parseRSSFeed(webSource);
      } else if (webSource.type === 'html') {
        items = await this.parseHTMLPage(webSource);
      }
      
      console.log(`📋 Found ${items.length} items from ${webSource.name}`);
      
      // Notify WebSocket clients about parsing progress
      webSocketService.webParsingProgress(webSource.id, webSource.name, items.length);
      
      // Process new items
      let processedCount = 0;
      for (const item of items) {
        await this.processWebItem(item, webSource);
        processedCount++;
      }
      
      // Update last parsed timestamp (direct DB update since lastParsed is not in InsertWebSource)
      await db.update(webSources).set({ 
        lastParsed: new Date(),
        updatedAt: new Date() 
      }).where(eq(webSources.id, webSource.id));
      
      // Notify WebSocket clients that parsing completed
      webSocketService.webParsingCompleted(webSource.id, webSource.name, processedCount);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error parsing web source ${webSource.name}:`, errorMessage);
      
      // Notify WebSocket clients about the error
      webSocketService.parsingError(webSource.name, errorMessage);
      
      await storage.createActivityLog({
        type: 'web_parsing_failed',
        description: `Failed to parse web source ${webSource.name}: ${errorMessage}`,
      });
    }
  }

  private async parseRSSFeed(webSource: WebSource): Promise<ParsedWebItem[]> {
    try {
      const response = await axios.get(webSource.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TelegramBot/1.0)',
        },
        timeout: 10000,
      });
      
      const $ = cheerio.load(response.data, { xmlMode: true });
      const items: ParsedWebItem[] = [];
      
      // Parse RSS 2.0 format
      $('item').each((index, element) => {
        const $item = $(element);
        const title = $item.find('title').text().trim();
        const description = $item.find('description').text().trim();
        const link = $item.find('link').text().trim();
        const pubDate = $item.find('pubDate').text().trim();
        const guid = $item.find('guid').text().trim() || link || `${webSource.id}-${index}`;
        
        if (title && description) {
          // Extract images from content
          const images = this.extractImages(description);
          
          items.push({
            id: guid,
            title,
            content: this.cleanContent(description),
            url: link,
            publishedDate: pubDate ? new Date(pubDate) : new Date(),
            images,
          });
        }
      });
      
      // Parse Atom format as fallback
      if (items.length === 0) {
        $('entry').each((index, element) => {
          const $entry = $(element);
          const title = $entry.find('title').text().trim();
          const content = $entry.find('content').text().trim() || 
                         $entry.find('summary').text().trim();
          const link = $entry.find('link[rel="alternate"]').attr('href') || 
                      $entry.find('link').attr('href') || '';
          const published = $entry.find('published').text().trim() || 
                           $entry.find('updated').text().trim();
          const id = $entry.find('id').text().trim() || link || `${webSource.id}-${index}`;
          
          if (title && content) {
            const images = this.extractImages(content);
            
            items.push({
              id,
              title,
              content: this.cleanContent(content),
              url: link,
              publishedDate: published ? new Date(published) : new Date(),
              images,
            });
          }
        });
      }
      
      return items.slice(0, 10); // Limit to latest 10 items
      
    } catch (error: unknown) {
      console.error('Error parsing RSS feed:', error);
      return [];
    }
  }

  private async parseHTMLPage(webSource: WebSource): Promise<ParsedWebItem[]> {
    try {
      const response = await axios.get(webSource.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
      });
      
      const $ = cheerio.load(response.data);
      const items: ParsedWebItem[] = [];
      
      // If no selector provided, try common article selectors
      const selectors = webSource.selector ? 
        [webSource.selector] : 
        [
          'article', 
          '.article', 
          '.post', 
          '.news-item', 
          '.entry', 
          '.content-item',
          'main article',
          '[role="article"]',
          'h1, h2, h3', // Fallback to headings
        ];
      
      console.log(`🔍 HTML parsing ${webSource.name}: trying selectors [${selectors.join(', ')}]`);
      
      // Try each selector until we find content
      for (const selector of selectors) {
        const elements = $(selector);
        console.log(`   → Selector "${selector}": found ${elements.length} elements`);
        
        if (elements.length === 0) continue;
        
        elements.each((index, element) => {
        const $el = $(element);
        
        // Try to extract title from various elements
        const title = $el.find('h1, h2, h3, .title, [class*="title"]').first().text().trim() ||
                     $el.attr('title') ||
                     $el.text().substring(0, 100).trim() ||
                     `Article ${index + 1}`;
        
        // Get the main content
        const content = $el.text().trim();
        
        // Try to find a link
        const link = $el.find('a').first().attr('href') || 
                    $el.closest('a').attr('href') || '';
        
        // Make relative URLs absolute
        const absoluteUrl = link.startsWith('http') ? link : 
                           link.startsWith('/') ? new URL(link, webSource.url).href : '';
        
        // Extract images
        const images = this.extractImagesFromElement($el);
        
          if (content && content.length > 50) { // Only process substantial content
            console.log(`   ✅ Found content: "${title.substring(0, 50)}..."`);
            items.push({
              id: `${webSource.id}-${index}-${Date.now()}`,
              title,
              content: this.cleanContent(content),
              url: absoluteUrl,
              publishedDate: new Date(),
              images,
            });
          }
        });
        
        // If we found items with this selector, stop trying others
        if (items.length > 0) {
          console.log(`   ✅ Using selector "${selector}": found ${items.length} items`);
          break;
        }
      }
      
      if (items.length === 0) {
        console.log(`   ❌ No content found with any selector on ${webSource.url}`);
      }
      
      return items.slice(0, 5); // Limit to 5 items for HTML parsing
      
    } catch (error: unknown) {
      console.error('Error parsing HTML page:', error);
      return [];
    }
  }

  private extractImages(content: string): string[] {
    const images: string[] = [];
    const $ = cheerio.load(content);
    
    $('img').each((index, element) => {
      const src = $(element).attr('src');
      if (src && this.isValidImageUrl(src)) {
        images.push(src);
      }
    });
    
    return images;
  }

  private extractImagesFromElement($element: cheerio.Cheerio<any>): string[] {
    const images: string[] = [];
    
    $element.find('img').each((index, element) => {
      const src = $element.find(element).attr('src');
      if (src && this.isValidImageUrl(src)) {
        images.push(src);
      }
    });
    
    return images;
  }

  private isValidImageUrl(url: string): boolean {
    try {
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const urlObj = new URL(url, 'https://example.com'); // Handle relative URLs
      const pathname = urlObj.pathname.toLowerCase();
      return validExtensions.some(ext => pathname.includes(ext)) || 
             url.includes('image') || 
             url.includes('photo');
    } catch {
      return false;
    }
  }

  private cleanContent(content: string): string {
    // Remove HTML tags
    const $ = cheerio.load(content);
    let cleanText = $.text();
    
    // Clean up whitespace and formatting
    cleanText = cleanText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    // Limit length
    if (cleanText.length > 2000) {
      cleanText = cleanText.substring(0, 2000) + '...';
    }
    
    return cleanText;
  }

  private async processWebItem(item: ParsedWebItem, webSource: WebSource): Promise<void> {
    try {
      // Check if this item already exists as a draft
      const existingDraft = await storage.getDraftPostByOriginalId(
        item.id,
        undefined, // No channel pair for web sources
        webSource.id
      );

      if (existingDraft) {
        console.log(`📝 Draft already exists for web item ${item.id}, skipping...`);
        return;
      }

      let content = `${item.title}\n\n${item.content}`;
      if (item.url) {
        content += `\n\n🔗 ${item.url}`;
      }

      // Try to translate if needed
      try {
        const translationResult = await translationService.translateToRussian(content);
        if (translationResult.wasTranslated) {
          content = translationResult.translatedText;
          console.log(`✅ Translated web item from ${translationResult.detectedLanguage} → Russian`);
        }
      } catch (translationError) {
        console.error('❌ Translation failed for web item:', translationError);
      }

      // Create draft post from web content
      const draftPost = await storage.createDraftPost({
        webSourceId: webSource.id,
        originalPostId: item.id,
        originalContent: `${item.title}\n\n${item.content}`,
        content: content,
        mediaUrls: item.images,
        status: 'draft',
        sourceUrl: item.url || webSource.url,
      });

      console.log(`📝 Created draft from web source: ${draftPost.id}`);
      
      // Notify WebSocket clients about new draft
      webSocketService.draftCreated(webSource.name, item.title);

      // Log activity
      await storage.createActivityLog({
        type: 'web_content_parsed',
        description: `New content parsed from ${webSource.name}: "${item.title}"`,
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error processing web item:`, errorMessage);
      
      await storage.createActivityLog({
        type: 'web_content_failed',
        description: `Failed to process web content from ${webSource.name}: ${errorMessage}`,
      });
    }
  }

  async parseSourceManually(webSourceId: string): Promise<void> {
    try {
      const webSource = await storage.getWebSource(webSourceId);
      if (!webSource) {
        throw new Error('Web source not found');
      }

      await this.parseWebSource(webSource);
      
    } catch (error) {
      console.error('Manual parsing error:', error);
      throw error;
    }
  }
}

export const webSourceParserService = new WebSourceParserService();