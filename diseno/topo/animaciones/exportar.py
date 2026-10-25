"""Registro por traslación, tiras WebP y GIF de revisión de la primera entrega."""
import json
import argparse
import sys
from collections import deque
from pathlib import Path

WORK = next(parent for parent in Path(__file__).resolve().parents if (parent/'package.json').exists())
sys.path.insert(0, str(WORK / 'tmp/madriguera-tools'))
from PIL import Image, ImageDraw, ImageFilter, ImageChops

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, default=WORK)
ROOT = parser.parse_args().root.resolve()
SOURCE = ROOT / 'diseno/topo/animaciones'
PUBLIC = ROOT / 'public/topo/anim'
REVIEW = SOURCE / 'revision'
for directory in (SOURCE, PUBLIC, REVIEW):
    directory.mkdir(parents=True, exist_ok=True)
production = json.loads((Path(__file__).parent / 'produccion.json').read_text(encoding='utf-8-sig'))
neutral = Image.open(production['references'][1]).convert('RGBA')

def nose_center(image):
    # Buscar la isla rosa central superior: excluye casco dorado, tierra y pies.
    small = image.resize((256, 256), Image.Resampling.BILINEAR)
    pixels = small.load()
    todo = set()
    for y in range(30, 225):
        for x in range(90, 180):
            r,g,b,a = pixels[x,y]
            if a>80 and r>160 and r>g*1.25 and b>g*.8 and b>70:
                todo.add((x,y))
    candidates = []
    while todo:
        start = todo.pop()
        queue = deque([start])
        group = [start]
        while queue:
            x,y = queue.popleft()
            for point in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if point in todo:
                    todo.remove(point)
                    queue.append(point)
                    group.append(point)
        if len(group)<70:
            continue
        xs, ys = zip(*group)
        width, height = max(xs)-min(xs)+1, max(ys)-min(ys)+1
        # Nariz y borde de la boca pueden formar una sola isla rosa vertical.
        if .6 < width/height < 3 and width>14 and height<65 and min(ys)<218:
            candidates.append((min(ys), len(group), (min(xs)+max(xs)+1)*2))
    if not candidates:
        return None
    # Excluir las patas laterales y las mejillas; el rostro siempre ocupa la franja central.
    central = [item for item in candidates if 470 <= item[2] <= 650]
    return max(central, key=lambda item: item[1])[2] if central else None

def preserve_region(image, region):
    # Las zonas invariantes conservan los píxeles de la base, evitando deriva.
    mask = Image.new('L', (1024,1024))
    draw = ImageDraw.Draw(mask)
    boxes = [(389,230,457,299),(577,230,647,299)] if region=='ojos' else [(145,410,885,900)]
    for box in boxes:
        draw.rectangle(box, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(3 if region=='ojos' else 14))
    return Image.composite(image, neutral, mask)

records = []
by_id = {}
for item in production['assets']:
    image = Image.open(item['path']).convert('RGBA')
    # Normalizar el lienzo entregado por el generador. Después solo se traslada.
    image = image.resize((1024,1024), Image.Resampling.LANCZOS)
    center = nose_center(image)
    # La punta de nariz que asoma no fija el centro: conservar el agujero.
    align = (item['id']=='excavar-entrar' and int(item['frame'])<=11
        or item['id']=='excavar-salir' and int(item['frame'])>=5
        or item['id']=='cavar-bucle' or item.get('region'))
    dx = round(517.5-center) if center is not None and align else 0
    if abs(dx)>144:
        raise ValueError(f'Deriva horizontal excesiva: {item["id"]}/{item["frame"]}: {dx}')
    shifted = Image.new('RGBA', (1024,1024))
    shifted.alpha_composite(image, (dx,0))
    image = preserve_region(shifted,item['region']) if item.get('region') else shifted
    bounds = image.getchannel('A').point(lambda a: 255 if a>=16 else 0).getbbox()
    if not bounds:
        raise ValueError('Cuadro vacío')
    dy = 918 - (bounds[3]-1)
    registered = Image.new('RGBA', (1024,1024))
    head_clearance = max(0, 10-(bounds[1]+dy)) if item['id']=='excavar-salir' and int(item['frame'])>=8 else 0
    if head_clearance:
        # Registrar por separado tierra y personaje: el casco cabe sin mover el piso
        # ni reescalar la anatomía. La paleta distingue la tierra violeta del topo.
        character_mask=Image.new('L',image.size)
        character_mask.putdata([255 if a>8 and r>g*1.05 and r>b*1.18 else 0 for r,g,b,a in image.get_flattened_data()])
        character_mask=character_mask.filter(ImageFilter.MaxFilter(5))
        # Conservar la pieza conectada del personaje; los reflejos de piedras
        # aisladas pertenecen a la tierra y no deben trasladarse con el topo.
        seed=next((point for point in [(512,550),(512,500),(512,600),(500,550),(540,550)] if character_mask.getpixel(point)==255),None)
        if seed is None:
            raise ValueError('No se encontró el centro del cuerpo')
        ImageDraw.floodfill(character_mask,seed,128)
        character_mask=character_mask.point(lambda value:255 if value==128 else 0)
        # Rellenar huecos internos de ojos, lámpara y sombras de la misma pieza.
        ImageDraw.floodfill(character_mask,(0,0),128)
        character_mask=character_mask.point(lambda value:0 if value==128 else 255)
        soil_mask=ImageChops.invert(character_mask)
        soil=image.copy()
        soil.putalpha(ImageChops.multiply(image.getchannel('A'),soil_mask))
        character=image.copy()
        character.putalpha(ImageChops.multiply(image.getchannel('A'),ImageChops.invert(soil_mask)))
        registered.alpha_composite(character,(0,dy+head_clearance))
        registered.alpha_composite(soil,(0,dy))
    else:
        registered.alpha_composite(image,(0,dy))
    assert registered.getchannel('A').getextrema()==(0,255)
    target = SOURCE / item['id'] / f'{item["frame"]}.png'
    target.parent.mkdir(parents=True,exist_ok=True)
    registered.save(target)
    record = {**item, 'registro': {'dx':dx,'dy':dy,'margenCasco':head_clearance,'boundsOriginales':bounds}, 'png': str(target.relative_to(ROOT))}
    by_id.setdefault(item['id'],[]).append(record)
    records.append(record)

