const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM = {
  email: process.env.SENDGRID_FROM_EMAIL,
  name:  process.env.SENDGRID_FROM_NAME,
};

const TEMPLATES = {
  ORDER_CONFIRMED: (data) => ({
    subject: `✅ Order #${data.orderId} Confirmed — MK Store`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;">
        <h2 style="color:#2e7d32;">Your Order is Confirmed! 🎉</h2>
        <p>Hi there,</p>
        <p>Great news! Your payment was successful and your order is being processed.</p>
        <div style="background:#f5f5f5;padding:16px;border-radius:6px;margin:20px 0;">
          <p style="margin:0;font-size:16px;"><strong>Order ID:</strong> #${data.orderId}</p>
          <p style="margin:8px 0 0;font-size:16px;"><strong>Status:</strong> Confirmed</p>
        </div>
        <p>We'll notify you when your order is shipped.</p>
        <p style="color:#888;font-size:12px;margin-top:30px;">MK Store — Thank you for shopping with us!</p>
      </div>
    `,
  }),

  ORDER_CANCELLED: (data) => ({
    subject: `🚫 Order #${data.orderId} Cancelled — MK Store`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;">
        <h2 style="color:#e65100;">Your Order Has Been Cancelled</h2>
        <p>Hi there,</p>
        <p>${data.message || `Your order #${data.orderId} has been cancelled.`}</p>
        <div style="background:#fff8f0;padding:16px;border-radius:6px;margin:20px 0;">
          <p style="margin:0;font-size:16px;"><strong>Order ID:</strong> #${data.orderId}</p>
          <p style="margin:8px 0 0;font-size:16px;"><strong>Status:</strong> Cancelled</p>
        </div>
        <p>If you did not request this, please contact us immediately.</p>
        <p style="color:#888;font-size:12px;margin-top:30px;">MK Store — Thank you for shopping with us!</p>
      </div>
    `,
  }),

  ORDER_SHIPPED: (data) => ({
    subject: `🚚 Order #${data.orderId} Shipped — MK Store`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;">
        <h2 style="color:#1565c0;">Your Order is On Its Way! 🚚</h2>
        <p>Hi there,</p>
        <p>Your order has been shipped and is on its way to you.</p>
        <div style="background:#f0f4ff;padding:16px;border-radius:6px;margin:20px 0;">
          <p style="margin:0;font-size:16px;"><strong>Order ID:</strong> #${data.orderId}</p>
          <p style="margin:8px 0 0;font-size:16px;"><strong>Status:</strong> Shipped</p>
        </div>
        <p style="color:#888;font-size:12px;margin-top:30px;">MK Store — Thank you for shopping with us!</p>
      </div>
    `,
  }),

  ORDER_DELIVERED: (data) => ({
    subject: `🎉 Order #${data.orderId} Delivered — MK Store`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;">
        <h2 style="color:#2e7d32;">Your Order Has Been Delivered! 🎉</h2>
        <p>Hi there,</p>
        <p>Your order has been successfully delivered. We hope you love it!</p>
        <div style="background:#f5f5f5;padding:16px;border-radius:6px;margin:20px 0;">
          <p style="margin:0;font-size:16px;"><strong>Order ID:</strong> #${data.orderId}</p>
          <p style="margin:8px 0 0;font-size:16px;"><strong>Status:</strong> Delivered</p>
        </div>
        <p>Thank you for choosing MK Store!</p>
        <p style="color:#888;font-size:12px;margin-top:30px;">MK Store — Thank you for shopping with us!</p>
      </div>
    `,
  }),

  PAYMENT_FAILED: (data) => ({
    subject: `❌ Payment Failed for Order #${data.orderId} — MK Store`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;">
        <h2 style="color:#c62828;">Payment Failed</h2>
        <p>Hi there,</p>
        <p>We were unable to process your payment for order #${data.orderId}.</p>
        <div style="background:#fff3f3;padding:16px;border-radius:6px;margin:20px 0;">
          <p style="margin:0;font-size:16px;"><strong>Order ID:</strong> #${data.orderId}</p>
          <p style="margin:8px 0 0;font-size:16px;"><strong>Reason:</strong> ${data.message || 'Payment verification failed'}</p>
        </div>
        <p>Please try placing your order again. If the issue persists, contact our support team.</p>
        <p style="color:#888;font-size:12px;margin-top:30px;">MK Store — We're sorry for the inconvenience.</p>
      </div>
    `,
  }),
};

const sendEmail = async ({ to, type, data }) => {
  const template = TEMPLATES[type];
  if (!template) {
    console.warn(`[EMAIL] No template found for type: ${type}`);
    return;
  }

  const { subject, html } = template(data);

  try {
    await sgMail.send({ from: FROM, to, subject, html });
    console.log(`[EMAIL] Sent ${type} email to ${to} for orderId: ${data.orderId}`);
  } catch (err) {
    console.error(`[EMAIL] Failed to send ${type} email:`, err.response?.body?.errors || err.message);
  }
};

module.exports = { sendEmail };
