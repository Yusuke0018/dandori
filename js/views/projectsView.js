function el(tag, attrs={}, ...children){
  const e=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k==='class') e.className=v; else if(k==='style') Object.assign(e.style,v); else if(k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k,v);
  }
  for(const c of children){ if(c==null) continue; if(typeof c==='string') e.appendChild(document.createTextNode(c)); else e.appendChild(c); }
  return e;
}

import { showProjectModal } from '../components/projectModal.js';

export function mountProjects(container, { getProjects, getAllTasks }){
  const addBtn = el('button',{class:'btn primary', onclick:()=> showProjectModal({ mode:'create' }) }, '新規');
  const header = el('div',{class:'header'}, el('div',{class:'date'}, 'プロジェクト一覧'), el('div',{class:'spacer'}), addBtn);
  const list = el('div',{class:'projects'});
  container.appendChild(header);
  container.appendChild(list);

  const projects = getProjects();
  const tasks = getAllTasks();
  const byProj = new Map();
  for(const p of projects) byProj.set(p.id, []);
  for(const t of tasks){
    if(byProj.has(t.projectId)) byProj.get(t.projectId).push(t);
  }

  for(const p of projects){
    const arr = byProj.get(p.id) || [];
    const total = arr.length || 0;
    const done = arr.filter(x=>x.done).length;
    const pct = total>0 ? Math.round(done/total*100) : 0;
    const name = el('div',{class:'proj-name'}, p.name);
    const tag = el('span',{class:'tag-pill', 'data-color':p.color}, p.name.slice(0,2));
    const bar = el('div',{class:'prog-bar'}, el('div',{class:'prog-fill', style:{width:`${pct}%`}}, `${pct}%`));
    const meta = el('div',{class:'muted', style:{fontSize:'12px'}}, `${done}/${total}`);
    const card = el('div',{class:'project-card', 'data-color':p.color, onclick:()=> showProjectModal({ mode:'edit', project:p }) }, el('div',{class:'row top'}, tag, meta), name, bar);
    list.appendChild(card);
  }
}
