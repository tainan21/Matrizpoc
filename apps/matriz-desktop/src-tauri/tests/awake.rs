use std::sync::{Arc, Mutex};

use matriz_desktop_native::awake::{AwakeApi, AwakeManager};

#[derive(Clone, Default)]
struct RecordingApi(Arc<Mutex<Vec<bool>>>);

impl AwakeApi for RecordingApi {
    fn apply(&self, enabled: bool) -> Result<(), String> {
        self.0.lock().expect("recording api").push(enabled);
        Ok(())
    }
}

#[test]
fn awake_is_off_by_default_and_restores_power_state_on_shutdown() {
    let api = RecordingApi::default();
    let manager = AwakeManager::with_api(api.clone());
    assert!(!manager.enabled());
    assert!(manager.set_enabled(true).expect("enable"));
    assert!(!manager.set_enabled(false).expect("disable"));
    assert_eq!(*api.0.lock().expect("calls"), vec![true, false]);
    manager.shutdown();
    assert_eq!(*api.0.lock().expect("calls"), vec![true, false, false]);
}
