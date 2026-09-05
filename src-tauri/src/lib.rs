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
        let mut cmd = Command::new("node");
        cmd.arg(&bundle_path);
        cmd.env("PORT", "5000");
        cmd.env("NODE_ENV", "production");
        cmd.env("DRIVEGRAM_EMBEDDED", "1");
        cmd.env("DRIVEGRAM_DATA_DIR", &data_dir);
        cmd.env("DRIVEGRAM_UPLOADS_DIR", &uploads_dir);

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
                log::info!("DriveGram Node.js backend server started (PID: {})", child.id());
                return Some(child);
            }
            Err(e) => {
                log::warn!("Could not start internal Node server: {}", e);
            }
        }
    } else {
        log::info!("Server bundle not found locally; assuming external server or dev mode.");
    }

    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![open_devtools, open_logs_folder])
        .setup(|app| {
            let child = start_backend_server(app.handle());
            app.manage(AppState {
                server_child: Mutex::new(child),
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
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
