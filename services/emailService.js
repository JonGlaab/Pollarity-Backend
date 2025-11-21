const { Resend } = require('resend');

let resendClient = null;
const apiKey = process.env.RESEND_API_KEY;

if (apiKey) {
    resendClient = new Resend(apiKey);
} else {
    console.warn('RESEND_API_KEY is not set. Welcome emails will be skipped.');
}

const sendWelcomeEmail = async (to, firstName) => {
    if (!resendClient) {
        return;
    }

    try {
        await resendClient.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'no-reply@pollarity.com',
            to,
            subject: `Welcome to Pollarity, ${firstName}!`,
            html: `<h1>Hi ${firstName},</h1><p>Thanks for signing up for Pollarity. We're excited to have you on board!</p>`
        });
    } catch (error) {
        console.error('Error sending welcome email:', error);
    }
};

module.exports = { sendWelcomeEmail };