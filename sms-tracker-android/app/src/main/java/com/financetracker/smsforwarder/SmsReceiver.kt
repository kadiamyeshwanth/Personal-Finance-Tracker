package com.financetracker.smsforwarder

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

/**
 * SmsReceiver — BroadcastReceiver triggered by Android for every incoming SMS.
 *
 * Android calls this automatically when an SMS arrives. We:
 *  1. Extract the SMS text and sender
 *  2. Check if it looks like a bank/UPI transaction SMS
 *  3. If yes → forward to the user's webhook URL
 *  4. If no  → silently ignore it
 *
 * This receiver works even when the app is completely closed.
 */
class SmsReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SMSTracker"

        // ── Indian Bank / UPI sender IDs ──────────────────────────────────────
        // These are the alphanumeric sender IDs used by banks and UPI apps
        private val BANK_SENDERS = setOf(
            // HDFC
            "hdfcbk", "hdfcbn", "vm-hdfcbk", "tm-hdfcbk", "ad-hdfcbk",
            // SBI
            "sbiinb", "sbipsg", "sbi", "ad-sbiupi", "vm-sbibnk",
            // ICICI
            "icicib", "icicit", "icici", "vm-icicit", "ad-icicit",
            // Axis Bank
            "axisbk", "axisbnk", "axis",
            // Kotak
            "kotakb", "kotak",
            // Yes Bank
            "yesbk", "yesbnk",
            // PNB
            "pnbsms", "pnb",
            // Bank of India
            "boiind", "boi",
            // Canara Bank
            "canbnk", "canara",
            // Union Bank
            "unionb", "ubicar",
            // Indian Bank
            "indbnk",
            // IDBI
            "idbibk", "idbi",
            // Central Bank
            "centralbk",
            // UPI Apps
            "paytm", "phonepe", "gpay", "googlepay", "amazon", "bhim",
            "freecharge", "mobikwik", "jiomoney", "airtelpa",
        )

        // ── Keyword check — does this SMS look like a transaction? ─────────────
        private val TRANSACTION_KEYWORDS = listOf(
            "debited", "credited", "paid", "sent", "received",
            "rs.", "rs ", "inr", "₹", "upi", "neft", "imps", "rtgs",
            "transaction", "txn", "a/c", "a/c no", "account",
        )

        fun isTransactionSms(message: String): Boolean {
            val lower = message.lowercase()
            val hasAmount = lower.contains(Regex("""(rs\.?\s*[\d,]+|₹\s*[\d,]+|inr\s*[\d,]+)"""))
            val hasKeyword = TRANSACTION_KEYWORDS.any { lower.contains(it) }
            return hasAmount && hasKeyword
        }

        fun isBankSender(sender: String): Boolean {
            val s = sender.lowercase().replace(Regex("[^a-z]"), "")
            return BANK_SENDERS.any { s.contains(it) }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val prefs = context.getSharedPreferences("sms_tracker", Context.MODE_PRIVATE)
        val webhookUrl = prefs.getString("webhook_url", null)
        val isActive   = prefs.getBoolean("is_active", false)

        // Don't process if not configured
        if (!isActive || webhookUrl.isNullOrEmpty()) {
            Log.d(TAG, "App not configured, skipping SMS")
            return
        }

        // Extract SMS messages from intent
        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) return

        // Group multi-part SMS by address
        val grouped = mutableMapOf<String, StringBuilder>()
        for (sms in messages) {
            val sender = sms.originatingAddress ?: "unknown"
            grouped.getOrPut(sender) { StringBuilder() }.append(sms.messageBody)
        }

        // Process each complete SMS
        for ((sender, bodyBuilder) in grouped) {
            val body = bodyBuilder.toString()
            Log.d(TAG, "SMS from: $sender | Body: ${body.take(80)}...")

            // Filter: only bank/UPI senders OR messages with transaction keywords
            if (!isBankSender(sender) && !isTransactionSms(body)) {
                Log.d(TAG, "Skipping non-transaction SMS from: $sender")
                continue
            }

            if (!isTransactionSms(body)) {
                Log.d(TAG, "Skipping — no transaction amount found")
                continue
            }

            Log.i(TAG, "✅ Transaction SMS detected from $sender — forwarding to webhook")

            // Send to webhook (non-blocking background thread)
            SmsWebhookSender.send(context, webhookUrl, sender, body)
        }
    }
}
