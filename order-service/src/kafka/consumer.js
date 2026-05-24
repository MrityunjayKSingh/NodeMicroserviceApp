const kafka      = require('../config/kafka');
const OrderModel = require('../models/order.model');
const { publishOrderCreated, publishOrderNotification } = require('./producer');

const consumer = kafka.consumer({ groupId: 'order-service-group' });

const startConsumer = async () => {
  await consumer.connect();

  // Listen to both stock.updated and payment topics
  await consumer.subscribe({ topic: 'stock.updated',    fromBeginning: false });
  await consumer.subscribe({ topic: 'payment.success',  fromBeginning: false });
  await consumer.subscribe({ topic: 'payment.failed',   fromBeginning: false });

  console.log('Order Service Kafka consumer listening on: stock.updated, payment.success, payment.failed');

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const data = JSON.parse(message.value.toString());

        // ── payment.success ──────────────────────────────────────────
        if (topic === 'payment.success') {
          console.log(`[CONSUMER] payment.success received for orderId: ${data.orderId}`);

          // Update order status to confirmed
          const order = await OrderModel.updateStatus(data.orderId, 'confirmed');

          if (order) {
            // Now trigger stock reduction
            const fullOrder = await OrderModel.findById(data.orderId);
            if (fullOrder && fullOrder.items) {
              await publishOrderCreated(fullOrder, fullOrder.items, data.userEmail);
              console.log(`[CONSUMER] Order ${data.orderId} confirmed — stock reduction triggered`);
            }
          }
        }

        // ── payment.failed ───────────────────────────────────────────
        if (topic === 'payment.failed') {
          console.log(`[CONSUMER] payment.failed received for orderId: ${data.orderId}`);
          await OrderModel.updateStatus(data.orderId, 'cancelled');
          console.log(`[CONSUMER] Order ${data.orderId} cancelled due to payment failure`);
        }

        // ── stock.updated ────────────────────────────────────────────
        if (topic === 'stock.updated') {
          console.log(`[CONSUMER] stock.updated received for orderId: ${data.orderId}`);

          if (data.status === 'failed') {
            // Stock failed after payment — edge case, log it
            console.warn(`[CONSUMER] Stock update failed for order ${data.orderId}: ${data.message}`);
          } else {
            console.log(`[CONSUMER] Stock updated successfully for order ${data.orderId}`);
          }
        }

      } catch (err) {
        console.error(`[CONSUMER] Error processing ${topic}:`, err.message);
      }
    },
  });
};

const disconnect = async () => {
  await consumer.disconnect();
};

module.exports = { startConsumer, disconnect };
