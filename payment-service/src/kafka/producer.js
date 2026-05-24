const kafka = require('../config/kafka');

const producer = kafka.producer();
let connected  = false;

const connect = async () => {
  if (!connected) {
    await producer.connect();
    connected = true;
    console.log('Payment Service Kafka producer connected');
  }
};

const publishPaymentSuccess = async ({ orderId, userId, userEmail, amount, razorpayPaymentId }) => {
  await connect();
  await producer.send({
    topic:    'payment.success',
    messages: [{
      key:   String(orderId),
      value: JSON.stringify({
        orderId,
        userId,
        userEmail,
        amount,
        razorpayPaymentId,
        createdAt: new Date().toISOString(),
      }),
    }],
  });
  console.log(`[PRODUCER] payment.success published for orderId: ${orderId}`);
};

const publishPaymentFailed = async ({ orderId, userId, userEmail, reason }) => {
  await connect();
  await producer.send({
    topic:    'payment.failed',
    messages: [{
      key:   String(orderId),
      value: JSON.stringify({
        orderId,
        userId,
        userEmail,
        reason,
        createdAt: new Date().toISOString(),
      }),
    }],
  });
  console.log(`[PRODUCER] payment.failed published for orderId: ${orderId}`);
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
  console.log(`[PRODUCER] order.notification published — ${type} for orderId: ${orderId}`);
};

const disconnect = async () => {
  await producer.disconnect();
  connected = false;
};

module.exports = {
  publishPaymentSuccess,
  publishPaymentFailed,
  publishOrderNotification,
  disconnect,
};
