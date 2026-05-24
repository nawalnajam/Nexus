const profileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: String,
  bio: String,
  // Entrepreneur specific
  startupName: String,
  pitchDeckUrl: String,
  fundingGoal: Number,
  // Investor specific
  investmentHistory: [String], // past startup names
  preferredSectors: [String],
  ticketSizeMin: Number,
  ticketSizeMax: Number
});