import { processImage } from './lib/image-processor.mjs';

export const handler = async (event) => {
  try {
    const imageS3Key = event.imageS3Key;

    if (!imageS3Key) {
      throw new Error('imageS3Key is required');
    }

    const albums = await processImage(imageS3Key);

    return {
      albums
    };
  } catch (error) {
    console.error('Image processor error:', error);
    throw error;
  }
};
