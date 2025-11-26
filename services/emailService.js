const path = require("path");
const fs = require("fs");
const sendpulse = require("sendpulse-api");

const API_USER_ID = process.env.SENDPULSE_USER_ID;
const API_SECRET = process.env.SENDPULSE_API_SECRET;

// Ensure tmp folder exists
const TOKEN_DIR = path.join(__dirname, "tmp");
if (!fs.existsSync(TOKEN_DIR)) {
    fs.mkdirSync(TOKEN_DIR);
}

const TOKEN_STORAGE = path.join(TOKEN_DIR, "token.json");

// Track whether initialization succeeded
let sendpulseReady = false;

/**
 * Initialize SendPulse with safe logging
 */
const initializeSendPulse = () => {
    return new Promise((resolve) => {
        console.log("🔧 Initializing SendPulse...");

        sendpulse.init(API_USER_ID, API_SECRET, TOKEN_STORAGE, (token) => {
            if (!token) {
                console.error("❌ SendPulse returned NO token");
                return resolve(false);
            }

            if (token.is_error) {
                console.error("❌ SendPulse token error:", token);
                return resolve(false);
            }

            console.log("✅ SendPulse initialized successfully");
            sendpulseReady = true;
            resolve(true);
        });
    });
};

/**
 * Send welcome email — robust & safe
 */
const sendWelcomeEmail = async (to, firstName) => {
    console.log("📧 Preparing to send welcome email to:", to);

    // Initialize if needed
    if (!sendpulseReady) {
        const ok = await initializeSendPulse();
        if (!ok) {
            console.error("⚠️ Email skipped — SendPulse not initialized");
            return false;
        }
    }

    const email = {
        html: `<h1>Hi ${firstName},</h1><p>Thanks for signing up for Pollarity!</p>`,
        text: `Hi ${firstName}, thanks for signing up!`,
        subject: `Welcome to Pollarity, ${firstName}!`,
        from: {
            name: "Pollarity",
            email: "no-reply@sendpulse.com" // safe fallback "from"
        },
        to: [{ email: to }]
    };

    console.log("📨 Sending email via SendPulse…");

    return new Promise((resolve) => {
        sendpulse.smtpSendMail((response) => {
            if (!response) {
                console.error("❌ No response received from SendPulse");
                return resolve(false);
            }

            if (!response.result) {
                console.error("❌ SendPulse failed:", response);
                return resolve(false);
            }

            console.log("✅ Email sent successfully:", response);
            resolve(true);
        }, email);
    });
};

module.exports = { sendWelcomeEmail };
