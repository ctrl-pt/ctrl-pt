// Original contribution-snake planner and animation helpers for this profile.
// No network requests, native packages, or copied third-party solver code.
// The planner seeks the nearest remaining active day with breadth-first search,
// keeps its body out of the chosen path, and closes on its exact starting pose.

const SK_DIRECTIONS = [[1,0],[0,1],[-1,0],[0,-1]];
const skKey = (x,y) => x+':'+y;
const skNumber = value => Math.round(value*1000)/1000;
let skCachedKey = '', skCachedPlan = null;

function skAdvance(pose,point) {
  return [point,...pose.slice(0,-1)];
}

// A simple path cannot cross its own new body. Treating the current body as
// walls is conservative; its tail is available because it leaves on step one.
function skFindPath(pose,width,height,isTarget,forbidden=new Set()) {
  const blocked=new Set(pose.slice(1,-1).map(([x,y])=>skKey(x,y)));
  const seen=new Set([skKey(...pose[0])]),queue=[{point:pose[0],parent:-1}];
  for(let index=0;index<queue.length;index++) {
    const current=queue[index], [x,y]=current.point;
    if(isTarget(x,y)) {
      const path=[]; let cursor=index;
      while(queue[cursor].parent!==-1) {path.push(queue[cursor].point);cursor=queue[cursor].parent;}
      return path.reverse();
    }
    for(const [dx,dy] of SK_DIRECTIONS) {
      const nx=x+dx,ny=y+dy,key=skKey(nx,ny);
      if(nx < -1 || nx > width || ny < -2 || ny > height || seen.has(key) || blocked.has(key) || forbidden.has(key)) continue;
      seen.add(key);queue.push({point:[nx,ny],parent:index});
    }
  }
  throw new Error('Contribution snake has no safe path to its target');
}

export function planContributionSnake(weeks,{length=4}={}) {
  const width=Math.max(1,weeks.length),height=7,boundWidth=Math.max(width,length*2);
  const signature=width+'|'+length+'|'+weeks.map(week=>week.map(day=>day.weekday+','+(day.level ?? day.contributionLevel ?? 0)).join(';')).join('|');
  if(skCachedPlan && signature===skCachedKey) return skCachedPlan;
  const remaining=new Set(),cells=[];
  weeks.forEach((week,x)=>week.forEach(day=>{
    const y=Number(day.weekday),level=Number(day.level ?? day.contributionLevel ?? 0);
    if(level>0) remaining.add(skKey(x,y));
    cells.push({x,y,level});
  }));
  const initial=Array.from({length},(_,x)=>[x,-1]),poses=[initial],eaten=new Map();
  let pose=initial;
  const step=point=>{
    const [x,y]=point,key=skKey(x,y);
    if(pose.slice(0,-1).some(([px,py])=>px===x && py===y)) throw new Error('Contribution snake body collision');
    if(Math.abs(x-pose[0][0])+Math.abs(y-pose[0][1])!==1) throw new Error('Contribution snake skipped a cell');
    pose=skAdvance(pose,point);poses.push(pose);
    if(remaining.delete(key)) eaten.set(key,poses.length-1);
  };
  // Hold the intact graph briefly at the beginning of every loop.
  for(let index=0;index<12;index++) poses.push(pose);
  while(remaining.size) {
    const path=skFindPath(pose,boundWidth,height,(x,y)=>remaining.has(skKey(x,y)));
    if(!path.length) throw new Error('Contribution snake failed to advance');
    path.forEach(step);
  }
  // Move out of the field and approach the starting tail from the right.
  // The last four steps then reconstruct the initial body exactly, so the
  // repeat seam has no teleport or abrupt direction change.
  skFindPath(pose,boundWidth,height,(x,y)=>x===boundWidth && y===-1).forEach(step);
  const forbidden=new Set(initial.slice(0,-1).map(([x,y])=>skKey(x,y)));
  skFindPath(pose,boundWidth,height,(x,y)=>x===length-1 && y===-1,forbidden).forEach(step);
  initial.slice(0,-1).reverse().forEach(step);
  for(let index=0;index<18;index++) poses.push(pose);
  const result={poses,eaten,cells,width,height,durationMs:(poses.length-1)*90};
  skCachedKey=signature;skCachedPlan=result;
  return result;
}

// Share one timeline among the body and all consumed cells. SMIL runs in SVG
// image embeds, including GitHub's image proxy; no JavaScript is needed.
export function contributionCellAnimation(plan,x,y,colored,empty) {
  const frame=plan.eaten.get(skKey(x,y));
  if(frame===undefined) return '';
  const time=Number((frame/(plan.poses.length-1)).toFixed(6));
  return `<animate attributeName="fill" values="${colored};${empty};${empty}" keyTimes="0;${time};1" calcMode="discrete" dur="${plan.durationMs}ms" repeatCount="indefinite"/>`;
}

export function contributionSnakeBody(plan,{cell,dot,x=40,y=45,head='#73b5ff',tail='#4de3ca',staticFrame=false}={}) {
  const count=plan.poses[0].length,total=plan.poses.length-1;
  let svg='';
  for(let part=count-1;part>=0;part--) {
    const size=dot+2-part*.9,offset=(dot-size)/2;
    const points=plan.poses.map((pose,index)=>({x:x+pose[part][0]*cell+offset,y:y+pose[part][1]*cell+offset,t:index/total}));
    // Keep turns and holds; straight runs need only their endpoints.
    const keyframes=points.filter((point,index)=>{
      if(index===0 || index===points.length-1) return true;
      const before=points[index-1],after=points[index+1];
      return Math.abs(before.x+after.x-2*point.x)>0.001 || Math.abs(before.y+after.y-2*point.y)>0.001;
    });
    const fill=part===0?head:tail;
    const first=keyframes[0];
    svg+=`<rect x="${skNumber(first.x)}" y="${skNumber(first.y)}" width="${skNumber(size)}" height="${skNumber(size)}" rx="3" fill="${fill}" data-snake-part="${part}" data-snake-segment="${part}">`;
    if(!staticFrame) {
      const times=keyframes.map(point=>Number(point.t.toFixed(6))).join(';');
      for(const axis of ['x','y']) svg+=`<animate attributeName="${axis}" values="${keyframes.map(point=>skNumber(point[axis])).join(';')}" keyTimes="${times}" calcMode="linear" dur="${plan.durationMs}ms" repeatCount="indefinite"/>`;
    }
    svg+='</rect>';
  }
  return svg;
}
