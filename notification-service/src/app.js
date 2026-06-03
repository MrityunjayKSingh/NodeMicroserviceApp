require('dotenv').config();
const { startConsumer } = require('./kafka/consumer');

console.log('Starting Notification Service...');
console.log('KAFKA_BROKER:', process.env.KAFKA_BROKER);
console.log('KAFKA_CA_CERT present:', !!process.env.KAFKA_CA_CERT);
console.log('KAFKA_USERNAME:', process.env.KAFKA_USERNAME);

startConsumer()
  .then(() => {
    console.log('Notification Service running — waiting for events');
  })
  .catch((err) => {
    console.error('Failed to start Notification Service:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  });

// Keep process alive
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});