manifest = json.loads((PUBLIC/'manifest.json').read_text(encoding='utf-8')) if (PUBLIC/'manifest.json').exists() else {}
for name, items in by_id.items():
    items.sort(key=lambda item:int(item['frame']))
    (SOURCE/name/'prompts.json').write_text(json.dumps(items,ensure_ascii=False,indent=2),encoding='utf-8')
    total = production['sequences'][name]
    if len(items)!=total:
        print(f'{name}: {len(items)}/{total}, aún sin publicar',flush=True)
        continue
    frames = [Image.open(ROOT/item['png']).convert('RGBA') for item in items]
    loop = name in ('cavar-bucle','respirar')
    retina = name in ('excavar-entrar','excavar-salir')
    fps = 12
    for size in ([256,512] if retina else [256]):
        strip = Image.new('RGBA',(size*total,size))
        for n,frame in enumerate(frames):
            strip.alpha_composite(frame.resize((size,size),Image.Resampling.LANCZOS),(size*n,0))
        target=PUBLIC/f'{name}{"@2x" if size==512 else ""}.webp'
        strip.save(target,'WEBP',quality=86,method=4)
        assert Image.open(target).size==(size*total,size)
        assert Image.open(target).getchannel('A').getextrema()==(0,255)
    manifest[name]={'cuadros':total,'fps':fps,'bucle':loop,'tam':256,'retina':retina}
    for bg,tag in [('#ffffff','blanco'),('#1b1352','violeta')]:
        previews=[]
        sheet=Image.new('RGB',(4*256,((total+3)//4)*280),bg)
        draw=ImageDraw.Draw(sheet)
        for n,frame in enumerate(frames):
            thumb=frame.resize((256,256),Image.Resampling.LANCZOS)
            preview=Image.new('RGBA',(256,256),bg)
            preview.alpha_composite(thumb)
            previews.append(preview.convert('RGB'))
            sheet.paste(previews[-1],((n%4)*256,(n//4)*280))
            draw.text(((n%4)*256+12,(n//4)*280+256),str(n+1).zfill(2),fill='#3a27a8' if tag=='blanco' else '#e3a8ff')
        durations=[round((n+1)*100/fps)*10-round(n*100/fps)*10 for n in range(total)]
        previews[0].save(REVIEW/f'{name}-{tag}.gif',save_all=True,append_images=previews[1:],duration=durations,loop=0 if loop else 1,disposal=2)
        sheet.save(REVIEW/f'{name}-{tag}.jpg',quality=94)
    if loop:
        assert frames[0].tobytes()==frames[-1].tobytes(), f'El bucle no enlaza: {name}'
    print(f'{name}: {total} cuadros exportados y verificados',flush=True)
(PUBLIC/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(REVIEW/'registro.json').write_text(json.dumps([{'id':r['id'],'frame':r['frame'],**r['registro']} for r in records],indent=2),encoding='utf-8')
