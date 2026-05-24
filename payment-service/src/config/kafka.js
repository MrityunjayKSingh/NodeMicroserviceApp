const fs   = require('fs');
const path = require('path');
const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
  clientId: 'payment-service',
  brokers:  [process.env.KAFKA_BROKER],
  ssl: {
    rejectUnauthorized: true,
    ca: [fs.readFileSync(path.resolve(__dirname, process.env.KAFKA_SSL_CA))],
  },
  sasl: {
    mechanism: 'scram-sha-256',
    username:  process.env.KAFKA_USERNAME,
    password:  process.env.KAFKA_PASSWORD,
  },
});

module.exports = kafka;
