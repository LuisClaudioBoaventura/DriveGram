# 🚀 DriveGram

<div align="center">

<img width="1855" height="917" alt="DriveGram - Home" src="https://github.com/user-attachments/assets/02e37ab8-f9ef-4908-9eff-5abc638a7db4" />

**Your complete ecosystem for unlimited cloud storage, high-performance streaming, and smart digital libraries — featuring a modern interface inspired by Google Drive and OneDrive, powered by Telegram's infrastructure.**

<br />

[![Release](https://img.shields.io/github/v/release/LuisClaudioBoaventura/DriveGram?color=f59e0b&label=Release&logo=github)](https://github.com/LuisClaudioBoaventura/DriveGram/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B%20%7C%2022-green.svg)](https://nodejs.org/)
[![Telegram MTProto](https://img.shields.io/badge/Telegram-MTProto%20Multi--Socket-2CA5E0.svg)](https://telegram.org/)
[![Desktop Tauri v2](https://img.shields.io/badge/Desktop-Tauri%20v2.11%20(Rust)-24C8D8.svg)](https://tauri.app/)
[![Android Capacitor](https://img.shields.io/badge/Android-Capacitor%208.5-brightgreen.svg)](https://capacitorjs.com/)
[![Node.js Mobile](https://img.shields.io/badge/Node.js%20Mobile-Embedded%20Engine-orange.svg)](https://github.com/red-mobile/nodejs-mobile-cordova)
[![Smart TV Cast](https://img.shields.io/badge/Cast-Chromecast%20%7C%20DLNA%20%7C%20Web%20TV-0284c7.svg)](#-smart-tv-casting--real-time-screen-mirroring)
[![i18n](https://img.shields.io/badge/i18n-PT%20%7C%20EN%20%7C%20ES-10b981.svg)](#-visual-customization-7-themes-multilingual-i18n--sound-effects)

<br />

**Languages / Idiomas:**  
[ 🇺🇸 **English** ](README.en.md) &nbsp;•&nbsp; [ 🇧🇷 **Português** ](README.md)

<br />

[📖 About](#-about-the-project) •
[📥 Downloads](#-ready-to-use-downloads--auto-update) •
[🌟 Libraries](#-all-features--dedicated-libraries) •
[📺 Smart TV Cast](#-smart-tv-casting--real-time-screen-mirroring) •
[🎨 Themes & i18n](#-visual-customization-7-themes-multilingual-i18n--sound-effects) •
[🔄 Cloud Sync Hub](#-cloud-management-hub-synchronization--audit) •
[🛠️ Tech Stack](#️-tech-stack) •
[👨‍💻 Developers](#-installation--developer-guide) •
[❓ FAQ](#-frequently-asked-questions-faq)

</div>

---

## 📖 About the Project

**DriveGram** transforms your **Telegram Saved Messages** into an enterprise-grade, unlimited personal cloud featuring 10 specialized multimedia libraries and ultra-fast streaming.

Forget about storage quotas and recurring subscription fees of traditional cloud providers. With DriveGram you get:
- **100% Unlimited & Free Storage**: Files up to **2 GB** each (or up to **4 GB** per file for Telegram Premium subscribers), with zero limits on total storage volume.
- **Multi-Socket Parallel Upload & Zero-Buffering Streaming**: Dedicated MTProto multi-socket connection pool for high-speed video/file uploads, paired with instant *HTTP 206 (Partial Content)* cloud streaming powered by an **asynchronous prefetch pipeline and in-memory LRU chunk cache**.
- **Cross-Platform Ecosystem (Windows Desktop & Android APK) with Auto-Update**: Ultra-lightweight native Windows Desktop app built with **Tauri v2 (Rust)** bundling an embedded Node.js runtime, plus a native **Android application (`.apk`)** powered by an autonomous embedded Node.js engine that runs 100% independently on your smartphone (no host PC required).
- **Smart TV Casting & Screen Mirroring**: Native support for **Google Cast V2 (Chromecast / Android TV / TCL)**, **SSDP/DLNA**, **QR Code Web TV Receiver (`/tv`)**, and **Real-Time Screen Mirroring (`/tv/mirror`)**.
- **Active Sync, Cloud Audit & Continuous Backup**: Your files, directory trees, sagas, recipes, and study notes are synthesized into secure cloud manifests (`#drivegram_metadata_sync`) on Telegram, featuring automatic startup restoration, orphan file auditing, and smart retention policies.

---

## 📥 Ready-to-Use Downloads & Auto-Update

Download the official release installers directly from the [**GitHub Releases Page**](https://github.com/LuisClaudioBoaventura/DriveGram/releases/latest):

| Platform | Package / Installer | Description | Direct Link |
| :--- | :--- | :--- | :--- |
| 💻 **Windows Desktop** | **`DriveGram_*_x64-setup.exe`** | **Recommended**. Self-contained NSIS installer (Tauri v2) with bundled Node.js runtime, WebView2 bootstrapper, and built-in Auto-Updater. | [⬇️ **Download Windows Installer (.EXE)**](https://github.com/LuisClaudioBoaventura/DriveGram/releases/latest) |
| 📱 **Android** | **`DriveGram.apk`** | Official Android application featuring an embedded self-hosted Node.js engine (`libnode.so`). | [⬇️ **Direct Download (.APK)**](https://github.com/LuisClaudioBoaventura/DriveGram/releases/latest/download/DriveGram.apk) |

> 🔄 **Built-in In-App Auto-Updater**:
> - **Windows Desktop**: Automatically checks for new releases via Tauri's `latest.json` manifest or direct installer fallback, safely releasing internal sidecar locks and updating in 1 click.
> - **Android APK**: Uses a decoupled release pipeline to guarantee mobile stability — once a validated `DriveGram.apk` is attached to the release, the Android app notifies you and lets you install the update directly.

---

## 🌟 All Features & Dedicated Libraries

DriveGram organizes your digital life into **10 purpose-built libraries** plus a **Smart YouTube Importer**:

### 📁 1. My Drive (Comprehensive File Manager)
- **Unlimited Directory Tree**: Create folders and subfolders with no depth limits, custom folder accent colors, collapsible sidebar, and intuitive *Breadcrumbs* navigation.
- **Smart Sidebar Drag & Drop**: Drag external files directly onto **"My Drive"** to upload, or drag internal items onto **"Favorites"** and **"Trash"**.
- **Multi-Socket Upload & Floating Manager**: Parallel MTProto upload pool for high-speed transfers, background progress bar, queue management, and **customizable upload completion sound effects**.
- **1-Click Folder Sync (*Sincronizar Pastas*)**: Available across every library catalog to automatically scan and index new files dropped into your Drive folders.
- **Semantic Deduplication & Duplicate Finder**: Recognizes default system categories, purges empty duplicates, and runs deep scans to clean up identical files.
- **View Modes & Quick Filters**: Switch between **Grid Cards** and **Detailed List**, with instant search and quick filters for Videos, Comics, E-books, PDFs, Documents, Images, Audios, Archives, and Code.

---

### 🎓 2. Courses & Learning (Virtual Learning Environment - VLE)
- **Modular Curriculum Structure**: Organize courses into modules and lessons with automatic alphanumeric sorting, lesson counters, and total runtime metrics.
- **Sequential Autoplay**: Visual 5-second countdown timer after a lesson ends before smoothly advancing to the next.
- **Resume Playback & Timestamps**: Remembers the exact second where you paused each video and lets you save clickable timestamp bookmarks.
- **Automatic Subtitles (`.vtt`/`.srt`) & Supporting Materials**: Auto-discovers subtitle tracks in the same folder and provides inline access to course PDFs, slides, and handouts.
- **Synchronized Lesson Notepad & Completion Tracking**: Dedicated auto-saving notepad per lesson and green completion checkmarks with overall course progress bars.

---

### 🎬 3. Movies & Cinema (Streaming Catalog & Sagas)
- **Netflix / Prime-style UI**: Cinematic posters, resolution badges, genres, release year, and duration.
- **Movie Sagas & Franchises**: Group films into sagas/franchises with custom saga cover art, chronological order, combined runtime, and **Continuous Saga Autoplay** (automatically plays the next movie in the franchise).
- **OMDb API Integration & Poster Persistence**: Automatic lookup by title or IMDb ID for synopsis, director, cast, awards, and official **IMDb** / **Metascore** ratings, automatically backing up poster images to Base64 / Telegram so covers never break.
- **Advanced Cinema Player**:
  - **Persistent Picture-in-Picture (PiP) & Native Always-on-Top**: Floating video window in the browser and native *Always on Top* mode on Tauri Desktop.
  - **Smart TV Casting**, custom subtitles, chapters/timestamps, quick restart button on the autoplay modal, and external player fallback for HEVC/H.265 files.

---

### 📹 4. Personal Videos & Photos (Family Memories, Vlogs & Photo Gallery)
- **Full Video & Photo Support**: Dedicated space for travel videos, family milestones, home movies, vlogs, and personal photo collections.
- **Immersive Photo Viewer**: Dedicated photo modal with zoom, carousel navigation, and metadata details alongside the personal video player with playback resume.
- **Automatic Video Covers & Hero Banner**: Automatic frame extraction for video thumbnails, redesigned Hero Banner showcase, and filters by Categories, People, Location, Date, and Tags.

---

### 🍳 5. Recipes & Culinary Studio (Kitchen Library)
- **Dedicated Culinary Hub**: Backed by the `🍳 Receitas` folder in My Drive, featuring a culinary Hero Banner and rich recipe cards.
- **Interactive Ingredients Checklist & Step-by-Step Instructions**: Follow ingredients (preserving exact numeric quantities) and preparation instructions side-by-side with the cooking video player.
- **Culinary Filters**: Filter by Category, Difficulty Level (*Easy, Medium, Hard, Chef*), Prep Time, Servings/Portions, Chef/Author, and Status (*Favorites, Completed, To-Do*).
- **YouTube Recipe Import & Save to Telegram**: Import cooking videos or playlists from YouTube (automatically parsing ingredients from descriptions) and click **"Save Video to Telegram"** to download the video in the background and permanently store it in your Telegram cloud.

---

### 🎧 6. Books & Audiobooks (Hi-Fi Studio, E-book Reader & Literary Sagas)
- **Literary Sagas & Series**: Group books and audiobooks into sagas with custom cover art, chronological reading order, and automatic total saga audio duration calculation.
- **Hybrid Support & Dynamic Duration**: Audio formats (MP3, M4A, AAC, FLAC) with automatic numeric track sorting + Digital Books (PDF, resilient EPUB reader with memory buffer, CBR, CBZ) and dynamic total audio duration badges on book cards.
- **3 Specialized View Modes**:
  1. **Audio-Only Mode (Default)**: *Hi-Fi Studio Widescreen* layout with prominent artwork, ambient lighting, timeline scrubber, and speed controls (`0.75x` to `2x`).
  2. **Listen & Read Mode (Split View)**: Compact audio player on the left paired with a responsive PDF/EPUB reader on the right.
  3. **Full-Screen Reader Mode**: Distraction-free reading experience.
- **Global Floating Miniplayer, Sleep Timer (15 to 60 min) & Google Books API**: Keep listening while browsing other tabs and auto-fetch book covers and metadata.

---

### 📚 7. Comics, Graphic Novels & Manga (Comics Studio)
- **Native `.cbr`, `.cbz`, `.pdf`, and `.epub` Support**: Real-time archive extraction powered by WebAssembly (`node-unrar-js` / `unrar.wasm`) and `jszip`.
- **Interactive Magnifier Tool**: High-precision loupe with smooth tracking and adjustable zoom under your cursor or touch, ideal for reading speech bubbles and artwork details on Desktop and Android.
- **Reading Modes**: Fit-to-width, full-screen mode, visual thumbnail drawer, and smooth page navigation.

---

### 📺 8. TV Series & Anime (TV Shows Studio)
- **Seasons & Episodes Layout**: Overview with series synopsis, poster art, episode counts, and watched markers.
- **Continuous Watch History**: Resumes playback right where you left off across all seasons and episodes, with YouTube playlist support.

---

### 🎙️ 9. Music & Podcasts (Audio Hub & RSS Feeds)
- **Podcast RSS Feed Support**: Add podcasts directly via RSS Feed URL or import shows and music albums from YouTube.
- **Redesigned Episodes Catalog**: Centralized episodes modal with **Compact Blocks (Grid)** and **List** views, chronological episode numbering, quick filters, **green border highlight for listened episodes**, and Base64 episode cover persistence.
- **Dedicated Floating Player**: Multitask freely across your cloud while listening to episodes with timestamp notes.

---

### 🔐 10. Red Locker (Secure Vault +18)
- **Password/PIN Protected**: Restricted private vault with automated inactivity timeout locking and strict isolation from public catalogs.
- **"Watch Random" (*Shuffle Play*) Button**: Instantly play a random video from your private collection.
- **Advanced Performer / Cast Management**: Register actors/performers with autocomplete search, detailed performer profile modal, quick linking, and a dedicated filter for videos with 0 or 1 performer assigned.
- **Folder Auto-Sync & Cover Generator**: Automated subfolder syncing, video frame cover extraction, Favorites card, and duplicate prevention by `fileId`.

---

### 📥 11. Smart YouTube Importer & Telegram Cloud Persistence
- **Single Videos, Full Playlists & Channels**: Powered by `youtubei.js` with resilient continuation pagination, smart chip filtering (ignoring *Shorts/Videos* filter chips during playlist extraction), and progressive HTTP 403 fallback.
- **5 Direct Destinations**: Import straight into **Courses**, **Music & Podcasts**, **TV Series**, **Movies & Videos**, or **Recipes & Culinary**.
- **Floating Playlist Player & PiP**: Watch imported playlists in Picture-in-Picture mode with advanced sorting and filtering.
- **"Save to Telegram" Button**: Convert any linked YouTube video into an actual `.mp4` file downloaded in the background and uploaded directly to your Telegram Saved Messages.

---

## 📺 Smart TV Casting & Real-Time Screen Mirroring

Enjoy your movies, courses, and personal videos on the big screen wirelessly:

1. **Native Google Cast V2 & DLNA**:
   - Automatic local network discovery (Wi-Fi/LAN) for **Chromecast**, **Android TV**, **TCL, Samsung, LG Smart TVs**, and UPnP/DLNA receivers, complete with an integrated **Cast Remote Control Bar**.
2. **Web TV Player (`/tv`) via QR Code**:
   - Scan the generated **QR Code** from any Smart TV, gaming console, or tablet browser on the same Wi-Fi network to launch a full-screen TV receiver — no app installation required on the TV.
3. **Real-Time Screen Mirroring (`/tv/mirror`)**:
   - Share your application screen live to any browser on your local network through a dedicated mirroring room with QR Code access.

---

## 🎨 Visual Customization (7 Themes), Multilingual (i18n) & Sound Effects

Personalize every aspect of DriveGram inside the **Cloud Management Hub**:

- **🎨 7 Customizable Visual Themes** (applied seamlessly across all catalogs, studios, and players):
  - **Dark Modern** *(Default Dark — Graphite gray with classic Google Drive blue)*
  - **Light Clean** *(Elegant Light — Crisp, high-contrast daylight interface)*
  - **Dracula** *(Vampire & Purple — Iconic dark blue-gray palette with purple accents)*
  - **Nord Polar** *(Arctic Ice — Nordic aurora-inspired cool blue and cyan palette)*
  - **Midnight Neon** *(Cyberpunk & OLED — Deep OLED black with electrifying neon purple)*
  - **Emerald Forest** *(Nature & Matrix — Deep moss green with vibrant emerald highlights)*
  - **Warm Sunset** *(Sepia & Amber — Cozy earthy tones of espresso, oak, and golden amber)*
- **🌐 Multilingual Support (i18n)**:
  - Switch the entire UI language in real time between **Português (🇧🇷)**, **English (🇺🇸)**, and **Español (🇪🇸)**.
- **🔔 Upload Completion Sound Alerts**:
  - Choose from multiple audio notifications (with live preview and volume slider) when background uploads complete.

---

## 🔄 Cloud Management Hub, Synchronization & Audit

DriveGram features an enterprise-grade persistence and diagnostics engine accessible via the **Cloud Management Hub**:

1. **Active Startup Sync & Visual Manifest Progress**:
   - On launch (Desktop or Android), DriveGram scans Saved Messages for newer `#drivegram_metadata_sync` manifests with a step-by-step visual progress tracker.
2. **Reactive Auto-Backup & Stream-Optimized Serialization**:
   - Every change schedules a background cloud backup using stream-optimized JSON serialization (preventing *Heap Out of Memory* errors even on massive databases with Base64 covers).
3. **Saved Messages Audit & Reconciliation**:
   - Scans your Telegram Saved Messages to discover unindexed or externally uploaded files and reconciles them into your local database in 1 click.
4. **Retention Policy & History Cleanup**:
   - Keeps your Saved Messages clean via `metadataRetentionCount` (default = 1), automatically purging outdated sync manifests.
5. **API Keys Manager, Local JSON Backup & System Diagnostics**:
   - Manage your **OMDb API** and **Google Books API** keys, export/import local `.json` backups, and inspect system health and live logs (with automatic 2 MB rotation on `drivegram.log`).

---

## 📱 Native Android App (.APK)

DriveGram delivers a first-class native Android experience powered by **Capacitor 8.5** and **Node.js Mobile**:

- **Embedded Node.js Engine**: The Express + GramJS backend runs entirely inside the Android device via `libnode.so` (compiled for `arm64-v8a`, `armeabi-v7a`, and `x86_64`).
- **100% Autonomous**: Requires no external server, proxy, or companion PC.
- **Startup Health Check & Safe Area Adaptation**: Monitors `/api/health` before revealing the UI and automatically adapts to Android status and navigation bar safe areas.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Native Desktop (Windows)** | **Tauri v2.11**, Rust 2021, Microsoft Edge WebView2, Node.js Standalone Sidecar, Tauri Updater |
| **Frontend** | React 18.3, TypeScript 5.4, Tailwind CSS 3.4, Lucide Icons, Vite 6.4, i18n (PT/EN/ES) & 7 Dynamic CSS Themes |
| **Backend** | Node.js (18+/22), Express 4, TypeScript, GramJS (Telegram MTProto Multi-Socket Pool), `youtubei.js`, esbuild |
| **Mobile (Android)** | Capacitor 8.5, Node.js Mobile (`@red-mobile/nodejs-mobile-cordova`), Native Android Bridge |
| **Smart TV & Cast** | Google Cast V2 (`castv2-client`), SSDP/DLNA, Web TV Receiver (`/tv`), Screen Mirroring (`/tv/mirror`) & QRCode |
| **Decompression & Readers** | WebAssembly `node-unrar-js` (`unrar.wasm`), `jszip`, `pdfjs-dist`, `epubjs` (resilient memory buffer) |
| **Streaming & Database** | HTTP 206 (Partial Content) with Async Prefetch & in-memory LRU Chunk Cache; Stream-optimized JSON + Cloud Sync |
| **External APIs & Feeds** | Telegram MTProto API, OMDb API (Movies), Google Books API (Books), YouTube InnerTube (`youtubei.js`), Podcast RSS Feeds |

---

## 🚀 Installation & Developer Guide

### 💻 1. Installing on Windows (Native Desktop App)

DriveGram Desktop is built with **Tauri v2**, consuming only **~70 MB to 100 MB of RAM** and bundling its own standalone Node.js runtime:

1. **Download Installer**: Visit the [Releases Page](https://github.com/LuisClaudioBoaventura/DriveGram/releases/latest) and download **`DriveGram_*_x64-setup.exe`**.
2. **Run the Installer**:
   - Double-click the `.exe` installer.
   - *Security Note:* If Windows SmartScreen displays *"Windows protected your PC"*, click **"More info"** and then **"Run anyway"**.
3. **Ready to Launch**: DriveGram creates Start Menu and Desktop shortcuts and automatically notifies you of future updates.
4. **🛠️ Diagnostics & Debugging**:
   - **F12 Shortcut (DevTools)**: Press `F12` on any screen to open the developer inspector.
   - **System Diagnostics & Logs**: Open Cloud Management ➔ **System Diagnostics** to view real-time logs or open the `drivegram.log` folder.

---

### 📱 2. Installing on Android (.APK)

1. **Download APK**: Download [**`DriveGram.apk`**](https://github.com/LuisClaudioBoaventura/DriveGram/releases/latest/download/DriveGram.apk) from the [Releases Page](https://github.com/LuisClaudioBoaventura/DriveGram/releases/latest) directly onto your Android device.
2. **Authorize Installation**: Open the downloaded APK and allow installation from *"Install unknown apps"* if prompted.
3. **Launch the App**: On first launch, wait 3 to 5 seconds while the embedded Node.js server initializes (`/api/health`) and connect your Telegram account!

---

### 👨‍💻 3. Developer Setup (Source Code)

#### Prerequisites:
- **Node.js (v18+ or v22 LTS)** and **npm**
- **Rust and Cargo** (required for compiling Tauri Desktop)
- **JDK 21** and **Android SDK** (if compiling the Android APK locally)

#### Quick Launchers (Root Directory):
- **`iniciar_desktop.bat`**: Launches the native Desktop app in development mode (Tauri + Vite Hot-Reload).
- **`iniciar.bat`**: Starts the backend server and opens the Web UI in your browser (`http://localhost:3000`).
- **`Criar_Atalho_Desktop.bat`**: Creates a Desktop shortcut with the official DriveGram icon (supports local and OneDrive Desktop folders).

#### Terminal Commands (`npm`):
```bash
# 1. Install dependencies (automatically applies nodejs-mobile patches via postinstall)
npm install

# 2. Run Desktop App in Development Mode (Tauri + Hot-reload)
npm run desktop:dev

# 3. Run traditional Web version in Browser (http://localhost:3000)
npm start

# 4. Run Quality Assurance & Embedded Server Smoke Tests (pre-release QA)
npm run qa
npm run test:smoke

# 5. Build Standalone Windows Installer (.exe via Tauri NSIS)
npm run desktop:build

# 6. Sync and build Android APK (Capacitor + Node.js Mobile)
npm run mobile:sync
npm run mobile:apk

# 7. Clean build caches to reclaim disk space (~9 GB)
npm run clean          # Cleans both Tauri/Rust and Android Gradle caches
npm run clean:desktop  # Cleans only Tauri cache (src-tauri/target)
npm run clean:android  # Cleans only Android cache (android/build)
```

#### Project Structure:
```text
DriveGram/
├── .github/workflows/    # CI, Desktop Release (v* tag), and on-demand Android APK Release workflows
├── android/              # Native Android project (Capacitor 8.5 + Node.js Mobile)
├── data/                 # Local JSON database & sync manifests (gitignored)
├── public/               # Static assets, official 3D icons & PWA manifest
├── scripts/              # Build, smoke test, embedded server bundling & Android SDK setup scripts
├── server/               # Backend Node.js / Express + Telegram GramJS Multi-Socket + Cast & YouTube
├── src/                  # Frontend React 18.3 + TypeScript + Tailwind CSS + i18n + 7 Themes
├── src-tauri/            # Native Desktop Rust core (Tauri v2.11 + Auto-Updater)
├── QA_CHECKLIST.md       # Pre-release quality assurance & verification checklist
├── Criar_Atalho_Desktop.bat
├── iniciar.bat
└── iniciar_desktop.bat
```

---

## 🔑 Telegram Connection

To connect your unlimited cloud storage:

1. Visit **[my.telegram.org](https://my.telegram.org)** and sign in with your phone number.
2. Navigate to **"API Development Tools"** and create an application to obtain your **`api_id`** and **`api_hash`** (can also be configured inside *Cloud Management ➔ API Keys*).
3. In DriveGram, click **"Connect Telegram"**:
   - **Option A (QR Code)**: Scan the QR Code using your Telegram mobile app (*Settings ➔ Devices ➔ Link Desktop Device*).
   - **Option B (SMS / Telegram Code)**: Enter your phone number in international format (e.g., `+1 555 123 4567`) and enter the verification code received in Telegram (full 2FA password support included).

> 🔒 **Absolute Privacy**: DriveGram runs **100% locally on your device**. No credentials, sessions, API keys, or personal files ever pass through third-party servers.

---

## ❓ Frequently Asked Questions (FAQ)

<details>
<summary><b>1. Are my files really stored inside Telegram?</b></summary>
Yes! All files uploaded via DriveGram (including YouTube videos saved using the <i>"Save to Telegram"</i> feature) are privately stored inside your personal Telegram <i>Saved Messages</i> with cloud encryption and unlimited storage capacity.
</details>

<details>
<summary><b>2. What happens if I format my PC or switch phones?</b></summary>
Simply install DriveGram on your new device and sign in with the same Telegram account. The app will detect your latest <code>#drivegram_metadata_sync</code> manifest and automatically restore all your folders, courses, sagas, books, recipes, notes, and media catalogs.
</details>

<details>
<summary><b>3. Can I organize folders freely in "My Drive" and sync them with the libraries?</b></summary>
Yes! You can create as many folders and subfolders as you wish in "My Drive". Every library also features a <b>"Sync Folders"</b> button that scans its dedicated Drive directory and automatically imports new files into the visual catalog.
</details>

<details>
<summary><b>4. What is the maximum file size limit?</b></summary>
- Free Telegram accounts: up to <b>2.0 GB</b> per individual file.<br>
- Telegram Premium accounts: up to <b>4.0 GB</b> per individual file.<br>
There is no limit to the total number of files or overall storage volume.
</details>

<details>
<summary><b>5. Does the Android APK require a PC running nearby?</b></summary>
No! The Android APK embeds a full Node.js engine (<code>libnode.so</code>) running locally on your smartphone, providing 100% standalone mobility.
</details>

<details>
<summary><b>6. How does Smart TV Casting work?</b></summary>
Open any video and click the <b>Cast</b> icon. You can stream directly via Google Cast V2 (Chromecast / Android TV / TCL) and DLNA, or simply scan the on-screen <b>QR Code</b> with your Smart TV to open the full-screen Web TV Player without installing any app on your television.
</details>

---

## 📄 License

This project is open-source under the **[MIT](LICENSE)** license.

<div align="center">
Crafted with dedication to transform the way you store, stream, and experience your digital media. 🚀
</div>

<br />

[ ⬆️ Back to Top ](#-drivegram)
