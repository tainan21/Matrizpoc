use sysinfo::{Pid, System};
use windows_sys::Win32::{
    Foundation::CloseHandle,
    System::Threading::{OpenProcess, TerminateProcess, PROCESS_SYNCHRONIZE, PROCESS_TERMINATE},
};

pub trait ProcessTerminator: Send + Sync {
    fn terminate(&self, pid: u32) -> Result<(), String>;
}

#[derive(Default)]
pub struct WindowsProcessTerminator;

pub fn is_current_or_ancestor(candidate: u32) -> bool {
    let current = std::process::id();
    if candidate == current {
        return true;
    }
    let system = System::new_all();
    let mut cursor = Pid::from_u32(current);
    let mut visited = std::collections::HashSet::new();
    while visited.insert(cursor) {
        let Some(parent) = system.process(cursor).and_then(|process| process.parent()) else {
            return false;
        };
        if parent.as_u32() == candidate {
            return true;
        }
        cursor = parent;
    }
    false
}

impl ProcessTerminator for WindowsProcessTerminator {
    fn terminate(&self, pid: u32) -> Result<(), String> {
        let handle = unsafe { OpenProcess(PROCESS_TERMINATE | PROCESS_SYNCHRONIZE, 0, pid) };
        if handle.is_null() {
            return Err(format!("Process {pid} cannot be opened for termination"));
        }
        let terminated = unsafe { TerminateProcess(handle, 1) };
        unsafe { CloseHandle(handle) };
        if terminated == 0 {
            return Err(format!("Windows refused to terminate process {pid}"));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn current_process_is_always_protected() {
        assert!(is_current_or_ancestor(std::process::id()));
    }

    #[test]
    fn parent_process_is_protected_when_available() {
        let system = System::new_all();
        let current = Pid::from_u32(std::process::id());
        if let Some(parent) = system.process(current).and_then(|process| process.parent()) {
            assert!(is_current_or_ancestor(parent.as_u32()));
        }
    }
}
