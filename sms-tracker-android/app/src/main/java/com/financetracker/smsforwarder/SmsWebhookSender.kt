package com.financetracker.smsforwarder

import android.content.Context
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException

/**
 * SmsWebhookSender — sends SMS data to the Finance Tracker backend webhook.
 *
 * Uses OkHttp for HTTP POST (lightweight, no extra dependencies).
 * Runs on a background coroutine — never blocks the main thread.
 *
 * Retry logic: tries up to 3 times with exponential backoff before giving up.
 */
object SmsWebhookSender {

    private const val TAG = "SMSTracker"
    private val JSON_TYPE = "application/json; charset=utf-8".toMediaType()

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
        .writeTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
        .build()

    /**
     * Send a real SMS to the webhook.
     * Called from SmsReceiver when a transaction SMS is detected.
     */
    fun send(context: Context, webhookUrl: String, sender: String, message: String) {
        CoroutineScope(Dispatchers.IO).launch {
            val body = JSONObject().apply {
                put("message",  message)
                put("from",     sender)
                put("sender",   sender)
                put("timestamp", System.currentTimeMillis())
                put("source",   "android_app")
            }.toString()

            sendWithRetry(webhookUrl, body, maxRetries = 3)
        }
    }

    /**
     * Send a test ping to verify the webhook URL is working.
     * Called from MainActivity when user taps "Test".
     */
    fun sendTestPing(context: Context, webhookUrl: String, callback: (Boolean) -> Unit) {
        CoroutineScope(Dispatchers.IO).launch {
            val testBody = JSONObject().apply {
                put("message",  "Rs. 1.00 debited from your account for test ping via UPI on ${java.util.Date()}")
                put("from",     "HDFCBK")
                put("sender",   "HDFCBK")
                put("timestamp", System.currentTimeMillis())
                put("source",   "android_test")
            }.toString()

            val success = sendWithRetry(webhookUrl, testBody, maxRetries = 1)
            callback(success)
        }
    }

    /**
     * Core HTTP POST with retry logic.
     * suspend function so we can use coroutine delay() instead of Thread.sleep()
     * Returns true if the request succeeded (HTTP 2xx or 200 skipped).
     */
    private suspend fun sendWithRetry(url: String, jsonBody: String, maxRetries: Int): Boolean {
        repeat(maxRetries) { attempt ->
            try {
                val request = Request.Builder()
                    .url(url)
                    .post(jsonBody.toRequestBody(JSON_TYPE))
                    .header("User-Agent", "FinanceTracker-AndroidApp/1.0")
                    .header("Content-Type", "application/json")
                    .header("bypass-tunnel-reminder", "true")
                    .build()

                httpClient.newCall(request).execute().use { response ->
                    val code = response.code
                    Log.i(TAG, "Webhook response: HTTP $code")

                    // 201 = created, 200 = ok/skipped, 409 = duplicate (all fine)
                    if (code in 200..299 || code == 409) {
                        return true
                    }

                    Log.w(TAG, "Webhook returned error $code on attempt ${attempt + 1}")
                }
            } catch (e: IOException) {
                Log.e(TAG, "Network error on attempt ${attempt + 1}: ${e.message}")
                if (attempt < maxRetries - 1) {
                    // Exponential backoff using coroutine delay (non-blocking)
                    delay(2000L * (attempt + 1))
                }
            }
        }
        Log.e(TAG, "All $maxRetries attempts failed for webhook: $url")
        return false
    }
}
