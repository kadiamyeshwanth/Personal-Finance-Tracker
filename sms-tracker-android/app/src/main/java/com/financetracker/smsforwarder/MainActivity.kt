package com.financetracker.smsforwarder

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

/**
 * MainActivity — The setup screen shown when the app is first launched.
 *
 * User enters their webhook URL (copied from Finance Tracker Settings page),
 * grants SMS permission, and activates the background service.
 * After setup the user never needs to open this app again.
 */
class MainActivity : AppCompatActivity() {

    private val SMS_PERMISSION_CODE  = 101
    private val NOTIF_PERMISSION_CODE = 102

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val prefs = getSharedPreferences("sms_tracker", MODE_PRIVATE)
        val webhookInput = findViewById<EditText>(R.id.webhookUrlInput)
        val statusText   = findViewById<TextView>(R.id.statusText)
        val activateBtn  = findViewById<Button>(R.id.activateBtn)
        val testBtn      = findViewById<Button>(R.id.testBtn)

        // Pre-fill saved URL
        webhookInput.setText(prefs.getString("webhook_url", ""))

        // Update status display
        val isActive = prefs.getBoolean("is_active", false)
        updateStatus(statusText, isActive)

        // ── Activate Button ────────────────────────────────────────
        activateBtn.setOnClickListener {
            val url = webhookInput.text.toString().trim()
            if (url.isEmpty()) {
                Toast.makeText(this, "Please enter your webhook URL", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (!url.startsWith("http")) {
                Toast.makeText(this, "URL must start with http:// or https://", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            // Save the URL
            prefs.edit()
                .putString("webhook_url", url)
                .putBoolean("is_active", true)
                .apply()

            // Request SMS permission if not already granted
            if (!hasSmsPermission()) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS),
                    SMS_PERMISSION_CODE
                )
            } else {
                startTrackerService()
                updateStatus(statusText, true)
                Toast.makeText(this, "✅ Activated! You can close this app now.", Toast.LENGTH_LONG).show()
            }
        }

        // ── Test Button ────────────────────────────────────────────
        testBtn.setOnClickListener {
            val url = prefs.getString("webhook_url", "") ?: ""
            if (url.isEmpty()) {
                Toast.makeText(this, "Please activate first", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            // Send a test SMS payload to the webhook
            SmsWebhookSender.sendTestPing(this, url) { success ->
                runOnUiThread {
                    if (success) {
                        Toast.makeText(this, "✅ Test successful! Check your dashboard.", Toast.LENGTH_LONG).show()
                    } else {
                        Toast.makeText(this, "❌ Test failed. Check the webhook URL.", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }

        // Request battery exemption + notification permission
        requestBatteryOptimizationExemption()
        requestNotificationPermission()
    }

    private fun hasSmsPermission() =
        ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) ==
                PackageManager.PERMISSION_GRANTED

    private fun startTrackerService() {
        val intent = Intent(this, TrackerForegroundService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    private fun updateStatus(tv: TextView, active: Boolean) {
        if (active) {
            tv.text = "🟢 ACTIVE — Monitoring SMS in background"
            tv.setTextColor(ContextCompat.getColor(this, R.color.green))
        } else {
            tv.text = "⚪ Inactive — Enter webhook URL and activate"
            tv.setTextColor(ContextCompat.getColor(this, R.color.gray))
        }
    }

    private fun requestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = getSystemService(POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
                intent.data = Uri.parse("package:$packageName")
                startActivity(intent)
            }
        }
    }

    private fun requestNotificationPermission() {
        // POST_NOTIFICATIONS is a runtime permission on Android 13+ (API 33+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    NOTIF_PERMISSION_CODE
                )
            }
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<out String>, grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == SMS_PERMISSION_CODE) {
            val prefs = getSharedPreferences("sms_tracker", MODE_PRIVATE)
            val statusText = findViewById<TextView>(R.id.statusText)
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startTrackerService()
                updateStatus(statusText, true)
                Toast.makeText(this, "✅ Permission granted! Activated successfully.", Toast.LENGTH_LONG).show()
            } else {
                prefs.edit().putBoolean("is_active", false).apply()
                updateStatus(statusText, false)
                Toast.makeText(this, "❌ SMS permission is required for this app to work.", Toast.LENGTH_LONG).show()
            }
        }
    }
}
