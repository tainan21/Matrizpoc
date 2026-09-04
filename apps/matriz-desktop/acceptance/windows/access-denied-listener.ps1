param([int]$Port = 0)

$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class ProcessAcl {
  [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern bool ConvertStringSecurityDescriptorToSecurityDescriptor(string sddl, uint revision, out IntPtr descriptor, out uint size);

  [DllImport("advapi32.dll", SetLastError = true)]
  static extern bool SetKernelObjectSecurity(IntPtr handle, uint information, IntPtr descriptor);

  [DllImport("kernel32.dll")]
  static extern IntPtr GetCurrentProcess();

  [DllImport("kernel32.dll")]
  static extern IntPtr LocalFree(IntPtr memory);

  public static void DenyTermination() {
    IntPtr descriptor;
    uint size;
    if (!ConvertStringSecurityDescriptorToSecurityDescriptor("D:(D;;0x0001;;;WD)(A;;GA;;;OW)", 1, out descriptor, out size))
      throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
    try {
      if (!SetKernelObjectSecurity(GetCurrentProcess(), 0x00000004, descriptor))
        throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
    } finally {
      LocalFree(descriptor);
    }
  }
}
'@

$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
$listener.Start()
try {
  [ProcessAcl]::DenyTermination()
  $endpoint = [Net.IPEndPoint]$listener.LocalEndpoint
  [PSCustomObject]@{
    schemaVersion = 'v1'
    ready = $true
    pid = $PID
    port = $endpoint.Port
  } | ConvertTo-Json -Compress
  [Console]::Out.Flush()
  while ([Console]::In.ReadLine() -ne 'stop') {}
}
finally {
  $listener.Stop()
}
