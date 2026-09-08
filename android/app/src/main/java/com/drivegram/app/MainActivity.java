package com.drivegram.app;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.util.Log;
import android.view.KeyEvent;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import androidx.core.content.FileProvider;
import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "DriveGram";
    private static final String PREFS_NAME = "DriveGramPrefs";
    private static final String KEY_STORAGE_MODE = "storage_mode";
    private static boolean isNodeStarted = false;
    private static boolean isServerReady = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Initialize Splash Screen before super.onCreate()
        SplashScreen.installSplashScreen(this);

        super.onCreate(savedInstanceState);

        Log.d(TAG, "MainActivity onCreate started");

        try {
            // Determine storage directory safely
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String mode = prefs.getString(KEY_STORAGE_MODE, "internal");

            File baseDir;
            if ("shared".equalsIgnoreCase(mode)) {
                try {
                    File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    baseDir = new File(downloadsDir, "DriveGram");
                } catch (Throwable t) {
                    baseDir = getFilesDir();
                }
            } else {
                File extFiles = getExternalFilesDir(null);
                baseDir = (extFiles != null) ? extFiles : getFilesDir();
            }

            File dataDir = new File(baseDir, "drivegram-data");
            File uploadsDir = new File(dataDir, "uploads");

            if (!dataDir.exists()) dataDir.mkdirs();
            if (!uploadsDir.exists()) uploadsDir.mkdirs();

            try {
                android.system.Os.setenv("DRIVEGRAM_DATA_DIR", dataDir.getAbsolutePath(), true);
                android.system.Os.setenv("DRIVEGRAM_UPLOADS_DIR", uploadsDir.getAbsolutePath(), true);
                android.system.Os.setenv("PORT", "5000", true);
                android.system.Os.setenv("NODE_ENV", "production", true);
                android.system.Os.setenv("DRIVEGRAM_EMBEDDED", "1", true);
            } catch (Throwable t) {
                Log.w(TAG, "Os.setenv notice: " + t.getMessage());
            }

            System.setProperty("DRIVEGRAM_DATA_DIR", dataDir.getAbsolutePath());
            System.setProperty("DRIVEGRAM_UPLOADS_DIR", uploadsDir.getAbsolutePath());

            Log.d(TAG, "Data dir: " + dataDir.getAbsolutePath());
            Log.d(TAG, "Uploads dir: " + uploadsDir.getAbsolutePath());

            // Start embedded Node.js Mobile engine in background thread
            startEmbeddedNodeServer(getFilesDir());

            // Load bootstrap loading screen in WebView immediately
            loadBootstrapPage();

            // Monitor /api/health and transition to http://localhost:5000 once ready
            waitForServerAndLoad();

            // Style navigation bar and status bar icons
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getWindow().setNavigationBarColor(0xFF0F172A);
            }
            try {
                androidx.core.view.WindowInsetsControllerCompat controller =
                    new androidx.core.view.WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
                controller.setAppearanceLightStatusBars(false);
                controller.setAppearanceLightNavigationBars(false);
            } catch (Throwable ignored) {}

            // Listen for window insets (status bar, notch cutout & navigation bar) and dynamically pass heights to webview
            androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (v, insets) -> {
                try {
                    androidx.core.graphics.Insets sb = insets.getInsets(
                        androidx.core.view.WindowInsetsCompat.Type.statusBars() | androidx.core.view.WindowInsetsCompat.Type.displayCutout()
                    );
                    androidx.core.graphics.Insets nb = insets.getInsets(
                        androidx.core.view.WindowInsetsCompat.Type.navigationBars()
                    );
                    float density = getResources().getDisplayMetrics().density;
                    int topDp = (int) Math.ceil(sb.top / density);
                    int bottomDp = (int) Math.ceil(nb.bottom / density);

                    if (bridge != null && bridge.getWebView() != null) {
                        bridge.getWebView().post(() -> {
                            StringBuilder js = new StringBuilder("(function(){try{");
                            if (topDp > 0) {
                                js.append("document.documentElement.style.setProperty('--safe-area-inset-top','").append(topDp).append("px');");
                                js.append("document.documentElement.style.setProperty('--android-status-bar-height','").append(topDp).append("px');");
                            }
                            if (bottomDp > 0) {
                                js.append("document.documentElement.style.setProperty('--safe-area-inset-bottom','").append(bottomDp).append("px');");
                                js.append("document.documentElement.style.setProperty('--android-navigation-bar-height','").append(bottomDp).append("px');");
                            }
                            js.append("}catch(e){}})();");
                            bridge.getWebView().evaluateJavascript(js.toString(), null);
                        });
                    }
                } catch (Throwable ignored) {}
                return insets;
            });
        } catch (Throwable t) {
            Log.e(TAG, "Error in onCreate: " + t.getMessage(), t);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (!isServerReady) {
            loadBootstrapPage();
        }
    }

    private void loadBootstrapPage() {
        runOnUiThread(() -> {
            try {
                if (bridge != null && bridge.getWebView() != null && !isServerReady) {
                    bridge.getWebView().loadUrl("file:///android_asset/public/loading.html");
                    Log.d(TAG, "Loaded bootstrap loading.html in WebView");
                }
            } catch (Throwable t) {
                Log.w(TAG, "Notice loading bootstrap page: " + t.getMessage());
            }
        });
    }

    private void startEmbeddedNodeServer(File filesDir) {
        if (isNodeStarted) return;
        isNodeStarted = true;

        new Thread(() -> {
            try {
                Log.d(TAG, "Preparing Node.js Mobile runtime assets...");
                File nodeProjectDir = new File(filesDir, "www/nodejs-project");
                nodeProjectDir.mkdirs();

                // Copy nodejs assets from APK to writable storage
                copyAssetFolder("www/nodejs-project", nodeProjectDir.getAbsolutePath());
                copyAssetFolder("nodejs-project", nodeProjectDir.getAbsolutePath());

                File mainJs = new File(nodeProjectDir, "main.js");
                File serverBundle = new File(nodeProjectDir, "server.bundle.js");

                Log.d(TAG, "main.js exists: " + mainJs.exists() + " (" + mainJs.length() + " bytes)");
                Log.d(TAG, "server.bundle.js exists: " + serverBundle.exists() + " (" + serverBundle.length() + " bytes)");

                if (!mainJs.exists()) {
                    Log.e(TAG, "main.js not found in " + nodeProjectDir.getAbsolutePath());
                    return;
                }

                // Reflectively invoke Node.js Mobile runtime
                Class<?> nodeClass = Class.forName("com.janeasystems.cdvnodejsmobile.NodeJS");
                Object node = nodeClass.getDeclaredConstructor().newInstance();

                try {
                    nodeClass.getMethod("registerNodeDataDirPath", String.class)
                             .invoke(node, filesDir.getAbsolutePath());
                } catch (Throwable t) {
                    Log.w(TAG, "registerNodeDataDirPath notice: " + t.getMessage());
                }

                String scriptPath = mainJs.getAbsolutePath();
                String nodePath = nodeProjectDir.getAbsolutePath();

                Log.d(TAG, "Starting Node.js Mobile engine with: " + scriptPath);
                nodeClass.getMethod("startNodeWithArguments", String[].class, String.class, boolean.class)
                         .invoke(node, new String[]{"node", scriptPath}, nodePath, true);
                Log.d(TAG, "Node.js Mobile engine started successfully.");

                try {
                    java.lang.reflect.Field field = nodeClass.getDeclaredField("engineAlreadyStarted");
                    field.setAccessible(true);
                    field.setBoolean(null, true);
                } catch (Throwable ignored) {}
            } catch (Throwable t) {
                Log.e(TAG, "Failed to start Node.js engine: " + t.getMessage(), t);
            }
        }).start();
    }

    private void waitForServerAndLoad() {
        new Thread(() -> {
            int attempts = 0;
            int maxAttempts = 60; // 24 seconds max (400ms intervals)

            while (attempts < maxAttempts && !isServerReady) {
                try {
                    Thread.sleep(400);
                    attempts++;
                    URL url = new URL("http://127.0.0.1:5000/api/health");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setConnectTimeout(600);
                    conn.setReadTimeout(600);
                    conn.setRequestMethod("GET");
                    int responseCode = conn.getResponseCode();
                    conn.disconnect();

                    if (responseCode >= 200 && responseCode < 400) {
                        isServerReady = true;
                        Log.d(TAG, "DriveGram server is ready (HTTP " + responseCode + ") after " + (attempts * 400) + "ms");
                        break;
                    }
                } catch (Exception ignored) {
                    // Server still booting
                }
            }

            if (isServerReady) {
                runOnUiThread(() -> {
                    try {
                        if (bridge != null && bridge.getWebView() != null) {
                            try {
                                bridge.getWebView().addJavascriptInterface(new AndroidUpdateBridge(MainActivity.this), "DriveGramAndroidBridge");
                            } catch (Throwable it) {
                                Log.w(TAG, "Notice adding DriveGramAndroidBridge: " + it.getMessage());
                            }
                            Log.d(TAG, "Transitioning WebView to http://127.0.0.1:5000");
                            bridge.getWebView().loadUrl("http://127.0.0.1:5000");
                        }
                    } catch (Throwable t) {
                        Log.e(TAG, "Error transitioning WebView: " + t.getMessage(), t);
                    }
                });
            } else {
                Log.w(TAG, "Timed out waiting for DriveGram server on port 5000");
            }
        }).start();
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            try {
                if (bridge != null && bridge.getWebView() != null && bridge.getWebView().canGoBack()) {
                    bridge.getWebView().goBack();
                    return true;
                }
            } catch (Throwable ignored) {}
        }
        return super.onKeyDown(keyCode, event);
    }

    private void copyAssetFolder(String srcFolder, String destPath) {
        try {
            String[] files = getAssets().list(srcFolder);
            if (files == null || files.length == 0) {
                copyAssetFile(srcFolder, destPath);
                return;
            }
            new File(destPath).mkdirs();
            for (String file : files) {
                String srcChild = srcFolder + "/" + file;
                String destChild = destPath + "/" + file;
                String[] subFiles = getAssets().list(srcChild);
                if (subFiles != null && subFiles.length > 0) {
                    copyAssetFolder(srcChild, destChild);
                } else {
                    copyAssetFile(srcChild, destChild);
                }
            }
        } catch (IOException e) {
            Log.d(TAG, "Asset copy notice for " + srcFolder + ": " + e.getMessage());
        }
    }

    private void copyAssetFile(String srcAsset, String destPath) {
        File destFile = new File(destPath);
        try (InputStream in = getAssets().open(srcAsset);
             OutputStream out = new FileOutputStream(destFile)) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            out.flush();
        } catch (IOException ignored) {}
    }

    public void startApkDownload(String apkUrl, String versionName) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!getPackageManager().canRequestPackageInstalls()) {
                    Toast.makeText(this, "Autorize a instalação de fontes desconhecidas para atualizar", Toast.LENGTH_LONG).show();
                    Intent reqIntent = new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                    reqIntent.setData(Uri.parse("package:" + getPackageName()));
                    reqIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(reqIntent);
                }
            }

            Toast.makeText(this, "Iniciando download do DriveGram " + (versionName != null ? versionName : "") + "...", Toast.LENGTH_SHORT).show();

            String cleanVersion = (versionName != null && !versionName.isEmpty()) ? versionName.replace("v", "") : "update";
            String fileName = "DriveGram_" + cleanVersion + ".apk";

            File destinationDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (destinationDir != null && !destinationDir.exists()) {
                destinationDir.mkdirs();
            }
            File apkFile = new File(destinationDir, fileName);
            if (apkFile.exists()) {
                apkFile.delete();
            }

            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(apkUrl));
            request.setTitle("DriveGram " + cleanVersion);
            request.setDescription("Baixando atualização do DriveGram...");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationUri(Uri.fromFile(apkFile));
            request.setMimeType("application/vnd.android.package-archive");

            DownloadManager downloadManager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            if (downloadManager == null) {
                Toast.makeText(this, "Erro: Gerenciador de downloads indisponível", Toast.LENGTH_SHORT).show();
                return;
            }

            final long downloadId = downloadManager.enqueue(request);

            BroadcastReceiver onComplete = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                    if (id == downloadId) {
                        try {
                            context.unregisterReceiver(this);
                        } catch (Exception ignored) {}

                        promptInstallApk(apkFile);
                    }
                }
            };

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(onComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), Context.RECEIVER_EXPORTED);
            } else {
                registerReceiver(onComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
            }

        } catch (Exception e) {
            Log.e(TAG, "Error starting APK download: " + e.getMessage(), e);
            Toast.makeText(this, "Erro no download: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    public void promptInstallApk(File apkFile) {
        try {
            if (!apkFile.exists()) {
                Toast.makeText(this, "Arquivo da atualização não encontrado", Toast.LENGTH_SHORT).show();
                return;
            }

            Uri fileUri = FileProvider.getUriForFile(
                this,
                getPackageName() + ".fileprovider",
                apkFile
            );

            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(fileUri, "application/vnd.android.package-archive");
            installIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(installIntent);
        } catch (Exception e) {
            Log.e(TAG, "Error prompting APK install: " + e.getMessage(), e);
            Toast.makeText(this, "Erro ao abrir instalador: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    public class AndroidUpdateBridge {
        private final MainActivity activity;

        public AndroidUpdateBridge(MainActivity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public boolean isNativeAndroid() {
            return true;
        }

        @JavascriptInterface
        public int getStatusBarHeightDp() {
            int result = 0;
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    android.view.WindowMetrics windowMetrics = activity.getWindowManager().getCurrentWindowMetrics();
                    android.graphics.Insets insets = windowMetrics.getWindowInsets().getInsets(
                        android.view.WindowInsets.Type.statusBars() | android.view.WindowInsets.Type.displayCutout()
                    );
                    result = insets.top;
                }
                if (result <= 0) {
                    int resourceId = activity.getResources().getIdentifier("status_bar_height", "dimen", "android");
                    if (resourceId > 0) {
                        result = activity.getResources().getDimensionPixelSize(resourceId);
                    }
                }
                float density = activity.getResources().getDisplayMetrics().density;
                return (int) Math.ceil(result / density);
            } catch (Throwable t) {
                return 28;
            }
        }

        @JavascriptInterface
        public int getNavigationBarHeightDp() {
            int result = 0;
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    android.view.WindowMetrics windowMetrics = activity.getWindowManager().getCurrentWindowMetrics();
                    android.graphics.Insets insets = windowMetrics.getWindowInsets().getInsets(
                        android.view.WindowInsets.Type.navigationBars()
                    );
                    result = insets.bottom;
                }
                if (result <= 0) {
                    int resourceId = activity.getResources().getIdentifier("navigation_bar_height", "dimen", "android");
                    if (resourceId > 0) {
                        result = activity.getResources().getDimensionPixelSize(resourceId);
                    }
                }
                float density = activity.getResources().getDisplayMetrics().density;
                return (int) Math.ceil(result / density);
            } catch (Throwable t) {
                return 48;
            }
        }

        @JavascriptInterface
        public void downloadAndInstallApk(final String apkUrl, final String versionName) {
            activity.runOnUiThread(() -> activity.startApkDownload(apkUrl, versionName));
        }
    }
}
