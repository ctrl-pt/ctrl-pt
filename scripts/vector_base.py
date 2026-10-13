"""Vector-first, concise GitHub profile samples. No portfolio imagery or essays."""
from pathlib import Path
from html import escape
import argparse
import collections
import copy
import datetime as dt
import json
import math
import re
import xml.etree.ElementTree as ET

BASE=Path(__file__).resolve().parent
ROOT=BASE.parent
THEMES=[
 dict(id='cosmic',n='01',name='Cosmic Console',bg='#101126',panel='#1b1e39',fg='#f0edff',muted='#a7acd2',a='#a399ff',b='#6ce8e0',c='#ffc78d',kind='Atmospheric',feel='Orbit maps · luminous charts · constellation nodes',note='Best overall: a vivid, coordinated GitHub dashboard.',order=['stats','stack','calendar','work','snake']),
 dict(id='pastel',n='02',name='Pastel Playground',bg='#f6edf6',panel='#e8ddf2',fg='#392e58',muted='#726582',a='#9869c5',b='#69b8ae',c='#eb9dac',kind='Playful',feel='Waves · layered windows · candy-colored icon tiles',note='Closest to the friendly, graphic energy of your reference.',order=['stack','stats','work','calendar','snake']),
 dict(id='arcade',n='03',name='Neon Arcade',bg='#0d1721',panel='#172b35',fg='#edffef',muted='#97b9af',a='#b4f46c',b='#55dfd3',c='#ffad78',kind='Playful',feel='Pixel mascot · activity levels · contribution snake',note='Most playful: dense arcade graphics with real activity data.',order=['stack','work','stats','snake','calendar']),
 dict(id='circuit',n='04',name='Circuit Atlas',bg='#071f2a',panel='#113440',fg='#def8f5',muted='#94bdc3',a='#4de3ca',b='#73b5ff',c='#fbc975',kind='Technical',feel='PCB traces · silicon modules · a connected toolchain',note='Best for the embedded systems and robotics side of your identity.',order=['stack','work','stats','calendar','snake']),
 dict(id='signal',n='05',name='Signal Observatory',bg='#171b1e',panel='#252b30',fg='#f2eee5',muted='#b2b9b8',a='#ffbc72',b='#9fd8c6',c='#b5bafc',kind='Technical',feel='Activity waveforms · radial charts · dense instrument panels',note='Strongest statistics focus with a restrained industrial palette.',order=['stats','calendar','stack','work','snake']),
 dict(id='sticker',n='06',name='Sticker Stack',bg='#f5efe0',panel='#eee1c8',fg='#2c2926',muted='#756958',a='#275bcb',b='#d25368',c='#f7bb43',kind='Playful',feel='Overlapping badges · punchy typography · graphic stickers',note='Boldest graphic personality without extra biography.',order=['work','stack','stats','calendar','snake']),
 dict(id='terminal',n='07',name='Aurora Terminal',bg='#0f1b20',panel='#1a2d35',fg='#dcf7ee',muted='#95b7b1',a='#72e2bd',b='#87c5ff',c='#eec387',kind='Technical',feel='Typing reveal · compact console blocks · an icon matrix',note='The most familiar developer profile direction, expanded visually.',order=['stack','stats','calendar','work','snake']),
 dict(id='mono',n='08',name='Monochrome Lab',bg='#f4f3ed',panel='#e8e6dc',fg='#181b1d',muted='#62686b',a='#252c32',b='#667985',c='#9aa6ab',kind='Technical',feel='Architectural geometry · crisp metric tiles · monochrome charts',note='Maximalism through geometry and density rather than bright color.',order=['stats','stack','calendar','work','snake']),
]
ICON_NAMES=['python','cpp','java','javascript','typescript','html','css','php','github','arduino']
LABELS={'python':'Python','cpp':'C++','java':'Java','javascript':'JavaScript','typescript':'TypeScript','html':'HTML','css':'CSS','php':'PHP','github':'GitHub','arduino':'Arduino'}
ART_ALT={'stats':'GitHub activity: contributions, active days, longest streak, and repositories; weekly counts and weekday distribution.', 'stack':'Programming and development tools: Python, C++, Java, JavaScript, TypeScript, HTML, CSS, PHP, GitHub, Arduino. KiCad, QMK, Betaflight, Verilog, SQL, Wireshark. Learning React and AI safety.', 'calendar':'Twelve-month GitHub contribution heatmap, generated from the actual contribution calendar.', 'work':'Vector project cards for Atlas robotics, the QMK macropad, and the Air65 Tinywhoop. Original public repositories: astr-19 and drumbit.', 'snake':'Animated contribution snake generated from ctrl-pt’s actual GitHub contribution calendar.'}

