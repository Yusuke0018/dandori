import { getProjectById } from '../storage.js';
import { todayYMD } from '../state.js';
import { createTaskCard } from '../components/taskCard.js';
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
    const y = h*60; // px
    const label = el('div',{class:'hour-label', style:{top:`${y-6}px`}}, String(h).padStart(2,'0')+':00');
    wrap.appendChild(label);
  }
  return wrap;
}

export function mountTimeline(container, { selectedDate, getProjects, getTasksByDate }){
  const header = el('div',{class:'header'}, el('div',{class:'date'}, selectedDate), el('div',{class:'muted'},'タイムライン'));
  const scroll = el('div',{class:'timeline-wrap'});
  const timeline = el('div',{class:'timeline'});
  const labels = buildHourLabels();
  const nowLine = el('div',{class:'now-line'});
  timeline.appendChild(labels);
  timeline.appendChild(nowLine);
  scroll.appendChild(timeline);
  container.appendChild(header);
  container.appendChild(scroll);

  const projs = getProjects();
  const byId = Object.fromEntries(projs.map(p=>[p.id,p]));

  function refresh(){
    // clear task cards
    [...timeline.querySelectorAll('.task-card')].forEach(n=>n.remove());
    const tasks = getTasksByDate(selectedDate);
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
  const obs = new MutationObserver((muts)=>{ /* placeholder */ });
  obs.observe(container,{childList:true});
  // clean-up when container is replaced
  const cleanup = () => { clearInterval(id); obs.disconnect(); };
  // expose cleanup if needed (not used yet)
  container.__cleanup = cleanup;
}
