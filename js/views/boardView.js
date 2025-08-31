import { createTaskCard } from '../components/taskCard.js';
import { makeDraggable, withinRect } from '../services/dragdrop.js';
import { updateTask } from '../storage.js';
import { todayYMD } from '../state.js';

function el(tag, attrs={}, ...children){
  const e=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k==='class') e.className=v; else if(k==='style') Object.assign(e.style,v); else if(k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k,v);
  }
  for(const c of children){ if(c==null) continue; if(typeof c==='string') e.appendChild(document.createTextNode(c)); else e.appendChild(c); }
  return e;
}

export function mountBoard(container, { getProjects, getSomedayTasks }){
  const dropRow = el('div',{class:'drop-row'},
    el('div',{class:'drop-target', 'data-type':'day'}, '今日へ（未定）'),
    el('div',{class:'drop-target', 'data-type':'timed'}, '今日へ（13:00〜）')
  );
  const header = el('div',{class:'header'}, el('div',{class:'date'}, 'いつかやる'), el('div',{class:'muted'},'ボード'), el('div',{class:'spacer'}), dropRow);
  const grid = el('div',{class:'board-grid'});
  container.appendChild(header);
  container.appendChild(el('div',{class:'board',}, grid));

  const projs = getProjects();
  const byId = Object.fromEntries(projs.map(p=>[p.id,p]));

  function refresh(){
    const tasks = getSomedayTasks();
    grid.innerHTML='';
    for(const t of tasks){
      const proj = byId[t.projectId];
      const card = createTaskCard(t, proj, refresh);
      card.classList.add('list');
      enableDragSomeday(card, t);
      grid.appendChild(card);
    }
  }
  refresh();

  function enableDragSomeday(card, task){
    makeDraggable(card, {
      onMove: ({x,y})=>{
        for(const zone of dropRow.children){
          const r = zone.getBoundingClientRect();
          zone.classList.toggle('active', withinRect(x,y,r));
        }
      },
      onEnd: ({x,y})=>{
        for(const zone of dropRow.children){
          const r = zone.getBoundingClientRect();
          if(withinRect(x,y,r)){
            const typ = zone.getAttribute('data-type');
            if(typ==='day') updateTask(task.id, { type:'day', date: todayYMD() });
            else updateTask(task.id, { type:'timed', date: todayYMD(), startMin: 13*60, endMin: 14*60 });
            refresh();
            break;
          }
        }
        for(const zone of dropRow.children){ zone.classList.remove('active'); }
      }
    });
  }
}