def text(x,y,value,size=24,fill=None,weight=400,family='Segoe UI,Arial,sans-serif',extra=''):
    return f'<text x="{x}" y="{y}" fill="{fill or T["fg"]}" font-family="{family}" font-size="{size}" font-weight="{weight}" {extra}>{escape(str(value))}</text>'
def box(x,y,w,h,fill=None,r=16,stroke=None,sw=1):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill or T["panel"]}"'+(f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '')+'/>'
def line(path,color=None,width=2,fill='none',extra=''):
    return f'<path d="{path}" fill="{fill}" stroke="{color or T["a"]}" stroke-width="{width}" {extra}/>'
def circle(x,y,r,color=None,fill='none',sw=2):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{color or T["a"]}" stroke-width="{sw}"/>'
def svg(content,w=1200,h=440,title='ctrl-pt',desc='',background=True):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title desc"><title id="title">{escape(title)}</title><desc id="desc">{escape(desc)}</desc>{box(0,0,w,h,T["bg"],0) if background else ""}{content}</svg>'
def star(x,y,size=8,color=None):return line(f'M{x-size} {y} H{x+size} M{x} {y-size} V{y+size}',color or T['b'],2)
def chip(x,y,w=124,h=120):
    s=box(x,y,w,h,T['panel'],12,T['a'],3)
    for i in range(5):
        px=x+15+i*(w-30)/4;py=y+15+i*(h-30)/4
        s+=line(f'M{px} {y-13} V{y} M{px} {y+h} V{y+h+13} M{x-13} {py} H{x} M{x+w} {py} H{x+w+13}',T['b'],3)
    s+=box(x+18,y+20,w-36,h-40,T['bg'],7)+text(x+w/2,y+h*.62,'PT',w*.34,T['a'],700,extra='text-anchor="middle"')
    return s
def keys(x,y,cell=32,gap=9):
    s=''
    for r in range(3):
        for c in range(3):s+=box(x+c*(cell+gap),y+r*(cell+gap),cell,cell,T['a'] if (r+c)%2==0 else T['b'],5)
    return s
def pixelbot(x,y,scale=10):
    pixels=['000111111000','001111111100','011001100110','011001100110','011111111110','001111111100','000111111000','001011110100','011011110110','110011110011','000110011000','001110011100']
    return ''.join(box(x+c*scale,y+r*scale,scale,scale,T['b'] if r in (2,3) else T['a'],0) for r,row in enumerate(pixels) for c,p in enumerate(row) if p=='1')
def laptop(x,y,w=260):
    s=box(x,y,w,w*.62,T['panel'],15,T['a'],3)+box(x+14,y+14,w-28,w*.62-28,T['bg'],9)
    s+=line(f'M{x-21} {y+w*.62} H{x+w+21} L{x+w-3} {y+w*.72} H{x+3} Z',T['a'],3,T['panel'])
    s+=text(x+33,y+55,'{ code }',w*.105,T['b'],600,family='Consolas,monospace')
    s+=line(f'M{x+34} {y+80} H{x+w-48} M{x+34} {y+104} H{x+w-88}',T['c'],5)
    return s
def icon(name,x,y,size=72):
    root=ET.parse(ICON_ROOT/(name+'.svg')).getroot()
    ns='{http://www.w3.org/2000/svg}'
    vb=root.attrib.get('viewBox','0 0 256 256')
    # Namespace every imported definition so gradients remain self-contained.
    prefix=name+'-'+str(x)+'-'+str(y)+'-'
    for node in root.iter():
        if 'id' in node.attrib:node.attrib['id']=prefix+node.attrib['id']
        for key,value in list(node.attrib.items()):
            node.attrib[key]=re.sub(r'url\(#([^)]+)\)',lambda m:'url(#'+prefix+m.group(1)+')',value)
            if value.startswith('#') and key.rsplit('}',1)[-1]=='href':node.attrib[key]='#'+prefix+value[1:]
    return f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="{vb}">'+''.join(ET.tostring(child,encoding='unicode') for child in root)+'</svg>'

