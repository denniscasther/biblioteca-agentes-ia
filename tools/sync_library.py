"""Copia únicamente los libros publicables de ../libros a este sitio.

Uso local: C:/Biblioteca Dennis/Biblioteca_IA/.venv/Scripts/python.exe tools/sync_library.py
El resultado en library/ y catalogo.json se versiona para que GitHub Pages pueda compilar sin acceso al proyecto editorial.
"""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

import pymupdf

SITE = Path(__file__).resolve().parents[1]
ROOT = SITE.parent
BOOKS = ROOT / "libros"
PUBLIC = SITE / "library"
COVERS = SITE / "src" / "assets" / "covers"

MOBILE_STYLE = """<meta name="viewport" content="width=device-width, initial-scale=1">
<style id="biblioteca-web-mobile">
@media screen and (max-width: 700px) {
  html,body{width:auto!important;min-width:0!important;max-width:100%!important;overflow-x:hidden!important}
  body{margin:0!important;padding:0 17px 32px!important;font-size:15px!important;line-height:1.6!important;text-align:left!important}
  section,main,article,.chapter,.frontnote,.titlepage,.partpage,.toc{width:auto!important;max-width:100%!important;min-height:0!important;height:auto!important;margin:0!important;padding:22px 0!important;box-shadow:none!important}
  section.cover,.cover{display:none!important}
  .titlepage{padding-top:25px!important}
  h1,h2,h3,h4{max-width:100%!important;overflow-wrap:anywhere}
  p,li,dd,dt{font-size:1em!important;overflow-wrap:anywhere}
  figure,svg,img{max-width:100%!important;height:auto!important}
  figure{margin:20px 0!important;overflow-x:auto}
  pre,code{max-width:100%!important;overflow-wrap:anywhere;white-space:pre-wrap!important}
  table{display:block;max-width:100%!important;overflow-x:auto;font-size:12px!important}
  .toc li{display:block!important}
}
</style>"""

INFO = {
    "01_agentes_idea_produccion": ("fundamentos", "El recorrido completo desde la idea de agente hasta una primera puesta en producción."),
    "02_construyendo_agentes": ("construccion", "Cómo coordinar agentes que colaboran sin perder claridad sobre sus responsabilidades."),
    "03_guia_ilustrada": ("fundamentos", "Una entrada visual a los conceptos y herramientas de los agentes de IA."),
    "04_patrones_multiagente": ("arquitectura", "Patrones para diseñar coordinación, memoria y control en sistemas multiagente."),
    "05_mcp": ("herramientas", "Herramientas, recursos y conexiones mediante Model Context Protocol."),
    "06_en_accion": ("construccion", "De los componentes a la orquestación y el despliegue de agentes."),
    "07_en_la_practica": ("produccion", "Criterios de ingeniería para construir agentes más robustos en situaciones reales."),
    "08_segundo_cerebro": ("conocimiento", "Organiza el conocimiento corporativo para que personas y agentes sepan dónde buscar."),
    "09_federacion_cerebros": ("conocimiento", "Conecta cerebros por dominio con permisos, semántica compartida y trazabilidad."),
    "10_maquina_predecir": ("fundamentos", "Una explicación conceptual de cómo funcionan los modelos de lenguaje."),
    "11_del_texto_al_contexto": ("conocimiento", "Una guía visual de tokens, embeddings, búsqueda vectorial, coseno y respuestas con fuentes."),
    "12_la_red_que_aprende": ("fundamentos", "Cómo aprenden las redes neuronales y qué arquitecturas llevan la inteligencia artificial moderna a producción."),
    "13_aprender_de_los_datos": ("fundamentos", "Machine Learning aplicado a logística, comercial, finanzas y operaciones, desde el ERP hasta los servicios en producción."),
    "14_arquitectura_empresa_inteligente": ("arquitectura", "Mapas y casos ilustrados para conectar ERP, BI, Machine Learning, agentes y MCP en una arquitectura empresarial."),
    "R1_castor_y_el_plano": ("desarrollo", "Especificaciones como plano vivo para desarrollar con agentes de código."),
}

ROMAN = ("I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV")


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    COVERS.mkdir(parents=True, exist_ok=True)
    catalog = []
    for folder in sorted(BOOKS.iterdir()):
        if folder.name not in INFO:
            continue
        data = json.loads((folder / "book.json").read_text(encoding="utf-8"))
        html = folder / data["source"]
        pdf = folder / data["pdf"]
        if not html.is_file() or not pdf.is_file():
            raise FileNotFoundError(f"Falta HTML o PDF en {folder}")
        dest = PUBLIC / folder.name
        dest.mkdir(exist_ok=True)
        published_html = html.read_text(encoding="utf-8")
        published_html, replaced = re.subn(r"</head>", MOBILE_STYLE + "\n</head>", published_html, count=1, flags=re.I)
        if replaced != 1:
            raise ValueError(f"Falta </head> en {html}")
        (dest / html.name).write_text(published_html, encoding="utf-8")
        shutil.copy2(pdf, dest / pdf.name)
        cover = COVERS / f"{folder.name}.png"
        with pymupdf.open(pdf) as doc:
            pages = doc.page_count
            doc[0].get_pixmap(matrix=pymupdf.Matrix(0.85, 0.85), alpha=False).save(cover)
        category, description = INFO[folder.name]
        catalog.append({
            "id": folder.name,
            "volume": data.get("volume"),
            "number": ROMAN[data["volume"] - 1] if data.get("volume") else "R",
            "title": data["title"],
            "animal": data["animal"],
            "angle": data["angle"],
            "description": description,
            "accent": data["accent"],
            "accentDark": data.get("accentDark", data["accent"]),
            "category": category,
            "pages": pages,
            "cover": f"assets/covers/{cover.name}",
            "html": f"library/{folder.name}/{html.name}",
            "pdf": f"library/{folder.name}/{pdf.name}",
        })
    (SITE / "catalogo.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(catalog)} libros sincronizados en {PUBLIC}")


if __name__ == "__main__":
    main()
