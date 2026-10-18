"""Recorta, registra y empaqueta piezas de GPT Image; no dibuja arte."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parent
PLAN=json.loads((ROOT/'rig-plan.json').read_text(encoding='utf-8'))
SOURCES=json.loads((ROOT/'rig-generation.json').read_text(encoding='utf-8'))
A,B=ROOT/'rig-piezas',ROOT/'rig-capas'
A.mkdir(exist_ok=True)
B.mkdir(exist_ok=True)
LANCZOS=Image.Resampling.LANCZOS

def write_json(path,data):
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def bounds(im):
    return im.getchannel('A').point(lambda v:255 if v>8 else 0).getbbox()

def register(name,target):
    original=Image.open(SOURCES[name]).convert('RGBA')
    original.putalpha(original.getchannel('A').point(lambda v:0 if v<=3 else v))
    source_box=bounds(original)
    assert source_box,name
    x,y,r,b=target
    piece=original.crop(source_box).resize((r-x,b-y),LANCZOS)
    layer=Image.new('RGBA',(1024,1024))
    layer.alpha_composite(piece,(x,y))
    return layer,source_box,list(original.size)

layers,records={},[]
for item in PLAN['layers']:
    name=item['name']
    if name not in SOURCES: continue
    layer,source_box,original_size=register(name,item['target'])
    layer.save(B/(name+'.png'))
    layers[name]=layer
    box=bounds(layer)
    crop=layer.crop((max(0,box[0]-8),max(0,box[1]-8),min(1024,box[2]+8),min(1024,box[3]+8)))
    crop.save(A/(name+'.png'))
    records.append({**item,'file':name+'.png','source':SOURCES[name],'sourceSize':original_size,'sourceBounds':source_box,'bounds':box,'cropSize':list(crop.size)})
if 'lagrima' in SOURCES:
    tear,_,_=register('lagrima',[651,297,676,337])
    tear.crop((643,289,684,345)).save(A/'lagrima.png')

stack=['pie-derecho','pie-izquierdo','cuerpo','brazo-derecho','brazo-izquierdo','ojo-derecho-abierto','ojo-izquierdo-abierto','boca-sonrisa','nariz']
write_json(B/'manifest.json',{'canvas':[1024,1024],'generator':'GPT Image integrado','reference':'../hoja-personaje.png','sideConvention':PLAN['sideConvention'],'registration':'Ediciones de GPT Image registradas a coordenadas fijas sobre el lienzo de la base.','base':'base.png','assetCount':1+len(records),'defaultStack':stack,'note':'La base es referencia; no apilarla bajo cuerpo. Usar cuerpo como fondo para cambiar expresiones.','layers':records})

pieces=[(r['name'],Image.open(A/r['file']).convert('RGBA')) for r in records]
if (A/'lagrima.png').exists(): pieces.append(('lagrima',Image.open(A/'lagrima.png').convert('RGBA')))
width,padding=3072,48
x=y=padding
row_height=0
placements=[]
for name,piece in pieces:
    if x+piece.width+padding>width:
        x=padding
        y+=row_height+padding
        row_height=0
    placements.append({'name':name,'xy':[x,y],'size':list(piece.size)})
    x+=piece.width+padding
    row_height=max(row_height,piece.height)
height=((y+row_height+padding+63)//64)*64
sheet=Image.new('RGBA',(width,height))
for placement,(_,piece) in zip(placements,pieces): sheet.alpha_composite(piece,tuple(placement['xy']))
sheet.save(A/'hoja-transparente.png')
white=Image.new('RGBA',sheet.size,'white')
white.alpha_composite(sheet)
white.convert('RGB').save(A/'hoja-blanca.png')
write_json(A/'manifest.json',{'generator':'GPT Image integrado','pieceCount':len(pieces),'scale':'Misma escala relativa al personaje del lienzo 1024x1024; recortes con 8px de margen.','sheetSize':list(sheet.size),'sheets':['hoja-transparente.png','hoja-blanca.png'],'parts':placements})

def compose(names):
    canvas=Image.new('RGBA',(1024,1024))
    for name in names:
        if name in layers: canvas.alpha_composite(layers[name])
    return canvas

neutral=compose(stack)
neutral.save(ROOT/'rig-neutral-compuesto.png')
neutral.save(B/'base.png')
no_face=[n for n in stack if not n.startswith('ojo-') and not n.startswith('boca-')]
states=[('Neutral',stack),('Feliz',no_face+['ojo-derecho-feliz','ojo-izquierdo-feliz','boca-feliz']),('Minero',stack+['casco-minero','gafas']),('Sorpresa',no_face+['ojo-derecho-sorpresa','ojo-izquierdo-sorpresa','boca-sorpresa']),('Somnoliento',no_face+['ojo-derecho-somnoliento','ojo-izquierdo-somnoliento','boca-neutral']),('Saludo',[n for n in stack if n!='brazo-derecho']+['brazo-derecho-saludo'])]
preview=Image.new('RGB',(1536,1064),'#f2ece3')
draw=ImageDraw.Draw(preview)
for index,(title,names) in enumerate(states):
    px,py=(index%3)*512,(index//3)*532
    draw.text((px+20,py+8),title,fill='#38271e')
    render=compose(names).resize((480,480),LANCZOS)
    preview.paste(render,(px+16,py+32),render)
preview.save(ROOT/'rig-vista-previa.jpg',quality=94)

if len(records)==29:
    for folder,expected in [(B,30),(A,32)]:
        files=list(folder.glob('*.png'))
        assert len(files)==expected,(folder,len(files))
        for path in files:
            image=Image.open(path)
            if path.name=='hoja-blanca.png': continue
            assert image.mode=='RGBA',path
            assert image.getchannel('A').getextrema()[0]==0,path
            if folder==B: assert image.size==(1024,1024),path
    print('Verificados: B 30 PNG (base + 29 capas) de 1024x1024; A 30 piezas y hojas blanca/transparente.')
else: print('Avance: '+str(len(records))+' capas registradas.')
