const kafka        = require('../config/kafka');
const ProductModel = require('../models/product.model');
const { publishStockUpdated, publishOrderNotification } = require('./producer');

const consumer = kafka.consumer({ groupId: 'product-service-group' });

const startConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'order.created', fromBeginning: false });

  console.log('Product Service Kafka consumer listening on: order.created');

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const data = JSON.parse(message.value.toString());
        console.log(`[CONSUMER] order.created received for orderId: ${data.orderId}`);

        // Check and reduce stock for each item
        for (const item of data.items) {
          const product = await ProductModel.findById(item.productId);

          if (!product) {
            await publishStockUpdated({
              orderId: data.orderId,
              status:  'failed',
              message: `Product ${item.productId} not found`,
            });
            return;
          }

          if (product.stock < item.quantity) {
            await publishStockUpdated({
              orderId: data.orderId,
              status:  'failed',
              message: `Insufficient stock for product: ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
            });

            await publishOrderNotification({
              orderId:   data.orderId,
              userId:    data.userId,
              userEmail: data.userEmail,
              type:      'ORDER_FAILED',
              message:   `Your order #${data.orderId} failed — insufficient stock for ${product.name}`,
            });
            return;
          }
        }

        // All items have sufficient stock — reduce stock
        for (const item of data.items) {
          await ProductModel.reduceStock(item.productId, item.quantity);
          console.log(`[CONSUMER] Stock reduced for productId: ${item.productId}, qty: ${item.quantity}`);
        }

        await publishStockUpdated({
          orderId: data.orderId,
          status:  'success',
          message: 'Stock reduced successfully',
        });

        await publishOrderNotification({
          orderId:   data.orderId,
          userId:    data.userId,
          userEmail: data.userEmail,
          type:      'ORDER_CONFIRMED',
          message:   `Your order #${data.orderId} has been confirmed and is being processed`,
        });

      } catch (err) {
        console.error('[CONSUMER] Error processing order.created:', err.message);
      }
    },
  });
};

const disconnect = async () => {
  await consumer.disconnect();
};

module.exports = { startConsumer, disconnect };
