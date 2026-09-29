package com.twelo.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.RectF;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.Person;
import androidx.core.app.RemoteInput;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Owns notification display for FCM DATA messages so the app renders them exactly like
 * Instagram does: the sender's photo (falling back to our blue launcher logo) as the
 * large icon, one notification per conversation that updates in place, and a genuine
 * inline "Reply" action served straight from the shade. The Capacitor push plugin's
 * stock MessagingService is removed in AndroidManifest in favour of this class.
 */
public class TweloMessagingService extends FirebaseMessagingService {

    public static final String CHANNEL_ID = "twelo_default";
    public static final String KEY_REPLY = "twelo_reply_text";
    public static final String EXTRA_URL = "twelo_push_url";
    public static final String EXTRA_CHAT_ID = "twelo_chat_id";
    public static final String EXTRA_NOTIF_ID = "twelo_notif_id";
    private static final int BRAND_COLOR = 0xFF4F46E5;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        try {
            Map<String, String> data = message.getData();
            String title = nz(data.get("title"), "Twelo");
            String body = nz(data.get("body"), "");
            String url = nz(data.get("url"), "/");
            String sender = data.get("sender");
            String avatar = data.get("avatar");
            ensureChannel();
            post(title, body, url, sender, null, false);
            // Upgrade the large icon to the sender's real photo (Instagram-style) as
            // soon as it downloads; re-post with onlyAlertOnce so it makes no extra sound.
            if (avatar != null && avatar.startsWith("http")) {
                new Thread(() -> {
                    Bitmap av = circle(loadBitmap(avatar));
                    if (av != null) new Handler(Looper.getMainLooper()).post(() -> post(title, body, url, sender, av, true));
                }).start();
            }
        } catch (Exception e) {
            // Never let a malformed payload crash the service.
        }
    }

    @Override
    public void onNewToken(@NonNull String token) {
        // Persist for the next app launch; the JS side re-syncs the live token on every
        // start via PushNotifications.register(), so this is only a safety copy.
        try {
            getSharedPreferences("twelo_push", MODE_PRIVATE).edit().putString("pending_fcm_token", token).apply();
        } catch (Exception ignored) {}
    }

    /** Builds and shows (or in-place replaces) the conversation notification. */
    private void post(String title, String body, String url, String sender, Bitmap largeIcon, boolean alertOnce) {
        int id = Math.abs(url.hashCode());
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_twelo)
                .setColor(BRAND_COLOR)
                .setLargeIcon(largeIcon != null ? largeIcon : BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher))
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setOnlyAlertOnce(alertOnce)
                .setGroup("twelo_" + url)
                .setContentIntent(openIntent(url));

        // Chat pushes get a messaging-style layout + a real inline reply box.
        String chatId = matchChatId(url);
        if (sender != null && !sender.isEmpty()) {
            NotificationCompat.MessagingStyle style = new NotificationCompat.MessagingStyle(
                    new Person.Builder().setName(getString(R.string.app_name)).build());
            style.addMessage(body, System.currentTimeMillis(), new Person.Builder().setName(sender).build());
            b.setStyle(style);
            b.setContentTitle(sender);
        }
        if (chatId != null) {
            RemoteInput ri = new RemoteInput.Builder(KEY_REPLY).setLabel("Reply to " + (sender != null ? sender : "chat")).build();
            NotificationCompat.Action reply = new NotificationCompat.Action.Builder(
                    R.drawable.ic_stat_twelo, "Reply", replyIntent(chatId, id))
                    .addRemoteInput(ri).setAllowGeneratedReplies(true).build();
            b.addAction(reply);
        }
        NotificationManagerCompat.from(this).notify(id, b.build());
    }

    private PendingIntent openIntent(String url) {
        Intent i = new Intent(this, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        i.putExtra(EXTRA_URL, url);
        return PendingIntent.getActivity(this, url.hashCode(), i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private PendingIntent replyIntent(String chatId, int id) {
        Intent i = new Intent(this, TweloReplyReceiver.class);
        i.putExtra(EXTRA_CHAT_ID, chatId);
        i.putExtra(EXTRA_NOTIF_ID, id);
        return PendingIntent.getBroadcast(this, id + 1, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void ensureChannel() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return; // never reset user's settings
        NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "Twelo", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Chats, likes, comments and follow activity");
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[]{0, 200, 100, 200});
        nm.createNotificationChannel(ch);
    }

    private static String nz(String v, String fallback) {
        return (v == null || v.trim().isEmpty()) ? fallback : v;
    }

    private static String matchChatId(String url) {
        Matcher m = Pattern.compile("chat=([^&]+)").matcher(url);
        return m.find() ? m.group(1) : null;
    }

    static Bitmap loadBitmap(String src) {
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(src).openConnection();
            c.setConnectTimeout(4000);
            c.setReadTimeout(5000);
            c.setInstanceFollowRedirects(true);
            InputStream in = c.getInputStream();
            Bitmap bmp = BitmapFactory.decodeStream(in);
            in.close();
            return bmp;
        } catch (Exception e) {
            return null;
        }
    }

    /** Square-crops then rounds a bitmap so avatars read as Instagram-style circles. */
    static Bitmap circle(Bitmap src) {
        if (src == null) return null;
        int size = Math.min(src.getWidth(), src.getHeight());
        Bitmap out = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(out);
        Paint paint = new Paint();
        paint.setAntiAlias(true);
        canvas.drawARGB(0, 0, 0, 0);
        canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint);
        paint.setXfermode(new android.graphics.PorterDuffXfermode(android.graphics.PorterDuff.Mode.SRC_IN));
        Rect srcRect = new Rect((src.getWidth() - size) / 2, (src.getHeight() - size) / 2,
                (src.getWidth() + size) / 2, (src.getHeight() + size) / 2);
        canvas.drawBitmap(src, srcRect, new RectF(0, 0, size, size), paint);
        return out;
    }
}
