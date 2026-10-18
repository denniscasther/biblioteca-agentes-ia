"""Construye dist/ para GitHub Pages con archivos versionados del sitio."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

SITE = Path(__file__).resolve().parents[1]
DEST = (SITE / "dist").resolve()


def main() -> None:
    if DEST.parent != SITE.resolve() or DEST.name != "dist":
        raise RuntimeError("Destino de compilación fuera del sitio")
    catalog = json.loads((SITE / "catalogo.json").read_text(encoding="utf-8"))
    if len(catalog) != 12:
        raise RuntimeError(f"Se esperaban 12 libros; hay {len(catalog)}")
    if DEST.exists():
        shutil.rmtree(DEST)
    shutil.copytree(SITE / "src", DEST)
    shutil.copytree(SITE / "library", DEST / "library")
    shutil.copy2(SITE / "catalogo.json", DEST / "catalogo.json")
    (DEST / ".nojekyll").write_text("", encoding="utf-8")
    for book in catalog:
        for key in ("cover", "html", "pdf"):
            if not (DEST / book[key]).is_file():
                raise RuntimeError(f"Falta {book[key]}")
    print(f"Sitio construido: {DEST}, {len(catalog)} libros")


if __name__ == "__main__":
    main()
