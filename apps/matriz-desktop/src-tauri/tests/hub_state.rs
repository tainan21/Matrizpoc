use std::{fs, time::Duration};

use matriz_desktop_native::hub_state::{HubArea, HubStateStore, SessionContext};

#[test]
fn persists_only_lightweight_resume_context_and_resets_on_workspace_change() {
    let directory = tempfile::tempdir().expect("state fixture");
    let store = HubStateStore::at(directory.path().join("hub-state.json"));

    store
        .record(
            "C:\\workspace-a",
            SessionContext {
                area: HubArea::Apps,
                app_id: Some("seumei".into()),
                terminal_cwd: Some("C:\\workspace-a".into()),
            },
        )
        .expect("record context");
    store
        .mark_used("C:\\workspace-a", "seumei")
        .expect("mark activity");

    let resume = store
        .read("C:\\workspace-a")
        .expect("read state")
        .resume
        .expect("resume");
    assert_eq!(resume.area, HubArea::Apps);
    assert_eq!(resume.app_id.as_deref(), Some("seumei"));
    assert!(store
        .last_used("C:\\workspace-a", "seumei")
        .expect("last used")
        .is_some());

    let changed = store.read("C:\\workspace-b").expect("changed workspace");
    assert!(changed.resume.is_none());
    assert!(changed.last_used_at.is_empty());
    let persisted =
        fs::read_to_string(directory.path().join("hub-state.json")).expect("persisted json");
    assert!(!persisted.contains("command"));
    assert!(!persisted.contains("output"));
}

#[test]
fn corrupt_state_degrades_to_empty() {
    let directory = tempfile::tempdir().expect("state fixture");
    let path = directory.path().join("hub-state.json");
    fs::write(&path, "not json").expect("corrupt state");
    let snapshot = HubStateStore::at(path)
        .read("C:\\workspace")
        .expect("safe fallback");
    assert!(snapshot.resume.is_none());
    assert!(snapshot.last_used_at.is_empty());
    std::thread::sleep(Duration::from_millis(1));
}
