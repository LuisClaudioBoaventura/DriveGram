use std::fs::{self, OpenOptions};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, WebviewWindow};

struct AppState {
    server_child: Mutex<Option<Child>>,
}

#[tauri::command]
fn open_devtools(window: WebviewWindow) {
    if window.is_devtools_open() {
        window.close_devtools();
    } else {
        window.open_devtools();
    }
}

#[tauri::command]
fn open_logs_folder(app: AppHandle) -> Result<String, String> {
    let data_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("./drivegram-data"));
    let _ = fs::create_dir_all(&data_dir);

    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("explorer").arg(&data_dir).spawn();
    }

    Ok(data_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let _ = Command::new("cmd")
            .args(["/c", "start", "", &url])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = Command::new("open")
            .arg(&url)
            .spawn()
            .or_else(|_| Command::new("xdg-open").arg(&url).spawn())
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn stop_backend_server(app: AppHandle) -> Result<bool, String> {
    if let Some(state) = app.try_state::<AppState>() {
        if let Ok(mut lock) = state.server_child.lock() {
            if let Some(mut child) = lock.take() {
                log::info!("DriveGram: stop_backend_server command invoked. Killing child PID {}", child.id());
                let _ = child.kill();
                return Ok(true);
            }
        }
    }
    Ok(false)
}

fn find_server_bundle(app: &AppHandle) -> Option<PathBuf> {
    // 1. Check relative to resources directory
    if let Ok(res_dir) = app.path().resource_dir() {
        let candidates = [
            res_dir.join("www").join("nodejs-project").join("server.bundle.js"),
            res_dir.join("_up_").join("www").join("nodejs-project").join("server.bundle.js"),
            res_dir.join("server.bundle.js"),
        ];
        for candidate in candidates {
            if candidate.exists() {
                return Some(candidate);
            }
        }
    }

    // 2. Check relative to current executable dir
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let candidates = [
                exe_dir.join("www").join("nodejs-project").join("server.bundle.js"),
                exe_dir.join("resources").join("www").join("nodejs-project").join("server.bundle.js"),
                exe_dir.join("resources").join("_up_").join("www").join("nodejs-project").join("server.bundle.js"),
            ];
            for candidate in candidates {
                if candidate.exists() {
                    return Some(candidate);
                }
            }
        }
    }

    // 3. Fallback to current working directory
    let dev_path = Path::new("www").join("nodejs-project").join("server.bundle.js");
    if dev_path.exists() {
        return Some(dev_path);
    }

    None
}

fn find_node_executable(app: &AppHandle) -> PathBuf {
    // 1. Verificar na pasta de recursos (instalador Tauri/NSIS empacotado)
    if let Ok(res_dir) = app.path().resource_dir() {
        let candidates = [
            res_dir.join("bin").join("node.exe"),
            res_dir.join("bin").join("node"),
            res_dir.join("node.exe"),
            res_dir.join("node"),
            res_dir.join("_up_").join("bin").join("node.exe"),
            res_dir.join("resources").join("bin").join("node.exe"),
        ];
        for candidate in candidates {
            if candidate.exists() {
                log::info!("DriveGram: runtime Node.js embutido localizado em: {:?}", candidate);
                return candidate;
            }
        }
    }

    // 2. Verificar relativo ao executavel principal (DriveGram.exe)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let candidates = [
                exe_dir.join("bin").join("node.exe"),
                exe_dir.join("node.exe"),
                exe_dir.join("resources").join("bin").join("node.exe"),
                exe_dir.join("resources").join("node.exe"),
            ];
            for candidate in candidates {
                if candidate.exists() {
                    log::info!("DriveGram: runtime Node.js embutido localizado na pasta do app: {:?}", candidate);
                    return candidate;
                }
            }
        }
    }

    // 3. Verificar pasta local de desenvolvimento (src-tauri/bin/node.exe ou bin/node.exe)
    let dev_candidates = [
        PathBuf::from("src-tauri").join("bin").join("node.exe"),
        PathBuf::from("bin").join("node.exe"),
    ];
    for candidate in dev_candidates {
        if candidate.exists() {
            log::info!("DriveGram: runtime Node.js local de desenvolvimento localizado em: {:?}", candidate);
            return candidate;
        }
    }

    // 4. Fallback para o comando global do sistema caso não haja runtime embutido
    log::info!("DriveGram: runtime embutido não localizado, usando 'node' do sistema (PATH)");
    PathBuf::from("node")
}

