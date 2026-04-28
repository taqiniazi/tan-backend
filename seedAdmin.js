require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@tannetwork.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Admin user already exists');
      existingAdmin.role = 'admin';
      await existingAdmin.save();
    } else {
      const hashed = await bcrypt.hash(adminPassword, 10);
      await User.create({
        name: 'Administrator',
        email: adminEmail,
        password: hashed,
        role: 'admin',
        referralCode: 'ADMIN1',
      });
      console.log('Admin user created successfully');
    }
  } catch (err) {
    console.error('Error seeding admin:', err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

seedAdmin();
