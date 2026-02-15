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
  private devMode: boolean;

  constructor(private context: InvocationContext) {
    this.accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || '';
    this.accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'generated-images';

    // Dev mode when no storage credentials are configured
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    this.devMode = !connectionString && !this.accountName;
    if (this.devMode) {
      this.context.log('[BlobStorage] Running in dev mode — images returned as data URLs, no Azure Storage required');
    }
  }

  /**
   * Initialize the blob service client with credentials.
   */
  private async getClient(): Promise<BlobServiceClient> {
    if (this.devMode) {
      throw new Error('BlobStorageService is in dev mode — no Azure Storage configured');
    }

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
    if (this.devMode) {
      const contentType = options?.contentType || 'image/png';
      const dataUrl = `data:${contentType};base64,${imageData.toString('base64')}`;
      this.context.log('[BlobStorage] Dev mode — returning data URL', { scenarioId, viewpoint });
      return dataUrl;
    }

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
    if (this.devMode) {
      this.context.log('[BlobStorage] Dev mode — skipping metadata upload', { scenarioId });
      return `dev://scenario-data/${scenarioId}/metadata.json`;
    }

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
    if (this.devMode) {
      return blobUrl; // data URL or dev:// URL, no SAS needed
    }

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
    if (this.devMode) {
      throw new Error(`Dev mode — no stored metadata for scenario ${scenarioId}`);
    }
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
   * List all scenarios from blob storage.
   * Returns metadata for all scenarios in the scenario-data container.
   */
  async listScenarios(): Promise<Array<{ scenarioId: string; metadata: unknown }>> {
    if (this.devMode) {
      this.context.log('[BlobStorage] Dev mode — returning empty scenario list');
      return [];
    }
    const client = await this.getClient();
    const containerClient = client.getContainerClient('scenario-data');

    const scenarios: Array<{ scenarioId: string; metadata: unknown }> = [];

    // List all blobs in the container
    for await (const blob of containerClient.listBlobsFlat()) {
      // Only process metadata.json files
      if (blob.name.endsWith('metadata.json')) {
        const scenarioId = blob.name.split('/')[0];
        try {
          const metadata = await this.getMetadata(scenarioId);
          scenarios.push({ scenarioId, metadata });
        } catch (error) {
          this.context.warn(`Failed to load metadata for scenario ${scenarioId}`, error);
        }
      }
    }

    return scenarios;
  }

  /**
   * Delete a scenario and all its associated blobs.
   * Removes images from generated-images container and metadata from scenario-data container.
   */
  async deleteScenario(scenarioId: string): Promise<void> {
    if (this.devMode) {
      this.context.log('[BlobStorage] Dev mode — skipping scenario deletion', { scenarioId });
      return;
    }
    const client = await this.getClient();

    // Delete images from generated-images container
    const imagesContainer = client.getContainerClient(this.containerName);
    for await (const blob of imagesContainer.listBlobsFlat({ prefix: `${scenarioId}/` })) {
      const blobClient = imagesContainer.getBlockBlobClient(blob.name);
      await blobClient.delete();
      this.context.log(`Deleted image blob: ${blob.name}`);
    }

    // Delete metadata from scenario-data container
    const metadataContainer = client.getContainerClient('scenario-data');
    for await (const blob of metadataContainer.listBlobsFlat({ prefix: `${scenarioId}/` })) {
      const blobClient = metadataContainer.getBlockBlobClient(blob.name);
      await blobClient.delete();
      this.context.log(`Deleted metadata blob: ${blob.name}`);
    }

    this.context.log(`Deleted scenario ${scenarioId} and all associated blobs`);
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
