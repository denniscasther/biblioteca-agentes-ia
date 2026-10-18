# Biblioteca de Agentes de IA — sitio web

Catálogo responsive de los diez volúmenes y el libro relacionado. Las portadas, HTML y PDF se copian desde el proyecto editorial a `library/` mediante `tools/sync_library.py`; solo este directorio del sitio se publica como repositorio GitHub. Los documentos internos de `referencias/`, `project_state/` y las herramientas de trabajo no se envían.

## Actualizar libros

Desde la carpeta `sitio/`, ejecutar:

```powershell
..\.venv\Scripts\python.exe tools\sync_library.py
..\.venv\Scripts\python.exe tools\build.py
```

El segundo comando usa solo la biblioteca ya versionada y funciona también en GitHub Actions. `dist/` queda fuera de Git. La acción `.github/workflows/pages.yml` publica `dist/` en GitHub Pages al enviar cambios a `main`.

## Primera publicación

Desde un PowerShell normal con acceso a Internet, ejecutar:

```powershell
& 'C:\Biblioteca Dennis\Biblioteca_IA\sitio\PUBLICAR.ps1'
```

El script comprueba la cuenta `denniscasther`, abre la autorización de GitHub si hace falta, crea el repositorio `biblioteca-agentes-ia`, sube `main`, activa Pages con GitHub Actions y espera el resultado del despliegue.
