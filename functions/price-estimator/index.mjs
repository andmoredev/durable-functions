import { estimatePrice } from './lib/price-estimator.mjs';

export const handler = async (event) => {
  try {
    const album = event.album;

    if (!album) {
      throw new Error('album is required');
    }

    const priceData = await estimatePrice(album);

    return {
      albumIndex: album.albumIndex,
      ...priceData
    };
  } catch (error) {
    console.error('Price estimator error:', error);
    throw error;
  }
};
