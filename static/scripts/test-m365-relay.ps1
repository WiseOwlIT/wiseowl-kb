<#
.SYNOPSIS
    Tests an existing Microsoft 365 inbound SMTP relay connector.
.DESCRIPTION
    Resolves the endpoint, checks TCP port 25 and sends one test message with
    STARTTLS and normal server certificate validation. Uses no mailbox login.
    Designed for Windows PowerShell 5.1. Does not configure the connector.
.PARAMETER SmtpServer
    The exact Microsoft 365 MX endpoint from your tenant configuration.
.PARAMETER CertificateThumbprint
    Optional client certificate in CurrentUser\My or LocalMachine\My.
    Its private key must be accessible to the account running this script.
.EXAMPLE
    .\test-m365-relay.ps1 -SmtpServer 'contoso-com.mail.protection.outlook.com' -From 'relay-test@contoso.com' -To 'you@contoso.com'
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$SmtpServer,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$From,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$To,

    [string]$CertificateThumbprint,
    [string]$Subject = "M365 Relay Test - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    [string]$Body = "This is an SMTP relay test sent at $(Get-Date)."
)

$smtpClient = $null
$mailMessage = $null
try {
    # Check addresses before making any network connection.
    $senderAddress = [System.Net.Mail.MailAddress]::new($From)
    $recipientAddress = [System.Net.Mail.MailAddress]::new($To)

    Write-Host "Resolving $SmtpServer..."
    Resolve-DnsName -Name $SmtpServer -DnsOnly -ErrorAction Stop |
        Where-Object { $_.IPAddress } |
        ForEach-Object { Write-Host "  $($_.IPAddress)" }

    Write-Host 'Checking TCP port 25...'
    $tcpTest = Test-NetConnection -ComputerName $SmtpServer -Port 25 -WarningAction SilentlyContinue -ErrorAction Stop
    if (-not $tcpTest.TcpTestSucceeded) {
        throw 'TCP port 25 is unreachable. Check the endpoint, firewall, routing and ISP restrictions. Connector authentication is checked during SMTP, after TCP connects.'
    }

    $smtpClient = [System.Net.Mail.SmtpClient]::new($SmtpServer, 25)
    $smtpClient.DeliveryMethod = [System.Net.Mail.SmtpDeliveryMethod]::Network
    $smtpClient.UseDefaultCredentials = $false
    $smtpClient.Credentials = $null
    $smtpClient.EnableSsl = $true
    $smtpClient.Timeout = 30000

    if ($CertificateThumbprint) {
        $thumbprint = ($CertificateThumbprint -replace '\s', '').ToUpperInvariant()
        if ($thumbprint -notmatch '^[0-9A-F]{40}$') {
            throw 'Enter the complete 40-character certificate thumbprint.'
        }
        $certificates = @(Get-ChildItem Cert:\CurrentUser\My, Cert:\LocalMachine\My -ErrorAction Stop |
            Where-Object { $_.Thumbprint -eq $thumbprint -and $_.HasPrivateKey -and $_.NotBefore -le (Get-Date) -and $_.NotAfter -gt (Get-Date) })
        if ($certificates.Count -eq 0) {
            throw 'No currently valid matching certificate with a private key was found in CurrentUser\My or LocalMachine\My.'
        }
        $null = $smtpClient.ClientCertificates.Add($certificates[0])
        Write-Host "Using client certificate $thumbprint."
    }

    $mailMessage = [System.Net.Mail.MailMessage]::new()
    $mailMessage.From = $senderAddress
    $mailMessage.To.Add($recipientAddress)
    $mailMessage.Subject = $Subject
    $mailMessage.Body = $Body
    Write-Host "Sending one test message from $From to $To with STARTTLS..."
    $smtpClient.Send($mailMessage)
    Write-Host 'SMTP submission accepted. Check the recipient mailbox and Exchange Online message trace to confirm delivery.' -ForegroundColor Green
} catch {
    throw "Relay test failed: $($_.Exception.Message)"
} finally {
    if ($mailMessage) { $mailMessage.Dispose() }
    if ($smtpClient) { $smtpClient.Dispose() }
}

Write-Host 'For tracing, connect separately to Exchange Online with an authorised account and use Get-MessageTraceV2.'
