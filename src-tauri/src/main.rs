// !Fnlloyd - Tauri v2 Backend
// Provides native desktop wrapping with WebGPU support via WebView2

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running fnlloyd");
}
