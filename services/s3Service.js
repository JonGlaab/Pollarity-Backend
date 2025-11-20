const { S3Client } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
    endpoint: process.env.B2_ENDPOINT,
    region: process.env.B2_ENDPOINT.split('.')[1], 
    credentials: {
        accessKeyId: process.env.B2_ACCESS_KEY_ID,
        secretAccessKey: process.env.B2_SECRET_ACCESS_KEY,
    },
});

const BUCKET_NAME = process.env.B2_BUCKET_NAME;

module.exports = { s3Client, BUCKET_NAME };