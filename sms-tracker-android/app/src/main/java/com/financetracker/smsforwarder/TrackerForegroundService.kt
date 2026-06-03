package com.financetracker.smsforwarder

import android.app.*
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

/**
 * TrackerForegroundService — keeps the app alive in the background.
 *
 * On Android 8+, background services get killed. A Foreground Service
 * with a persistent notification is the official way to keep running.
 * This service shows a small "Monitoring UPI SMS" notification in the
 * status bar — user can ignore it. The app will survive battery
 * optimization and phone restarts (via BootReceiver).
 */
class TrackerForegroundService : Service() {

    companion object {
        const val CHANNEL_ID   = "sms_tracker_channel"
        const val NOTIFICATION_ID = 1
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Restart if killed by system
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "UPI SMS Tracker",
                NotificationManager.IMPORTANCE_LOW // Silent — no sound/vibration
            ).apply {
                description = "Monitors incoming UPI and bank SMS messages"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        // Tap the notification to open the app
        val openIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Finance Tracker")
            .setContentText("Monitoring UPI & bank SMS...")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(openIntent)
            .setOngoing(true)          // Cannot be dismissed
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setSilent(true)           // No sound
            .build()
    }
}
