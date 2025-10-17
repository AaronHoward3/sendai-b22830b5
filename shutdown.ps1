# PowerShell script to safely shutdown all Sendai services
Write-Host "Shutting down Sendai services..." -ForegroundColor Yellow

# Kill processes on specific ports
$ports = @(3001, 3002, 5173, 5175)
$killedCount = 0

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($connection in $connections) {
            $pid = $connection.OwningProcess
            if ($pid) {
                try {
                    Write-Host "Killing process on port $port (PID: $pid)" -ForegroundColor Red
                    Stop-Process -Id $pid -Force -ErrorAction Stop
                    $killedCount++
                } catch {
                    Write-Host "Could not kill PID $pid on port $port" -ForegroundColor Yellow
                }
            }
        }
    }
}

if ($killedCount -eq 0) {
    Write-Host "No processes found on Sendai ports" -ForegroundColor Green
} else {
    Write-Host "Shutdown complete! Killed $killedCount processes" -ForegroundColor Green
}

Write-Host "For graceful shutdown, use Ctrl+C in the terminal running 'npm run dev'" -ForegroundColor Cyan
