"""Aurora Terminal layout with the interactive website's Circuit Atlas mascot."""
from pathlib import Path
import ast
import copy
import json
import re
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

def website_mascot(mobile=False):
    """Reuse the website's pixel map, stars, circuit paths, and proportions."""
    html=(ROOT/'web/index.html').read_text(encoding='utf-8')
    svg=re.search(r'<svg id="pixel-mascot".*?</svg>',html,re.S)
    if not svg:raise ValueError('Website mascot SVG was not found')
    mascot=ET.fromstring(svg[0].replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ',1))
    script=(ROOT/'web/app.js').read_text(encoding='utf-8')
    pixels=ast.literal_eval(re.search(r'const robot = (\[.*?\]);',script,re.S)[1])
    if len(pixels)!=12 or any(not re.fullmatch('[01]{12}',row) for row in pixels):
        raise ValueError('Website mascot pixel map is invalid')
    scale=.9 if mobile else 1.3
    mascot.attrib.update(x='358' if mobile else '890',y='260' if mobile else '86.5',
                         width=str(180*scale),height=str(210*scale),overflow='visible')
    for node in mascot.iter():
        kind=node.attrib.get('class')
        if kind=='mascot-traces':
            node.attrib.update(fill=terminal['bg'],stroke=terminal['b'],opacity='.6')
            node.set('stroke-width','1.4')
        elif kind=='mascot-sparks':
            node.attrib.update(fill='none',stroke=terminal['c'])
            node.set('stroke-width','2')
        elif kind=='mascot-ground':
            node.attrib.update(fill='none',stroke=terminal['a'],opacity='.2')
            node.set('stroke-width','2')
        elif kind=='mascot-body':
            node.set('shape-rendering','crispEdges')
            for y,row in enumerate(pixels):
                for x,pixel in enumerate(row):
                    if pixel=='1':
                        ET.SubElement(node,NS+'rect',x=str(30+x*10),y=str(45+y*10),
                                      width='10',height='10',fill=terminal['b'] if y in (2,3) else terminal['a'])
    return mascot


def customized_hero(mobile=False):
    root=ET.fromstring(v.hero(terminal,mobile))
    group=next(node for node in root.iter() if node.attrib.get('id')=='motif')
    group.clear();group.set('id','motif')
    v.T=terminal
    group.append(website_mascot(mobile))
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
    css=(ROOT/'web/styles.css').read_text(encoding='utf-8')
    period=float(re.search(r'animation:hoverbot ([\d.]+)s ease-in-out',css)[1])
    distance=float(re.search(r'50%\{transform:translateY\((-[\d.]+)px\)',css)[1])
    spec={'width':600 if mobile else 1200,'fps':30,'duration':period,'colors':256,'dither':'none','clip_to_base_alpha':True,'max_size_mb':2,'reveals':[],
          'layers':[{'id':'mascot-pixels','float':{'period':period,'offset':[0,distance*(.9 if mobile else 1.3)],'easing':'ease-in-out'}}]}
    (OUT/f'hero{suffix}-motion.json').write_text(json.dumps(spec,indent=2),encoding='utf-8')
print('Rendered the selected profile with abbreviated name and preserved text/order.')