fn start_backend_server(app: &AppHandle) -> Option<Child> {
    let data_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("./drivegram-data"));
    let _ = fs::create_dir_all(&data_dir);

    let uploads_dir = data_dir.join("uploads");
    let _ = fs::create_dir_all(&uploads_dir);

    let log_file_path = data_dir.join("drivegram.log");
    let log_file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file_path)
        .ok();

    if let Some(bundle_path) = find_server_bundle(app) {
        let node_bin = find_node_executable(app);
        let mut cmd = Command::new(&node_bin);
        cmd.arg(&bundle_path);
        cmd.env("PORT", "5000");
        cmd.env("NODE_ENV", "production");
        cmd.env("DRIVEGRAM_EMBEDDED", "1");
        cmd.env("DRIVEGRAM_DATA_DIR", &data_dir);
        cmd.env("DRIVEGRAM_UPLOADS_DIR", &uploads_dir);

        if let Some(parent) = bundle_path.parent() {
            let public_dir = parent.join("public");
            if public_dir.join("index.html").exists() {
                cmd.env("DRIVEGRAM_STATIC_DIR", &public_dir);
            }
        }
        if let Ok(res_dir) = app.path().resource_dir() {
            let candidates = [
                res_dir.join("www").join("nodejs-project").join("public"),
                res_dir.join("_up_").join("www").join("nodejs-project").join("public"),
                res_dir.join("public"),
                res_dir.join("dist"),
            ];
            for cand in candidates {
                if cand.join("index.html").exists() {
                    cmd.env("DRIVEGRAM_STATIC_DIR", &cand);
                    break;
                }
            }
        }

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        if let Some(file) = log_file {
            if let Ok(err_file) = file.try_clone() {
                cmd.stdout(Stdio::from(file));
                cmd.stderr(Stdio::from(err_file));
            }
        }

        match cmd.spawn() {
            Ok(child) => {
                log::info!("DriveGram Node.js backend server started with {:?} (PID: {})", node_bin, child.id());
                return Some(child);
            }
            Err(e) => {
                log::error!("Could not start internal Node server with {:?}: {}", node_bin, e);
            }
        }
    } else {
        log::info!("Server bundle not found locally; assuming external server or dev mode.");
    }

    None
}

#[cfg(target_os = "windows")]
fn purge_stale_webview_cache() {
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        let eb_default = Path::new(&local_app_data)
            .join("com.drivegram.desktop")
            .join("EBWebView")
            .join("Default");
        let targets = [
            eb_default.join("Service Worker"),
            eb_default.join("CacheStorage"),
            eb_default.join("ScriptCache"),
            eb_default.join("Cache"),
        ];
        for target in targets {
            if target.exists() {
                let _ = fs::remove_dir_all(&target);
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "windows")]
    purge_stale_webview_cache();

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![open_devtools, open_logs_folder, open_external_url, stop_backend_server])
        .setup(|app| {
            let child = start_backend_server(app.handle());
            app.manage(AppState {
                server_child: Mutex::new(child),
            });

            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                for _ in 0..60 {
                    std::thread::sleep(std::time::Duration::from_millis(100));
                    if std::net::TcpStream::connect("127.0.0.1:5000").is_ok() {
                        if let Some(window) = app_handle.get_webview_window("main") {
                            if let Ok(url) = tauri::Url::parse("http://127.0.0.1:5000") {
                                let _ = window.navigate(url);
                            }
                        }
                        break;
                    }
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            log::info!("Tauri RunEvent: {:?}", event);
            if let tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit = event {
                if let Some(state) = app_handle.try_state::<AppState>() {
                    if let Ok(mut lock) = state.server_child.lock() {
                        if let Some(mut child) = lock.take() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        });
}
