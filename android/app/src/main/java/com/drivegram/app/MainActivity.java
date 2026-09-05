package com.drivegram.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Environment;
import android.util.Log;
import android.view.KeyEvent;

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
}
