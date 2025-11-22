require('dotenv').config();
const db = require('../models');
const User = db.User;

const createAdmin = async () => {
    try {
        // Ensure DB is connected
        await db.sequelize.sync();

        const adminEmail = "admin@pollarity.com";
        const adminPassword = "admin123";

        // 1. Check if admin already exists
        const existingAdmin = await User.findOne({ where: { email: adminEmail } });
        if (existingAdmin) {
            console.log("⚠  Admin user already exists.");
            process.exit(0);
        }


        await User.create({
            first_name: "System",
            last_name: "Admin",
            email: adminEmail,
            password: adminPassword,
            role: "admin",
            isBanned: false
        });

        console.log("✅ Admin created successfully!");
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Password: ${adminPassword}`);

        process.exit(0);

    } catch (error) {
        console.error("❌ Failed to create admin:", error);
        process.exit(1);
    }
};

createAdmin();