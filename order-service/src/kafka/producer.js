const kafka = require('../config/kafka');

const producer = kafka.producer();
let connected = false;

const connect = async () => {
  if (!connected) {
    await producer.connect();
    connected = true;
    console.log('Order Service Kafka producer connected');
  }
};

const publishOrderCreated = async (order, items, userEmail) => {
  await connect();
  const message = {
    orderId:     order.id,
    userId:      order.user_id,
    userEmail:   userEmail,
    items:       items.map((i) => ({
      productId: i.productId,
      quantity:  i.quantity,
      price:     i.price,
    })),
    totalAmount: order.total_amount,
    createdAt:   new Date().toISOString(),
  };

  await producer.send({
    topic:    'order.created',
    messages: [{ key: String(order.id), value: JSON.stringify(message) }],
  });

  console.log(`[PRODUCER] order.created published for orderId: ${order.id}`);
};

const disconnect = async () => {
  await producer.disconnect();
  connected = false;
};

module.exports = { publishOrderCreated, disconnect };
