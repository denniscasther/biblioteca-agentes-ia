# Ejecutar desde un PowerShell normal con acceso a Internet:
#   & 'C:\Biblioteca Dennis\Biblioteca_IA\sitio\PUBLICAR.ps1'
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$repo = 'denniscasther/biblioteca-agentes-ia'
$url = 'https://github.com/denniscasther/biblioteca-agentes-ia.git'
$pagesUrl = 'https://denniscasther.github.io/biblioteca-agentes-ia/'

foreach ($command in @('git', 'gh')) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "Falta instalar $command."
    }
}

function Test-NativeCommand {
    param([string]$Program, [string[]]$Arguments)
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $Program @Arguments 1>$null 2>$null
        return $LASTEXITCODE -eq 0
    } finally {
        $ErrorActionPreference = $previousPreference
    }
}

function Push-Main {
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        git push -u origin main 2>&1 | ForEach-Object { Write-Host $_ }
        return $LASTEXITCODE -eq 0
    } finally {
        $ErrorActionPreference = $previousPreference
    }
}

# Esta carpeta fue creada desde un entorno aislado con otro propietario Windows.
$env:GIT_CONFIG_COUNT = '1'
$env:GIT_CONFIG_KEY_0 = 'safe.directory'
$env:GIT_CONFIG_VALUE_0 = $PSScriptRoot.Replace('\', '/')

Write-Host 'Comprobando acceso a GitHub...'
if (-not (Test-NativeCommand -Program 'gh' -Arguments @('auth', 'token'))) {
    Write-Host 'Se abrira la autorizacion de GitHub para denniscasther.'
    Test-NativeCommand -Program 'gh' -Arguments @('auth', 'logout', '-h', 'github.com', '-u', 'denniscasther') | Out-Null
    gh auth login -h github.com -p https -w
    if ($LASTEXITCODE -ne 0) { throw 'No se completo la autorizacion de GitHub.' }
}
$account = gh api user --jq '.login'
if ($LASTEXITCODE -ne 0 -or $account -ne 'denniscasther') {
    throw "No se confirmo la cuenta denniscasther (cuenta actual: '$account')."
}

$remote = $null
if (@(git remote) -contains 'origin') {
    $remote = git remote get-url origin
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo leer el remoto origin.' }
}
if ($remote -and $remote -ne $url) {
    throw "El remoto origin apunta a '$remote'; se esperaba '$url'."
}

if (-not (Test-NativeCommand -Program 'gh' -Arguments @('repo', 'view', $repo, '--json', 'name', '--jq', '.name'))) {
    Write-Host 'Creando repositorio publico...'
    gh repo create $repo --public --source . --remote origin
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el repositorio.' }
} else {
    if (-not $remote) { git remote add origin $url }
    Write-Host 'El repositorio ya existe.'
}

Write-Host 'Subiendo main...'
if (-not (Push-Main)) {
    Write-Host 'El push fallo. GitHub puede requerir permiso workflow para publicar el archivo de Actions.'
    Write-Host 'Se abrira la autorizacion para agregar ese permiso.'
    gh auth refresh -h github.com -s workflow
    if ($LASTEXITCODE -ne 0) { throw 'No se completo la autorizacion del permiso workflow.' }
    if (-not (Push-Main)) { throw 'No se pudo subir main tras autorizar workflow.' }
}

if (-not (Test-NativeCommand -Program 'gh' -Arguments @('api', "repos/$repo/pages", '--jq', '.build_type'))) {
    Write-Host 'Activando GitHub Pages con GitHub Actions...'
    gh api -X POST "repos/$repo/pages" -f build_type=workflow 1>$null
    if ($LASTEXITCODE -ne 0) { throw 'El repositorio se subio, pero no se pudo activar Pages.' }
}

Write-Host 'Iniciando despliegue de Pages...'
gh workflow run pages.yml --repo $repo
if ($LASTEXITCODE -ne 0) { throw 'El repositorio se subio, pero no se pudo iniciar el despliegue.' }

Start-Sleep -Seconds 5
$runId = gh run list --repo $repo --workflow pages.yml --limit 1 --json databaseId --jq '.[0].databaseId'
if ($LASTEXITCODE -ne 0 -or -not $runId) { throw 'No se encontro la ejecucion de Pages.' }
gh run watch $runId --repo $repo --exit-status
if ($LASTEXITCODE -ne 0) { throw 'La accion de Pages fallo. Revisa el resultado en GitHub.' }

Write-Host ''
Write-Host "Publicacion terminada: $pagesUrl"
