Add-Type @"
  using System;
  using System.Text;
  using System.Runtime.InteropServices;

  public class WindowHelper {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern void SwitchToThisWindow(IntPtr hWnd, bool fUnknown);

    public static void FocusProcess(uint targetPid) {
      EnumWindows((hWnd, lParam) => {
        uint pid;
        GetWindowThreadProcessId(hWnd, out pid);
        if (pid == targetPid && IsWindowVisible(hWnd)) {
          StringBuilder sb = new StringBuilder(256);
          GetWindowText(hWnd, sb, 256);
          Console.WriteLine("Found Window: HWND=" + hWnd + ", PID=" + pid + ", Title=" + sb.ToString());
          ShowWindow(hWnd, 9); // SW_RESTORE = 9
          ShowWindow(hWnd, 3); // SW_MAXIMIZE = 3
          SetForegroundWindow(hWnd);
          SwitchToThisWindow(hWnd, true);
        }
        return true;
      }, IntPtr.Zero);
    }
  }
"@

[WindowHelper]::FocusProcess(30732)
