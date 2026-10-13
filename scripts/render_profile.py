"""Aurora Terminal layout, Circuit Atlas colors, Neon Arcade pixel mascot."""
from pathlib import Path
import copy
import json
import xml.etree.ElementTree as ET
import vector_base as v

ET.register_namespace('', 'http://www.w3.org/2000/svg')

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/readme'
v.DATA=json.loads((ROOT/'data/github.json').read_text(encoding='utf-8'))
v.STATS=v.snapshot(v.DATA)
v.ICON_ROOT=OUT/'icons'
terminal=copy.deepcopy(next(t for t in v.THEMES if t['id']=='terminal'))
circuit=next(t for t in v.THEMES if t['id']=='circuit')
for key in ['bg','panel','fg','muted','a','b','c']:terminal[key]=circuit[key]
v.T=terminal
NS='{http://www.w3.org/2000/svg}'

def customized_hero(mobile=False):
    root=ET.fromstring(v.hero(terminal,mobile))
    group=next(node for node in root.iter() if node.attrib.get('id')=='motif')
    group.clear();group.set('id','motif')
    v.T=terminal
    if mobile:
        graphic=v.pixelbot(385,313,9)
        # Preserve the mobile Aurora monogram after replacing its chip illustration.
        graphic+=v.text(440,429,'PT',24,terminal['muted'],600,extra='text-anchor="middle"')
    else:graphic=v.pixelbot(929,145,13)
    fragment=ET.fromstring('<g xmlns="http://www.w3.org/2000/svg">'+graphic+'</g>')
    for node in fragment:group.append(node)
    for node in root.iter():
        for key,value in list(node.attrib.items()):
            if value=='#42656a':node.set(key,terminal['muted'])
    return ET.tostring(root,encoding='unicode')

def crop_svg(markup,viewbox,title):
    root=ET.fromstring(markup)
    x,y,w,h=viewbox
    root.set('viewBox',f'{x} {y} {w} {h}')
    root.set('width',str(w));root.set('height',str(h))
    next(n for n in root if n.tag==NS+'title').text=title
    return ET.tostring(root,encoding='unicode')

for mobile in [False,True]:
    suffix='-mobile' if mobile else ''
    (OUT/f'hero{suffix}.svg').write_text(customized_hero(mobile),encoding='utf-8')
    for name,fn in [('stack',v.stack_art),('stats',v.stats_art),('calendar',v.calendar_art)]:
        (OUT/f'{name}{suffix}.svg').write_text(fn(terminal,mobile),encoding='utf-8')
    work=v.work_art(terminal,mobile)
    builds=(0,0,600,1190) if mobile else (0,0,1200,427)
    repos=(0,1190,600,366) if mobile else (0,427,1200,212)
    (OUT/f'builds{suffix}.svg').write_text(crop_svg(work,builds,'Build / code — Atlas, macropad, Air65'),encoding='utf-8')
    (OUT/f'repositories{suffix}.svg').write_text(crop_svg(work,repos,'Public originals — astr-19 and drumbit'),encoding='utf-8')
    spec={'width':600 if mobile else 1200,'fps':30,'duration':5.2,'colors':192,'dither':'none','clip_to_base_alpha':True,'max_size_mb':2,'reveals':[{'id':'role-line','axis':'x','start':.25,'end':1.35,'exit':{'start':4.55,'end':5.05}},{'id':'spark-path','axis':'x','start':.75,'end':1.7,'exit':{'start':4.55,'end':5.05}}],'layers':[{'id':'motif','enter':{'start':.45,'end':1.45,'from':[15,-7]},'exit':{'start':4.55,'end':5.05,'to':[5,0]}}]}
    (OUT/f'hero{suffix}-motion.json').write_text(json.dumps(spec,indent=2),encoding='utf-8')
print('Rendered the selected profile with abbreviated name and preserved text/order.')
