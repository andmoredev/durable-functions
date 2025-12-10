import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

export async function processImage(imageS3Key) {
  const prompt = `Analyze this image of 6 vinyl albums. Extract the following information for each album:
- Album name
- Artist
- Year

Return as a JSON array with exactly 6 objects, each containing: albumName, artist, year.`;

  const response = await client.send(new InvokeModelCommand({
    modelId: process.env.BEDROCK_MODEL_ID || 'us.amazon.nova-lite-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      messages: [{
        role: 'user',
        content: [
          {
            image: {
              format: 'jpeg',
              source: {
                s3Location: {
                  uri: `s3://${process.env.BUCKET_NAME}/${imageS3Key}`
                }
              }
            }
          },
          { text: prompt }
        ]
      }],
      inferenceConfig: {
        max_new_tokens: 2000,
        temperature: 0.7
      }
    })
  }));

  const result = JSON.parse(new TextDecoder().decode(response.body));
  const content = result.output?.message?.content?.[0]?.text || '';

  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Could not extract JSON array from response');
  }

  const albums = JSON.parse(jsonMatch[0]);

  if (!Array.isArray(albums) || albums.length !== 6) {
    throw new Error(`Expected 6 albums, got ${albums?.length || 0}`);
  }

  return albums.map((album, index) => ({
    albumIndex: index + 1,
    albumName: album.albumName,
    artist: album.artist,
    year: album.year,
    yearValidated: false
  }));
}
