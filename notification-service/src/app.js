require('dotenv').config();
const { startConsumer } = require('./kafka/consumer');

console.log('Starting Notification Service...');

startConsumer()
  .then(() => {
    console.log('Notification Service running — waiting for events');
  })
  .catch((err) => {
    console.error('Failed to start Notification Service:', err.message);
    process.exit(1);
  });
