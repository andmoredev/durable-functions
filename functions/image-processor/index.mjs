export const handler = async (event) => {
  console.log('Image Processor Event:', JSON.stringify(event, null, 2));
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Image processor placeholder' })
  };
};
