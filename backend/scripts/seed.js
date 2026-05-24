/**
 * Seed the DB with demo users for testing.
 * Run: node scripts/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../src/models/User');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB…');

  await User.deleteMany({});
  console.log('Cleared existing users.');

  const users = await User.create([
    {
      name: 'Aisha Khan',
      email: 'entrepreneur@nexus.test',
      password: 'Test1234!',
      role: 'entrepreneur',
      bio: 'Building the future of fintech in South Asia.',
      location: 'Lahore, PK',
      startup: {
        name: 'PaySwift',
        description: 'Mobile payment platform for unbanked populations',
        industry: 'Fintech',
        stage: 'mvp',
        fundingNeeded: 500000,
        founded: 2023,
        teamSize: 5,
      },
    },
    {
      name: 'Omar Sheikh',
      email: 'investor@nexus.test',
      password: 'Test1234!',
      role: 'investor',
      bio: 'Early-stage investor focused on emerging market tech.',
      location: 'Karachi, PK',
      investmentPreferences: {
        industries: ['Fintech', 'EdTech', 'HealthTech'],
        stages: ['mvp', 'early-revenue'],
        ticketSizeMin: 50000,
        ticketSizeMax: 500000,
        portfolioSize: 12,
        totalInvested: 3000000,
      },
    },
  ]);

  console.log(`✅  Seeded ${users.length} users:`);
  users.forEach((u) => console.log(`   • ${u.name} (${u.role}) — ${u.email}`));

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});