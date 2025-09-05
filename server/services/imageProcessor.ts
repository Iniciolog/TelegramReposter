import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

export class ImageProcessor {
  async processImage(
    inputBuffer: Buffer,
    options: {
      addWatermark?: boolean;
      watermarkText?: string;
      optimizeSize?: boolean;
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
    } = {}
  ): Promise<Buffer> {
    try {
      let image = sharp(inputBuffer);

      // Get image metadata
      const metadata = await image.metadata();
      
      // Optimize size if requested
      if (options.optimizeSize) {
        const maxWidth = options.maxWidth || 1920;
        const maxHeight = options.maxHeight || 1080;
        
        if (metadata.width && metadata.width > maxWidth) {
          image = image.resize(maxWidth, null, {
            withoutEnlargement: true,
            fit: 'inside'
          });
        }
        
        if (metadata.height && metadata.height > maxHeight) {
          image = image.resize(null, maxHeight, {
            withoutEnlargement: true,
            fit: 'inside'
          });
        }
      }

      // Add watermark if requested
      if (options.addWatermark && options.watermarkText) {
        const watermarkSvg = this.createWatermarkSvg(
          options.watermarkText,
          metadata.width || 1920,
          metadata.height || 1080
        );

        image = image.composite([{
          input: Buffer.from(watermarkSvg),
          gravity: 'southeast'
        }]);
      }

      // Apply compression based on format
      if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
        image = image.jpeg({ 
          quality: options.quality || 85,
          progressive: true 
        });
      } else if (metadata.format === 'png') {
        image = image.png({ 
          quality: options.quality || 85,
          compressionLevel: 8 
        });
      } else if (metadata.format === 'webp') {
        image = image.webp({ 
          quality: options.quality || 85 
        });
      }

      return await image.toBuffer();
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  }

  private createWatermarkSvg(text: string, width: number, height: number): string {
    const fontSize = Math.max(width * 0.02, 12);
    const padding = 20;
    
    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feMorphology operator="dilate" radius="1"/>
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/> 
            </feMerge>
          </filter>
        </defs>
        <text 
          x="${width - padding}" 
          y="${height - padding}" 
          font-family="Arial, sans-serif" 
          font-size="${fontSize}" 
          fill="white" 
          text-anchor="end" 
          filter="url(#shadow)"
          opacity="0.8"
        >${text}</text>
      </svg>
    `;
  }

  async removeExifData(inputBuffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(inputBuffer)
        .withMetadata(false)
        .toBuffer();
    } catch (error) {
      console.error('Error removing EXIF data:', error);
      throw error;
    }
  }

  async convertToFormat(
    inputBuffer: Buffer, 
    format: 'jpeg' | 'png' | 'webp',
    quality: number = 85
  ): Promise<Buffer> {
    try {
      let image = sharp(inputBuffer);

      switch (format) {
        case 'jpeg':
          image = image.jpeg({ quality, progressive: true });
          break;
        case 'png':
          image = image.png({ quality, compressionLevel: 8 });
          break;
        case 'webp':
          image = image.webp({ quality });
          break;
      }

      return await image.toBuffer();
    } catch (error) {
      console.error('Error converting image format:', error);
      throw error;
    }
  }
}

export const imageProcessor = new ImageProcessor();
