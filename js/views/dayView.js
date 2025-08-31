import { getProjectById, updateTask } from '../storage.js';
import { createTaskCard } from '../components/taskCard.js';
import { todayYMD } from '../state.js';
import { makeDraggable, withinRect, snapMinutes } from '../services/dragdrop.js';
import { computeLanes } from '../services/layout.js';

function el(tag, attrs={}, ...children){
  const e=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k==='class') e.className=v; else if(k==='style') Object.assign(e.style,v); else if(k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k,v);
  }
  for(const c of children){ if(c==null) continue; if(typeof c==='string') e.appendChild(document.createTextNode(c)); else e.appendChild(c); }
  return e;
}

function buildHourLabels(){
  const wrap = el('div',{class:'hour-labels'});
  for(let h=0; h<24; h++){
    const y = h*60;
    const label = el('div',{class:'hour-label', style:{top:`${y-6}px`}}, String(h).padStart(2,'0')+':00');
    wrap.appendChild(label);
  }
  return wrap;
}

export function mountDay(container, { selectedDate, getProjects, getTasksByDate }){
  const dropSomeday = el('div',{class:'drop-target'}, 'いつかへ移動');
  const header = el('div',{class:'header'}, el('div',{class:'date'}, selectedDate), el('div',{class:'muted'},'日ビュー（時間未定＋時間あり）'), el('div',{class:'spacer'}), dropSomeday);
  const unschedWrap = el('div',{style:{padding:'12px'}});
  const unschedTitle = el('div',{class:'muted', style:{margin:'4px 0 8px'}}, '時間未定');
  const unschedList = el('div',{});
  unschedWrap.appendChild(unschedTitle);
  unschedWrap.appendChild(unschedList);

  const scroll = el('div',{class:'timeline-wrap'});
  const timeline = el('div',{class:'timeline'});
  const labels = buildHourLabels();
  const nowLine = el('div',{class:'now-line'});
  timeline.appendChild(labels);
  timeline.appendChild(nowLine);
  scroll.appendChild(timeline);

  container.appendChild(header);
  container.appendChild(unschedWrap);
  container.appendChild(scroll);

  const projs = getProjects();
  const byId = Object.fromEntries(projs.map(p=>[p.id,p]));

  function refresh(){
    const tasks = getTasksByDate(selectedDate);
    // 時間未定
    unschedList.innerHTML='';
    for(const t of tasks){
      if(t.type!=='day') continue;
      const proj = byId[t.projectId];
      const card = createTaskCard(t, proj, refresh);
      enableDragDayToTimeline(card, t);
      card.classList.add('list');
      unschedList.appendChild(card);
    }
    // 時間あり
    [...timeline.querySelectorAll('.task-card')].forEach(n=>n.remove());
    const lanes = computeLanes(tasks);
    const rect = timeline.getBoundingClientRect();
    const avail = rect.width - 64 - 12; const gap = 6;
    for(const t of tasks){
      if(t.type!=='timed') continue;
      const proj = byId[t.projectId];
      const card = createTaskCard(t, proj, refresh);
      const top = t.startMin; const height = Math.max(24, (t.endMin - t.startMin));
      card.style.top = `${top}px`; card.style.height = `${height}px`;
      const ln = lanes[t.id] || { lane:0, lanes:1 };
      const width = (avail - gap*(ln.lanes-1)) / ln.lanes;
      const left = 64 + ln.lane*(width + gap);
      card.style.left = `${left}px`; card.style.width = `${width}px`; card.style.right='auto';
      enableDragTimed(card, t);
      timeline.appendChild(card);
    }
  }

  function updateNow(){
    const isToday = selectedDate===todayYMD();
    nowLine.style.display = isToday ? 'block' : 'none';
    if(isToday){
      const d = new Date(); const m = d.getHours()*60 + d.getMinutes();
      nowLine.style.top = `${m}px`;
    }
  }

  refresh();
  updateNow();
  const id = setInterval(updateNow, 60*1000);
  const cleanup = () => clearInterval(id);
  container.__cleanup = cleanup;

  // DnD helpers
  function enableDragDayToTimeline(card, task){
    makeDraggable(card, {
      onMove: ({x,y})=>{
        // visual hint
        const rectT = timeline.getBoundingClientRect();
        const overTimeline = withinRect(x,y,rectT);
        timeline.style.outline = overTimeline? '2px dashed var(--accent)' : '';
        const rS = dropSomeday.getBoundingClientRect();
        dropSomeday.classList.toggle('active', withinRect(x,y,rS));
      },
      onEnd: ({x,y})=>{
        timeline.style.outline='';
        const rectT = timeline.getBoundingClientRect();
        const rectU = unschedWrap.getBoundingClientRect();
        const rS = dropSomeday.getBoundingClientRect();
        if(withinRect(x,y,rS)){
          updateTask(task.id, { type:'someday', date:undefined });
          dropSomeday.classList.remove('active');
          refresh();
          return;
        }
        if(withinRect(x,y,rectT)){
          const relY = y - rectT.top; // px to minutes (1px=1min)
          const start = snapMinutes(Math.max(0, Math.min(1439, Math.round(relY))));
          const dur = 60; // default 60min
          const end = Math.min(24*60, start + dur);
          updateTask(task.id, { type:'timed', date:selectedDate, startMin:start, endMin:end });
          refresh();
        } else if(withinRect(x,y,rectU)){
          // stay as day
        }
      }
    });
  }

  function enableDragTimed(card, task){
    makeDraggable(card, {
      onMove: ({x,y})=>{
        const rectT = timeline.getBoundingClientRect();
        const overTimeline = withinRect(x,y,rectT);
        const rectU = unschedWrap.getBoundingClientRect();
        timeline.style.outline = overTimeline? '2px dashed var(--accent)' : '';
        unschedWrap.style.outline = withinRect(x,y,rectU)? '2px dashed var(--accent)' : '';
      },
      onEnd: ({x,y})=>{
        timeline.style.outline=''; unschedWrap.style.outline='';
        const rectT = timeline.getBoundingClientRect();
        const rectU = unschedWrap.getBoundingClientRect();
        if(withinRect(x,y,rectT)){
          const relY = y - rectT.top;
          const start = snapMinutes(Math.max(0, Math.min(1439, Math.round(relY))));
          const dur = Math.max(15, (task.endMin - task.startMin));
          const end = Math.min(24*60, start + dur);
          updateTask(task.id, { type:'timed', date:selectedDate, startMin:start, endMin:end });
          refresh();
        } else if(withinRect(x,y,rectU)){
          updateTask(task.id, { type:'day', date:selectedDate, startMin:undefined, endMin:undefined });
          refresh();
        }
      }
    });
  }
}
