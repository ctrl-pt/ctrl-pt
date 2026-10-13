"""Refresh only live image query revisions so GitHub can retire stale proxy images."""
from pathlib import Path
import datetime as dt
import json
import re

ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'data/github.json').read_text())
revision=str(int(dt.datetime.fromisoformat(data['fetchedAt'].replace('Z','+00:00')).timestamp()))
path=ROOT/'README.md'
pattern=re.compile(r'(https://ctrl-pt-interactive-profile\.silkypeach6\.chatgpt\.site/api/(?:stats(?:-mobile)?|calendar(?:-mobile)?|snake(?:-static)?)\.svg)(?:\?v=[^"\s]*)?')
text=path.read_text(encoding='utf-8')
updated,count=pattern.subn(lambda match:match[1]+'?v='+revision,text)
if count!=6:raise ValueError('Expected exactly six live image references; README was preserved')
path.write_text(updated,encoding='utf-8')
print('Updated live image revisions without changing profile text or item order.')
