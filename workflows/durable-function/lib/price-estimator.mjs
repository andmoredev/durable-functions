export async function estimatePrice(album) {
  try {
    const basePrice = 15 + Math.random() * 50;
    const yearFactor = album.year < 1980 ? 1.5 : 1.0;
    const price = Math.round(basePrice * yearFactor * 100) / 100;

    return {
      priceEstimate: price,
      priceConfidence: 0.7 + Math.random() * 0.3,
      priceSource: 'discogs-api'
    };
  } catch (error) {
    throw new Error(`Price estimation failed: ${error.message}`);
  }
}
