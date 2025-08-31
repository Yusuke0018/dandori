import { createTaskCard } from '../components/taskCard.js';

function el(tag, attrs={}, ...children){
  const e=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k==='class') e.className=v; else if(k==='style') Object.assign(e.style,v); else if(k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k,v);
  }
  for(const c of children){ if(c==null) continue; if(typeof c==='string') e.appendChild(document.createTextNode(c)); else e.appendChild(c); }
  return e;
}

export function mountBoard(container, { getProjects, getSomedayTasks }){
  const header = el('div',{class:'header'}, el('div',{class:'date'}, 'いつかやる'), el('div',{class:'muted'},'ボード'));
  const grid = el('div',{class:'board-grid'});
  container.appendChild(header);
  container.appendChild(el('div',{class:'board',}, grid));

  const tasks = getSomedayTasks();
  const projs = getProjects();
  const byId = Object.fromEntries(projs.map(p=>[p.id,p]));

  function refresh(){
    grid.innerHTML='';
    for(const t of tasks){
      const proj = byId[t.projectId];
      const card = createTaskCard(t, proj, refresh);
      card.classList.add('list');
      grid.appendChild(card);
    }
  }
  refresh();
}

