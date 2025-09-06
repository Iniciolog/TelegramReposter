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
      removeOriginalBranding?: boolean;
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

      // Remove original branding if requested (crop bottom area where watermarks usually are)
      if (options.removeOriginalBranding) {
        const width = metadata.width || 1920;
        const height = metadata.height || 1080;
        
        // Crop bottom 5% where watermarks/logos are typically placed
        const cropHeight = Math.floor(height * 0.95);
        image = image.extract({
          left: 0,
          top: 0,
          width: width,
          height: cropHeight
        });
      }

      // Add watermark if requested
      if (options.addWatermark && options.watermarkText) {
        const currentMetadata = await image.metadata();
        const watermarkSvg = this.createWatermarkSvg(
          options.watermarkText,
          currentMetadata.width || 1920,
          currentMetadata.height || 1080
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
        .withMetadata({})
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
