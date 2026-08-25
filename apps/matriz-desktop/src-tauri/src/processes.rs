use windows_sys::Win32::{
    Foundation::CloseHandle,
    System::Threading::{OpenProcess, TerminateProcess, PROCESS_SYNCHRONIZE, PROCESS_TERMINATE},
};

pub trait ProcessTerminator: Send + Sync {
    fn terminate(&self, pid: u32) -> Result<(), String>;
}

#[derive(Default)]
pub struct WindowsProcessTerminator;

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
