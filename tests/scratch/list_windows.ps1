$procs = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 }
foreach ($p in $procs) {
    Write-Host "Id: $($p.Id), Name: $($p.ProcessName), Title: $($p.MainWindowTitle)"
}
