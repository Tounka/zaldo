"""Exporta los assets del encargo y produce láminas para revisión visual."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tmp/madriguera-tools'))
from PIL import Image, ImageChops, ImageDraw

BASE = ROOT / 'diseno/madriguera'
manifest = json.loads((BASE / 'generacion.json').read_text(encoding='utf-8'))
(BASE / 'revision').mkdir(parents=True, exist_ok=True)
records = []
for asset in manifest['assets']:
    name = asset['id']
    source = ROOT / asset['png']
    source.parent.mkdir(parents=True, exist_ok=True)
    image = Image.open(asset['generated']).convert('RGBA')
    if name == 'separador':
        # El generador entrega un lienzo 3:1; conservar la ilustración en el 4:1 pedido.
        bounds = image.getchannel('A').getbbox()
        content = image.crop(bounds)
        content.thumbnail((2008, 472), Image.Resampling.LANCZOS)
        image = Image.new('RGBA', (2048, 512))
        image.alpha_composite(content, ((2048-content.width)//2, (512-content.height)//2))
    else:
        image = image.resize((1024, 1024), Image.Resampling.LANCZOS)
    if name == 'patron-tuneles':
        original = ImageChops.offset(image, 512, 512)
        repair_spec = json.loads((BASE / 'reparacion-patron.json').read_text(encoding='utf-8'))
        repaired = Image.open(repair_spec['generated']).convert('RGBA').resize((1024, 1024), Image.Resampling.LANCZOS)
        # El perímetro proviene de una región continua del original; conservarlo.
        # El encargo permite desplazar al 50% y retocar el centro del mosaico.
        mask = Image.new('L', (1024, 1024))
        mask.putdata([round(255*max(0, min(1, (min(x,y,1023-x,1023-y)-64)/64))) for y in range(1024) for x in range(1024)])
        image = Image.composite(repaired, original, mask)
    image.save(source)
    if name == 'patron-tuneles':
        ImageChops.offset(image, 512, 512).save(BASE / 'revision/patron-desplazado.png')
    size = 512 if name == 'patron-tuneles' else 256 if name == 'topo-agujero' else 1200 if name == 'separador' else 384
    # Ignorar píxeles casi invisibles que inflan el lienzo de los recortes.
    bounds = image.getchannel('A').point(lambda a: 255 if a >= 8 else 0).getbbox()
    export = image if name == 'patron-tuneles' else image.crop(bounds)
    export = export.resize((size, round(size*export.height/export.width)), Image.Resampling.LANCZOS)
    target = ROOT / asset['webp']
    target.parent.mkdir(parents=True, exist_ok=True)
    export.save(target, 'WEBP', quality=88, method=6)
    alpha = export.getchannel('A')
    assert alpha.getextrema() == (0, 255), (name, alpha.getextrema())
    records.append({'id': name, 'png': list(image.size), 'webp': list(export.size), 'bytes': target.stat().st_size, 'alpha': list(alpha.getextrema())})

for bg, tag in [('#ffffff', 'blanco'), ('#1b1352', 'violeta')]:
    sheet = Image.new('RGB', (1280, 760), bg)
    draw = ImageDraw.Draw(sheet)
    for i, asset in enumerate(manifest['assets']):
        image = Image.open(ROOT / asset['webp']).convert('RGBA')
        image.thumbnail((284, 300), Image.Resampling.LANCZOS)
        x, y = (i%4)*320, (i//4)*380
        sheet.paste(image, (x+(320-image.width)//2, y+20+(300-image.height)//2), image)
        draw.text((x+18, y+340), asset['id'], fill='#3a27a8' if tag=='blanco' else '#e3a8ff')
    sheet.save(BASE / f'revision/lamina-{tag}.jpg', quality=94)

tile = Image.open(ROOT / 'public/madriguera/patron-tuneles.webp').convert('RGBA')
sheet = Image.new('RGBA', (1024,1024), '#f6f0ff')
for x in range(2):
    for y in range(2):
        sheet.alpha_composite(tile, (x*512,y*512))
sheet.convert('RGB').save(BASE / 'revision/patron-2x2.jpg', quality=94)
(BASE / 'revision/validacion.json').write_text(json.dumps(records, indent=2), encoding='utf-8')
print(json.dumps(records, indent=2))
