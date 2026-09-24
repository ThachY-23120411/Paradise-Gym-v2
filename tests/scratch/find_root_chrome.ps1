Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" | Where-Object { $_.CommandLine -like '*puppeteer_dev_chrome_profile-GYM6fJ*' -and $_.CommandLine -notlike '*--type=*' } | ForEach-Object {
    Write-Host "PID: $($_.ProcessId)"
    Write-Host "CMD: $($_.CommandLine)"
}
