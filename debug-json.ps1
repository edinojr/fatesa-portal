$test = @{
    'Marcos 4:11-12' = '1. Disse-lhe Jesus: A vocês é dado conhecer o mistério do reino de Deus; mas aos que estão fora, tudo se diz em parábolas, 2. para que, embora vejam, não percebam; e, embora ouçam, não compreendam; para que não se convertam e sejam perdoados.'
} | ConvertTo-Json -Compress

Write-Host "Test JSON:" -ForegroundColor Cyan
Write-Host $test
Write-Host ""
Write-Host "Test parsing:"
try {
    $parsed = $test | ConvertFrom-Json
    Write-Host "Success!" -ForegroundColor Green
} catch {
    Write-Host "Failed: $_" -ForegroundColor Red
}