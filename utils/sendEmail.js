const axios = require("axios");

const sendEmail = async (to, subject, html) => {
  const netlifyUrl = process.env.EMAIL_FUNCTION_URL || "https://sri-gayathri-fancy-religious.netlify.app/.netlify/functions/send-email";
  const secret = process.env.EMAIL_API_SECRET;
  if (!secret) throw new Error("EMAIL_API_SECRET is not configured on the backend");

  try {
    await axios.post(netlifyUrl, { to, subject, html, secret }, { timeout: 15000 });
  } catch (err) {
    const errorDetails = err.response?.data?.error || err.message;
    console.error("HTTP email send failed:", errorDetails);
    throw new Error("Email delivery failed");
  }
};

module.exports = sendEmail;
