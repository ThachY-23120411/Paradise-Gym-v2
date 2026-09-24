Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" | Select-Object ProcessId, CommandLine | ForEach-Object {
    Write-Host "PID: $($_.ProcessId)"
    Write-Host "CMD: $($_.CommandLine)"
    Write-Host "--------------------------------"
}