def hero(t,mobile=False):
    global T
    T=t;a=t['a'];b=t['b'];c=t['c'];s=''
    if mobile:
        s+=text(35,54,'CTRL-PT / UCI CSE ’29',24,a,600,family='Consolas,monospace')
        s+=text(32,139,'Pratinav',77,weight=700)+text(32,220,'A.',77,a,700)
        s+='<g id="role-line">'+text(36,273,'ROBOTICS · CODE · CURIOSITY',25,t['muted'],600)+'</g>'
        s+='<g id="motif">'+chip(374,321,138,86)+keys(49,332,22,7)+'</g>'
        s+='<g id="spark-path">'+line('M160 367 H255 V321 H342',b,3)+circle(255,367,6,b,b)+star(540,302,9,c)+'</g>'
        return svg(s,600,440,'Pratinav A. — '+t['name'],'UCI Computer Science & Engineering, Class of 2029. Robotics, embedded systems, and AI safety.')
    if t['id']=='cosmic':
        for x,y,r in [(185,165,160),(968,218,153),(968,218,108)]:s+=circle(x,y,r,'#343658',sw=1)
        s+=text(49,66,'CTRL-PT  /  UCI CSE ’29',23,b,600,family='Consolas,monospace')
        s+=text(45,181,'Pratinav',96,weight=700)+text(45,280,'A.',96,a,700)
        s+='<g id="role-line">'+text(53,341,'ROBOTICS · EMBEDDED · AI SAFETY',28,t['muted'])+'</g>'
        s+='<g id="motif">'+chip(908,158,118,115)+icon('python',946,35,61)+icon('cpp',798,211,61)+icon('typescript',1068,276,61)+keys(855,327,19,5)+'</g>'
        s+='<g id="spark-path">'+line('M965 112 V143 M904 215 H861 M1034 217 H1098 V270 M966 284 V332',b,4)+star(1140,67,11)+star(779,67,8,c)+star(750,355,9,a)+'</g>'
        s+=text(53,405,'BUILD  /  DEBUG  /  REPEAT',22,b,600,family='Consolas,monospace')
    elif t['id']=='pastel':
        s+=line('M0 385 C290 294 480 448 820 374 S1100 308 1200 348 V440 H0 Z',a,0,t['panel'])
        s+=line('M0 419 C350 339 560 471 904 399 S1120 378 1200 410 V440 H0 Z',a,0,'#d7c5ec')
        s+=text(51,64,'CTRL-PT / HELLO, GITHUB',23,a,600)
        s+=text(49,175,'Pratinav',92,weight=700)+text(49,266,'A.',92,a,700)
        s+='<g id="role-line">'+text(54,324,'CSE @ UCI   ·   CLASS OF 2029',27,t['muted'])+'</g>'
        s+='<g id="motif">'+laptop(815,133,280)+icon('python',786,53,70)+icon('java',1090,215,65)+keys(730,286,23,7)+'</g>'
        s+='<g id="spark-path">'+star(1130,62,13,b)+star(714,183,15,c)+star(1086,354,12,a)+line('M713 255 Q683 237 688 214',c,4)+'</g>'
    elif t['id']=='arcade':
        s+=box(25,25,1150,390,'none',0,a,3)+box(43,44,1114,47,t['panel'],0)
        s+=text(63,76,'PLAYER / CTRL-PT',23,a,700,family='Consolas,monospace')+text(1124,76,'UCI · 2029',23,b,extra='text-anchor="end"',family='Consolas,monospace')
        s+=text(59,204,'PRATINAV',87,weight=800,family='Consolas,monospace')+text(59,292,'A.',87,a,800,family='Consolas,monospace')
        s+='<g id="role-line">'+text(64,367,'CODE + ROBOTS + EMBEDDED SYSTEMS',25,b,600,family='Consolas,monospace')+'</g>'
        s+='<g id="motif">'+pixelbot(919,144,13)+box(888,331,245,35,t['panel'],0,b,2)+text(1010,357,'BUILD MODE',21,a,600,extra='text-anchor="middle"',family='Consolas,monospace')+'</g>'
        s+='<g id="spark-path">'+star(846,147,8,c)+star(1115,279,10,c)+line('M825 194 H867 M815 208 H877',b,4)+'</g>'
    elif t['id']=='circuit':
        for x in [45,83,120,1118,1155]:s+=line(f'M{x} 0 V78 H{x+14} V134',t['panel'],4)
        s+=text(49,72,'CTRL-PT / ELECTRONICS × SOFTWARE',23,b,600,family='Consolas,monospace')
        s+=text(47,184,'Pratinav',96,weight=700)+text(47,284,'A.',96,a,700)
        s+='<g id="role-line">'+text(51,345,'UCI CSE ’29 / BUILDING AT THE BOUNDARY',24,t['muted'])+'</g>'
        s+='<g id="motif">'+chip(861,125,210,190)+keys(726,321,25,7)+icon('arduino',785,51,65)+'</g>'
        s+='<g id="spark-path">'+line('M760 52 V165 H828 M1097 219 H1152 V364 H978 M968 341 V383 H891 M744 284 H789 V206 H828',b,3)+circle(760,52,7,a)+circle(1152,364,7,c)+circle(891,383,6,a)+'</g>'
        s+=text(50,405,'CAN  /  I²C  /  QMK  /  COMPUTER VISION',22,a,600,family='Consolas,monospace')
    elif t['id']=='signal':
        s+=box(25,25,1150,390,'none',4,'#465059',2)
        s+=text(52,67,'CTRL-PT / SIGNAL OBSERVATORY',24,a,600,family='Consolas,monospace')
        s+=text(50,185,'PRATINAV',90,weight=800)+text(50,279,'A.',90,a,800)
        s+='<g id="role-line">'+text(56,347,'CSE @ UCI  /  ROBOTICS + EMBEDDED',25,t['muted'])+'</g>'
        s+='<g id="motif">'+circle(974,224,116,b,sw=15)+circle(974,224,84,a,sw=2)+chip(934,186,80,75)+text(974,392,'ACTIVITY / ACTUAL DATA',19,b,extra='text-anchor="middle"',family='Consolas,monospace')+'</g>'
        wave='M766 224 H820 L839 187 L857 259 L877 224 H903 M1045 224 H1072 L1090 191 L1112 261 L1130 224 H1170'
        s+='<g id="spark-path">'+line(wave,a,4)+'</g>'
    elif t['id']=='sticker':
        s+=text(42,65,'CTRL-PT / CODE, WITH CHARACTER',23,a,700)
        s+=text(40,180,'PRATINAV',98,weight=900)+text(40,281,'A.',98,a,900)
        s+='<g id="role-line">'+text(49,350,'UCI CSE ’29  ·  ROBOTICS + EMBEDDED',26,t['muted'])+'</g>'
        s+='<g id="motif"><g transform="rotate(8 1010 120)">'+box(855,61,274,92,c,0,T['fg'],3)+text(988,121,'{ BUILD }',40,T['fg'],800,extra='text-anchor="middle"')+'</g><g transform="rotate(-8 1013 285)">'+box(910,225,224,138,b,70,T['fg'],3)+text(1022,290,'DEBUG',39,'#fff6e8',800,extra='text-anchor="middle"')+text(1022,328,'REPEAT',30,'#fff6e8',800,extra='text-anchor="middle"')+'</g>'+icon('python',788,200,76)+icon('cpp',857,299,65)+'</g>'
        s+='<g id="spark-path">'+star(1162,190,18,a)+star(797,124,17,b)+line('M723 304 l30 -12 l-6 33',a,5)+'</g>'
    elif t['id']=='terminal':
        s+=box(25,24,1150,392,'none',14,'#42656a',2)+line('M25 79 H1175','#42656a',2)
        for x,col in [(53,c),(80,b),(107,a)]:s+=circle(x,51,7,col,col,0)
        s+=text(600,58,'ctrl-pt@uci: ~ / profile',22,t['muted'],extra='text-anchor="middle"',family='Consolas,monospace')
        s+=text(56,127,'$ whoami',25,a,family='Consolas,monospace')
        s+=text(55,213,'Pratinav A.',65,weight=700,family='Consolas,monospace')
        s+='<g id="role-line">'+text(58,279,'CSE @ UCI / CLASS OF 2029',25,b,family='Consolas,monospace')+text(58,324,'robotics · embedded · AI safety',25,a,family='Consolas,monospace')+'</g>'
        s+='<g id="motif">'+icon('python',911,130,75)+icon('cpp',1010,130,75)+icon('typescript',911,230,75)+icon('arduino',1010,230,75)+'</g>'
        s+='<g id="spark-path">'+text(59,381,'understand → build → test → iterate',23,t['muted'],family='Consolas,monospace')+'</g>'
    elif t['id']=='mono':
        s+=line('M41 77 H1159 M846 25 V415',T['fg'],2)+text(42,59,'CTRL-PT / PROFILE 2026',23,T['fg'],600,family='Consolas,monospace')
        s+=text(35,183,'Pratinav',100,weight=700)+text(35,287,'A..',100,a,700)
        s+='<g id="role-line">'+text(44,355,'UCI CSE ’29 / ROBOTICS + EMBEDDED',26,T['fg'])+'</g>'
        s+='<g id="motif">'+circle(1001,227,132,a,sw=2)+circle(1001,227,91,b,sw=16)+box(963,189,76,76,a,0)+text(1001,242,'PT',28,T['bg'],700,extra='text-anchor="middle"')+'</g>'
        s+='<g id="spark-path">'+line('M855 227 H1147 M1001 80 V374',a,2)+circle(1001,96,9,a,a,0)+circle(1133,227,9,a,a,0)+'</g>'
    return svg(s,title='Pratinav A. — '+t['name'],desc='ctrl-pt. Computer Science & Engineering at UC Irvine, Class of 2029. Robotics, embedded systems, and AI safety.')

