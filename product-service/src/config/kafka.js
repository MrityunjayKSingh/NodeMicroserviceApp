const fs   = require('fs');
const path = require('path');
const { Kafka } = require('kafkajs');
require('dotenv').config();

const getSSLConfig = () => {
  // ECS: KAFKA_CA_CERT env var contains the cert content directly
  if (process.env.KAFKA_CA_CERT) {
    const tmpPath = '/tmp/ca.pem';
    fs.writeFileSync(tmpPath, process.env.KAFKA_CA_CERT);
    return { ca: [fs.readFileSync(tmpPath)] };
  }

  // Local: KAFKA_SSL_CA is a file path
  if (process.env.KAFKA_SSL_CA) {
    return { ca: [fs.readFileSync(path.resolve(__dirname, process.env.KAFKA_SSL_CA))] };
  }

  // Fallback: no cert (should not happen in production)
  console.warn('WARNING: No Kafka SSL cert configured. Using rejectUnauthorized: false');
  return { rejectUnauthorized: false };
};

const kafka = new Kafka({
  clientId: 'product-service', // change per service
  brokers:  [process.env.KAFKA_BROKER],
  ssl: {
    rejectUnauthorized: true,
    ...getSSLConfig(),
  },
  sasl: {
    mechanism: 'scram-sha-256',
    username:  process.env.KAFKA_USERNAME,
    password:  process.env.KAFKA_PASSWORD,
  },
});

module.exports = kafka;
