Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  public class Win32 {
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  }
"@

$procs = Get-Process -Name chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
foreach ($p in $procs) {
    Write-Host "Process: $($p.Id) - Title: $($p.MainWindowTitle) - Handle: $($p.MainWindowHandle)"
    [Win32]::ShowWindow($p.MainWindowHandle, 3)
    [Win32]::SetForegroundWindow($p.MainWindowHandle)
}
