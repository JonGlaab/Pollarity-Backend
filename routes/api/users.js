const router = require('express').Router();
const { User } = require('../../models');
const { authenticateJWT } = require('../../middleware/auth');
const { s3Client } = require('../../config/backblaze');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

// Helper function to generate a pre-signed URL for a private photo
const generatePresignedUrl = async (photoUrl) => {
    // Only try to generate a URL if it's a valid Backblaze URL
    if (photoUrl && photoUrl.includes('backblazeb2.com')) {
        try {
            const url = new URL(photoUrl);
            const bucketName = url.hostname.split('.')[0];
            const key = url.pathname.substring(1);

            const command = new GetObjectCommand({
                Bucket: bucketName,
                Key: key,
            });

            // The URL will be valid for 1 hour
            return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        } catch (urlError) {
            console.error("Could not generate pre-signed URL:", urlError);
            return photoUrl; // Return original URL on failure
        }
    }
    return photoUrl; // Return original URL if it's not a Backblaze URL
};

// GET /api/users/me - Fetch the current logged-in user's profile
router.get('/me', authenticateJWT, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.user_id, {
            attributes: ['first_name', 'last_name', 'email', 'user_photo_url']
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

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

// PUT /api/users/me - Update the current logged-in user's profile
router.put('/me', authenticateJWT, async (req, res) => {
    const { first_name, last_name, email } = req.body;

    try {
        const user = await User.findByPk(req.user.user_id);

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Update the user's fields
        user.first_name = first_name || user.first_name;
        user.last_name = last_name || user.last_name;
        user.email = email || user.email;
        
        await user.save();

        const presignedUrl = await generatePresignedUrl(user.user_photo_url);

        // Return the updated user data with a new pre-signed URL
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
