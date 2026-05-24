const kafka    = require('../config/kafka');
const OrderModel = require('../models/order.model');

const consumer = kafka.consumer({ groupId: 'order-service-group' });

const startConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'stock.updated', fromBeginning: false });

  console.log('Order Service Kafka consumer listening on: stock.updated');

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const data = JSON.parse(message.value.toString());
        console.log(`[CONSUMER] stock.updated received:`, data);

        if (data.status === 'success') {
          await OrderModel.updateStatus(data.orderId, 'confirmed');
          console.log(`[CONSUMER] Order ${data.orderId} updated to confirmed`);
        } else {
          await OrderModel.updateStatus(data.orderId, 'cancelled');
          console.log(`[CONSUMER] Order ${data.orderId} cancelled — reason: ${data.message}`);
        }
      } catch (err) {
        console.error('[CONSUMER] Error processing stock.updated:', err.message);
      }
    },
  });
};

const disconnect = async () => {
  await consumer.disconnect();
};

module.exports = { startConsumer, disconnect };
