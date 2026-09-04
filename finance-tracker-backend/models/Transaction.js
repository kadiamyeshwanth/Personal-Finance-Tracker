const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const transactionSchema = new Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    username: { type: String, required: true },
    type:     { type: String, required: true, enum: ['income', 'expense'] },
    category: { type: String, required: true, trim: true },
    amount:   { type: Number, required: true, min: [0.01, 'Amount must be positive'] },
    date:     { type: Date, required: true },
    description: { type: String, trim: true },
    merchant:    { type: String, trim: true, default: '' },          // merchant/payee name
    tags:        [{ type: String, trim: true }],                     // user-defined labels
    flags:       [{ type: String }],                                 // system flags: 'late-night', 'impulse', 'duplicate', 'abnormal'
    isRecurring: { type: Boolean, default: false },
    frequency:   { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly', 'once'], default: 'once' },

    // ── Provenance ────────────────────────────────────────────────────────────
    // How this transaction got here. Written by the SMS webhook and the CSV
    // importer; absent on rows typed in by hand. Without these declared, strict
    // mode silently dropped them and GET /api/sms/history could never match.
    source:      { type: String, enum: ['manual', 'sms_webhook', 'csv_import', 'recurring_cron'], default: 'manual', index: true },
    smsSender:   { type: String, trim: true, default: '' },   // originating sender ID, e.g. "VM-HDFCBK"
    smsRaw:      { type: String, default: '' },               // original SMS text, truncated to 500 chars
}, {
    timestamps: true,
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;