$file = Get-ChildItem "C:\Users\edino\Downloads\lições html\fatesa_licoes_html_revisadas_sem_imagens\licoes-html-com-biblia\*.html" | Select-Object -First 1
$content = Get-Content $file.FullName -Raw -Encoding UTF8

if ($content -match 'const BIBLIA_LOCAL = (.+?);') {
    Write-Host "BIBLIA_LOCAL found, length: $($matches[1].Length)"
    Write-Host "First 500 chars:"
    Write-Host $matches[1].Substring(0, [Math]::Min(500, $matches[1].Length))
    Write-Host ""
    Write-Host "Trying to parse..."
    try {
        $json = "{" + $matches[1] + "}"
        $parsed = $json | ConvertFrom-Json
        Write-Host "Success!" -ForegroundColor Green
    } catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "No BIBLIA_LOCAL found"
}