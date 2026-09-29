package com.twelo.app;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.Toast;

import androidx.core.app.NotificationCompat;
import androidx.core.app.RemoteInput;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Handles the inline "Reply" action from a Twelo chat notification (Instagram-style:
 * the notification vanishes the moment the reply is sent). Uses the session JWT the JS
 * layer mirrors into the Capacitor Preferences store, posting to /api/push/reply.
 */
public class TweloReplyReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        Bundle results = RemoteInput.getResultsFromIntent(intent);
        final String text = results != null ? String.valueOf(results.getCharSequence(TweloMessagingService.KEY_REPLY, "")) : "";
        final String chatId = intent.getStringExtra(TweloMessagingService.EXTRA_CHAT_ID);
        final int notifId = intent.getIntExtra(TweloMessagingService.EXTRA_NOTIF_ID, 1);
        if (chatId == null || text == null || text.trim().isEmpty()) return;

        // Instagram behaviour: clear the notification immediately, the reply travels in background.
        ((NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(notifId);

        final Context app = context.getApplicationContext();
        new Thread(() -> {
            String status = "failed";
            try {
                // The Capacitor Preferences plugin stores under this exact file name
                // ("CapacitorStorage"); nativePush.js mirrors {twelo_jwt, twelo_api_base}.
                SharedPreferences p = app.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                String jwt = p.getString("twelo_jwt", null);
                String base = p.getString("twelo_api_base", null);
                if (jwt != null && base != null && !jwt.isEmpty() && !base.isEmpty()) {
                    HttpURLConnection c = (HttpURLConnection) new URL(base + "/api/push/reply").openConnection();
                    c.setRequestMethod("POST");
                    c.setConnectTimeout(8000);
                    c.setReadTimeout(8000);
                    c.setDoOutput(true);
                    c.setRequestProperty("Content-Type", "application/json");
                    c.setRequestProperty("Authorization", "Bearer " + jwt);
                    String json = "{\"to\":\"" + chatId.replace("\"", "") + "\",\"text\":\"" + esc(text) + "\"}";
                    OutputStream os = c.getOutputStream();
                    os.write(json.getBytes("UTF-8"));
                    os.flush();
                    os.close();
                    int code = c.getResponseCode();
                    if (code >= 200 && code < 300) status = "sent";
                    else if (code == 401) status = "expired";
                } else {
                    status = "nosession";
                }
            } catch (Exception e) {
                // fall through with "failed"
            }
            if (!"sent".equals(status)) {
                final String body = "expired".equals(status) || "nosession".equals(status)
                        ? "Your session expired — open Twelo and reply from the chat."
                        : "Couldn't send your reply — open Twelo to try again.";
                showSimple(app, notifId, body);
            }
        }).start();
    }

    private static String esc(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }

    private static void showSimple(Context context, int id, String body) {
        try {
            Intent open = new Intent(context, MainActivity.class);
            open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pi = PendingIntent.getActivity(context, id, open,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            NotificationCompat.Builder b = new NotificationCompat.Builder(context, TweloMessagingService.CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_stat_twelo)
                    .setColor(0xFF4F46E5)
                    .setContentTitle("Reply not sent")
                    .setContentText(body)
                    .setAutoCancel(true)
                    .setContentIntent(pi);
            androidx.core.app.NotificationManagerCompat.from(context).notify(id + 7, b.build());
        } catch (Exception ignored) {}
    }
}
