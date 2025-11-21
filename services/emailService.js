const { Resend } = 'resend'

const resend = new Resend(process.env.RESEND_API_KEY);

const sendWelcomeEmail = async (to, firstName) => {
    try {
        await resend.emails.
        send({
            from: 'onboarding@yourdomain.com',
            to: to,
            subject: `Welcome to Pollarity, ${firstName}!`,
            html: `<h1>Hi ${firstName},</h1><p>Thanks for signing up for Pollarity. We're excited to have you on board!</p>`
        });
    } catch (error) {
        console.error('Error sending welcome email:', error);
    }
};

module.exports = { sendWelcomeEmail };