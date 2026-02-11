import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/index.js';
import { v4 as uuidv4 } from 'uuid';

const s3Client = config.aws.accessKeyId
  ? new S3Client({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    })
  : null;

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-rar-compressed',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export interface UploadResult {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export class UploadService {
  private bucketName: string;

  constructor() {
    this.bucketName = config.aws.bucketName || 'helpdesk-uploads';
  }

  async uploadFile(
    file: Express.Multer.File,
    tenantId: string
  ): Promise<UploadResult> {
    if (!file) {
      throw new Error('No file provided');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds maximum limit of 10MB');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new Error('File type not allowed');
    }

    const ext = this.getExtension(file.originalname);
    const filename = `${tenantId}/${uuidv4()}${ext}`;

    if (s3Client) {
      return this.uploadToS3(file, filename);
    }

    return this.uploadToLocal(file, filename, tenantId);
  }

  private async uploadToS3(
    file: Express.Multer.File,
    filename: string
  ): Promise<UploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client!.send(command);

    const url = `https://${this.bucketName}.s3.${config.aws.region}.amazonaws.com/${filename}`;

    return {
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url,
    };
  }

  private async uploadToLocal(
    file: Express.Multer.File,
    filename: string,
    tenantId: string
  ): Promise<UploadResult> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const uploadDir = path.join(process.cwd(), 'uploads', tenantId);
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, file.buffer);

    return {
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/${filename}`,
    };
  }

  async deleteFile(filename: string): Promise<void> {
    if (s3Client) {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
      });
      await s3Client.send(command);
    } else {
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'uploads', filename);
      await fs.unlink(filePath).catch(() => {});
    }
  }

  async getSignedUrl(filename: string, expiresIn = 3600): Promise<string> {
    if (!s3Client) {
      return `/uploads/${filename}`;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: filename,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
  }

  private getExtension(filename: string): string {
    const ext = filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
    return ext ? `.${ext}` : '';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const uploadService = new UploadService();
