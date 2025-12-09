export const handler = async (event) => {
  console.log('Price Estimator Event:', JSON.stringify(event, null, 2));
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Price estimator placeholder' })
  };
};
