use sysinfo::{Pid, System};
use windows_sys::Win32::System::JobObjects::{
    AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
    SetInformationJobObject, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
    JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
};
use windows_sys::Win32::{
    Foundation::{CloseHandle, GetLastError, ERROR_ACCESS_DENIED},
    System::Threading::{
        OpenProcess, TerminateProcess, WaitForSingleObject, PROCESS_SET_QUOTA, PROCESS_SYNCHRONIZE,
        PROCESS_TERMINATE,
    },
};

const WAIT_OBJECT_0_RESULT: u32 = 0;

pub trait ProcessTerminator: Send + Sync {
    fn terminate(&self, pid: u32) -> Result<(), String>;
}

#[derive(Default)]
pub struct WindowsProcessTerminator;

pub struct ManagedProcessJob(windows_sys::Win32::Foundation::HANDLE);

unsafe impl Send for ManagedProcessJob {}

impl ManagedProcessJob {
    pub fn assign(pid: u32) -> Result<Self, String> {
        let job = unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) };
        if job.is_null() {
            return Err(format!("Unable to create process job ({})", unsafe {
                GetLastError()
            }));
        }
        let mut limits = unsafe { std::mem::zeroed::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() };
        limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        let configured = unsafe {
            SetInformationJobObject(
                job,
                JobObjectExtendedLimitInformation,
                &limits as *const _ as *const std::ffi::c_void,
                std::mem::size_of_val(&limits) as u32,
            )
        };
        if configured == 0 {
            let error = unsafe { GetLastError() };
            unsafe { CloseHandle(job) };
            return Err(format!("Unable to configure process job ({error})"));
        }
        let process = unsafe { OpenProcess(PROCESS_SET_QUOTA | PROCESS_TERMINATE, 0, pid) };
        if process.is_null() {
            let error = unsafe { GetLastError() };
            unsafe { CloseHandle(job) };
            return Err(format!(
                "Unable to open managed process {pid} for job assignment ({error})"
            ));
        }
        let assigned = unsafe { AssignProcessToJobObject(job, process) };
        let error = if assigned == 0 {
            Some(unsafe { GetLastError() })
        } else {
            None
        };
        unsafe { CloseHandle(process) };
        if let Some(error) = error {
            unsafe { CloseHandle(job) };
            return Err(format!(
                "Unable to assign managed process {pid} to its job ({error})"
            ));
        }
        Ok(Self(job))
    }
}

impl Drop for ManagedProcessJob {
    fn drop(&mut self) {
        unsafe { CloseHandle(self.0) };
    }
}

pub fn terminate_process_tree(pid: u32) -> Result<(), String> {
    let system = System::new_all();
    let relations = system
        .processes()
        .values()
        .filter_map(|process| {
            process
                .parent()
                .map(|parent| (process.pid().as_u32(), parent.as_u32()))
        })
        .collect::<Vec<_>>();
    let descendants = descendant_pids(pid, &relations);
    WindowsProcessTerminator.terminate(pid)?;
    for descendant in descendants {
        WindowsProcessTerminator.terminate(descendant)?;
    }
    Ok(())
}

fn descendant_pids(root: u32, relations: &[(u32, u32)]) -> Vec<u32> {
    let mut result = Vec::new();
    let mut frontier = vec![root];
    while let Some(parent) = frontier.pop() {
        for &(child, candidate_parent) in relations {
            if candidate_parent == parent && child != root && !result.contains(&child) {
                result.push(child);
                frontier.push(child);
            }
        }
    }
    result.reverse();
    result
}

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
        let synchronization = unsafe { OpenProcess(PROCESS_SYNCHRONIZE, 0, pid) };
        if !synchronization.is_null() {
            let already_stopped =
                unsafe { WaitForSingleObject(synchronization, 0) } == WAIT_OBJECT_0_RESULT;
            unsafe { CloseHandle(synchronization) };
            if already_stopped {
                return Ok(());
            }
        }
        let handle = unsafe { OpenProcess(PROCESS_TERMINATE | PROCESS_SYNCHRONIZE, 0, pid) };
        if handle.is_null() {
            return Err(termination_failure(pid, unsafe { GetLastError() }));
        }
        let terminated = unsafe { TerminateProcess(handle, 1) };
        let error = if terminated == 0 {
            Some(unsafe { GetLastError() })
        } else {
            None
        };
        let already_stopped =
            terminated == 0 && unsafe { WaitForSingleObject(handle, 0) } == WAIT_OBJECT_0_RESULT;
        unsafe { CloseHandle(handle) };
        if terminated == 0 {
            if already_stopped {
                return Ok(());
            }
            return Err(termination_failure(pid, error.unwrap_or_default()));
        }
        Ok(())
    }
}

fn termination_failure(pid: u32, error: u32) -> String {
    if error == ERROR_ACCESS_DENIED {
        return format!("Access denied while terminating process {pid}. Matriz Control will not request elevation; close it from its owning app or run both apps at the same integrity level");
    }
    format!("Windows refused to terminate process {pid} (error {error})")
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

    #[test]
    fn access_denial_is_actionable_and_never_suggests_elevation() {
        let message = termination_failure(4242, ERROR_ACCESS_DENIED);
        assert!(message.contains("Access denied"));
        assert!(message.contains("will not request elevation"));
        assert!(message.contains("owning app"));
    }

    #[test]
    fn descendant_snapshot_is_complete_without_cycles() {
        let descendants = descendant_pids(10, &[(11, 10), (12, 11), (13, 10), (10, 12)]);
        assert_eq!(descendants.len(), 3);
        assert_eq!(descendants.iter().filter(|&&pid| pid == 12).count(), 1);
        assert!(
            descendants.iter().position(|&pid| pid == 12)
                < descendants.iter().position(|&pid| pid == 11)
        );
        assert!(descendants.contains(&13));
        assert!(!descendants.contains(&10));
    }
}
