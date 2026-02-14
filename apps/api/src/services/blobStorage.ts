/**
 * Azure Blob Storage service for managing generated images and scenario metadata.
 */

import { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import type { InvocationContext } from '@azure/functions';

export interface BlobUploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface SASUrlOptions {
  expiresInHours?: number;
  permissions?: string;
}

/**
 * Service for interacting with Azure Blob Storage.
 */
export class BlobStorageService {
  private blobServiceClient?: BlobServiceClient;
  private accountName: string;
  private accountKey?: string;
  private containerName: string;

  constructor(private context: InvocationContext) {
    this.accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || '';
    this.accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'generated-images';
  }

  /**
   * Initialize the blob service client with credentials.
   */
  private async getClient(): Promise<BlobServiceClient> {
    if (this.blobServiceClient) {
      return this.blobServiceClient;
    }

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

    if (connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    } else if (this.accountName && this.accountKey) {
      const credential = new StorageSharedKeyCredential(this.accountName, this.accountKey);
      this.blobServiceClient = new BlobServiceClient(
        `https://${this.accountName}.blob.core.windows.net`,
        credential
      );
    } else {
      // Use managed identity
      const credential = new DefaultAzureCredential();
      this.blobServiceClient = new BlobServiceClient(
        `https://${this.accountName}.blob.core.windows.net`,
        credential
      );
    }

    return this.blobServiceClient;
  }

  /**
   * Upload an image to blob storage.
   */
  async uploadImage(
    scenarioId: string,
    viewpoint: string,
    imageData: Buffer,
    options?: BlobUploadOptions
  ): Promise<string> {
    const client = await this.getClient();
    const containerClient = client.getContainerClient(this.containerName);

    // Ensure container exists
    await containerClient.createIfNotExists({ access: 'blob' });

    const blobName = `${scenarioId}/${viewpoint}.png`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.upload(imageData, imageData.length, {
      blobHTTPHeaders: {
        blobContentType: options?.contentType || 'image/png',
      },
      metadata: options?.metadata,
    });

    this.context.log('Uploaded image to blob storage', { scenarioId, viewpoint, blobName });

    return blockBlobClient.url;
  }

  /**
   * Upload scenario metadata to blob storage.
   */
  async uploadMetadata(scenarioId: string, metadata: unknown): Promise<string> {
    const client = await this.getClient();
    const containerClient = client.getContainerClient('scenario-data');

    // Ensure container exists
    await containerClient.createIfNotExists();

    const blobName = `${scenarioId}/metadata.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const metadataJson = JSON.stringify(metadata, null, 2);
    const buffer = Buffer.from(metadataJson, 'utf-8');

    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: 'application/json',
      },
    });

    this.context.log('Uploaded metadata to blob storage', { scenarioId, blobName });

    return blockBlobClient.url;
  }

  /**
   * Generate a SAS URL for read-only access to a blob.
   */
  async generateSASUrl(blobUrl: string, options?: SASUrlOptions): Promise<string> {
    if (!this.accountKey) {
      // If using managed identity, return the URL as-is (container must be public)
      this.context.warn('No storage account key available for SAS generation, returning blob URL');
      return blobUrl;
    }

    const expiresInHours = options?.expiresInHours || 24;
    const permissions = options?.permissions || 'r';

    const url = new URL(blobUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const containerName = pathParts[0];
    const blobName = pathParts.slice(1).join('/');

    const credential = new StorageSharedKeyCredential(this.accountName, this.accountKey);

    const expiresOn = new Date();
    expiresOn.setHours(expiresOn.getHours() + expiresInHours);

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse(permissions),
        startsOn: new Date(),
        expiresOn,
      },
      credential
    ).toString();

    return `${blobUrl}?${sasToken}`;
  }

  /**
   * Get metadata for a scenario.
   */
  async getMetadata(scenarioId: string): Promise<unknown> {
    const client = await this.getClient();
    const containerClient = client.getContainerClient('scenario-data');
    const blobName = `${scenarioId}/metadata.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const downloadResponse = await blockBlobClient.download(0);
    
    if (!downloadResponse.readableStreamBody) {
      throw new Error('No readable stream available for download');
    }
    
    const downloaded = await this.streamToBuffer(downloadResponse.readableStreamBody);
    return JSON.parse(downloaded.toString('utf-8'));
  }

  /**
   * Helper to convert stream to buffer.
   */
  private async streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      readableStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      readableStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      readableStream.on('error', reject);
    });
  }
}
