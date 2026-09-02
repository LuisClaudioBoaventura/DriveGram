package com.drivegram.app;

import android.os.Bundle;
import android.util.Log;
import android.view.WindowManager;

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
    private static boolean isNodeStarted = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Initialize Splash Screen before super.onCreate()
        SplashScreen.installSplashScreen(this);

        super.onCreate(savedInstanceState);

        // Enable hardware acceleration for WebView (improves video playback)
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );

        try {
            // Set writable Android storage paths
            File filesDir = getFilesDir();
            File dataDir = new File(filesDir, "drivegram-data");
            File uploadsDir = new File(dataDir, "uploads");

            if (!dataDir.exists()) dataDir.mkdirs();
            if (!uploadsDir.exists()) uploadsDir.mkdirs();

            try {
                android.system.Os.setenv("DRIVEGRAM_DATA_DIR", dataDir.getAbsolutePath(), true);
                android.system.Os.setenv("DRIVEGRAM_UPLOADS_DIR", uploadsDir.getAbsolutePath(), true);
                android.system.Os.setenv("PORT", "5000", true);
                android.system.Os.setenv("NODE_ENV", "production", true);
            } catch (Throwable t) {
                Log.w(TAG, "Os.setenv warning: " + t.getMessage());
            }

            System.setProperty("DRIVEGRAM_DATA_DIR", dataDir.getAbsolutePath());
            System.setProperty("DRIVEGRAM_UPLOADS_DIR", uploadsDir.getAbsolutePath());

            Log.d(TAG, "Data dir: " + dataDir.getAbsolutePath());
            Log.d(TAG, "Uploads dir: " + uploadsDir.getAbsolutePath());

            // Start embedded Node.js in background thread
            startEmbeddedNodeServer(filesDir);

            Log.d(TAG, "MainActivity initialized successfully");

            // Monitor local Express server and reload WebView when ready
            waitForServerAndLoad();
        } catch (Throwable t) {
            Log.e(TAG, "Error initializing MainActivity: " + t.getMessage(), t);
        }
    }

    private void startEmbeddedNodeServer(File filesDir) {
        if (isNodeStarted) return;
        isNodeStarted = true;

        new Thread(() -> {
            try {
                Log.d(TAG, "Preparing Node.js Mobile assets...");
                File nodeProjectDir = new File(filesDir, "www/nodejs-project");
                nodeProjectDir.mkdirs();

                // Copy nodejs assets from APK to writable filesDir
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

                // Use reflection to invoke NodeJS native methods without needing CordovaPlugin compile dependency
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

                Log.d(TAG, "Starting Node.js Mobile runtime with script: " + scriptPath);
                nodeClass.getMethod("startNodeWithArguments", String[].class, String.class, boolean.class)
                         .invoke(node, new String[]{"node", scriptPath}, nodePath, true);
                Log.d(TAG, "Node.js Mobile engine process started.");
            } catch (Throwable t) {
                Log.e(TAG, "Failed to start embedded Node.js engine: " + t.getMessage(), t);
            }
        }).start();
    }

    private void waitForServerAndLoad() {
        new Thread(() -> {
            int attempts = 0;
            int maxAttempts = 30; // 15 seconds max (500ms intervals)
            boolean serverReady = false;

            while (attempts < maxAttempts && !serverReady) {
                try {
                    Thread.sleep(500);
                    attempts++;
                    URL url = new URL("http://127.0.0.1:5000/api/folders");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setConnectTimeout(800);
                    conn.setReadTimeout(800);
                    conn.setRequestMethod("GET");
                    int responseCode = conn.getResponseCode();
                    conn.disconnect();
                    if (responseCode >= 200 && responseCode < 500) {
                        serverReady = true;
                        Log.d(TAG, "Local Express server responded with HTTP " + responseCode + " after " + (attempts * 500) + "ms");
                    }
                } catch (Exception ignored) {
                    // Server not ready yet
                }
            }

            if (serverReady) {
                runOnUiThread(() -> {
                    try {
                        if (bridge != null && bridge.getWebView() != null) {
                            Log.d(TAG, "Reloading WebView to http://localhost:5000");
                            bridge.getWebView().loadUrl("http://localhost:5000");
                        }
                    } catch (Throwable t) {
                        Log.e(TAG, "Error reloading WebView: " + t.getMessage(), t);
                    }
                });
            } else {
                Log.w(TAG, "Timed out waiting for local Express server on port 5000");
            }
        }).start();
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
            Log.d(TAG, "Asset copy notice for: " + srcFolder + " (" + e.getMessage() + ")");
        }
    }

    private void copyAssetFile(String srcAsset, String destPath) {
        try (InputStream in = getAssets().open(srcAsset);
             OutputStream out = new FileOutputStream(destPath)) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            out.flush();
        } catch (IOException e) {
            // Ignored if asset does not exist as file
        }
    }
}

