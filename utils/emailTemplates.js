// src/utils/emailTemplates.js

const brandColorPrimary = "#5e0099"; // Royal Velvet Purple
const brandColorSecondary = "#D4AF37"; // Royal Gold
const textColorDark = "#2c004f";

/**
 * Base HTML Template Wrapper
 */
const getBaseTemplate = (title, preheader, contentHtml) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #f8f5fd;
          font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: ${textColorDark};
          -webkit-font-smoothing: antialiased;
        }
        .wrapper {
          width: 100%;
          background-color: #f8f5fd;
          padding: 40px 10px;
          box-sizing: border-box;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(94, 0, 153, 0.05);
          border: 1px solid #f0e6ff;
        }
        .header {
          background: linear-gradient(135deg, ${brandColorPrimary}, #7a14c7);
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          color: ${brandColorSecondary};
          font-weight: 800;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .content {
          padding: 40px 30px;
          line-height: 1.6;
        }
        .content h2 {
          color: ${brandColorPrimary};
          font-size: 22px;
          margin-top: 0;
          font-weight: 700;
        }
        .content p {
          font-size: 16px;
          color: #444444;
          margin: 0 0 20px;
        }
        .divider {
          border: none;
          border-top: 1px solid #f0e6ff;
          margin: 25px 0;
        }
        .btn-container {
          text-align: center;
          margin: 30px 0;
        }
        .btn {
          display: inline-block;
          background: linear-gradient(135deg, #7a14c7, ${brandColorPrimary});
          color: #ffffff !important;
          padding: 12px 30px;
          border-radius: 30px;
          font-weight: 700;
          text-decoration: none;
          font-size: 16px;
          box-shadow: 0 4px 12px rgba(94, 0, 153, 0.2);
        }
        .footer {
          background: #faf7ff;
          padding: 24px 30px;
          text-align: center;
          font-size: 13px;
          color: #887799;
          border-top: 1px solid #f0e6ff;
        }
        .footer p {
          margin: 4px 0;
        }
        .footer a {
          color: ${brandColorPrimary};
          text-decoration: none;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <h1>Sri Gayathri Fancy & Religious</h1>
          </div>
          <div class="content">
            ${contentHtml}
          </div>
          <div class="footer">
            <p><b>Sri Gayathri Fancy & Religious Store</b></p>
            <p>No.02, Annai Shopping Centre (North), Beach Road, Velankanni, India</p>
            <p>Need support? Contact us on <a href="https://wa.me/919842004217">WhatsApp</a> or call +91 95975 80853</p>
            <p style="margin-top: 15px; font-size: 11px;">© 2026 Sri Gayathri Religious. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * 1. Email Verification Template
 */
const getVerificationEmail = (username, verifyUrl) => {
  const content = `
    <h2>Welcome to Sri Gayathri, ${username}!</h2>
    <p>We are delighted to have you join our religious and devotional community. To complete your signup and activate your account, please click the secure link below to verify your email address:</p>
    <div class="btn-container">
      <a href="${verifyUrl}" class="btn" target="_blank">Verify Email Address</a>
    </div>
    <p>If the button doesn't work, copy and paste the link below into your web browser:</p>
    <p style="word-break: break-all; font-size: 14px;"><a href="${verifyUrl}" style="color: ${brandColorPrimary};">${verifyUrl}</a></p>
    <p>This verification link will expire in 1 hour.</p>
  `;
  return getBaseTemplate("Verify Your Email", "Complete your account registration", content);
};

/**
 * 2. Password Reset Template
 */
const getResetPasswordEmail = (resetUrl) => {
  const content = `
    <h2>Password Reset Request</h2>
    <p>We received a request to reset the password for your account. If you did not initiate this request, you can safely ignore this email.</p>
    <p>To set a new password, click the secure link below:</p>
    <div class="btn-container">
      <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
    </div>
    <p>If the button doesn't work, copy and paste the link below into your web browser:</p>
    <p style="word-break: break-all; font-size: 14px;"><a href="${resetUrl}" style="color: ${brandColorPrimary};">${resetUrl}</a></p>
    <p>This secure reset link will expire in 15 minutes.</p>
  `;
  return getBaseTemplate("Reset Your Password", "Reset your account password", content);
};

/**
 * 3. Customer Order Receipt Template
 */
const getCustomerOrderReceipt = (username, orderId, address, mobile, productListHtml, totalAmount, deliveryInstructions) => {
  const content = `
    <h2>Thank You for Your Order, ${username}!</h2>
    <p>We have successfully received your payment. Our store team is preparing your blessed items for shipping.</p>
    
    <div class="divider"></div>
    
    <h3 style="color: ${brandColorPrimary}; margin-bottom: 10px;">📋 Order Summary (#${orderId.slice(-6)})</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="border-bottom: 2px solid #f0e6ff; text-align: left;">
          <th style="padding: 8px 0; font-size: 14px; color: #887799;">Item Description</th>
          <th style="padding: 8px 0; font-size: 14px; color: #887799; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${productListHtml}
      </tbody>
    </table>

    <div style="background-color: #faf8ff; border: 1px solid #f0e6ff; border-radius: 12px; padding: 18px; margin-bottom: 25px;">
      <h4 style="margin: 0 0 8px; color: ${brandColorPrimary};">📍 Delivery Address</h4>
      <p style="margin: 0; font-size: 14.5px; color: #555;">${address}</p>
      <p style="margin: 5px 0 0; font-size: 14.5px; color: #555;"><b>Mobile:</b> ${mobile}</p>
      ${deliveryInstructions ? `<p style="margin: 10px 0 0; font-size: 13.5px; color: #7a14c7; font-style: italic;"><b>Notes:</b> "${deliveryInstructions}"</p>` : ""}
    </div>

    <h3 style="text-align: right; margin-top: 0; color: ${brandColorPrimary};">
      Amount Paid: <span style="color: ${brandColorSecondary}; font-weight: 800;">₹${totalAmount}</span>
    </h3>

    <div class="btn-container">
      <a href="https://sri-gayathri-fancy-religious.netlify.app/orders" class="btn" target="_blank">Track Your Order</a>
    </div>
  `;
  return getBaseTemplate(`Order Confirmation #${orderId.slice(-6)}`, "Thank you for your purchase", content);
};

/**
 * 4. Order Status Update Template
 */
const getOrderStatusUpdateEmail = (username, orderId, status) => {
  let statusBadgeColor = "#ffd86b";
  let statusText = "Pending";
  let extraIcon = "⏳";

  if (status === "Processing") {
    statusBadgeColor = "#e1ccff";
    statusText = "Processing";
    extraIcon = "⚙️";
  } else if (status === "Shipped") {
    statusBadgeColor = "#bbdefb";
    statusText = "Shipped";
    extraIcon = "🚚";
  } else if (status === "Delivered") {
    statusBadgeColor = "#c8e6c9";
    statusText = "Delivered";
    extraIcon = "✔";
  } else if (status === "Cancelled") {
    statusBadgeColor = "#ffcdd2";
    statusText = "Cancelled";
    extraIcon = "❌";
  }

  const content = `
    <h2>Order Update Notification</h2>
    <p>Dear ${username}, the dispatch status of your Order <b>#${orderId.slice(-6)}</b> has been updated:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <span style="background-color: ${statusBadgeColor}; padding: 12px 30px; border-radius: 50px; font-size: 18px; font-weight: 800; color: ${textColorDark}; box-shadow: 0 4px 10px rgba(0,0,0,0.04);">
        ${extraIcon} Status: ${statusText}
      </span>
    </div>

    <p>You can check delivery progress and tracking numbers on our customer portal:</p>
    <div class="btn-container">
      <a href="https://sri-gayathri-fancy-religious.netlify.app/orders" class="btn" target="_blank">View Order Details</a>
    </div>
  `;
  return getBaseTemplate(`Order #${orderId.slice(-6)} Status: ${status}`, "Your order status has changed", content);
};

/**
 * 5. Admin New Order Alert Template
 */
const getAdminNewOrderAlert = (orderId, customerName, mobile, address, productListHtml, totalAmount, deliveryInstructions, isWebhook = false) => {
  const content = `
    <h2 style="color: #2e7d32;">📦 NEW ORDER RECEIVED ${isWebhook ? "(Webhook confirmed)" : ""}</h2>
    <p>A new purchase has been processed successfully through the storefront gateway. Details are provided below:</p>
    
    <div class="divider"></div>

    <h3 style="color: ${brandColorPrimary};">👤 Customer Info</h3>
    <table style="width: 100%; font-size: 15px; margin-bottom: 20px;">
      <tr>
        <td style="width: 130px; font-weight: 600; color: #887799; padding: 4px 0;">Name:</td>
        <td style="padding: 4px 0; color: #333;">${customerName}</td>
      </tr>
      <tr>
        <td style="font-weight: 600; color: #887799; padding: 4px 0;">Mobile Number:</td>
        <td style="padding: 4px 0; color: #333;">${mobile}</td>
      </tr>
      <tr>
        <td style="font-weight: 600; color: #887799; padding: 4px 0; vertical-align: top;">Delivery Address:</td>
        <td style="padding: 4px 0; color: #333; line-height: 1.4;">${address}</td>
      </tr>
      ${deliveryInstructions ? `
      <tr>
        <td style="font-weight: 600; color: #887799; padding: 4px 0; vertical-align: top;">Instructions:</td>
        <td style="padding: 4px 0; color: #d32f2f; font-weight: 600;">"${deliveryInstructions}"</td>
      </tr>` : ""}
    </table>

    <div class="divider"></div>

    <h3 style="color: ${brandColorPrimary};">🛍 Items to Pack</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="border-bottom: 2px solid #f0e6ff; text-align: left;">
          <th style="padding: 8px 0; font-size: 14px; color: #887799;">Product Description</th>
          <th style="padding: 8px 0; font-size: 14px; color: #887799; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${productListHtml}
      </tbody>
    </table>

    <h3 style="text-align: right; color: ${brandColorPrimary};">
      Total Value: <span style="color: #2e7d32; font-weight: 800;">₹${totalAmount}</span>
    </h3>

    <div class="btn-container">
      <a href="https://sri-gayathri-fancy-religious.netlify.app/admin/orders" class="btn" style="background: #2e7d32;" target="_blank">Manage Admin Orders</a>
    </div>
  `;
  return getBaseTemplate(`New Order Alert #${orderId.slice(-6)}`, "New purchase alert", content);
};

/**
 * 6. Admin Shipping Details Updated Template
 */
const getAdminShippingUpdateAlert = (orderId, customerName, mobile, address, deliveryInstructions) => {
  const content = `
    <h2 style="color: #c62828;">⚠️ SHIPPING DETAILS UPDATED BY CUSTOMER</h2>
    <p>A customer has modified their delivery details for a pending order. Please update the shipping label before dispatching:</p>
    
    <div class="divider"></div>

    <h3 style="color: ${brandColorPrimary};">📋 Modified Details (Order #${orderId.slice(-6)})</h3>
    <table style="width: 100%; font-size: 15px; margin-bottom: 20px;">
      <tr>
        <td style="width: 130px; font-weight: 600; color: #887799; padding: 4px 0;">Customer Name:</td>
        <td style="padding: 4px 0; color: #333;">${customerName}</td>
      </tr>
      <tr>
        <td style="font-weight: 600; color: #887799; padding: 4px 0;">New Mobile:</td>
        <td style="padding: 4px 0; color: #333;">${mobile}</td>
      </tr>
      <tr>
        <td style="font-weight: 600; color: #887799; padding: 4px 0; vertical-align: top;">New Address:</td>
        <td style="padding: 4px 0; color: #333; line-height: 1.4; font-weight: 700;">${address}</td>
      </tr>
      <tr>
        <td style="font-weight: 600; color: #887799; padding: 4px 0; vertical-align: top;">New Instructions:</td>
        <td style="padding: 4px 0; color: #d32f2f; font-style: italic;">"${deliveryInstructions || "None"}"</td>
      </tr>
    </table>

    <div class="btn-container">
      <a href="https://sri-gayathri-fancy-religious.netlify.app/admin/orders" class="btn" style="background: #c62828;" target="_blank">Manage Admin Orders</a>
    </div>
  `;
  return getBaseTemplate(`Shipping Updated #${orderId.slice(-6)}`, "Shipping address modified", content);
};

/**
 * 7. Admin Order Cancelled Alert Template
 */
const getAdminOrderCancelledAlert = (orderId, customerName, totalAmount) => {
  const content = `
    <h2 style="color: #c62828;">❌ ORDER CANCELLED BY CUSTOMER</h2>
    <p>A customer has cancelled their order before dispatch. The items have been returned to stock inventory automatically.</p>
    
    <div class="divider"></div>

    <h3 style="color: ${brandColorPrimary};">📋 Cancellation Details</h3>
    <table style="width: 100%; font-size: 15px; margin-bottom: 20px;">
      <tr>
        <td style="width: 130px; font-weight: 600; color: #887799; padding: 4px 0;">Order ID:</td>
        <td style="padding: 4px 0; color: #333; font-weight: bold;">#${orderId.slice(-6)}</td>
      </tr>
      <tr>
        <td style="font-weight: 600; color: #887799; padding: 4px 0;">Customer Name:</td>
        <td style="padding: 4px 0; color: #333;">${customerName}</td>
      </tr>
      <tr>
        <td style="font-weight: 600; color: #887799; padding: 4px 0;">Refund Amount:</td>
        <td style="padding: 4px 0; color: #333; font-weight: bold; color: #c62828;">₹${totalAmount}</td>
      </tr>
    </table>

    <div class="btn-container">
      <a href="https://sri-gayathri-fancy-religious.netlify.app/admin/orders" class="btn" style="background: #c62828;" target="_blank">View Cancelled Order</a>
    </div>
  `;
  return getBaseTemplate(`Order Cancelled #${orderId.slice(-6)}`, "Customer order cancellation notification", content);
};

module.exports = {
  getVerificationEmail,
  getResetPasswordEmail,
  getCustomerOrderReceipt,
  getOrderStatusUpdateEmail,
  getAdminNewOrderAlert,
  getAdminShippingUpdateAlert,
  getAdminOrderCancelledAlert
};
