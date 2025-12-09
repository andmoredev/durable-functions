import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

const mockS3Send = vi.fn();
const mockBedrockSend = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: mockS3Send
  })),
  GetObjectCommand: vi.fn()
}));

vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: vi.fn(() => ({
    send: mockBedrockSend
  })),
  ConverseCommand: vi.fn()
}));

const { processImage } = await import('../../workflows/durable-function/lib/image-processor.mjs');

describe('Image Processor - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Property 6: Exact Album Count - **Feature: album-registration-system, Property 6: Exact Album Count** - **Validates: Requirements 2.2**', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            albumName: fc.string({ minLength: 1, maxLength: 100 }),
            artist: fc.string({ minLength: 1, maxLength: 100 }),
            year: fc.integer({ min: 1900, max: 2100 })
          }),
          { minLength: 6, maxLength: 6 }
        ),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (mockAlbums, imageKey) => {
          const mockImageBytes = new Uint8Array([1, 2, 3, 4]);

          mockS3Send.mockResolvedValue({
            Body: {
              transformToByteArray: async () => mockImageBytes
            }
          });

          mockBedrockSend.mockResolvedValue({
            output: {
              message: {
                content: [
                  {
                    text: JSON.stringify(mockAlbums)
                  }
                ]
              }
            }
          });

          const result = await processImage(imageKey);

          expect(result).toHaveLength(6);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7: Album Data Completeness - **Feature: album-registration-system, Property 7: Album Data Completeness** - **Validates: Requirements 2.3**', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            albumName: fc.string({ minLength: 1, maxLength: 100 }),
            artist: fc.string({ minLength: 1, maxLength: 100 }),
            year: fc.integer({ min: 1900, max: 2100 })
          }),
          { minLength: 6, maxLength: 6 }
        ),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (mockAlbums, imageKey) => {
          const mockImageBytes = new Uint8Array([1, 2, 3, 4]);

          mockS3Send.mockResolvedValue({
            Body: {
              transformToByteArray: async () => mockImageBytes
            }
          });

          mockBedrockSend.mockResolvedValue({
            output: {
              message: {
                content: [
                  {
                    text: JSON.stringify(mockAlbums)
                  }
                ]
              }
            }
          });

          const result = await processImage(imageKey);

          result.forEach(album => {
            expect(album).toHaveProperty('albumName');
            expect(album).toHaveProperty('artist');
            expect(album).toHaveProperty('year');
            expect(album.albumName).toBeTruthy();
            expect(album.artist).toBeTruthy();
            expect(typeof album.year).toBe('number');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: Album Index Uniqueness - **Feature: album-registration-system, Property 8: Album Index Uniqueness** - **Validates: Requirements 2.4**', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            albumName: fc.string({ minLength: 1, maxLength: 100 }),
            artist: fc.string({ minLength: 1, maxLength: 100 }),
            year: fc.integer({ min: 1900, max: 2100 })
          }),
          { minLength: 6, maxLength: 6 }
        ),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (mockAlbums, imageKey) => {
          const mockImageBytes = new Uint8Array([1, 2, 3, 4]);

          mockS3Send.mockResolvedValue({
            Body: {
              transformToByteArray: async () => mockImageBytes
            }
          });

          mockBedrockSend.mockResolvedValue({
            output: {
              message: {
                content: [
                  {
                    text: JSON.stringify(mockAlbums)
                  }
                ]
              }
            }
          });

          const result = await processImage(imageKey);

          const indices = result.map(album => album.albumIndex);
          const uniqueIndices = new Set(indices);

          expect(uniqueIndices.size).toBe(6);
          expect(Math.min(...indices)).toBe(1);
          expect(Math.max(...indices)).toBe(6);
        }
      ),
      { numRuns: 100 }
    );
  });
});
