const axios = require("axios");

const sendEmail = async (to, subject, html) => {
  try {
    const netlifyUrl = "https://sri-gayathri-fancy-religious.netlify.app/.netlify/functions/send-email";
    const secret = process.env.EMAIL_API_SECRET || "sri-gayathri-secret-email-key-2026";

    await axios.post(netlifyUrl, {
      to,
      subject,
      html,
      secret,
    });
  } catch (err) {
    const errorDetails = err.response?.data?.error || err.message;
    console.error("HTTP email send failed:", errorDetails);
    throw new Error(errorDetails);
  }
};

module.exports = sendEmail;
