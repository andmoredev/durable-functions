/**
 * Simple Hello World Lambda function for durable function invoke example
 */

export const handler = async (event) => {
  console.log('Hello World function invoked with event:', JSON.stringify(event, null, 2));

  const { name = 'World', message = 'Hello' } = event;

  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 100));

  const response = {
    statusCode: 200,
    greeting: `${message}, ${name}!`,
    timestamp: new Date().toISOString(),
    processedBy: 'hello-world-function',
    inputReceived: event
  };

  console.log('Hello World function returning:', JSON.stringify(response, null, 2));

  return response;
};