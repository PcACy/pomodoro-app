package com.pomau.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "TimerForeground",
    permissions = {
        @Permission(
            strings = { Manifest.permission.POST_NOTIFICATIONS },
            alias = "notifications"
        )
    }
)
public class TimerForegroundPlugin extends Plugin {

    @PluginMethod
    public void startTimer(PluginCall call) {
        String title = call.getString("title", "Timer");
        String content = call.getString("content", "");
        Long targetTime = call.getLong("targetTime");
        Boolean isCountDown = call.getBoolean("isCountDown", true);

        if (targetTime == null) {
            Integer remainingSeconds = call.getInt("remainingSeconds");
            if (remainingSeconds != null) {
                targetTime = System.currentTimeMillis() + (remainingSeconds * 1000L);
            } else {
                targetTime = System.currentTimeMillis();
            }
        }

        Context context = getContext();
        Intent intent = new Intent(context, TimerForegroundService.class);
        intent.setAction(TimerForegroundService.ACTION_START);
        intent.putExtra(TimerForegroundService.EXTRA_TITLE, title);
        intent.putExtra(TimerForegroundService.EXTRA_CONTENT, content);
        intent.putExtra(TimerForegroundService.EXTRA_TARGET_TIMESTAMP, targetTime);
        intent.putExtra(TimerForegroundService.EXTRA_COUNTDOWN, isCountDown != null ? isCountDown : true);

        try {
            ContextCompat.startForegroundService(context, intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to start timer foreground service: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void stopTimer(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, TimerForegroundService.class);
        intent.setAction(TimerForegroundService.ACTION_STOP);

        try {
            context.startService(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to stop timer foreground service: " + e.getMessage(), e);
        }
    }
}