def heading(label,x=42,y=52):return text(x,y,label.upper(),23,T['a'],600,family='Consolas,monospace')

def stack_art(t,mobile=False):
    global T
    T=t;s=heading('Toolbox');cols=5 if mobile else 10;sz=75 if mobile else 72;gap=32 if mobile else 39
    for i,name in enumerate(ICON_NAMES):
        x=38+(i%cols)*(sz+gap);y=86+(i//cols)*119
        s+=icon(name,x,y,sz)+text(x+sz/2,y+sz+25,LABELS[name],20,T['muted'],extra='text-anchor="middle"')
    y=367 if mobile else 225
    tags=['KiCad','QMK','Betaflight','Verilog','SQL','Wireshark']
    for i,label in enumerate(tags):
        x=38+(i%3)*179 if mobile else 39+i*187;by=y+(i//3)*61 if mobile else y
        s+=box(x,by,161,42,T['panel'],21,T['a'],1)+text(x+80,by+28,label,23,T['fg'],600,extra='text-anchor="middle"')
    ly=525 if mobile else 318
    s+=text(40,ly,'LEARNING',21,T['muted'],600,family='Consolas,monospace')+icon('react',175,ly-35,45)+text(238,ly,'React · AI safety',25,T['fg'])
    return svg(s,600 if mobile else 1200,560 if mobile else 365,'Toolbox',ART_ALT['stack'])

def stats_art(t,mobile=False):
    global T
    T=t;s=heading('GitHub / last 12 months');w=600 if mobile else 1200
    vals=[(STATS['total'],'Contributions'),(STATS['active_days'],'Active days'),(STATS['longest_streak'],'Best streak · days'),(STATS['public_repos'],'Public repos')]
    for i,(val,label) in enumerate(vals):
        x=35+(i%2)*274 if mobile else 36+i*288; y=82+(i//2)*134 if mobile else 84
        s+=box(x,y,250 if mobile else 266,112,T['panel'],12)+text(x+20,y+59,val,49,T['a'],700)+text(x+20,y+90,label,22,T['muted'])
    cy=440 if mobile else 278
    s+=heading('weekly activity',38,cy)
    chart_y=cy+26;chart_h=157;chart_w=525 if mobile else 720
    bars=STATS['weekly'];peak=max(bars) or 1
    pts=[]
    for i,count in enumerate(bars):
        x=40+i*chart_w/(len(bars)-1);yy=chart_y+chart_h-count/peak*chart_h
        pts.append((x,yy))
        s+=box(x-5,chart_y+chart_h-count/peak*chart_h,10,max(2,count/peak*chart_h),T['b'],2)
    s+=line('M'+' L'.join(f'{x:.1f} {y:.1f}' for x,y in pts),T['a'],3)
    for y in [chart_y,chart_y+78,chart_y+157]:s+=line(f'M35 {y} H{35+chart_w}',T['muted'],.5,extra='opacity=".35"')
    s+=text(39,chart_y+190,str(len(bars))+' weeks',21,T['muted'])+text(39+chart_w,chart_y+190,'max '+str(peak)+' / week',21,T['muted'],extra='text-anchor="end"')
    cx=194 if mobile else 958;dy=840 if mobile else 378;r=93 if mobile else 79
    if mobile:s+=heading('Weekday mix',38,705)
    else:s+=heading('Weekday mix',856,271)
    colors=[T['a'],T['b'],T['c'],blend(T['a'],T['b'],.5),blend(T['a'],T['c'],.5),blend(T['b'],T['c'],.6),T['muted']]
    running=0
    for i,count in enumerate(STATS['weekday']):
        fraction=count/max(STATS['total'],1);start=running*360-90;end=(running+fraction)*360-90;running+=fraction
        x1=cx+r*math.cos(math.radians(start));y1=dy+r*math.sin(math.radians(start));x2=cx+r*math.cos(math.radians(end));y2=dy+r*math.sin(math.radians(end))
        if count:s+=line(f'M{x1:.2f} {y1:.2f} A{r} {r} 0 {int(fraction>.5)} 1 {x2:.2f} {y2:.2f}',colors[i],24)
    s+=text(cx,dy+9,'7 DAYS',26,T['fg'],700,extra='text-anchor="middle"')
    lx=335 if mobile else 1080
    for i,(name,count) in enumerate(zip(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],STATS['weekday'])):
        yy=dy-87+i*28;s+=circle(lx,yy-7,4,colors[i],colors[i],0)+text(lx+12,yy,name,19,T['muted'])+text(lx+97,yy,count,19,T['fg'],600,extra='text-anchor="end"')
    fy=1030 if mobile else 552
    s+=line(f'M35 {fy-25} H{w-35}',T['muted'],1,extra='opacity=".4"')+text(38,fy,'Followers '+str(STATS['followers'])+'  ·  Original public repos '+str(STATS['originals']),21,T['muted'])
    return svg(s,w,1070 if mobile else 590,'Actual GitHub activity',ART_ALT['stats'])

def blend(a,b,t):
    ax=[int(a[i:i+2],16) for i in [1,3,5]];bx=[int(b[i:i+2],16) for i in [1,3,5]]
    return '#'+''.join(f'{round(x+(y-x)*t):02x}' for x,y in zip(ax,bx))
def heat_color(value,level=None):
    levels={'NONE':0,'FIRST_QUARTILE':1,'SECOND_QUARTILE':2,'THIRD_QUARTILE':3,'FOURTH_QUARTILE':4}
    if isinstance(level,str):level=levels.get(level)
    if level is not None:return T['panel'] if level==0 else blend(T['panel'],T['a'],.25*level)
    return T['panel'] if value==0 else blend(T['panel'],T['a'],.23+.77*value/max(STATS['peak_day'],1))

def calendar_art(t,mobile=False):
    global T
    T=t;s=heading('Contribution field');weeks=DATA['weeks'];w=600 if mobile else 1200
    if mobile:
        # Two halves preserve all daily data without microscopic cells.
        parts=[weeks[:27],weeks[27:]];positions=[100,340];cell=18;dot=14
    else:parts=[weeks];positions=[98];cell=20.7;dot=16
    for part,y in zip(parts,positions):
        for ix,week in enumerate(part):
            for day in week:
                s+='<g><title>'+escape(day['date']+': '+str(day['contributionCount'])+' contributions')+'</title>'+box(40+ix*cell,y+day['weekday']*cell,dot,dot,heat_color(day['contributionCount'],day.get('contributionLevel')),3)+'</g>'
        s+=text(40,y-15,part[0][0]['date'][:7],20,T['muted'])+text(40+len(part)*cell,y-15,part[-1][-1]['date'][:7],20,T['muted'],extra='text-anchor="end"')
    y=555 if mobile else 285
    s+=text(41,y,str(STATS['total'])+' contributions',29,T['a'],700)
    for i in range(5):s+=box(w-188+i*26,y-21,18,18,heat_color(i,i),3)
    s+=text(w-207,y+25,'less ← activity → more',19,T['muted'])
    return svg(s,w,610 if mobile else 345,'Contribution heatmap',ART_ALT['calendar'])

def project_illustration(key,x,y,width):
    """Inline the photo-referenced specimen; no linked images are needed on GitHub."""
    root=ET.parse(BASE/'illustrations'/(key+'.svg')).getroot()
    prefix=f'project-{key}-'
    # Isolate gradient, component, and accessibility IDs from the containing board.
    for node in root.iter():
        if 'id' in node.attrib:node.attrib['id']=prefix+node.attrib['id']
        for attr,value in list(node.attrib.items()):
            if attr.rsplit('}',1)[-1]=='href' and value.startswith('#'):
                node.attrib[attr]='#'+prefix+value[1:]
            elif attr in ['aria-labelledby','aria-describedby']:
                node.attrib[attr]=' '.join(prefix+part for part in value.split())
            else:
                node.attrib[attr]=re.sub(r'url\(#([^)]+)\)',lambda m:'url(#'+prefix+m.group(1)+')',value)
    root.attrib.update(x=str(x),y=str(y),width=str(width),height=str(width*2/3))
    return ET.tostring(root,encoding='unicode')
def work_art(t,mobile=False):
    global T
    T=t;s=heading('Build / code');w=600 if mobile else 1200
    projects=[('atlas','ATLAS','FRC 2854'),('macropad','MACROPAD','KiCad + QMK'),('air65','AIR65','Betaflight')]
    for i,(key,title,sub) in enumerate(projects):
        x=35 if mobile else 35+i*386;y=83+i*369 if mobile else 84;cw=530 if mobile else 358
        s+=box(x,y,cw,345 if mobile else 318,T['panel'],16)
        iw=400 if mobile else 338
        s+=project_illustration(key,x+(cw-iw)/2,y+8 if mobile else y+14,iw)
        tx=x+cw/2;ty=y+302 if mobile else y+266
        s+=text(tx,ty,title,32 if mobile else 29,T['fg'],700,extra='text-anchor="middle"')
        s+=text(tx,ty+30,sub,25 if mobile else 21,T['muted'],extra='text-anchor="middle"')
    by=1240 if mobile else 475
    s+=heading('Public originals',38,by-20)
    for i,r in enumerate([r for r in DATA['repos'] if r['name'] in ['astr-19','drumbit']]):
        x=35 if mobile else 35+i*579;y=by+(i*151 if mobile else 0);cw=530 if mobile else 549
        s+=box(x,y,cw,130,T['panel'],12)+text(x+24,y+46,r['name'],32,T['a'],700,family='Consolas,monospace')
        label='Python · astronomy coursework' if r['name']=='astr-19' else 'Beat experiments'
        s+=text(x+24,y+84,label,23,T['muted'])+text(x+cw-28,y+48,'↗',30,T['b'],600,extra='text-anchor="end"')
    desc=('Portfolio-based illustrations: Atlas with blue 2854 bumper and roller intake; '
          'the 3×3 macropad with red switch stems and left-side Pro Micro; '
          'the Air65 with blue ducts, three-blade propellers, and FPV camera. '
          'Original public repositories: astr-19 and drumbit.')
    return svg(s,w,1556 if mobile else 639,'Builds and original public code',desc)

def links_art(t):
    global T
    T=t;s=''
    for i,(label,glyph) in enumerate([('GITHUB','⌘'),('PORTFOLIO','↗'),('EMAIL','@')]):
        x=20+i*210;s+=box(x,12,190,60,T['panel'],30,T['a'],1)+text(x+22,52,glyph,28,T['a'],700)+text(x+66,50,label,23,T['fg'],600)
    return svg(s,650,85,'Connect with ctrl-pt','GitHub, engineering portfolio, and email links.')

def snapshot(data):
    days=[d for week in data['weeks'] for d in week];streak=longest=0
    for d in days:
        streak=streak+1 if d['contributionCount'] else 0;longest=max(longest,streak)
    total=sum(d['contributionCount'] for d in days)
    if total!=data.get('totalContributions',total):raise ValueError('GitHub calendar total mismatch')
    return dict(total=total,active_days=sum(d['contributionCount']>0 for d in days),longest_streak=longest,peak_day=max(d['contributionCount'] for d in days),public_repos=data['account']['public_repos'],followers=data['account']['followers'],originals=data.get('originalRepoCount',len(data['repos'])),weekly=[sum(d['contributionCount'] for d in w) for w in data['weeks']],weekday=[sum(d['contributionCount'] for d in days if d['weekday']==i) for i in range(7)])

def sample_md(t):
    prefix='../assets/'+t['id']+'-'
    lines=[f'<picture>\n  <source media="(prefers-reduced-motion: reduce)" srcset="{prefix}hero.svg">\n  <source media="(max-width: 600px)" srcset="{prefix}hero-mobile.gif">\n  <img src="{prefix}hero.gif" width="100%" alt="Pratinav A. — UCI Computer Science & Engineering, Class of 2029; robotics, embedded systems, AI safety">\n</picture>','',
           '<p align="center"><b>UCI CSE ’29</b> · Robotics · Embedded systems · AI safety</p>','',
           '<p align="center"><a href="https://github.com/ctrl-pt?tab=repositories">Code ↗</a> · <a href="https://pratinaa.github.io/">Portfolio ↗</a> · <a href="mailto:agrawalptnv@gmail.com">Email ↗</a></p>','']
    for kind in t['order']:
        if kind=='snake':
            lines += [f'<picture>\n  <source media="(prefers-reduced-motion: reduce)" srcset="{prefix}snake-static.svg">\n  <img src="{prefix}snake.gif" width="100%" alt="{ART_ALT[kind]}">\n</picture>','']
        else:lines += [f'<picture>\n  <source media="(max-width: 600px)" srcset="{prefix}{kind}-mobile.svg">\n  <img src="{prefix}{kind}.svg" width="100%" alt="{ART_ALT[kind]}">\n</picture>','']
        if kind=='work':lines+=['<p align="center"><a href="https://github.com/ctrl-pt/astr-19">astr-19 ↗</a> · <a href="https://github.com/ctrl-pt/drumbit">drumbit ↗</a></p>','']
    return '\n'.join(lines)

def main():
    global DATA,STATS,T,ICON_ROOT
    parser=argparse.ArgumentParser();parser.add_argument('--data',type=Path,default=BASE/'source-data.json');parser.add_argument('--assets',type=Path,default=BASE/'dist/assets');parser.add_argument('--theme');parser.add_argument('--assets-only',action='store_true');args=parser.parse_args()
    DATA=json.loads(args.data.read_text(encoding='utf-8'));STATS=snapshot(DATA)
    out=args.assets;out.mkdir(parents=True,exist_ok=True);ICON_ROOT=out/'icons'
    chosen=[t for t in THEMES if not args.theme or t['id']==args.theme]
    if not chosen:raise ValueError('Unknown theme')
    for t in chosen:
        for mobile in [False,True]:
            suffix='-mobile' if mobile else ''
            for kind,fn in [('hero',hero),('stack',stack_art),('stats',stats_art),('calendar',calendar_art),('work',work_art)]:
                (out/(t['id']+'-'+kind+suffix+'.svg')).write_text(fn(t,mobile),encoding='utf-8')
            spec={'width':600 if mobile else 1200,'fps':30,'duration':5.2,'colors':192,'dither':'none','clip_to_base_alpha':True,'max_size_mb':2,'reveals':[{'id':'role-line','axis':'x','start':.25,'end':1.35,'exit':{'start':4.55,'end':5.05}},{'id':'spark-path','axis':'x','start':.75,'end':1.7,'exit':{'start':4.55,'end':5.05}}], 'layers':[{'id':'motif','enter':{'start':.45,'end':1.45,'from':[15,-7]},'exit':{'start':4.55,'end':5.05,'to':[5,0]}}]}
            (out/(t['id']+'-hero'+suffix+'-motion.json')).write_text(json.dumps(spec,indent=2),encoding='utf-8')
        (out/(t['id']+'-links.svg')).write_text(links_art(t),encoding='utf-8')
        # Compact full-direction specimen, with original vector panels rather than photos.
        T=t
        h=ET.fromstring(hero(t));inner=''.join(ET.tostring(child,encoding='unicode') for child in h if child.tag.rsplit('}',1)[-1] not in ['title','desc'])
        thumb='<g transform="scale(1 .78)">'+inner+'</g>'
        for i,(val,label) in enumerate([(STATS['total'],'contributions'),(STATS['active_days'],'active days'),(STATS['longest_streak'],'best streak')]):
            x=30+i*390;thumb+=box(x,367,363,109,T['panel'],10)+text(x+22,421,val,48,T['a'],700)+text(x+22,458,label,24,T['muted'])
        for i,name in enumerate(ICON_NAMES):thumb+=icon(name,40+i*112,504,69)
        (out/(t['id']+'-specimen.svg')).write_text(svg(thumb,1200,605,t['name'],t['feel']),encoding='utf-8')
    if not args.assets_only:
        dist=BASE/'dist';(dist/'samples').mkdir(parents=True,exist_ok=True)
        refs=json.loads((ROOT/'research/visual-v2/references.json').read_text(encoding='utf-8'))
        for t in THEMES:
            t['markdown']='samples/'+t['n']+'-'+t['id']+'.md';(dist/t['markdown']).write_text(sample_md(t),encoding='utf-8')
        app_data={'themes':THEMES,'stats':STATS,'snapshot':DATA['snapshot'],'references':refs,'alt':ART_ALT}
        (dist/'data.js').write_text('window.PROFILE_LAB = '+json.dumps(app_data,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
        (BASE/'themes.json').write_text(json.dumps(THEMES,indent=2),encoding='utf-8')
    print(json.dumps({'themes':len(chosen),'stats':STATS,'assets':str(out)},ensure_ascii=True))

if __name__=='__main__':main()

