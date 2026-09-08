import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const baseNodeModules = path.join(
  rootDir,
  'node_modules',
  '@red-mobile',
  'nodejs-mobile-cordova'
);

const gradlePath = path.join(
  baseNodeModules,
  'src',
  'android',
  'build.gradle'
);

if (fs.existsSync(baseNodeModules)) {
  // 1. Ensure libnode/include headers exist in src/android/libnode/include
  const libnodeSrcInclude = path.join(baseNodeModules, 'libs', 'android', 'libnode', 'include');
  const targetSrcInclude = path.join(baseNodeModules, 'src', 'android', 'libnode', 'include');

  if (fs.existsSync(libnodeSrcInclude)) {
    fs.mkdirSync(path.dirname(targetSrcInclude), { recursive: true });
    fs.cpSync(libnodeSrcInclude, targetSrcInclude, { recursive: true });
    console.log('[patch-nodejs-mobile] Synced libnode/include headers to src/android/libnode/include');

    // Also copy to plugin libs and app libs for fallback
    const headerTargets = [
      path.join(rootDir, 'android', 'app', 'libs', 'cdvnodejsmobile', 'libnode', 'include'),
      path.join(rootDir, 'android', 'capacitor-cordova-android-plugins', 'libs', 'cdvnodejsmobile', 'libnode', 'include')
    ];
    for (const ht of headerTargets) {
      fs.mkdirSync(path.dirname(ht), { recursive: true });
      fs.cpSync(libnodeSrcInclude, ht, { recursive: true });
    }
  }

  // 2. Ensure libnode.so binaries are decompressed from .so.gz
  const abis = ['arm64-v8a', 'armeabi-v7a', 'x86_64'];
  const appJniLibs = path.join(rootDir, 'android', 'app', 'src', 'main', 'jniLibs');

  for (const abi of abis) {
    const gzPath = path.join(baseNodeModules, 'libs', 'android', 'libnode', 'bin', abi, 'libnode.so.gz');
    const targetPluginPath = path.join(baseNodeModules, 'libs', 'android', 'libnode', 'bin', abi, 'libnode.so');
    const targetSrcPath = path.join(baseNodeModules, 'src', 'android', 'libnode', 'bin', abi, 'libnode.so');
    const targetAppPath = path.join(appJniLibs, abi, 'libnode.so');

    if (fs.existsSync(gzPath)) {
      const compressed = fs.readFileSync(gzPath);
      const decompressed = zlib.gunzipSync(compressed);

      for (const dest of [targetPluginPath, targetSrcPath, targetAppPath]) {
        if (!fs.existsSync(dest) || fs.statSync(dest).size < 10 * 1024 * 1024) {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, decompressed);
        }
      }
      console.log(`[patch-nodejs-mobile] Verified libnode.so for ${abi}`);
    }
  }

  // 3. Patch build.gradle if exists
  if (fs.existsSync(gradlePath)) {
    let content = fs.readFileSync(gradlePath, 'utf8');
    let modified = false;

    // Replace removed jcenter() with google() and mavenCentral() for Gradle 8+ and 9+
    if (content.includes('jcenter()')) {
      content = content.replace(/jcenter\(\)/g, 'google()\n        mavenCentral()');
      modified = true;
      console.log('[patch-nodejs-mobile] Replaced jcenter() with google() & mavenCentral()');
    }

    // Fix null check on android.defaultConfig.ndk.abiFilters (fixes "Cannot invoke java.util.Iterator.hasNext() because self is null")
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

    // Fallback for Capacitor assets path if www folder is checked
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

    // Ensure cdvPluginPostBuildExtras syntax is robust for Gradle 8/9 & Groovy 4
    const oldPostBuildRegex = /cdvPluginPostBuildExtras\s*(\+=|\<\<)\s*\{\s*->?/;
    if (oldPostBuildRegex.test(content)) {
      content = content.replace(
        oldPostBuildRegex,
        `if (!project.ext.has('cdvPluginPostBuildExtras') || project.ext.get('cdvPluginPostBuildExtras') == null) {
      project.ext.set('cdvPluginPostBuildExtras', [])
  }
  project.ext.cdvPluginPostBuildExtras.add({ ->`
      );
      content = content.replace(/\};\s*$/, '});\n');
      modified = true;
      console.log('[patch-nodejs-mobile] Patched cdvPluginPostBuildExtras to project.ext.cdvPluginPostBuildExtras.add');
    }

    // Fix CMakeLists.txt path for Capacitor
    if (content.includes('path "libs/cdvnodejsmobile/CMakeLists.txt"')) {
      content = content.replace(
        'path "libs/cdvnodejsmobile/CMakeLists.txt"',
        'path "${rootProject.projectDir}/../node_modules/@red-mobile/nodejs-mobile-cordova/src/android/CMakeLists.txt"'
      );
      modified = true;
      console.log('[patch-nodejs-mobile] Patched CMakeLists.txt path for Capacitor');
    }

    if (modified) {
      fs.writeFileSync(gradlePath, content, 'utf8');
      console.log('[patch-nodejs-mobile] Successfully patched nodejs-mobile-cordova build.gradle');
    }
  }

  // 4. Explicitly patch nodejs-mobile CMakeLists.txt with resilient include paths & sources
  const cmakeSrc = path.join(baseNodeModules, 'src', 'android', 'CMakeLists.txt');
  const robustCmakeContent = `cmake_minimum_required(VERSION 3.4.1)
project(nodejs_mobile_cordova)

add_library( # Sets the name of the library.
             nodejs-mobile-cordova-native-lib

             # Sets the library as a shared library.
             SHARED

             # Provides a relative path to your source file(s).
             \${CMAKE_CURRENT_LIST_DIR}/jni/native-lib.cpp
             \${CMAKE_CURRENT_LIST_DIR}/../common/cordova-bridge/cordova-bridge.cpp
           )

# Support headers in src/android/libnode or libs/android/libnode
include_directories(\${CMAKE_CURRENT_LIST_DIR}/libnode/include/node/)
include_directories(\${CMAKE_CURRENT_LIST_DIR}/../../libs/android/libnode/include/node/)
include_directories(\${CMAKE_CURRENT_LIST_DIR}/../common/cordova-bridge/)

add_library( libnode
             SHARED
             IMPORTED )

if(EXISTS "\${CMAKE_CURRENT_LIST_DIR}/libnode/bin/\${ANDROID_ABI}/libnode.so")
    set(LIBNODE_PATH "\${CMAKE_CURRENT_LIST_DIR}/libnode/bin/\${ANDROID_ABI}/libnode.so")
elseif(EXISTS "\${CMAKE_CURRENT_LIST_DIR}/../../libs/android/libnode/bin/\${ANDROID_ABI}/libnode.so")
    set(LIBNODE_PATH "\${CMAKE_CURRENT_LIST_DIR}/../../libs/android/libnode/bin/\${ANDROID_ABI}/libnode.so")
else()
    set(LIBNODE_PATH "\${CMAKE_CURRENT_LIST_DIR}/libnode/bin/\${ANDROID_ABI}/libnode.so")
endif()

set_target_properties( # Specifies the target library.
                       libnode

                       # Specifies the parameter you want to define.
                       PROPERTIES IMPORTED_LOCATION

                       # Provides the path to the library you want to import.
                       \${LIBNODE_PATH} )

find_library( # Sets the name of the path variable.
              log-lib

              # Specifies the name of the NDK library that
              # you want CMake to locate.
              log )

target_link_libraries( # Specifies the target library.
                       nodejs-mobile-cordova-native-lib
                       libnode
                       \${log-lib} )
`;

  fs.writeFileSync(cmakeSrc, robustCmakeContent, 'utf8');
  console.log('[patch-nodejs-mobile] Overwrote CMakeLists.txt with robust Capacitor paths');

  const targets = [
    path.join(rootDir, 'android', 'app', 'libs', 'cdvnodejsmobile', 'CMakeLists.txt'),
    path.join(rootDir, 'android', 'capacitor-cordova-android-plugins', 'libs', 'cdvnodejsmobile', 'CMakeLists.txt'),
    path.join(rootDir, 'android', 'capacitor-cordova-android-plugins', 'src', 'main', 'libs', 'cdvnodejsmobile', 'CMakeLists.txt'),
    path.join(rootDir, 'android', 'app', 'src', 'main', 'libs', 'cdvnodejsmobile', 'CMakeLists.txt')
  ];
  for (const t of targets) {
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.writeFileSync(t, robustCmakeContent, 'utf8');
  }
  console.log('[patch-nodejs-mobile] Mirrored robust CMakeLists.txt to app and plugin libs');

} else {
  console.log('[patch-nodejs-mobile] nodejs-mobile-cordova not found in node_modules; skipping patch.');
}
