use std::{ffi::c_void, mem::size_of, path::Path};

use windows_sys::Win32::{
    Foundation::{CloseHandle, ERROR_INSUFFICIENT_BUFFER},
    NetworkManagement::IpHelper::{
        GetExtendedTcpTable, MIB_TCP6ROW_OWNER_PID, MIB_TCPROW_OWNER_PID,
        TCP_TABLE_OWNER_PID_LISTENER,
    },
    Networking::WinSock::{AF_INET, AF_INET6},
    System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION,
    },
};

use crate::ObservedProcess;

pub fn enumerate_listeners() -> Result<Vec<ObservedProcess>, String> {
    let mut rows = enumerate_v4()?;
    rows.extend(enumerate_v6()?);
    rows.sort_by_key(|row| (row.port, row.pid));
    rows.dedup_by_key(|row| (row.port, row.pid));
    Ok(rows)
}

fn table_buffer(address_family: u32) -> Result<Vec<u8>, String> {
    let mut size = 0_u32;
    let first = unsafe {
        GetExtendedTcpTable(
            std::ptr::null_mut(),
            &mut size,
            0,
            address_family,
            TCP_TABLE_OWNER_PID_LISTENER,
            0,
        )
    };
    if first != ERROR_INSUFFICIENT_BUFFER || size < size_of::<u32>() as u32 {
        return Err(format!("GetExtendedTcpTable size failed: {first}"));
    }

    let mut buffer = vec![0_u8; size as usize];
    let result = unsafe {
        GetExtendedTcpTable(
            buffer.as_mut_ptr().cast::<c_void>(),
            &mut size,
            0,
            address_family,
            TCP_TABLE_OWNER_PID_LISTENER,
            0,
        )
    };
    if result != 0 {
        return Err(format!("GetExtendedTcpTable failed: {result}"));
    }
    Ok(buffer)
}

fn row_count(buffer: &[u8]) -> usize {
    u32::from_ne_bytes(buffer[0..4].try_into().expect("TCP table count")) as usize
}

fn enumerate_v4() -> Result<Vec<ObservedProcess>, String> {
    let buffer = table_buffer(AF_INET as u32)?;
    parse_rows::<MIB_TCPROW_OWNER_PID>(&buffer, |row| (row.dwLocalPort, row.dwOwningPid))
}

fn enumerate_v6() -> Result<Vec<ObservedProcess>, String> {
    let buffer = table_buffer(AF_INET6 as u32)?;
    parse_rows::<MIB_TCP6ROW_OWNER_PID>(&buffer, |row| (row.dwLocalPort, row.dwOwningPid))
}

fn parse_rows<T: Copy>(
    buffer: &[u8],
    values: impl Fn(T) -> (u32, u32),
) -> Result<Vec<ObservedProcess>, String> {
    let count = row_count(buffer);
    let required = size_of::<u32>() + count.saturating_mul(size_of::<T>());
    if required > buffer.len() {
        return Err("Windows returned a truncated TCP table".into());
    }

    let mut result = Vec::with_capacity(count);
    for index in 0..count {
        let offset = size_of::<u32>() + index * size_of::<T>();
        let row = unsafe { std::ptr::read_unaligned(buffer.as_ptr().add(offset).cast::<T>()) };
        let (raw_port, pid) = values(row);
        let port = u16::from_be((raw_port & 0xffff) as u16);
        let (process_name, executable_path) = process_identity(pid);
        result.push(ObservedProcess {
            pid,
            port,
            process_name,
            executable_path,
            state: if (3000..=3007).contains(&port) {
                "ready"
            } else {
                "external"
            },
        });
    }
    Ok(result)
}

fn process_identity(pid: u32) -> (String, Option<String>) {
    let handle = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid) };
    if handle.is_null() {
        return (format!("PID {pid}"), None);
    }

    let mut buffer = vec![0_u16; 32_768];
    let mut length = buffer.len() as u32;
    let read = unsafe { QueryFullProcessImageNameW(handle, 0, buffer.as_mut_ptr(), &mut length) };
    unsafe { CloseHandle(handle) };
    if read == 0 {
        return (format!("PID {pid}"), None);
    }

    let path = String::from_utf16_lossy(&buffer[..length as usize]);
    let name = Path::new(&path)
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("process")
        .to_owned();
    (name, Some(path))
}

#[cfg(test)]
mod tests {
    use super::enumerate_listeners;

    #[test]
    fn reads_the_real_listener_table_without_mutating_it() {
        let listeners = enumerate_listeners().expect("Windows TCP listener table");
        assert!(listeners.iter().all(|row| row.port > 0));
    }
}
