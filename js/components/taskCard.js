import { toggleTaskDone } from '../storage.js';
import { showEditorModal } from './editorModal.js';

function el(tag, attrs={}, ...children){
  const e=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k==='class') e.className=v; else if(k==='style') Object.assign(e.style,v); else if(k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k,v);
  }
  for(const c of children){ if(c==null) continue; if(typeof c==='string') e.appendChild(document.createTextNode(c)); else e.appendChild(c); }
  return e;
}

export function createTaskCard(task, project, refresh){
  const checked = !!task.done;
  const box = el('div',{class:`checkbox ${checked?'checked':''}`, onclick:(e)=>{
    e.stopPropagation();
    toggleTaskDone(task.id);
    refresh?.();
  }});
  const pill = el('span',{class:'tag-pill', 'data-color':project?.color||''}, project?.name||'プロジェクト');
  const title = el('div',{class:'task-title'}, task.title);
  const topRow = el('div',{class:'row top'}, el('div',{class:'row'}, box, title), pill);
  const card = el('div',{class:`task-card ${checked?'done':''}`, 'data-color':project?.color||'', onclick:()=>{
    showEditorModal({ mode:'edit', task });
  }}, topRow);
  return card;
}
