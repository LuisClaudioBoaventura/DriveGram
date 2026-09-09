# 🚀 DriveGram

<div align="center">

<img width="1855" height="917" alt="DriveGram - Home" src="https://github.com/user-attachments/assets/02e37ab8-f9ef-4908-9eff-5abc638a7db4" />

**Your complete ecosystem for unlimited cloud storage, streaming, and digital libraries — featuring a modern interface inspired by Google Drive and OneDrive, powered by Telegram's infrastructure.**

<br />

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Telegram MTProto](https://img.shields.io/badge/Telegram-MTProto%20GramJS-2CA5E0.svg)](https://telegram.org/)
[![Android Capacitor](https://img.shields.io/badge/Android-Capacitor%208-brightgreen.svg)](https://capacitorjs.com/)
[![Desktop Tauri v2](https://img.shields.io/badge/Desktop-Tauri%20v2%20(Rust)-24C8D8.svg)](https://tauri.app/)
[![Node.js Mobile](https://img.shields.io/badge/Node.js%20Mobile-Embedded%20Engine-orange.svg)](https://github.com/red-mobile/nodejs-mobile-cordova)

<br />

**Languages / Idiomas:**  
[ 🇺🇸 **English** ](README.en.md) &nbsp;•&nbsp; [ 🇧🇷 **Português** ](README.md)

</div>

---

## 📖 About the Project

**DriveGram** transforms your **Telegram Saved Messages** into an enterprise-grade, unlimited personal cloud with ultra-fast streaming.

Forget about storage constraints and recurring fees of traditional cloud storage services. With DriveGram you get:
- **100% Unlimited & Free Storage**: Files up to **2 GB** each (or up to **4 GB** per file for Telegram Premium subscribers).
- **Instant Streaming without Prior Download**: Watch movies, video lectures, and listen to music/audiobooks directly from the cloud via the *HTTP 206 (Partial Content)* protocol.
- **Cross-Platform Ecosystem (Desktop & Android APK)**: Runs natively on your computer (Windows/Mac/Linux) and includes an official Android application (`.apk`) powered by an autonomous embedded Node.js engine that runs 100% independently on your phone (no host PC required).
- **Active Sync & Continuous Backup**: Your files, directory trees, and notes are synthesized into secure manifests (`#drivegram_metadata_sync`) stored on Telegram, featuring 1-click cloud restoration and intelligent retention policies.

---

## 📥 Ready-to-Use Downloads (Easy Installation)

Download the official release installers directly from the [**GitHub Releases Page**](https://github.com/LuisClaudioBoaventura/DriveGram/releases/latest):

| Platform | Package / Installer | Description | Direct Link |
| :--- | :--- | :--- | :--- |
| 💻 **Windows Desktop** | **`DriveGram-Setup.exe`** | **Recommended**. Self-contained installer (Tauri v2) with bundled Node.js runtime and Desktop shortcut. | [⬇️ **Download .EXE**](https://github.com/LuisClaudioBoaventura/DriveGram/releases/latest/download/DriveGram-Setup.exe) |
| 📱 **Android** | **`DriveGram.apk`** | Official Android application featuring an embedded self-hosted Node.js engine. | [⬇️ **Download .APK**](https://github.com/LuisClaudioBoaventura/DriveGram/releases/latest/download/DriveGram.apk) |

> 🏷️ *All release packages, changelogs, and source code archives are also available on the [Releases Tab](https://github.com/LuisClaudioBoaventura/DriveGram/releases).*

---

## 🌟 All Features & Dedicated Libraries

DriveGram is organized into intelligent, purpose-built modules designed for every media format and workflow:

### 📁 1. My Drive (Comprehensive File Manager)
- **Unlimited Directory Tree**: Create folders and subfolders with no depth limits, custom folder accent colors, and intuitive *Breadcrumbs* navigation.
- **Smart Folder Deduplication**: Semantic algorithm that recognizes default system categories, purges empty duplicates, and safely protects all your stored files.
- **Smart Upload (Drag & Drop)**: Drag and drop individual files or complete directory hierarchies straight into the interface.
- **Floating Upload Manager**: Background transfer monitor with real-time progress bars, transfer speed indicators, and queue controls.
- **Multiple View Modes**: Seamlessly toggle between **Grid Cards** with rich thumbnails and **Detailed List** sorted by Name, Size, Date, and Type.
- **Instant Search & Quick Filters**: Search through files in real time and filter by Videos, Audios, PDFs, Documents, Images, Code, and Compressed Archives.
- **Favorites & Secure Trash**: Star high-priority files for quick retrieval, and rely on the Trash bin for safe restores or permanent deletion.
- **Duplicate Finder**: Automated deep scan to detect and remove identical files across your cloud.
- **Smart File Moving**: Effortlessly relocate files and folders between directories.

---

### 🎓 2. Courses & Learning (Virtual Learning Environment - VLE)
- **Modular Curriculum Structure**: Organize courses into modules and lessons with automated lesson counters and total runtime metrics.
- **Sequential Autoplay**: Visual 5-second countdown timer after a lesson ends before smoothly progressing to the next.
- **Resume Playback**: Automatically remembers the exact second where you paused or stopped each lesson.
- **Timestamp Bookmarks**: Save important chapters or key study moments with interactive, clickable links.
- **Automatic Subtitles (.vtt/.srt)**: Automatic discovery and rendering of subtitle files stored in the same lesson folder.
- **Supporting Materials & PDFs**: Instant inline access to presentation slides, cheat sheets, and course handouts.
- **Synchronized Lesson Notepad**: Dedicated notepad per lesson with instantaneous auto-saving.
- **Completion Tracking**: Mark finished lessons with green completion checks and track your overall course progress bar.

---

### 🎬 3. Movies & Cinema (Streaming Catalog)
- **Netflix / Prime-style UI**: Cinematic posters, resolution badges, genres, release year, and duration.
- **OMDb API Integration**: Automatic metadata lookup by title or IMDb ID to fetch synopsis, director, cast, awards, parental rating, and official scores from **IMDb** and **Metascore**.
- **Advanced Cinema Player**:
  - **Persistent Picture-in-Picture (PiP)**: Keep watching in a floating window while browsing other sections. The *"Back to Tab"* button brings you back to fullscreen instantly.
  - **Custom Subtitles**: Select, upload, and synchronize external subtitle tracks.
  - **Chapters & Timestamps**: Jump straight to scenes and key moments.
  - **Keyboard Shortcuts**: Space (Play/Pause), Arrow keys (Skip/Rewind 10s), `F` (Fullscreen), `M` (Mute).
- **Genre Management**: Create, edit, and organize custom film categories.

---

### 📹 4. Videos & Personal Media (Family Memories & Vlogs)
- **Dedicated Personal Hub**: Dedicated space tailored for travel videos, family milestones, home movies, and personal vlogs.
- **Advanced Filters**: Filter by Categories, People tagged, Location, Date, and Custom tags.
- **Playback History**: Seamlessly resumes each video right from where you left off.

---

### 🎧 5. Books & Audiobooks (Hi-Fi Studio & E-book Reader)
- **Hybrid Support**: Audio formats (MP3, M4A, AAC, FLAC) + Digital Books (PDF, EPUB, CBR, CBZ).
- **3 Specialized View Modes**:
  1. **Audio-Only Mode (Default)**: Smart adaptive *Hi-Fi Studio Widescreen* layout with prominent album artwork, dynamic ambient glow, expansive timeline scrubber, and speed controls (`0.75x` to `2x`).
  2. **Listen & Read Mode (Split View)**: Compact audio player on the left paired with a responsive PDF reader on the right for synchronized study.
  3. **E-book / PDF Reader Mode**: Immersive distraction-free full-screen reader.
- **Global Floating Miniplayer**: Keep enjoying audiobooks in a floating bar while navigating anywhere in the app.
- **Sleep Timer**: Automatically halt audio playback after 15, 30, 45, or 60 minutes.
- **Google Books Integration**: Automated fetching of high-res book covers, authors, and literary metadata.

---

### 📚 6. Comics, Graphic Novels & Manga (Comics Studio)
- **Full Comic Format Support**: Direct native viewing of **.cbr**, **.cbz**, **.pdf**, and **.epub** files.
- **Real-Time Decompression**: Ultra-fast client/server archive extraction powered by WebAssembly (`node-unrar-js` + `unrar.wasm`) and `jszip`.
- **Interactive Magnifier Tool**: Precision loupe with adjustable magnification following your mouse or touch, perfect for reading speech bubbles and intricate artwork on Desktop and Android APK.
- **Reading Modes**: Fit-to-width, full-screen mode, visual thumbnail drawer, and smooth page transitions.

---

### 📺 7. TV Series & Anime
- **Seasons & Episodes Layout**: Dedicated overview with series synopsis, poster art, episode counts, and watched markers.
- **Watch History**: Continuous playback state tracking across all seasons and episodes.

---

### 🎙️ 8. Podcasts & Audio Shows
- **Episode Manager**: Listening status indicators, timestamp notes, and playback history.
- **Dedicated Floating Player**: Multitask freely across your cloud while listening to favorite podcasts.

---

### 📥 9. YouTube Importer
- **Direct Download & Upload**: Download video or audio streams from YouTube by pasting the link into the import modal.
- **Custom Target Destination**: Select which directory in "My Drive" the media is saved to before automatically syncing to Telegram.

---

### 🔐 10. Red Locker (Secure Vault)
- **Password/PIN Protected**: Restricted private area with automated timeout locking upon inactivity.
- **Specialized Cataloging**: Manage performers/actors, studios, custom categories, and tags.
- **Isolated Structure**: Keeps confidential media strictly segregated from public browsing.

---

## 🔄 Smart Synchronization & Retention Policy

DriveGram features a state-of-the-art metadata synchronization architecture:

1. **Active Startup Sync**:
   - When launching the application (Desktop or Android APK) with an active Telegram session, it immediately scans Saved Messages for newer metadata manifests (`#drivegram_metadata_sync`), seamlessly applying changes made on other devices.
2. **Reactive Auto-Backup**:
   - Whenever you create, edit, move, or delete a file or folder, an automated background backup is scheduled with smart debouncing (3.5s) and uploaded directly to your cloud.
3. **Retention Policy & History Cleanup**:
   - To keep your Saved Messages tidy and avoid cluttering your chat with dozens of old sync messages, DriveGram applies a configurable retention policy (`metadataRetentionCount`, default = 1), automatically purging previous sync manifests and retaining only the freshest revision.
4. **Clean First Launch**:
   - On fresh installations without a logged-in account, the local database initializes completely blank (0 files, 0 MB), without loading outdated mock data. Once you sign in, your cloud metadata is restored immediately.

---

## 📱 Native Android App (.APK)

DriveGram delivers a first-class native Android experience powered by **Capacitor 8** and **Node.js Mobile**:

- **Embedded Node.js Engine**: The Express + GramJS backend runs entirely within the Android device through `libnode.so` (compiled for `arm64-v8a`, `armeabi-v7a`, and `x86_64` architectures).
- **100% Autonomous**: The APK requires no external server, proxy, or companion computer to be running.
- **Startup Health Check**: The Android Main Activity monitors the embedded server's lifecycle via `/api/health` before revealing the web view, preventing blank screens or connection errors.

### How to Build the Android APK:
```bash
# 1. Compile the frontend and synchronize the embedded mobile server
npm run mobile:sync

# 2. Build the final installer APK (requires Android SDK / Gradle)
npm run mobile:apk
```
The compiled APK file will be available at the project root as **`DriveGram.apk`**.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Native Desktop (Windows)** | **Tauri v2**, Rust 2021, Microsoft Edge WebView2, Node.js Sidecar |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite |
| **Backend** | Node.js, Express, TypeScript, GramJS (Telegram MTProto Client), esbuild |
| **Mobile (Android)** | Capacitor 8, Node.js Mobile (`@red-mobile/nodejs-mobile-cordova`), esbuild |
| **Decompression & Formats** | WebAssembly `node-unrar-js` (`unrar.wasm`), `jszip`, `pdfjs-dist`, `epubjs` |
| **Local Database** | JSON persistence with cloud manifest sync and semantic deduplication |
| **Streaming** | HTTP 206 (Partial Content) protocol with direct byte-range streaming and local caching |
| **External APIs** | OMDb API (Movies), Google Books API (Books) |

---

## 🚀 Installation & Usage Guide

### 💻 1. Installing on Windows (Native Desktop App)

DriveGram Desktop is powered by **Tauri v2**, making it remarkably lightweight: it consumes only **~70 MB to 100 MB of RAM** (unlike Electron apps that easily require 350+ MB) and the installer weighs only **~4.33 MB**!

1. **Download Installer**: Grab the latest [**`DriveGram-Setup.exe`**](https://github.com/LuisClaudioBoaventura/DriveGram/releases/download/v1.2.0/DriveGram-Setup.exe) from the [Releases Page](https://github.com/LuisClaudioBoaventura/DriveGram/releases/tag/v1.2.0) (or the [enterprise MSI version](https://github.com/LuisClaudioBoaventura/DriveGram/releases/download/v1.2.0/DriveGram.msi)).
2. **Run the Installer**:
   - Double-click the `.exe` file.
   - *Security Note:* If Windows SmartScreen displays a *"Windows protected your PC"* prompt, click **"More info"** and then **"Run anyway"** (common for new open-source software releases).
3. **Ready to Launch**: DriveGram will automatically place shortcuts in your Start Menu and on your Desktop.
4. **🛠️ Diagnostics & Debugging Tools**:
   - **F12 Shortcut (DevTools)**: Press `F12` on any screen to inspect network requests, console logs, or visual elements.
   - **Server Logs**: In server settings, click **"Logs Folder"** to open `drivegram.log` directly.

---

### 📱 2. Installing on Android (.APK)

The Android application operates 100% autonomously without needing a host computer, thanks to its embedded high-performance Node.js runtime.

1. **Download APK**: Download the [**`DriveGram.apk`**](https://github.com/LuisClaudioBoaventura/DriveGram/releases/latest/download/DriveGram.apk) package from the [Releases Page](https://github.com/LuisClaudioBoaventura/DriveGram/releases/latest) directly onto your Android device.
2. **Authorize Installation**:
   - Open the downloaded file.
   - When prompted by Android, permit installation from your browser or file manager under *"Install unknown apps"*.
3. **Launch the App**:
   - On first launch, DriveGram will wait 3 to 5 seconds while the internal engine initializes (`/api/health`).
   - The welcome screen will appear, ready for you to connect your Telegram account!

---

### 👨‍💻 3. Developer Setup (Source Code)

If you wish to run or modify the source code:

#### Prerequisites:
- **Node.js (v18+)** and **npm**
- **Rust and Cargo** (required for compiling Tauri Desktop)
- **JDK 21** and **Android SDK** (if compiling Android APK locally)

#### Quick Launchers (Root Directory):
- **`iniciar_desktop.bat`**: Starts the native Desktop app (Tauri + Vite Hot-Reload).
- **`iniciar.bat`**: Starts the backend server and opens the Web UI in your browser (`localhost:3000`).
- **`Criar_Atalho_Desktop.bat`**: Creates a direct Desktop shortcut with the official DriveGram icon.

#### Terminal Commands (`npm`):
```bash
# 1. Install dependencies
npm install

# 2. Run Desktop App in Development Mode (Tauri + Hot-reload)
npm run desktop:dev

# 3. Run traditional Web version in Browser
npm start
# Open http://localhost:3000

# 4. Build Standalone Windows Installer (.exe)
npm run desktop:build

# 5. Sync and build Android APK (Capacitor)
npm run mobile:sync
npm run mobile:apk

# 6. Clean build caches to reclaim disk space (~9 GB)
npm run clean          # Cleans both Tauri/Rust and Android Gradle caches
npm run clean:desktop  # Cleans only Tauri cache (src-tauri/target)
npm run clean:android  # Cleans only Android cache (android/build)
```

#### Automation Scripts (`scripts/`):
All build, setup, and maintenance scripts are organized in the [`scripts/`](scripts/) folder:
- **`scripts/build-desktop.bat`**: 1-click Windows Tauri installer build.
- **`scripts/build-apk.bat`**: Builds the Android APK with Gradle and copies the binary.
- **`scripts/compile-apk.ps1`**: Full PowerShell build pipeline for Android.
- **`scripts/setup-android-sdk.ps1`**: Automated Android SDK configuration and license acceptance for Windows.
- **`scripts/generate-icon.ps1`**: Multi-resolution icon generation script.

#### Project Structure:
```text
DriveGram/
├── android/              # Native Android project (Capacitor 8 + Node.js Mobile)
├── data/                 # Local SQLite/JSON databases & sync manifests (gitignored)
├── public/               # Static assets, official icons & PWA manifest
├── scripts/              # Build, setup & maintenance automation scripts
├── server/               # Backend Express + Telegram GramJS MTProto engine
├── src/                  # Frontend React 18 + TypeScript + Tailwind CSS
├── src-tauri/            # Lightweight native Desktop Rust core (Tauri v2)
├── Criar_Atalho_Desktop.bat # Desktop shortcut creator with icon
├── iniciar.bat           # Web + Backend launcher
└── iniciar_desktop.bat   # Native Desktop app launcher
```

---

## 🔑 Telegram Connection

To connect your unlimited cloud storage:

1. Visit **[my.telegram.org](https://my.telegram.org)** and log in with your phone number.
2. Navigate to **"API Development Tools"** and create an application to obtain your **`api_id`** and **`api_hash`**.
3. In DriveGram, click **"Connect Telegram"**:
   - **Option A (QR Code)**: Scan the QR Code using your Telegram mobile app (*Settings ➔ Devices ➔ Link Desktop Device*).
   - **Option B (SMS / Telegram Code)**: Enter your phone number with international area code (e.g., `+1 555 123 4567`) and type the verification code received inside your Telegram app (supports 2-Factor Authentication / 2FA password).

> 🔒 **Absolute Privacy**: DriveGram runs **100% locally on your machine**. No credentials, tokens, or personal files ever pass through third-party servers.

---

## ❓ Frequently Asked Questions (FAQ)

<details>
<summary><b>1. Are my files really stored inside Telegram?</b></summary>
Yes! All files uploaded via DriveGram are securely stored inside your personal Telegram <i>Saved Messages</i> with end-to-end cloud encryption and unlimited storage capacity.
</details>

<details>
<summary><b>2. What happens if I format my computer or switch devices?</b></summary>
Simply install DriveGram on your new device and log in with the same Telegram account. The app will detect your latest <code>#drivegram_metadata_sync</code> manifest and automatically restore all your folders, courses, books, notes, and media catalogs.
</details>

<details>
<summary><b>3. Can I create custom folders freely inside "My Drive"?</b></summary>
Yes! You can create as many directories and subfolders as you wish in the root of "My Drive" and structure your content however you like. The 9 default categories simply help organize the media catalogue tabs.
</details>

<details>
<summary><b>4. What is the maximum file size limit?</b></summary>
- Free Telegram accounts: up to <b>2.0 GB</b> per individual file.<br>
- Telegram Premium accounts: up to <b>4.0 GB</b> per individual file.<br>
There is no limit to the total number of files or overall storage volume you can upload.
</details>

<details>
<summary><b>5. Does the Android APK require a PC running nearby?</b></summary>
No! The Android APK includes an embedded, high-performance Node.js engine running locally on your phone, providing complete independent mobility.
</details>

---

## 📄 License

This project is open-source under the **[MIT](LICENSE)** license.

<div align="center">
Crafted with dedication to transform the way you store, stream, and experience your digital media. 🚀
</div>

<br />

[ ⬆️ Back to Top ](#-drivegram)
