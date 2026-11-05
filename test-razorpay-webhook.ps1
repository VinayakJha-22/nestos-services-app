
# NestOS Services - Razorpay Webhook Connectivity Test

Write-Host "NestOS Razorpay Webhook Test" -ForegroundColor Cyan

# Ask for webhook secret securely
$secure = Read-Host "Enter RAZORPAY_WEBHOOK_SECRET" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)

try {
    $secret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if ([string]::IsNullOrWhiteSpace($secret)) {
    throw "Webhook secret cannot be empty."
}

# Create simulated payment.failed event
$body = '{"event":"payment.failed"}'

# Generate HMAC SHA256 signature
$keyBytes = [System.Text.Encoding]::UTF8.GetBytes($secret)
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)

$hmac = [System.Security.Cryptography.HMACSHA256]::new($keyBytes)

try {
    $hash = $hmac.ComputeHash($bodyBytes)
    $signature = [BitConverter]::ToString($hash).Replace("-", "").ToLower()
}
finally {
    $hmac.Dispose()
}

# Generate unique event ID
$eventId = [guid]::NewGuid().ToString()

Write-Host "Signature generated." -ForegroundColor Green
Write-Host "Sending webhook to local application through ngrok..."

try {
    $response = Invoke-RestMethod `
        -Method Post `
        -Uri "https://chef-reply-rind.ngrok-free.dev/api/webhooks/razorpay" `
        -ContentType "application/json" `
        -Headers @{
            "x-razorpay-signature" = $signature
            "x-razorpay-event-id" = $eventId
        } `
        -Body $body

    Write-Host "`nWebhook response:" -ForegroundColor Green
    $response | Format-List
}
catch {
    Write-Host "`nWebhook request failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message

    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    }
}
finally {
    $secret = $null
    $keyBytes = $null
    $bodyBytes = $null
    $signature = $null
}
