import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private configService: ConfigService) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    // Validate that all required credentials are present
    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.error(
        '❌ Cloudinary credentials are missing in environment variables',
      );
      this.logger.error(`Cloud Name: ${cloudName ? '✓' : '✗'}`);
      this.logger.error(`API Key: ${apiKey ? '✓' : '✗'}`);
      this.logger.error(`API Secret: ${apiSecret ? '✓' : '✗'}`);
      throw new InternalServerErrorException(
        'Cloudinary configuration is incomplete',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    this.logger.log('✅ Cloudinary service initialized');
    this.logger.log(`📦 Cloud Name: ${cloudName}`);
  }

  /**
   * Upload image to Cloudinary
   * @param file - Express.Multer.File
   * @param folder - Optional folder name in Cloudinary (e.g., 'skin-analysis', 'products')
   * @returns Promise with Cloudinary upload response containing URL
   */
  async uploadImage(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: folder || 'skinalyze',
        resource_type: 'auto' as const,
        transformation: [{ quality: 'auto:good' }, { fetch_format: 'auto' }],
      };

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error) {
            this.logger.error('Failed to upload image to Cloudinary:', error);
            return reject(error);
          }
          if (result) {
            this.logger.log(
              `Image uploaded successfully: ${result.secure_url}`,
            );
            resolve(result);
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Upload multiple images to Cloudinary
   */
  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder?: string,
  ): Promise<UploadApiResponse[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file, folder));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete image from Cloudinary
   * @param publicId - The public ID of the image to delete
   */
  async deleteImage(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Image deleted: ${publicId}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to delete image from Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Delete multiple images from Cloudinary
   */
  async deleteMultipleImages(publicIds: string[]): Promise<any> {
    try {
      const result = await cloudinary.api.delete_resources(publicIds);
      this.logger.log(`Deleted ${publicIds.length} images`);
      return result;
    } catch (error) {
      this.logger.error('Failed to delete images from Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Get image URL with transformations
   */
  getImageUrl(publicId: string, transformations?: any): string {
    return cloudinary.url(publicId, transformations);
  }
}
