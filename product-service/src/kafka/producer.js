const kafka = require('../config/kafka');

const producer = kafka.producer();
let connected  = false;

const connect = async () => {
  if (!connected) {
    await producer.connect();
    connected = true;
    console.log('Product Service Kafka producer connected');
  }
};

const publishStockUpdated = async ({ orderId, status, message }) => {
  await connect();
  await producer.send({
    topic:    'stock.updated',
    messages: [{
      key:   String(orderId),
      value: JSON.stringify({ orderId, status, message }),
    }],
  });
  console.log(`[PRODUCER] stock.updated published for orderId: ${orderId} — ${status}`);
};

const publishOrderNotification = async ({ orderId, userId, userEmail, type, message }) => {
  await connect();
  await producer.send({
    topic:    'order.notification',
    messages: [{
      key:   String(orderId),
      value: JSON.stringify({
        orderId,
        userId,
        userEmail,
        type,
        message,
        createdAt: new Date().toISOString(),
      }),
    }],
  });
  console.log(`[PRODUCER] order.notification published for orderId: ${orderId} — ${type}`);
};

const disconnect = async () => {
  await producer.disconnect();
  connected = false;
};

module.exports = { publishStockUpdated, publishOrderNotification, disconnect };
