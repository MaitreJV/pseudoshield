# Build PseudoShield — Chrome Web Store + Firefox AMO
# Le manifest unique fonctionne pour les deux navigateurs.
#
# 2 garde-fous importants :
#  1. Staging propre : seuls les fichiers de l'extension sont inclus (scripts de dev exclus).
#  2. Chemins en FORWARD SLASH dans le ZIP : Compress-Archive (PowerShell 5.1) ecrit des
#     backslash non conformes -> Chrome/Firefox ne trouvent pas les sous-dossiers. On
#     construit donc le ZIP via .NET ZipArchive en normalisant les separateurs en '/'.

$version = "2.1.0"
$baseDir = "D:\Claude\anonymizator"
$staging = Join-Path $env:TEMP "pseudoshield-build-$version"

# Fichiers racine de l'extension
$rootFiles = @(
    "manifest.json", "background.js", "content.js",
    "popup.html", "popup.js", "options.html", "options.js", "privacy.html"
)
# Dossiers de l'extension
$dirs = @("icons", "adapters", "anonymizer", "data", "utils", "ui", "_locales")

# Reconstruire un staging vierge
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging -Force | Out-Null
foreach ($f in $rootFiles) { Copy-Item (Join-Path $baseDir $f) -Destination $staging }
foreach ($d in $dirs) { Copy-Item (Join-Path $baseDir $d) -Destination $staging -Recurse }

# Exclure les fichiers non destines a l'extension (scripts de dev, notes, archives)
Get-ChildItem $staging -Recurse -File -Include *.py, *.cjs, *.sh, *.bak, *.md, *.zip |
    Remove-Item -Force

Add-Type -AssemblyName System.IO.Compression          # ZipArchive / ZipArchiveMode
Add-Type -AssemblyName System.IO.Compression.FileSystem # ZipFile / ZipFileExtensions

function New-ExtensionZip([string]$destPath) {
    if (Test-Path $destPath) { Remove-Item $destPath }
    $zip = [System.IO.Compression.ZipFile]::Open($destPath, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        # Chemin relatif robuste (insensible aux noms courts/longs Windows) : on se place
        # dans le staging et on derive le chemin via Resolve-Path -Relative, puis on
        # normalise '.\xxx' -> 'xxx' et les separateurs en '/'.
        Push-Location $staging
        try {
            Get-ChildItem -Recurse -File | ForEach-Object {
                $rel = (Resolve-Path -LiteralPath $_.FullName -Relative) -replace '^\.[\\/]', '' -replace '\\', '/'
                [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
            }
        } finally {
            Pop-Location
        }
    } finally {
        $zip.Dispose()
    }
    $kb = [math]::Round((Get-Item $destPath).Length / 1024)
    Write-Host "ZIP: $destPath ($kb KB)"
}

New-ExtensionZip "D:\Claude\pseudoshield-chrome-v$version.zip"
New-ExtensionZip "D:\Claude\pseudoshield-firefox-v$version.zip"

Remove-Item $staging -Recurse -Force
Write-Host "`nBuild termine. Chemins forward slash (conforme Chrome/Firefox), scripts de dev exclus."
