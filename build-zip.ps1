# Build PseudoShield — Chrome Web Store + Firefox AMO
# Le manifest unique fonctionne pour les deux navigateurs

$version = "2.0.0"
$baseDir = "D:\Claude\anonymizator"

$items = @(
    "$baseDir\manifest.json",
    "$baseDir\background.js",
    "$baseDir\content.js",
    "$baseDir\popup.html",
    "$baseDir\popup.js",
    "$baseDir\options.html",
    "$baseDir\options.js",
    "$baseDir\privacy.html",
    "$baseDir\icons",
    "$baseDir\adapters",
    "$baseDir\anonymizer",
    "$baseDir\data",
    "$baseDir\utils",
    "$baseDir\ui",
    "$baseDir\_locales"
)

# Chrome Web Store
$chromePath = "D:\Claude\pseudoshield-chrome-v$version.zip"
if (Test-Path $chromePath) { Remove-Item $chromePath }
Compress-Archive -Path $items -DestinationPath $chromePath -Force
Write-Host "Chrome ZIP: $chromePath ($([math]::Round((Get-Item $chromePath).Length / 1024)) KB)"

# Firefox AMO
$firefoxPath = "D:\Claude\pseudoshield-firefox-v$version.zip"
if (Test-Path $firefoxPath) { Remove-Item $firefoxPath }
Compress-Archive -Path $items -DestinationPath $firefoxPath -Force
Write-Host "Firefox ZIP: $firefoxPath ($([math]::Round((Get-Item $firefoxPath).Length / 1024)) KB)"

Write-Host "`nBuild termine. Meme contenu, manifest cross-browser."
