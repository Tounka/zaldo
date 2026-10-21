"""Publica las animaciones del topo como tiras WebP para `TopoAnimado`.

Lee los PNG registrados de `diseno/topo/animaciones/<origen>/NN.png` y escribe
`public/topo/anim/<id>.webp` (256 px por cuadro), `<id>@2x.webp` (512 px) si la
animación es retina, y agrega o actualiza su ficha en `manifest.json`.

Uso:  python diseno/topo/publicar-animaciones.py [id ...]   (sin ids = todas)
"""
import json
import sys
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
FUENTES = RAIZ / "diseno" / "topo" / "animaciones"
DESTINO = RAIZ / "public" / "topo" / "anim"

# cuadros: lista de (carpeta, cuadro). Una animación puede reutilizar cuadros de otra.
ANIMACIONES = {
    "excavar-entrar": {"cuadros": [("excavar-entrar", f"{n:02d}") for n in range(1, 15)],
                       "fps": 12, "bucle": False, "retina": True},
    # Solo existen los cuadros clave (impares); a 6 fps dura lo mismo que 10 a 12 fps.
    "excavar-salir": {"cuadros": [("excavar-salir", n) for n in ("01", "03", "05", "07", "09")],
                      "fps": 6, "bucle": False, "retina": True},
    # Bucle de carga armado con las poses de cavar de excavar-entrar (misma profundidad).
    "cavar-bucle": {"cuadros": [("excavar-entrar", n) for n in ("05", "06", "05", "07")],
                    "fps": 6, "bucle": True, "retina": False},
    "parpadeo": {"cuadros": [("parpadeo", f"{n:02d}") for n in range(1, 5)],
                 "fps": 12, "bucle": False, "retina": False},
    "respirar": {"cuadros": [("respirar", f"{n:02d}") for n in range(1, 7)],
                 "fps": 12, "bucle": True, "retina": False},
}


def tira(cuadros, tam):
    lienzo = Image.new("RGBA", (tam * len(cuadros), tam), (0, 0, 0, 0))
    for i, (carpeta, cuadro) in enumerate(cuadros):
        imagen = Image.open(FUENTES / carpeta / f"{cuadro}.png").convert("RGBA")
        lienzo.alpha_composite(imagen.resize((tam, tam), Image.LANCZOS), (i * tam, 0))
    return lienzo


def publicar(ids):
    ruta_manifest = DESTINO / "manifest.json"
    manifest = json.loads(ruta_manifest.read_text(encoding="utf-8")) if ruta_manifest.exists() else {}
    DESTINO.mkdir(parents=True, exist_ok=True)
    for id_ in ids:
        ficha = ANIMACIONES[id_]
        tira(ficha["cuadros"], 256).save(DESTINO / f"{id_}.webp", quality=85, method=6)
        if ficha["retina"]:
            tira(ficha["cuadros"], 512).save(DESTINO / f"{id_}@2x.webp", quality=85, method=6)
        manifest[id_] = {"cuadros": len(ficha["cuadros"]), "fps": ficha["fps"],
                         "bucle": ficha["bucle"], "tam": 256, "retina": ficha["retina"]}
        # Cuadro donde reinicia el bucle (los anteriores solo se ven la primera vez).
        if "inicioBucle" in ficha:
            manifest[id_]["inicioBucle"] = ficha["inicioBucle"]
        print(f"{id_}: {len(ficha['cuadros'])} cuadros a {ficha['fps']} fps")
    ruta_manifest.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    publicar(sys.argv[1:] or list(ANIMACIONES))
