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

    public static void ListAllWindows() {
      EnumWindows((hWnd, lParam) => {
        if (IsWindowVisible(hWnd)) {
          StringBuilder sb = new StringBuilder(256);
          GetWindowText(hWnd, sb, 256);
          string title = sb.ToString();
          if (!string.IsNullOrEmpty(title)) {
            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            Console.WriteLine("PID: " + pid + " | Title: " + title);
          }
        }
        return true;
      }, IntPtr.Zero);
    }
  }
"@

[WindowHelper]::ListAllWindows()
