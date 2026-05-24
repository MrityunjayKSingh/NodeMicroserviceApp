const kafka              = require('../config/kafka');
const { sendEmail }      = require('../email.service');

const consumer = kafka.consumer({ groupId: 'notification-service-group' });

// Map Kafka event types to email types
const EMAIL_EVENTS = new Set([
  'ORDER_CONFIRMED',
  'ORDER_FAILED',
  'ORDER_CANCELLED',
  'ORDER_SHIPPED',
  'ORDER_DELIVERED',
]);

const startConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'order.notification', fromBeginning: false });

  console.log('Notification Service Kafka consumer listening on: order.notification');

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const data = JSON.parse(message.value.toString());
        console.log(`[CONSUMER] order.notification received — type: ${data.type}, orderId: ${data.orderId}`);

        // Console log always
        console.log('========== NOTIFICATION ==========');
        console.log(`TO      : ${data.userEmail}`);
        console.log(`TYPE    : ${data.type}`);
        console.log(`ORDER   : #${data.orderId}`);
        console.log(`MESSAGE : ${data.message}`);
        console.log('==================================');

        // Send email for relevant event types
        if (EMAIL_EVENTS.has(data.type) && data.userEmail) {
          await sendEmail({
            to:   data.userEmail,
            type: data.type,
            data,
          });
        }
      } catch (err) {
        console.error('[CONSUMER] Error processing order.notification:', err.message);
      }
    },
  });
};

const disconnect = async () => {
  await consumer.disconnect();
};

module.exports = { startConsumer, disconnect };
