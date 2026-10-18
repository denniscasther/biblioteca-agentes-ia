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

# Esta carpeta fue creada desde un entorno aislado con otro propietario Windows.
$env:GIT_CONFIG_COUNT = '1'
$env:GIT_CONFIG_KEY_0 = 'safe.directory'
$env:GIT_CONFIG_VALUE_0 = $PSScriptRoot.Replace('\', '/')

Write-Host 'Comprobando acceso a GitHub...'
$existingToken = gh auth token 2>$null
if ($LASTEXITCODE -ne 0 -or -not $existingToken) {
    Write-Host 'Se abrirá la autorización de GitHub para denniscasther.'
    gh auth logout -h github.com -u denniscasther 2>$null
    gh auth login -h github.com -p https -w
    if ($LASTEXITCODE -ne 0) { throw 'No se completó la autorización de GitHub.' }
}
$account = gh api user --jq '.login'
if ($LASTEXITCODE -ne 0 -or $account -ne 'denniscasther') {
    throw "No se confirmó la cuenta denniscasther (cuenta actual: '$account')."
}

$remote = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0 -and $remote -ne $url) {
    throw "El remoto origin apunta a '$remote'; se esperaba '$url'."
}

gh repo view $repo --json name --jq '.name' 1>$null 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Creando repositorio público y subiendo main...'
    gh repo create $repo --public --source . --remote origin --push
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear o subir el repositorio.' }
} else {
    if (-not $remote) { git remote add origin $url }
    Write-Host 'El repositorio ya existe. Subiendo main...'
    git push -u origin main
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo subir main.' }
}

gh api "repos/$repo/pages" --jq '.build_type' 1>$null 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Activando GitHub Pages con GitHub Actions...'
    gh api -X POST "repos/$repo/pages" -f build_type=workflow 1>$null
    if ($LASTEXITCODE -ne 0) { throw 'El repositorio se subió, pero no se pudo activar Pages.' }
}

Write-Host 'Iniciando despliegue de Pages...'
gh workflow run pages.yml --repo $repo
if ($LASTEXITCODE -ne 0) { throw 'El repositorio se subió, pero no se pudo iniciar el despliegue.' }

Start-Sleep -Seconds 5
$runId = gh run list --repo $repo --workflow pages.yml --limit 1 --json databaseId --jq '.[0].databaseId'
if ($LASTEXITCODE -ne 0 -or -not $runId) { throw 'No se encontró la ejecución de Pages.' }
gh run watch $runId --repo $repo --exit-status
if ($LASTEXITCODE -ne 0) { throw 'La acción de Pages falló. Revisa el resultado en GitHub.' }

Write-Host ''
Write-Host "Publicación terminada: $pagesUrl"
