package com.pomau.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import org.json.JSONObject;

public class TimerForegroundService extends Service {

    public static final String CHANNEL_ID = "pomodoro_focus_island";
    public static final String CHANNEL_NAME = "Pomodoro Timer Capsule";
    public static final int NOTIFICATION_ID = 1001;

    public static final String ACTION_START = "com.pomau.app.action.START_TIMER";
    public static final String ACTION_STOP = "com.pomau.app.action.STOP_TIMER";

    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_CONTENT = "extra_content";
    public static final String EXTRA_TARGET_TIMESTAMP = "extra_target_timestamp";
    public static final String EXTRA_COUNTDOWN = "extra_countdown";

    private PowerManager.WakeLock wakeLock;

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_STOP.equals(action)) {
                stopTimerService();
                return START_NOT_STICKY;
            } else if (ACTION_START.equals(action)) {
                String title = intent.getStringExtra(EXTRA_TITLE);
                if (title == null || title.isEmpty()) {
                    title = "Pomodoro";
                }
                String content = intent.getStringExtra(EXTRA_CONTENT);
                long targetWhen = intent.getLongExtra(EXTRA_TARGET_TIMESTAMP, System.currentTimeMillis());
                boolean isCountDown = intent.getBooleanExtra(EXTRA_COUNTDOWN, true);
                startTimerService(title, content, targetWhen, isCountDown);
                return START_STICKY;
            }
        }
        return START_NOT_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                // IMPORTANCE_HIGH is required by HyperOS to promote the notification to the Super Island capsule
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Laufender Timer Countdown in der Xiaomi HyperOS Island");
                channel.enableLights(false);
                channel.enableVibration(false);
                channel.setSound(null, null);
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                manager.createNotificationChannel(channel);
            }
        }
    }

    /**
     * Builds the proprietary Xiaomi HyperOS / MIUI Focus Notification payload
     * to display the live countdown inside the camera punch-hole / status bar capsule.
     */
    private String buildXiaomiIslandPayload(String title, String content, long targetWhenMs) {
        try {
            long remainingSec = Math.max(0, (targetWhenMs - System.currentTimeMillis()) / 1000);
            long mins = remainingSec / 60;
            long secs = remainingSec % 60;
            String timeText = String.format(java.util.Locale.US, "%02d:%02d", mins, secs);

            JSONObject root = new JSONObject();
            JSONObject paramV2 = new JSONObject();
            paramV2.put("business", "timer");
            paramV2.put("scene", "timer");
            paramV2.put("updatable", true);
            paramV2.put("enable_float", true);
            paramV2.put("show_notification", true);
            paramV2.put("ticker", title + " " + timeText);

            JSONObject paramIsland = new JSONObject();

            // Small Island: pill around camera cutout showing live time
            JSONObject smallIsland = new JSONObject();
            JSONObject smallText = new JSONObject();
            smallText.put("title", timeText);
            smallIsland.put("textInfo", smallText);
            paramIsland.put("smallIslandArea", smallIsland);

            // Big Island: expanded capsule card on touch / hold
            JSONObject bigIsland = new JSONObject();
            JSONObject bigLeft = new JSONObject();
            bigLeft.put("type", 1);
            JSONObject bigText = new JSONObject();
            bigText.put("title", title);
            bigText.put("content", (content != null && !content.trim().isEmpty()) ? content : timeText);
            bigLeft.put("textInfo", bigText);
            bigIsland.put("left", bigLeft);
            paramIsland.put("bigIslandArea", bigIsland);

            paramV2.put("param_island", paramIsland);
            root.put("param_v2", paramV2);

            return root.toString();
        } catch (Exception e) {
            return null;
        }
    }

    private Notification buildNotification(String title, String content, long targetWhenMs, boolean isCountDown) {
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pendingIntent = null;
        if (launchIntent != null) {
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            pendingIntent = PendingIntent.getActivity(this, 0, launchIntent, pendingFlags);
        }

        int smallIcon = getResources().getIdentifier("ic_stat_timer", "drawable", getPackageName());
        if (smallIcon == 0) {
            smallIcon = getApplicationInfo().icon;
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setSmallIcon(smallIcon)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setShowWhen(true)
            .setUsesChronometer(true)
            .setChronometerCountDown(isCountDown)
            .setWhen(targetWhenMs);

        if (content != null && !content.trim().isEmpty()) {
            builder.setContentText(content);
        }

        if (pendingIntent != null) {
            builder.setContentIntent(pendingIntent);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            builder.setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE);
        }

        // Attach Xiaomi HyperOS Super Island capsule payload
        String islandPayload = buildXiaomiIslandPayload(title, content, targetWhenMs);
        if (islandPayload != null) {
            builder.getExtras().putString("miui.focus.param", islandPayload);
        }

        return builder.build();
    }

    private void startTimerService(String title, String content, long targetWhen, boolean isCountDown) {
        acquireWakeLock();
        Notification notification = buildNotification(title, content, targetWhen, isCountDown);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, 0);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void stopTimerService() {
        releaseWakeLock();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        stopSelf();
    }

    private void acquireWakeLock() {
        if (wakeLock == null) {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Pomau:TimerWakeLock");
                wakeLock.acquire();
            }
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            wakeLock = null;
        }
    }

    @Override
    public void onDestroy() {
        releaseWakeLock();
        super.onDestroy();
    }
}
