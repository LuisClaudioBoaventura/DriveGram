/**
 * build-embedded-server.js
 * Compiles the TypeScript server into a single self-contained bundle
 * for use with Node.js Mobile inside the Android APK.
 *
 * Output: android/app/src/main/assets/nodejs-project/server.bundle.js
 *         www/nodejs-project/server.bundle.js  (Capacitor www sync)
 */
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Targets: all locations Capacitor and Cordova look for nodejs-project
const targetDirs = [
  path.join(rootDir, 'www', 'nodejs-project'),
  path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'nodejs-project'),
  path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'www', 'nodejs-project'),
];

// ---- 1. Bundle the server with esbuild ----
const bundleOutPath = path.join(rootDir, '_tmp_server_bundle.mjs');

console.log('[build-embedded] Bundling server TypeScript with esbuild...');
await build({
  entryPoints: [path.join(rootDir, 'server', 'index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundleOutPath,
  target: ['node18'],
  banner: {
    js: `import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import __esbuild_path from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_path.dirname(__filename);
`,
  },
  // Packages with native binaries must stay external
  external: [
    'fsevents',
    'better-sqlite3',
    'sqlite3',
    'canvas',
    'sharp',
  ],
  logLevel: 'warning',
  supported: { 'top-level-await': true },
  tsconfig: path.join(rootDir, 'tsconfig.json'),
});

console.log('[build-embedded] Bundle created at', bundleOutPath);
const bundleContent = fs.readFileSync(bundleOutPath, 'utf8');

// ---- 2. Generate main.js entry point ----
const mainJs = `// DriveGram — Embedded Server Entry Point (Node.js Mobile)
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

process.env.NODE_ENV = 'production';
process.env.PORT = '5000';
process.env.DRIVEGRAM_EMBEDDED = '1';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Android internal app files directory (/data/data/com.drivegram.app/files)
// In www/nodejs-project: __dirname is .../files/www/nodejs-project -> resolve ../..
const filesBaseDir = path.resolve(__dirname, '..', '..');
const defaultDataDir = path.join(filesBaseDir, 'drivegram-data');

const rawDataDir = process.env.DRIVEGRAM_DATA_DIR;
const dataDir = (rawDataDir && rawDataDir.length > 5 && rawDataDir !== '/data' && !rawDataDir.startsWith('/data/uploads'))
  ? rawDataDir
  : defaultDataDir;

const rawUploadsDir = process.env.DRIVEGRAM_UPLOADS_DIR;
const uploadsDir = (rawUploadsDir && rawUploadsDir.length > 5 && rawUploadsDir !== '/data' && !rawUploadsDir.startsWith('/data/uploads'))
  ? rawUploadsDir
  : path.join(dataDir, 'uploads');

[dataDir, uploadsDir].forEach(d => {
  try {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  } catch (err) {
    console.error('[NodeJS-Mobile] Directory creation warning for ' + d + ':', err.message);
  }
});

process.env.DRIVEGRAM_DATA_DIR = dataDir;
process.env.DRIVEGRAM_UPLOADS_DIR = uploadsDir;

console.log('[NodeJS-Mobile] Starting DriveGram server on port', process.env.PORT);
console.log('[NodeJS-Mobile] Data dir:', dataDir);
console.log('[NodeJS-Mobile] Uploads dir:', uploadsDir);

// Global error handlers to prevent silent crashes
process.on('uncaughtException', (err) => {
  console.error('[NodeJS-Mobile] Uncaught exception:', err.message, err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('[NodeJS-Mobile] Unhandled rejection:', reason);
});

const staticDir = path.join(__dirname, 'public');
if (fs.existsSync(staticDir)) {
  process.env.DRIVEGRAM_STATIC_DIR = staticDir;
  console.log('[NodeJS-Mobile] Static frontend dir detected:', staticDir);
}

try {
  await import('./server.bundle.js');
  console.log('[NodeJS-Mobile] Server initialized successfully.');
} catch (err) {
  console.error('[NodeJS-Mobile] Failed to start server:', err.message);
  console.error(err.stack);
}
`;

// ---- 3. Deploy to all target directories ----
const distDir = path.join(rootDir, 'dist');
const hasDist = fs.existsSync(distDir) && fs.existsSync(path.join(distDir, 'index.html'));

for (const targetDir of targetDirs) {
  fs.mkdirSync(targetDir, { recursive: true });

  // Remove old server/ folder (was copying raw .ts files before)
  const oldServerDir = path.join(targetDir, 'server');
  if (fs.existsSync(oldServerDir)) {
    fs.rmSync(oldServerDir, { recursive: true, force: true });
    console.log('[build-embedded] Removed legacy server/ folder from', targetDir);
  }

  // package.json
  fs.writeFileSync(path.join(targetDir, 'package.json'), JSON.stringify({
    name: 'drivegram-embedded-server',
    version: '1.0.0',
    main: 'main.js',
    type: 'module'
  }, null, 2));

  // main.js entry point
  fs.writeFileSync(path.join(targetDir, 'main.js'), mainJs.trimStart());

  // server.bundle.js — the compiled, self-contained server
  fs.writeFileSync(path.join(targetDir, 'server.bundle.js'), bundleContent);

  // Copy dist to public/ inside nodejs-project
  if (hasDist) {
    const publicTarget = path.join(targetDir, 'public');
    fs.mkdirSync(publicTarget, { recursive: true });
    fs.cpSync(distDir, publicTarget, { recursive: true });
    console.log('[build-embedded] Copied frontend dist to:', publicTarget);
  }

  // Copy unrar.wasm for CBR comic extraction if available
  const unrarWasmSrc = path.join(rootDir, 'node_modules', 'node-unrar-js', 'dist', 'js', 'unrar.wasm');
  if (fs.existsSync(unrarWasmSrc)) {
    fs.copyFileSync(unrarWasmSrc, path.join(targetDir, 'unrar.wasm'));
    console.log('[build-embedded] Copied unrar.wasm to:', targetDir);
  }

  console.log('[build-embedded] Deployed to:', targetDir);
}

// Cleanup temp file
fs.unlinkSync(bundleOutPath);

const bundleSize = (Buffer.byteLength(bundleContent) / 1024 / 1024).toFixed(2);
console.log(`[build-embedded] ✅ Server bundle ready: ${bundleSize} MB`);

// ---- 3.1 Copy builtin cordova-bridge assets ----
const cordovaAssetsSrc = path.join(rootDir, 'node_modules', '@red-mobile', 'nodejs-mobile-cordova', 'install', 'nodejs-mobile-cordova-assets');
const cordovaAssetTargets = [
  path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'nodejs-mobile-cordova-assets'),
  path.join(rootDir, 'android', 'capacitor-cordova-android-plugins', 'src', 'main', 'assets', 'nodejs-mobile-cordova-assets'),
  path.join(rootDir, 'www', 'nodejs-mobile-cordova-assets'),
];

if (fs.existsSync(cordovaAssetsSrc)) {
  for (const cat of cordovaAssetTargets) {
    fs.mkdirSync(cat, { recursive: true });
    fs.cpSync(cordovaAssetsSrc, cat, { recursive: true });
    console.log('[build-embedded] Synchronized cordova assets to:', cat);
  }
}

// ---- 4. Extract native libnode.so for Android ABIs ----
import zlib from 'zlib';

console.log('[build-embedded] Verifying native libnode.so binaries...');
const abis = ['arm64-v8a', 'armeabi-v7a', 'x86_64'];
const baseNodeModules = path.join(rootDir, 'node_modules', '@red-mobile', 'nodejs-mobile-cordova');
const appJniLibs = path.join(rootDir, 'android', 'app', 'src', 'main', 'jniLibs');

for (const abi of abis) {
  const gzPath = path.join(baseNodeModules, 'libs', 'android', 'libnode', 'bin', abi, 'libnode.so.gz');
  const targetPluginPath = path.join(baseNodeModules, 'libs', 'android', 'libnode', 'bin', abi, 'libnode.so');
  const targetSrcPath = path.join(baseNodeModules, 'src', 'android', 'libnode', 'bin', abi, 'libnode.so');
  const targetAppPath = path.join(appJniLibs, abi, 'libnode.so');

  if (fs.existsSync(targetAppPath) && fs.statSync(targetAppPath).size > 10 * 1024 * 1024) {
    console.log(`[build-embedded] libnode.so already extracted for ${abi}`);
    continue;
  }

  if (fs.existsSync(gzPath)) {
    console.log(`[build-embedded] Extracting libnode.so.gz for ${abi}...`);
    const compressed = fs.readFileSync(gzPath);
    const decompressed = zlib.gunzipSync(compressed);

    fs.mkdirSync(path.dirname(targetPluginPath), { recursive: true });
    fs.writeFileSync(targetPluginPath, decompressed);

    fs.mkdirSync(path.dirname(targetSrcPath), { recursive: true });
    fs.writeFileSync(targetSrcPath, decompressed);

    fs.mkdirSync(path.dirname(targetAppPath), { recursive: true });
    fs.writeFileSync(targetAppPath, decompressed);

    console.log(`[build-embedded] ✅ Extracted libnode.so (${(decompressed.length / 1024 / 1024).toFixed(1)} MB) for ${abi}`);
  }
}


