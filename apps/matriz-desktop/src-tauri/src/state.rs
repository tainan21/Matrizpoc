use std::{collections::HashSet, sync::Mutex};

use uuid::Uuid;

use crate::{
    authorize_batch, ownership_is_current, ports::enumerate_listeners, DesktopSnapshot,
    TerminationError, TerminationRequest, TerminationsRequest,
};
use crate::{processes::ProcessTerminator, processes::WindowsProcessTerminator};

pub struct NativeState<T = WindowsProcessTerminator> {
    snapshot: Mutex<DesktopSnapshot>,
    terminator: T,
}

impl NativeState<WindowsProcessTerminator> {
    pub fn new() -> Self {
        Self {
            snapshot: Mutex::new(DesktopSnapshot::empty()),
            terminator: WindowsProcessTerminator,
        }
    }
}

impl Default for NativeState<WindowsProcessTerminator> {
    fn default() -> Self {
        Self::new()
    }
}

impl<T: ProcessTerminator> NativeState<T> {
    #[cfg(test)]
    pub fn with(snapshot: DesktopSnapshot, terminator: T) -> Self {
        Self {
            snapshot: Mutex::new(snapshot),
            terminator,
        }
    }

    pub fn refresh(&self) -> Result<DesktopSnapshot, String> {
        let next = DesktopSnapshot {
            snapshot_id: Uuid::new_v4().to_string(),
            ports: enumerate_listeners()?,
        };
        *self.snapshot.lock().map_err(|_| "Snapshot lock poisoned")? = next.clone();
        Ok(next)
    }

    pub fn terminate(&self, request: &TerminationRequest) -> Result<DesktopSnapshot, String> {
        self.terminate_many(&TerminationsRequest {
            pids: vec![request.pid],
            snapshot_id: request.snapshot_id.clone(),
        })
    }

    pub fn terminate_many(&self, request: &TerminationsRequest) -> Result<DesktopSnapshot, String> {
        let snapshot = self
            .snapshot
            .lock()
            .map_err(|_| "Snapshot lock poisoned")?
            .clone();
        authorize_batch(
            &request.pids,
            &request.snapshot_id,
            &snapshot.snapshot_id,
            &snapshot.ports,
            std::process::id(),
        )
        .map_err(|error| error.to_string())?;

        let current = enumerate_listeners()?;
        if request
            .pids
            .iter()
            .any(|pid| !ownership_is_current(*pid, &snapshot.ports, &current))
        {
            return Err("Process ownership changed; refresh before terminating".into());
        }

        for pid in &request.pids {
            self.terminator.terminate(*pid)?;
        }
        self.refresh()
    }
}

pub fn has_duplicates(pids: &[u32]) -> bool {
    let mut seen = HashSet::with_capacity(pids.len());
    pids.iter().any(|pid| !seen.insert(*pid))
}

#[allow(dead_code)]
fn _typed_error(_: TerminationError) {}

#[cfg(test)]
mod tests {
    use std::sync::Mutex;

    use super::*;
    use crate::ObservedProcess;

    #[derive(Default)]
    struct RecordingTerminator(Mutex<Vec<u32>>);

    impl ProcessTerminator for RecordingTerminator {
        fn terminate(&self, pid: u32) -> Result<(), String> {
            self.0.lock().expect("recording lock").push(pid);
            Ok(())
        }
    }

    #[test]
    fn stale_requests_never_reach_the_terminator() {
        let state = NativeState::with(
            DesktopSnapshot {
                snapshot_id: "fresh".into(),
                ports: vec![ObservedProcess::test(6000, 3000)],
            },
            RecordingTerminator::default(),
        );
        let result = state.terminate(&TerminationRequest {
            pid: 6000,
            snapshot_id: "stale".into(),
        });
        assert!(result.is_err());
        assert!(state
            .terminator
            .0
            .lock()
            .expect("recording lock")
            .is_empty());
    }
}
