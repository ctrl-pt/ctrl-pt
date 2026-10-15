// Circuit Atlas SVGs. The caller supplies one shared, current GitHub snapshot.
// Pure string rendering keeps the image endpoints portable and dependency-free.
import {planContributionSnake,contributionCellAnimation,contributionSnakeBody} from './snake-path.mjs';
const SR_PALETTE = Object.freeze({bg:'#071f2a',panel:'#113440',fg:'#def8f5',muted:'#94bdc3',a:'#4de3ca',b:'#73b5ff',c:'#fbc975'});
const SR_LEVEL_COLORS = ['#113440','#206058','#2f8b77','#3db796','#4de3ca'];
const srEscape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const srNumber = value => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
const srRound = value => Math.round(value * 100) / 100;
const srText = (x,y,value,size=24,fill=SR_PALETTE.fg,weight=400,extra='') => `<text x="${srRound(x)}" y="${srRound(y)}" fill="${fill}" font-family="Segoe UI,Arial,sans-serif" font-size="${size}" font-weight="${weight}" ${extra}>${srEscape(value)}</text>`;
const srBox = (x,y,w,h,fill=SR_PALETTE.panel,r=16,extra='') => `<rect x="${srRound(x)}" y="${srRound(y)}" width="${srRound(w)}" height="${srRound(h)}" rx="${r}" fill="${fill}" ${extra}/>`;
const srPath = (d,color=SR_PALETTE.a,width=2,extra='') => `<path d="${srEscape(d)}" fill="none" stroke="${color}" stroke-width="${width}" ${extra}/>`;
const srHeading = (value,x=42,y=52) => `<text x="${x}" y="${y}" fill="${SR_PALETTE.a}" font-family="Consolas,monospace" font-size="23" font-weight="600">${srEscape(value.toUpperCase())}</text>`;
const srBlend = (a,b,fraction) => '#'+[1,3,5].map(index => Math.round(parseInt(a.slice(index,index+2),16)+(parseInt(b.slice(index,index+2),16)-parseInt(a.slice(index,index+2),16))*fraction).toString(16).padStart(2,'0')).join('');

function srSnapshot(data) {
  const weeks=(data.weeks || []).map(week => (Array.isArray(week) ? week : week.contributionDays || []).map(day => ({
    date:String(day.date || ''), weekday:srNumber(day.weekday),
    count:srNumber(day.contributionCount ?? day.count),
    level:Number.isInteger(day.contributionLevel ?? day.level) ? Math.max(0,Math.min(4,day.contributionLevel ?? day.level)) : null
  })));
  const days=weeks.flat();
  const hasGithubLevels=days.every(day=>day.level!==null),peakDay=Math.max(1,...days.map(day=>day.count));
  for(const day of days) if(day.level===null) day.level=day.count===0 ? 0 : Math.min(4,Math.ceil(day.count/peakDay*4));
  let streak=0,longestStreak=0,previousDate=null;
  for(const day of [...days].sort((a,b)=>a.date.localeCompare(b.date))) {
    const dayTime=Date.parse(day.date+'T00:00:00Z');
    if(previousDate !== null && dayTime-previousDate !== 86400000) streak=0;
    streak=day.count>0 ? streak+1 : 0;
    longestStreak=Math.max(longestStreak,streak); previousDate=dayTime;
  }
  const weekly=weeks.map(week=>week.reduce((sum,day)=>sum+day.count,0));
  const sum=weekly.reduce((total,count)=>total+count,0);
  return {
    weeks,days,weekly,hasGithubLevels,total:srNumber(data.totalContributions ?? data.total_contributions ?? sum),
    activeDays:days.filter(day=>day.count>0).length,longestStreak,
    publicRepos:srNumber(data.account?.public_repos ?? data.account?.publicRepos ?? data.publicRepos),
    followers:srNumber(data.account?.followers ?? data.followers),
    originals:srNumber(data.originalRepoCount ?? data.original_repos ?? data.originalRepos ?? data.repos?.length),
    weekday:Array.from({length:7},(_,index)=>days.reduce((total,day)=>total+(day.weekday===index ? day.count : 0),0)),
    login:String(data.account?.login || 'ctrl-pt'), fetchedAt:String(data.fetchedAt || data.snapshot || ''),
    freshness:String(data.freshness || 'live'),
    start:days[0]?.date || String(data.range?.[0] || ''),end:days.at(-1)?.date || String(data.range?.[1] || '')
  };
}

