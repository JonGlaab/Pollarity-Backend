const { S3Client } = require('@aws-sdk/client-s3');

const {
    BACKBLAZE_ENDPOINT, 
    BACKBLAZE_REGION, 
    BACKBLAZE_KEY_ID, 
    BACKBLAZE_APPLICATION_KEY 
} = process.env;

if (!BACKBLAZE_ENDPOINT || !BACKBLAZE_REGION || !BACKBLAZE_KEY_ID || !BACKBLAZE_APPLICATION_KEY) {
    console.warn("Backblaze environment variables are not fully configured. File operations may fail.");
}

const s3Client = new S3Client({
    endpoint: `https://${BACKBLAZE_ENDPOINT}`,
    region: BACKBLAZE_REGION,
    credentials: {
        accessKeyId: BACKBLAZE_KEY_ID,
        secretAccessKey: BACKBLAZE_APPLICATION_KEY,
    },
    forcePathStyle: true, // Required for Backblaze
});

module.exports = { s3Client };
