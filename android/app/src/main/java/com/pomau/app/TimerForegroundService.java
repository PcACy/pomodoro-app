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
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import java.lang.reflect.Method;
import java.util.Locale;
import org.json.JSONObject;

public class TimerForegroundService extends Service {

    public static final String CHANNEL_ID = "pomodoro_live_timer";
    public static final String CHANNEL_NAME = "Pomodoro Timer";
    public static final int NOTIFICATION_ID = 1;

    public static final String ACTION_START = "com.pomau.app.action.START_TIMER";
    public static final String ACTION_STOP = "com.pomau.app.action.STOP_TIMER";

    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_CONTENT = "extra_content";
    public static final String EXTRA_TARGET_TIMESTAMP = "extra_target_timestamp";
    public static final String EXTRA_COUNTDOWN = "extra_countdown";

    private PowerManager.WakeLock wakeLock;
    private Handler mainHandler;
    private Runnable tickerRunnable;

    private String currentTitle = "Pomodoro";
    private String currentContent = "";
    private long currentTargetWhen = 0;
    private boolean currentIsCountdown = true;

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        mainHandler = new Handler(Looper.getMainLooper());
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
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_DEFAULT
                );
                channel.setDescription("Pomodoro Live Countdown (Xiaomi HyperOS Island / Now Bar)");
                channel.enableLights(false);
                channel.enableVibration(false);
                channel.setSound(null, null);
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                manager.createNotificationChannel(channel);
            }
        }
    }

    private String formatTime(long seconds) {
        long mins = Math.max(0, seconds) / 60;
        long secs = Math.max(0, seconds) % 60;
        return String.format(Locale.US, "%02d:%02d", mins, secs);
    }

    /**
     * Applies the standard Android 16 / HyperOS Promoted Ongoing Notification API.
     * This promotes the notification to the status bar pill / Dynamic Island / Now Bar.
     */
    private void applyPromotedOngoing(NotificationCompat.Builder builder, String shortText) {
        try {
            builder.setRequestPromotedOngoing(true);
        } catch (Throwable t) {
            try {
                Method m = builder.getClass().getMethod("setRequestPromotedOngoing", boolean.class);
                m.invoke(builder, true);
            } catch (Throwable ignored) {}
        }

        if (shortText != null && !shortText.isEmpty()) {
            try {
                builder.setShortCriticalText(shortText);
            } catch (Throwable t) {
                try {
                    Method m = builder.getClass().getMethod("setShortCriticalText", CharSequence.class);
                    m.invoke(builder, shortText);
                } catch (Throwable ignored) {}
            }
        }
    }

    /**
     * Builds the proprietary Xiaomi HyperOS / MIUI Focus Notification payload as extra fallback.
     */
    private String buildXiaomiIslandPayload(String title, String content, long targetWhenMs, String timeText) {
        try {
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

    private Notification buildNotification(String title, String content, long targetWhenMs, boolean isCountDown, String shortText) {
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

        int smallIcon = R.drawable.ic_stat_timer;
        if (smallIcon == 0) {
            smallIcon = getApplicationInfo().icon;
        }

        String displayTitle = title + "  ·  " + shortText;
        String body = (content != null && !content.trim().isEmpty()) ? content : "Pomau Focus Timer";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(displayTitle)
            .setContentText(body)
            .setSmallIcon(smallIcon)
            .setColor(0xFFD71921) // Nothing Red Accent
            .setOngoing(true)
            .setSilent(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setShowWhen(true)
            .setUsesChronometer(true)
            .setChronometerCountDown(isCountDown)
            .setWhen(targetWhenMs);

        if (pendingIntent != null) {
            builder.setContentIntent(pendingIntent);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            builder.setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE);
        }

        // Apply Android 16 / HyperOS Promoted Ongoing Live Update API
        applyPromotedOngoing(builder, shortText);

        // Attach Xiaomi HyperOS Super Island capsule payload
        String islandPayload = buildXiaomiIslandPayload(title, content, targetWhenMs, shortText);
        if (islandPayload != null) {
            builder.getExtras().putString("miui.focus.param", islandPayload);
        }

        return builder.build();
    }

    private void startTimerService(String title, String content, long targetWhen, boolean isCountDown) {
        acquireWakeLock();
        this.currentTitle = title != null ? title : "Pomodoro";
        this.currentContent = content != null ? content : "";
        this.currentTargetWhen = targetWhen;
        this.currentIsCountdown = isCountDown;

        stopTicker();

        long remainingSec = Math.max(0, (targetWhen - System.currentTimeMillis()) / 1000);
        String shortText = formatTime(remainingSec);

        Notification notification = buildNotification(currentTitle, currentContent, currentTargetWhen, currentIsCountdown, shortText);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, 0);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        startTicker();
    }

    private void startTicker() {
        tickerRunnable = new Runnable() {
            @Override
            public void run() {
                long now = System.currentTimeMillis();
                long remainingSec = Math.max(0, (currentTargetWhen - now) / 1000);
                String shortText = formatTime(remainingSec);

                updateNotification(shortText);

                if (remainingSec > 0) {
                    mainHandler.postDelayed(this, 1000);
                }
            }
        };
        mainHandler.postDelayed(tickerRunnable, 1000);
    }

    private void stopTicker() {
        if (tickerRunnable != null && mainHandler != null) {
            mainHandler.removeCallbacks(tickerRunnable);
            tickerRunnable = null;
        }
    }

    private void updateNotification(String shortText) {
        try {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                Notification notification = buildNotification(currentTitle, currentContent, currentTargetWhen, currentIsCountdown, shortText);
                manager.notify(NOTIFICATION_ID, notification);
            }
        } catch (Exception ignored) {}
    }

    private void stopTimerService() {
        stopTicker();
        releaseWakeLock();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.cancel(NOTIFICATION_ID);
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
        stopTicker();
        releaseWakeLock();
        super.onDestroy();
    }
}
