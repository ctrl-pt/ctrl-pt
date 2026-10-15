'use strict';
(() => {
  const $ = (selector) => document.querySelector(selector);
  const palette = {bg:'#071f2a',panel:'#113440',fg:'#def8f5',muted:'#94bdc3',primary:'#4de3ca',secondary:'#73b5ff',accent:'#fbc975'};
  const REFRESH_MS = 180000;
  let data = normalizeProfile(window.PROFILE_FALLBACK);
  let syncState = 'pending', syncInFlight = false;
  function normalizeProfile(raw) {
    if (!raw || raw.account?.login !== 'ctrl-pt' || !Array.isArray(raw.weeks) || !raw.weeks.length) throw new Error('Invalid profile data');
    const integer = value => Number.isSafeInteger(value) && value >= 0;
    if (!integer(raw.account.followers) || !integer(raw.account.public_repos)) throw new Error('Invalid account counts');
    const seen = new Set();
    const weeks = raw.weeks.map(week => {
      if (!Array.isArray(week) || !week.length || week.length > 7) throw new Error('Invalid calendar week');
      return week.map(day => {
        const count = day.contributionCount ?? day.count;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isFinite(Date.parse(day.date+'T00:00:00Z')) || !integer(count) || !Number.isInteger(day.weekday) || day.weekday < 0 || day.weekday > 6 || seen.has(day.date)) throw new Error('Invalid contribution day');
        seen.add(day.date);
        return {date:day.date,weekday:day.weekday,count};
      });
    });
    const days = weeks.flat().sort((a,b) => a.date.localeCompare(b.date));
    let total = 0, activeDays = 0, longestStreak = 0, streak = 0, peakDay = 0, previousDate = null;
    days.forEach(day => {
      if (previousDate && Date.parse(day.date)-Date.parse(previousDate) !== 86400000) streak = 0;
      total += day.count; peakDay = Math.max(peakDay,day.count);
      if (day.count > 0) { activeDays++; longestStreak = Math.max(longestStreak,++streak); } else streak = 0;
      previousDate = day.date;
    });
    if (raw.totalContributions !== undefined && raw.totalContributions !== total) throw new Error('Inconsistent contribution total');
    const originalRepos = raw.originalRepoCount ?? raw.repos?.filter(repo => !repo.isFork && !repo.fork).length;
    if (!integer(originalRepos)) throw new Error('Invalid repository count');
    const fetchedAt = raw.fetchedAt && Number.isFinite(Date.parse(raw.fetchedAt)) ? new Date(raw.fetchedAt).toISOString() : null;
    return {total,activeDays,longestStreak,peakDay:Math.max(1,peakDay),weeks,followers:raw.account.followers,publicRepos:raw.account.public_repos,originalRepos,start:days[0].date,end:days.at(-1).date,snapshot:raw.snapshot || days.at(-1).date,fetchedAt,freshness:raw.freshness || 'fallback'};
  }
  function syncLabel() {
    if (syncState === 'pending') return 'Cached snapshot '+data.snapshot+' · Sync pending';
    if (syncState === 'error') return (data.fetchedAt ? 'Last synced '+data.fetchedAt : 'Cached snapshot '+data.snapshot)+' · Sync unavailable';
    if (data.freshness === 'stale' || data.freshness === 'fallback') return (data.fetchedAt ? 'Cached data '+data.fetchedAt : 'Cached snapshot '+data.snapshot)+' · GitHub refresh pending';
    return (data.fetchedAt ? 'Updated '+data.fetchedAt : 'GitHub snapshot '+data.snapshot)+' · Scheduled GitHub snapshot';
  }
  const svgNS = 'http://www.w3.org/2000/svg';
  const robot = ['000111111000','001111111100','011001100110','011001100110','011111111110','001111111100','000111111000','001011110100','011011110110','110011110011','000110011000','001110011100'];
  robot.forEach((row,y) => [...row].forEach((pixel,x) => { if (pixel !== '1') return; const rect = document.createElementNS(svgNS,'rect'); for (const [attr,value] of Object.entries({x:30+x*10,y:45+y*10,width:10,height:10,fill:(y===2||y===3)?palette.secondary:palette.primary})) rect.setAttribute(attr,value); $('#mascot-pixels').append(rect); }));

  const output = $('#terminal-output');
  const input = $('#command-input');
  const history = []; let historyIndex = 0;
  function line(text,className='') { const node=document.createElement('div'); if(className) node.className=className; node.textContent=text; return node; }
  function renderStats(result) {
    result.replaceChildren();
    const grid=document.createElement('div');grid.className='stats-inline';
    [[data.total,'Contributions'],[data.activeDays,'Active days'],[data.longestStreak,'Best streak · days'],[data.publicRepos,'Public repos']].forEach(([value,label])=>{const card=document.createElement('div');card.className='stat';const strong=document.createElement('strong');strong.textContent=value;const caption=document.createElement('span');caption.textContent=label;card.append(strong,caption);grid.append(card);});
    result.append(grid,line('Followers '+data.followers+' · Original public repos '+data.originalRepos),line('GitHub / last 12 months · '+data.start+' → '+data.end),line(syncLabel()));
  }
  function runCommand(raw) {
    const command=raw.trim(); if(!command) return;
    history.push(command);historyIndex=history.length;
    const parts=command.toLowerCase().split(/\s+/); const cmd=parts[0];
    if(cmd==='clear'){output.replaceChildren();input.value='';return;}
    const entry=document.createElement('div');entry.className='output-entry';
    entry.append(line('$ '+command,'output-command'));
    const result=document.createElement('div');result.className='output-result';
    const text=(value)=>result.append(line(value));
    if(cmd==='help') text('whoami   identity\nskills   toolbox\nstats    GitHub activity\nprojects portfolio\nsnake    play\nclear    reset terminal\n↑ / ↓    command history');
    else if(cmd==='whoami') text('Pratinav A.\nCSE @ UCI / CLASS OF 2029\nrobotics · embedded · AI safety\nunderstand → build → test → iterate');
    else if(cmd==='skills') text('Python · C++ · Java · JavaScript · TypeScript\nHTML · CSS · PHP · GitHub · Arduino\nKiCad · QMK · Betaflight · Verilog · SQL · Wireshark\nLEARNING  React · AI safety');
    else if(cmd==='stats') {
      result.classList.add('live-stats');renderStats(result);
    }
    else if(cmd==='projects') { const links=document.createElement('div');links.className='project-links';[['ATLAS','FRC 2854'],['MACROPAD','KiCad + QMK'],['AIR65','Betaflight']].forEach(([name,subtitle])=>{const link=document.createElement('a');link.href='https://pratinaa.github.io/';link.textContent=name+' / '+subtitle+' ↗';links.append(link);});result.append(links); }
    else if(cmd==='snake') {text('Launching contribution snake…');location.hash='snake';}
    else if(cmd==='theme'||cmd==='theme?') text('Circuit Atlas\n#071f2a  #113440  #4de3ca  #73b5ff  #fbc975');
    else text('Command not found: '+command+'\nType help for commands.');
    entry.append(result);output.append(entry);while(output.children.length>35) output.firstElementChild.remove();output.scrollTop=output.scrollHeight;input.value='';
  }
  $('#command-form').addEventListener('submit',e=>{e.preventDefault();runCommand(input.value);});
  document.querySelectorAll('[data-command]').forEach(button=>button.addEventListener('click',()=>{runCommand(button.dataset.command);if(button.dataset.command!=='snake')input.focus({preventScroll:true});}));
  input.addEventListener('keydown',e=>{if(e.key==='ArrowUp'){e.preventDefault();historyIndex=Math.max(0,historyIndex-1);input.value=history[historyIndex]||'';}else if(e.key==='ArrowDown'){e.preventDefault();historyIndex=Math.min(history.length,historyIndex+1);input.value=history[historyIndex]||'';}else if(e.key==='Escape'){input.value='';}});

  const calendar=$('#calendar');
  function renderCalendar() {
    calendar.replaceChildren();calendar.setAttribute('viewBox','0 0 '+(data.weeks.length*10)+' 70');
    data.weeks.forEach((week,x)=>week.forEach(day=>{const rect=document.createElementNS(svgNS,'rect');rect.setAttribute('x',x*10);rect.setAttribute('y',day.weekday*10);rect.setAttribute('width','7');rect.setAttribute('height','7');rect.setAttribute('rx','1');rect.setAttribute('fill',day.count>0?palette.primary:palette.panel);rect.setAttribute('opacity',day.count>0?(.25+.75*day.count/data.peakDay).toFixed(2):'1');const title=document.createElementNS(svgNS,'title');title.textContent=day.date+': '+day.count+' contributions';rect.append(title);calendar.append(rect);}));
    $('#calendar-snapshot').textContent=data.snapshot;
    $('#calendar-caption').replaceChildren(document.createTextNode(data.total+' contributions · '+data.start+' → '+data.end),document.createElement('br'),document.createTextNode(syncLabel()));
    calendar.setAttribute('aria-label','GitHub contribution calendar: '+data.total+' contributions from '+data.start+' to '+data.end+'. '+syncLabel()+'.');
  }

  const board=$('#game-board');const ctx=board.getContext('2d');
  const COLS=30,ROWS=18,CELL=32;
  const vectors={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
  const keyDirections={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
  let state='ready',snake=[],direction=vectors.right,pendingDirection=null,food=null,score=0,best=0,timer=null;
  try{const stored=Number(localStorage.getItem('ctrl-pt-snake-best-v1'));best=Number.isSafeInteger(stored)&&stored>=0?stored:0;}catch{}
  $('#best-score').textContent=String(best).padStart(3,'0');
  let recent=[],foodHints=[];
  function updateField() {
    recent=data.weeks.slice(-26);foodHints=[];
    recent.forEach((week,x)=>week.forEach(day=>{if(day.count>0)foodHints.push({x:x+2,y:day.weekday+5});}));
    renderCalendar();document.querySelectorAll('.live-stats').forEach(renderStats);render();
  }
  async function refreshProfile() {
    if (syncInFlight || document.hidden) return;
    syncInFlight=true;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
    try {
      const response=await fetch('./api/github.json',{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
      if(!response.ok) throw new Error('GitHub data unavailable');
      const fresh=normalizeProfile(await response.json());
      data=fresh;syncState='synced';
    } catch {
      syncState='error';
    } finally {
      clearTimeout(timeout);syncInFlight=false;updateField();
    }
  }
  function same(a,b){return a.x===b.x&&a.y===b.y;}
  function placeFood(){
    const open=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(!snake.some(s=>s.x===x&&s.y===y))open.push({x,y});
    if(!open.length){finish(true);return;}
    const availableHints=foodHints.filter(h=>!snake.some(s=>same(s,h)));
    const pool=availableHints.length&&Math.random()<.6?availableHints:open;
    food=pool[Math.floor(Math.random()*pool.length)];
  }
  function reset(){clearInterval(timer);timer=null;score=0;snake=[{x:8,y:9},{x:7,y:9},{x:6,y:9},{x:5,y:9}];direction=vectors.right;pendingDirection=null;state='ready';placeFood();$('#score').textContent='000';render();syncUI();}
  function syncUI(){
    $('#game-state').textContent=({ready:'Ready',running:'Running',paused:'Paused',over:'Game over',won:'Complete'})[state];
    $('#pause-game').disabled=!['running','paused'].includes(state);$('#pause-game').innerHTML=state==='paused'?'<span aria-hidden="true">▷</span> Resume':'<span aria-hidden="true">Ⅱ</span> Pause';
    $('#start-game').disabled=state==='running';$('#start-game').innerHTML=state==='paused'?'<span aria-hidden="true">▷</span> Resume':'<span aria-hidden="true">▷</span> Start';
    $('#game-overlay').hidden=state==='running';
    const labels={ready:['READY TO BUILD A STREAK?','Follow the signal.','Start · move · collect'],paused:['SIGNAL ON HOLD','Paused.','Resume when you’re ready'],over:['CONNECTION LOST','Try another route.','Score '+score+' · Restart to play again'],won:['FIELD COMPLETE','Every signal collected.','Score '+score+' · Restart to play again']};
    if(labels[state]){const [a,b,c]=labels[state];$('#overlay-kicker').textContent=a;$('#overlay-title').textContent=b;$('#overlay-detail').textContent=c;}
  }
  function interval(){return Math.max(85,160-score*3);}
  function start(){if(state==='over'||state==='won')reset();if(state==='running')return;state='running';clearInterval(timer);timer=setInterval(step,interval());syncUI();board.focus({preventScroll:true});}
  function pause(){if(state!=='running')return;state='paused';clearInterval(timer);timer=null;syncUI();}
  function finish(won=false){state=won?'won':'over';clearInterval(timer);timer=null;syncUI();render();}
  function queueDirection(name){const next=vectors[name];if(!next||state!=='running'||pendingDirection)return;if(next.x===-direction.x&&next.y===-direction.y)return;pendingDirection=next;}
  function step(){
    if(state!=='running')return;if(pendingDirection){direction=pendingDirection;pendingDirection=null;}
    const head={x:snake[0].x+direction.x,y:snake[0].y+direction.y};
    const grows=food&&same(head,food);const body=grows?snake:snake.slice(0,-1);
    if(head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS||body.some(s=>same(s,head))){finish();return;}
    snake.unshift(head);if(grows){score++;$('#score').textContent=String(score).padStart(3,'0');if(score>best){best=score;$('#best-score').textContent=String(best).padStart(3,'0');try{localStorage.setItem('ctrl-pt-snake-best-v1',String(best));}catch{}}placeFood();if(state==='running'){clearInterval(timer);timer=setInterval(step,interval());}}else snake.pop();render();
  }
  function rounded(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
  function render(){
    ctx.fillStyle=palette.bg;ctx.fillRect(0,0,board.width,board.height);
    ctx.strokeStyle='#11344088';ctx.lineWidth=.6;
    for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(x*CELL,0);ctx.lineTo(x*CELL,board.height);ctx.stroke();}for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*CELL);ctx.lineTo(board.width,y*CELL);ctx.stroke();}
    recent.forEach((week,x)=>week.forEach(day=>{ctx.fillStyle=day.count>0?palette.primary:palette.panel;ctx.globalAlpha=day.count>0?.04+.18*day.count/data.peakDay:.35;rounded((x+2)*CELL+6,(day.weekday+5)*CELL+6,CELL-12,CELL-12,4);}));ctx.globalAlpha=1;
    if(food){const x=food.x*CELL,y=food.y*CELL;ctx.fillStyle='#fbc97520';rounded(x+2,y+2,CELL-4,CELL-4,6);ctx.fillStyle=palette.accent;rounded(x+9,y+9,CELL-18,CELL-18,3);ctx.strokeStyle=palette.accent;ctx.lineWidth=1;ctx.strokeRect(x+5.5,y+5.5,CELL-11,CELL-11);}
    snake.forEach((segment,i)=>{ctx.fillStyle=i===0?palette.primary:palette.secondary;ctx.globalAlpha=i===0?1:Math.max(.4,.9-i*.025);rounded(segment.x*CELL+3,segment.y*CELL+3,CELL-6,CELL-6,5);});ctx.globalAlpha=1;
    const h=snake[0];if(h){ctx.fillStyle=palette.bg;const center={x:h.x*CELL+CELL/2,y:h.y*CELL+CELL/2};const perp={x:-direction.y,y:direction.x};[-1,1].forEach(n=>{rounded(center.x+direction.x*6+perp.x*n*5-2,center.y+direction.y*6+perp.y*n*5-2,4,4,1);});}
  }
  let pausePointerState=null;
  $('#pause-game').addEventListener('pointerdown',()=>{pausePointerState=state;});
  $('#start-game').addEventListener('click',start);$('#pause-game').addEventListener('click',()=>{const desiredState=pausePointerState;pausePointerState=null;if(desiredState==='running')pause();else if(state==='paused')start();else pause();});$('#restart-game').addEventListener('click',()=>{reset();start();});
  board.addEventListener('keydown',e=>{const name=keyDirections[e.key]||keyDirections[e.key.toLowerCase()];if(name){e.preventDefault();queueDirection(name);}else if(e.code==='Space'){e.preventDefault();state==='running'?pause():start();}else if(e.key==='Enter'){e.preventDefault();if(state==='running')return;if(state==='over'||state==='won')reset();start();}});
  board.addEventListener('blur',()=>pause());
  document.querySelectorAll('[data-direction]').forEach(button=>button.addEventListener('pointerdown',e=>{e.preventDefault();board.focus({preventScroll:true});queueDirection(button.dataset.direction);}));
  document.querySelectorAll('[data-direction]').forEach(button=>button.addEventListener('click',e=>{if(e.detail===0){board.focus({preventScroll:true});queueDirection(button.dataset.direction);}}));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else refreshProfile();});window.addEventListener('blur',pause);
  let swipeStart=null;board.addEventListener('pointerdown',e=>{board.focus({preventScroll:true});swipeStart={x:e.clientX,y:e.clientY};});board.addEventListener('pointerup',e=>{if(!swipeStart)return;const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;swipeStart=null;if(Math.max(Math.abs(dx),Math.abs(dy))<15)return;queueDirection(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');});board.addEventListener('pointercancel',()=>{swipeStart=null;});
  function route(){const mode=location.hash==='#snake'?'snake':'terminal';$('#terminal-view').hidden=mode!=='terminal';$('#snake-view').hidden=mode!=='snake';document.querySelectorAll('[data-mode]').forEach(a=>{if(a.dataset.mode===mode)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});if(mode!=='snake')pause();document.title='ctrl-pt / '+mode;}
  window.addEventListener('hashchange',route);updateField();reset();route();refreshProfile();setInterval(refreshProfile,REFRESH_MS);
})();
