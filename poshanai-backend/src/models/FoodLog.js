import mongoose from 'mongoose';
import encrypt from 'mongoose-encryption';
import { env } from '../config/env.js';

const foodLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Local calendar day chosen by the client, YYYY-MM-DD.
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    ifctCode: { type: String, required: true },
    foodName: { type: String, required: true },
    grams: { type: Number, required: true, min: 1, max: 2000 },
    quantity: { type: Number, min: 1, max: 2000 },
    measure: { type: String, maxlength: 30 },
    // Computed on the server from the IFCT dataset; never taken from the client.
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, versionKey: false },
);

foodLogSchema.index({ userId: 1, date: 1 });

// Food diaries are health data: encrypt the content, keep userId/date queryable.
foodLogSchema.plugin(encrypt, {
  encryptionKey: env.encryptionKey,
  signingKey: env.signingKey,
  encryptedFields: ['ifctCode', 'foodName', 'grams', 'quantity', 'measure', 'calories', 'protein', 'carbs', 'fat'],
});

const FoodLog = mongoose.models.FoodLog ?? mongoose.model('FoodLog', foodLogSchema);
export default FoodLog;
