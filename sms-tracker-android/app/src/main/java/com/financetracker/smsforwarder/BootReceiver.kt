package com.financetracker.smsforwarder

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * BootReceiver — restarts the tracker service when the phone reboots.
 *
 * Without this, the user would have to manually open the app after
 * every phone restart. With this, the tracker starts automatically.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (action == Intent.ACTION_BOOT_COMPLETED ||
            action == "android.intent.action.QUICKBOOT_POWERON") {

            val prefs = context.getSharedPreferences("sms_tracker", Context.MODE_PRIVATE)
            val isActive = prefs.getBoolean("is_active", false)
            val webhookUrl = prefs.getString("webhook_url", null)

            // Only restart if user has configured and activated the app
            if (isActive && !webhookUrl.isNullOrEmpty()) {
                val serviceIntent = Intent(context, TrackerForegroundService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
            }
        }
    }
}