function srSvg(content,width,height,title,description,snapshot) {
  const stamp=snapshot.fetchedAt ? `; fetched ${snapshot.fetchedAt}` : '';
  const state=['live','fresh'].includes(snapshot.freshness) ? '' : `; ${snapshot.freshness} snapshot`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">${srEscape(title+' — '+snapshot.login+stamp+state)}</title><desc id="desc">${srEscape(description+stamp+state)}</desc>${srBox(0,0,width,height,SR_PALETTE.bg,0)}${content}</svg>`;
}

function srDayRect(day,x,y,size) {
  return `<rect x="${srRound(x)}" y="${srRound(y)}" width="${size}" height="${size}" rx="3" fill="${SR_LEVEL_COLORS[day.level]}" data-date="${srEscape(day.date)}" data-count="${day.count}" data-level="${day.level}"><title>${srEscape(day.date)}: ${day.count} ${day.count===1?'contribution':'contributions'}</title></rect>`;
}

export function renderStats(data,mobile=false) {
  const s=srSnapshot(data),p=SR_PALETTE,width=mobile?600:1200;
  let art=srHeading('GitHub / last 12 months');
  const values=[[s.total,'Contributions'],[s.activeDays,'Active days'],[s.longestStreak,'Best streak · days'],[s.publicRepos,'Public repos']];
  values.forEach(([value,label],index)=>{
    const x=mobile ? 35+(index%2)*274 : 36+index*288,y=mobile ? 82+Math.floor(index/2)*134 : 84;
    art+=srBox(x,y,mobile?250:266,112,p.panel,12)+srText(x+20,y+59,value,49,p.a,700)+srText(x+20,y+90,label,22,p.muted);
  });
  const cy=mobile?440:278,chartY=cy+26,chartH=157,chartW=mobile?525:720,peak=Math.max(1,...s.weekly);
  art+=srHeading('weekly activity',38,cy);
  const step=chartW/Math.max(s.weekly.length-1,1),barWidth=Math.min(10,Math.max(2,step*.65)),points=[];
  s.weekly.forEach((count,index)=>{
    const x=40+index*step,y=chartY+chartH-count/peak*chartH; points.push([x,y]);
    const dates=s.weeks[index];
    art+=`<g data-week="${index}" data-count="${count}"><title>${srEscape(dates[0]?.date || '')} → ${srEscape(dates.at(-1)?.date || '')}: ${count} contributions</title>${srBox(x-barWidth/2,y,barWidth,Math.max(2,count/peak*chartH),p.b,2)}</g>`;
  });
  if(points.length) art+=srPath('M'+points.map(([x,y])=>`${srRound(x)} ${srRound(y)}`).join(' L'),p.a,3);
  [chartY,chartY+78,chartY+157].forEach(y=>art+=srPath(`M35 ${y} H${35+chartW}`,p.muted,.5,'opacity=".35"'));
  art+=srText(39,chartY+190,s.weekly.length+' weeks',21,p.muted)+srText(39+chartW,chartY+190,'max '+Math.max(0,...s.weekly)+' / week',21,p.muted,400,'text-anchor="end"');
  const cx=mobile?194:958,dy=mobile?840:378,r=mobile?93:79;
  art+=srHeading('Weekday mix',mobile?38:856,mobile?705:271);
  const colors=[p.a,p.b,p.c,srBlend(p.a,p.b,.5),srBlend(p.a,p.c,.5),srBlend(p.b,p.c,.6),p.muted];
  const daySum=s.weekday.reduce((total,count)=>total+count,0);let running=0;
  s.weekday.forEach((count,index)=>{
    const fraction=count/Math.max(daySum,1),start=running*360-90,end=(running+fraction)*360-90;running+=fraction;
    if(fraction===1) art+=`<circle cx="${cx}" cy="${dy}" r="${r}" fill="none" stroke="${colors[index]}" stroke-width="24"/>`;
    else if(count) art+=srPath(`M${srRound(cx+r*Math.cos(start*Math.PI/180))} ${srRound(dy+r*Math.sin(start*Math.PI/180))} A${r} ${r} 0 ${Number(fraction>.5)} 1 ${srRound(cx+r*Math.cos(end*Math.PI/180))} ${srRound(dy+r*Math.sin(end*Math.PI/180))}`,colors[index],24);
  });
  art+=srText(cx,dy+9,'7 DAYS',26,p.fg,700,'text-anchor="middle"');
  const lx=mobile?335:1080;
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach((name,index)=>{
    const y=dy-87+index*28;
    art+=`<circle cx="${lx}" cy="${y-7}" r="4" fill="${colors[index]}"/>`+srText(lx+12,y,name,19,p.muted)+srText(lx+97,y,s.weekday[index],19,p.fg,600,'text-anchor="end"');
  });
  const fy=mobile?1030:552;
  art+=srPath(`M35 ${fy-25} H${width-35}`,p.muted,1,'opacity=".4"')+srText(38,fy,'Followers '+s.followers+'  ·  Original public repos '+s.originals,21,p.muted);
  return srSvg(art,width,mobile?1070:590,'Actual GitHub activity',`${s.total} contributions, ${s.activeDays} active days, best streak ${s.longestStreak} days, ${s.publicRepos} public repositories, ${s.followers} followers, ${s.originals} original public repositories. ${s.start} to ${s.end}; all ${s.weeks.length} weekly totals and weekday distribution.`,s);
}

