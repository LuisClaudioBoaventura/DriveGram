import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const gradlePath = path.join(
  rootDir,
  'node_modules',
  '@red-mobile',
  'nodejs-mobile-cordova',
  'src',
  'android',
  'build.gradle'
);

if (fs.existsSync(gradlePath)) {
  let content = fs.readFileSync(gradlePath, 'utf8');
  let modified = false;

  // 1. Replace removed jcenter() with google() and mavenCentral() for Gradle 8+ and 9+
  if (content.includes('jcenter()')) {
    content = content.replace(/jcenter\(\)/g, 'google()\n        mavenCentral()');
    modified = true;
    console.log('[patch-nodejs-mobile] Replaced jcenter() with google() & mavenCentral()');
  }

  // 2. Fix Gradle 8/9 << operator deprecation/error if present
  if (content.includes('cdvPluginPostBuildExtras << {')) {
    content = content.replace('cdvPluginPostBuildExtras << {', 'ext.cdvPluginPostBuildExtras = {');
    modified = true;
    console.log('[patch-nodejs-mobile] Fixed cdvPluginPostBuildExtras syntax for Gradle 8/9');
  }

  if (modified) {
    fs.writeFileSync(gradlePath, content, 'utf8');
    console.log('[patch-nodejs-mobile] Successfully patched nodejs-mobile-cordova build.gradle');
  } else {
    console.log('[patch-nodejs-mobile] nodejs-mobile-cordova build.gradle is already up to date.');
  }
} else {
  console.log('[patch-nodejs-mobile] nodejs-mobile-cordova not found in node_modules; skipping patch.');
}
