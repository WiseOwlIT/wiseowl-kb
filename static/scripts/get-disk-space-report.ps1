# Lists local fixed drives with drive letters. Does not modify disks.
# Optional: pass -CsvPath to create a new report file (never overwrites).
[CmdletBinding()]
param(
    [string]$CsvPath
)

$disks = @(Get-CimInstance -ClassName Win32_LogicalDisk -Filter 'DriveType=3' -ErrorAction Stop)
if ($disks.Count -eq 0) {
    Write-Warning 'No local fixed drives were returned.'
    return
}

$report = @($disks | Sort-Object DeviceID | ForEach-Object {
    [pscustomobject]@{
        Computer = $env:COMPUTERNAME
        Drive = $_.DeviceID
        Label = $_.VolumeName
        SizeGiB = if ($null -ne $_.Size) { [math]::Round($_.Size / 1GB, 2) } else { $null }
        FreeGiB = if ($null -ne $_.FreeSpace) { [math]::Round($_.FreeSpace / 1GB, 2) } else { $null }
        FreePercent = if ($_.Size -gt 0 -and $null -ne $_.FreeSpace) {
            [math]::Round(100 * $_.FreeSpace / $_.Size, 1)
        } else { $null }
    }
})

if ($CsvPath) {
    $report | Export-Csv -LiteralPath $CsvPath -NoTypeInformation -Encoding UTF8 -NoClobber -ErrorAction Stop
}
$report