export function renderCalendar(data,mobile=false) {
  const s=srSnapshot(data),p=SR_PALETTE,width=mobile?600:1200;
  let art=srHeading('Contribution field');
  const split=Math.ceil(s.weeks.length/2),parts=mobile?[s.weeks.slice(0,split),s.weeks.slice(split)]:[s.weeks];
  const positions=mobile?[100,340]:[98],cell=mobile?18:Math.min(20.7,1120/Math.max(s.weeks.length,1)),dot=mobile?14:Math.min(16,cell-3);
  parts.forEach((part,index)=>{
    const y=positions[index];
    part.forEach((week,x)=>week.forEach(day=>art+=srDayRect(day,40+x*cell,y+day.weekday*cell,dot)));
    if(part.length) art+=srText(40,y-15,part[0][0]?.date.slice(0,7),20,p.muted)+srText(40+part.length*cell,y-15,part.at(-1).at(-1)?.date.slice(0,7),20,p.muted,400,'text-anchor="end"');
  });
  const y=mobile?555:285;
  art+=srText(41,y,s.total+' contributions',29,p.a,700);
  SR_LEVEL_COLORS.forEach((color,index)=>art+=srBox(width-188+index*26,y-21,18,18,color,3));
  art+=srText(width-207,y+25,'less ← activity → more',19,p.muted);
  return srSvg(art,width,mobile?610:345,'Contribution heatmap',`${s.total} GitHub contributions from ${s.start} to ${s.end}. Each of ${s.days.length} daily cells uses the account's actual count and ${s.hasGithubLevels?'GitHub activity level':'count-derived fallback intensity'}. This calendar includes GitHub contribution types, not only commits.`,s);
}

export function renderSnake(data,mobile=false,staticFrame=false) {
  const s=srSnapshot(data),p=SR_PALETTE,width=mobile?600:1200,height=mobile?350:270;
  const cell=Math.min(mobile?10:20.7,(width-80)/Math.max(s.weeks.length,1)),dot=Math.min(mobile?7:16,cell-3),fieldY=45;
  const plan=planContributionSnake(s.weeks,{length:4});
  let art=`<g data-snake-duration="${plan.durationMs}" data-snake-frames="${plan.poses.length}" data-snake-last-meal-step="${Math.max(0,...plan.eaten.values())}">`;
  s.weeks.forEach((week,x)=>week.forEach(day=>{
    const animation=staticFrame?'':contributionCellAnimation(plan,x,day.weekday,SR_LEVEL_COLORS[day.level],p.panel);
    const rect=srDayRect(day,40+x*cell,fieldY+day.weekday*cell,dot);
    const meal=plan.eaten.get(x+':'+day.weekday);
    art+=rect.replace('<rect ',`<rect ${meal===undefined?'':`data-eaten-step="${meal}" `}`).replace('</rect>',animation+'</rect>');
  }));
  art+=contributionSnakeBody(plan,{cell,dot,y:fieldY,head:p.b,tail:p.a,staticFrame});
  if(!mobile) {
    const chartWidth=1116,step=chartWidth/Math.max(s.weekly.length,1),peak=Math.max(1,...s.weekly);
    s.weekly.forEach((count,index)=>{
      const barHeight=count/peak*22;
      art+=`<g><title>Week ${index+1}: ${count} contributions</title>${srBox(40+index*step,height-18-barHeight,Math.max(2,step-3),barHeight,p.a,2)}</g>`;
    });
  }
  return srSvg(art+'</g>',width,height,staticFrame?'Static contribution snake':'Animated contribution snake',`${s.total} actual GitHub contributions from ${s.start} to ${s.end}; ${s.days.length} daily cells, colored by ${s.hasGithubLevels?'GitHub activity level':'count-derived fallback intensity'}. ${staticFrame?'Reduced-motion still image.':'Vector snake seeks and eats all active cells, then resets the current contribution field.'}`,s);
}
