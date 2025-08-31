import { getProjectById } from '../storage.js';
import { createTaskCard } from '../components/taskCard.js';
import { todayYMD } from '../state.js';

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
  const header = el('div',{class:'header'}, el('div',{class:'date'}, selectedDate), el('div',{class:'muted'},'日ビュー（時間未定＋時間あり）'));
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

  const tasks = getTasksByDate(selectedDate);
  const projs = getProjects();
  const byId = Object.fromEntries(projs.map(p=>[p.id,p]));

  function refresh(){
    // 時間未定
    unschedList.innerHTML='';
    for(const t of tasks){
      if(t.type!=='day') continue;
      const proj = byId[t.projectId];
      const card = createTaskCard(t, proj, refresh);
      card.classList.add('list');
      unschedList.appendChild(card);
    }
    // 時間あり
    [...timeline.querySelectorAll('.task-card')].forEach(n=>n.remove());
    for(const t of tasks){
      if(t.type!=='timed') continue;
      const proj = byId[t.projectId];
      const card = createTaskCard(t, proj, refresh);
      const top = t.startMin; const height = Math.max(24, (t.endMin - t.startMin));
      card.style.top = `${top}px`; card.style.height = `${height}px`;
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
}

