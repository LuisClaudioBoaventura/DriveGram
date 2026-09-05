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

  // 2. Fix null check on android.defaultConfig.ndk.abiFilters (fixes "Cannot invoke java.util.Iterator.hasNext() because self is null")
  const targetNdkCheck = 'if (android.defaultConfig.ndk.abiFilters.isEmpty())';
  if (content.includes(targetNdkCheck)) {
    content = content.replace(
      targetNdkCheck,
      `def ndkCfg = android.defaultConfig.hasProperty('ndk') ? android.defaultConfig.ndk : null
    def filters = (ndkCfg != null && ndkCfg.hasProperty('abiFilters')) ? ndkCfg.abiFilters : null
    if (filters == null || filters.isEmpty())`
    );
    content = content.replace(
      'android.defaultConfig.ndk.abiFilters = ["armeabi-v7a", "arm64-v8a", "x86_64"] as Set<String>;',
      `if (android.defaultConfig.hasProperty('ndk') && android.defaultConfig.ndk != null) {
        android.defaultConfig.ndk.abiFilters = ["armeabi-v7a", "arm64-v8a", "x86_64"] as Set<String>;
      } else {
        android.defaultConfig.ndk {
          abiFilters "armeabi-v7a", "arm64-v8a", "x86_64"
        }
      }`
    );
    modified = true;
    console.log('[patch-nodejs-mobile] Patched ndk.abiFilters null check for Gradle 8/9');
  }

  // 3. Fallback for Capacitor assets path if www folder is checked
  const oldWwwThrow = "throw new GradleException('nodejs-mobile-cordova couldn\\'t find the www folder in the Android project.');";
  if (content.includes(oldWwwThrow)) {
    content = content.replace(
      oldWwwThrow,
      `if (file("\${rootProject.projectDir}/app/src/main/assets/public/").exists()) {
        projectWWW = "\${rootProject.projectDir}/app/src/main/assets/public";
    } else if (file("\${rootProject.projectDir}/app/src/main/assets/").exists()) {
        projectWWW = "\${rootProject.projectDir}/app/src/main/assets";
    } else {
        projectWWW = "\${project.projectDir}/src/main/assets";
    }`
    );
    modified = true;
    console.log('[patch-nodejs-mobile] Patched Capacitor assets fallback');
  }

  // 4. Ensure cdvPluginPostBuildExtras syntax is robust for Gradle 8/9 & Groovy 4
  const oldPostBuildRegex = /cdvPluginPostBuildExtras\s*(\+=|\<\<)\s*\{\s*->?/;
  if (oldPostBuildRegex.test(content)) {
    content = content.replace(
      oldPostBuildRegex,
      `if (!project.ext.has('cdvPluginPostBuildExtras') || project.ext.get('cdvPluginPostBuildExtras') == null) {
    project.ext.set('cdvPluginPostBuildExtras', [])
}
project.ext.cdvPluginPostBuildExtras.add({ ->`
    );
    // Adjust trailing closing bracket from }; to });
    content = content.replace(/\};\s*$/, '});\n');
    modified = true;
    console.log('[patch-nodejs-mobile] Patched cdvPluginPostBuildExtras to project.ext.cdvPluginPostBuildExtras.add');
  }

  // 5. Fix CMakeLists.txt path for Capacitor
  if (content.includes('path "libs/cdvnodejsmobile/CMakeLists.txt"')) {
    content = content.replace(
      'path "libs/cdvnodejsmobile/CMakeLists.txt"',
      'path "${rootProject.projectDir}/../node_modules/@red-mobile/nodejs-mobile-cordova/src/android/CMakeLists.txt"'
    );
    modified = true;
    console.log('[patch-nodejs-mobile] Patched CMakeLists.txt path for Capacitor');
  }

  // Also ensure libs/cdvnodejsmobile/CMakeLists.txt exists in app and plugins for safety
  const cmakeSrc = path.join(rootDir, 'node_modules', '@red-mobile', 'nodejs-mobile-cordova', 'src', 'android', 'CMakeLists.txt');
  if (fs.existsSync(cmakeSrc)) {
    const targets = [
      path.join(rootDir, 'android', 'app', 'libs', 'cdvnodejsmobile', 'CMakeLists.txt'),
      path.join(rootDir, 'android', 'capacitor-cordova-android-plugins', 'libs', 'cdvnodejsmobile', 'CMakeLists.txt'),
      path.join(rootDir, 'android', 'app', 'src', 'main', 'libs', 'cdvnodejsmobile', 'CMakeLists.txt')
    ];
    for (const t of targets) {
      fs.mkdirSync(path.dirname(t), { recursive: true });
      fs.copyFileSync(cmakeSrc, t);
    }
    console.log('[patch-nodejs-mobile] Mirrored CMakeLists.txt to app and plugin libs');
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
