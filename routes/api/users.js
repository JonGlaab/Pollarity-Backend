const router = require('express').Router();
const { User } = require('../../models');
const { authenticateJWT } = require('../../middleware/auth');
const { s3Client } = require('../../config/backblaze');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const getKeyFromUrl = (url) => {
    if (!url) return null;
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.pathname.substring(1);
    } catch (e) {
        return null;
    }
};

const generatePresignedUrl = async (photoUrl) => {
    const key = getKeyFromUrl(photoUrl);
    if (key) {
        try {
            const command = new GetObjectCommand({
                Bucket: process.env.BACKBLAZE_BUCKET,
                Key: key,
            });
            return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        } catch (urlError) {
            console.error("Could not generate pre-signed URL:", urlError);
            return photoUrl;
        }
    }
    return photoUrl;
};

router.get('/me', authenticateJWT, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.user_id, {
            attributes: ['first_name', 'last_name', 'email', 'user_photo_url']
        });
        if (!user) return res.status(404).json({ error: 'User not found.' });
        const presignedUrl = await generatePresignedUrl(user.user_photo_url);
        res.json({
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            user_photo_url: presignedUrl
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Server error while fetching profile.' });
    }
});

router.put('/me', authenticateJWT, upload.single('profile_photo'), async (req, res) => {
    const { first_name, last_name, email, remove_photo } = req.body;

    try {
        const user = await User.findByPk(req.user.user_id);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const oldPhotoUrl = user.user_photo_url;
        const oldVersionId = user.user_photo_version_id;
        const defaultPhotoUrl = `https://${process.env.BACKBLAZE_BUCKET}.${process.env.BACKBLAZE_ENDPOINT}/default-profile.png`;

        const deleteOldPhoto = async () => {
            const oldKey = getKeyFromUrl(oldPhotoUrl);
            if (oldKey && oldKey !== 'default-profile.png' && oldVersionId) {
                try {
                    const deleteCommand = new DeleteObjectCommand({
                        Bucket: process.env.BACKBLAZE_BUCKET,
                        Key: oldKey,
                        VersionId: oldVersionId, // Specify the exact version to delete
                    });
                    await s3Client.send(deleteCommand);
                } catch (deleteError) {
                    console.error("Failed to permanently delete old profile photo:", deleteError);
                }
            }
        };

        if (req.file) {
            await deleteOldPhoto();
            
            const file = req.file;
            const uniqueFileName = `user_profile_photo_${uuidv4()}${path.extname(file.originalname)}`;
            
            const putCommand = new PutObjectCommand({
                Bucket: process.env.BACKBLAZE_BUCKET,
                Key: uniqueFileName,
                Body: file.buffer,
                ContentType: file.mimetype,
            });
            const uploadResult = await s3Client.send(putCommand);

            user.user_photo_url = `https://${process.env.BACKBLAZE_BUCKET}.${process.env.BACKBLAZE_ENDPOINT}/${uniqueFileName}`;
            user.user_photo_version_id = uploadResult.VersionId; // Save the new version ID
        } 
        else if (remove_photo === 'true') {
            await deleteOldPhoto();
            user.user_photo_url = defaultPhotoUrl;
            user.user_photo_version_id = null; // Clear the version ID
        }

        user.first_name = first_name || user.first_name;
        user.last_name = last_name || user.last_name;
        user.email = email || user.email;
        
        await user.save();

        const presignedUrl = await generatePresignedUrl(user.user_photo_url);

        res.json({
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            user_photo_url: presignedUrl
        });

    } catch (error) {
        console.error('Error updating user profile:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'This email is already in use.' });
        }
        res.status(500).json({ error: 'Server error while updating profile.' });
    }
});

module.exports = router;