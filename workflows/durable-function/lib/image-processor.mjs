import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_DEFAULT_REGION });
const s3Client = new S3Client({ region: process.env.AWS_DEFAULT_REGION });

export async function processImage(imageS3Key) {
  const getObjectResponse = await s3Client.send(new GetObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: imageS3Key
  }));

  const imageBytes = await getObjectResponse.Body.transformToByteArray();

  const prompt = `Analyze this image of 6 vinyl albums. Extract:
- Album name
- Artist
- Year
Return as JSON array with 6 objects in this exact format:
[{"albumName": "...", "artist": "...", "year": 1973}, ...]`;

  const response = await bedrockClient.send(new ConverseCommand({
    modelId: process.env.BEDROCK_MODEL_ID,
    messages: [
      {
        role: 'user',
        content: [
          {
            image: {
              format: 'jpeg',
              source: {
                bytes: imageBytes
              }
            }
          },
          {
            text: prompt
          }
        ]
      }
    ]
  }));

  const responseText = response.output.message.content[0].text;
  const albums = JSON.parse(responseText);

  return albums.map((album, index) => ({
    albumIndex: index + 1,
    albumName: album.albumName,
    artist: album.artist,
    year: album.year,
    yearValidated: false
  }));
}
