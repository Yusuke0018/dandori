import { getProjects } from '../storage.js';
import { createProject, updateProject, deleteProject, getAllTasks } from '../storage.js';
import { notify } from '../state.js';

function el(tag, attrs={}, ...children){
  const e=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k==='class') e.className=v; else if(k==='style') Object.assign(e.style,v); else if(k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k,v);
  }
  for(const c of children){ if(c==null) continue; if(typeof c==='string') e.appendChild(document.createTextNode(c)); else e.appendChild(c); }
  return e;
}

const THEMES = [
  { key:'vivid', label:'原色', colors:['blue','green','pink','yellow','purple','orange','red','teal'] },
  { key:'pastel', label:'パステル', colors:['blue','green','pink','yellow','purple','orange','teal','gray'] },
  { key:'dark', label:'ダーク', colors:['blue','green','pink','yellow','purple','orange','teal','gray'] }
];

function swatch(theme, color, selected){
  const code = `theme/${theme}/${color}`;
  const s = el('button',{class:`swatch ${selected?'sel':''}`, 'data-color':code, title:color, onclick:(e)=>{
    const wrap = e.currentTarget.closest('.swatches');
    wrap.querySelectorAll('.swatch').forEach(x=>x.classList.remove('sel'));
    e.currentTarget.classList.add('sel');
    wrap.setAttribute('data-selected', code);
  }}, '');
  return s;
}

export function showProjectModal({ mode='create', project=null }={}){
  const overlay = el('div',{class:'modal-overlay', onclick:(e)=>{ if(e.target===overlay) close(); }});
  const dialog = el('div',{class:'modal shadow', role:'dialog', 'aria-modal':'true'});
  const header = el('div',{class:'modal-header'}, el('div',{class:'title'}, mode==='create'?'新規プロジェクト':'プロジェクト編集'));

  const name = el('input',{class:'input', placeholder:'プロジェクト名', value: project?.name||''});
  const body = el('div',{class:'modal-body'});
  const field = (label,node)=> el('div',{class:'field'}, el('div',{class:'label muted'},label), node);
  body.appendChild(field('名前', name));

  const palettes = el('div',{});
  for(const th of THEMES){
    const row = el('div',{class:'palette-row'}, el('div',{class:'label muted', style:{width:'72px'}}, th.label));
    const wrap = el('div',{class:'swatches'});
    for(const c of th.colors){
      wrap.appendChild(swatch(th.key, c, project?.color===`theme/${th.key}/${c}`));
    }
    if(!project && th.key==='pastel' && th.colors[0]){
      wrap.setAttribute('data-selected', `theme/${th.key}/${th.colors[0]}`);
      wrap.firstChild?.classList.add('sel');
    } else if(project){
      wrap.setAttribute('data-selected', project.color);
    }
    row.appendChild(wrap);
    palettes.appendChild(row);
  }
  body.appendChild(field('カラー', palettes));

  const saveBtn = el('button',{class:'btn primary'},'保存');
  const cancelBtn = el('button',{class:'btn'},'キャンセル');
  const delBtn = mode==='edit'? el('button',{class:'btn', style:{marginLeft:'auto', background:'transparent', color:'var(--danger)', borderColor:'var(--danger)' }}, '削除') : null;
  const footer = el('div',{class:'modal-footer'}, delBtn||el('span'), el('div',{class:'spacer'}), cancelBtn, saveBtn);

  dialog.appendChild(header);
  dialog.appendChild(body);
  dialog.appendChild(footer);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  function close(){ overlay.remove(); }
  cancelBtn.addEventListener('click', close);

  if(delBtn){
    delBtn.addEventListener('click', ()=>{
      const tasks = getAllTasks().filter(t=>t.projectId===project.id);
      if(tasks.length>0){ toast('配下にタスクがあるため削除できません'); return; }
      if(confirm('削除してよろしいですか？')){ deleteProject(project.id); close(); notify(); }
    });
  }

  saveBtn.addEventListener('click', ()=>{
    const nm = name.value.trim(); if(!nm) return toast('名前を入力してください');
    let color = 'theme/pastel/blue';
    const sel = overlay.querySelector('.swatches[data-selected]');
    if(sel) color = sel.getAttribute('data-selected');
    if(mode==='create') createProject({ name:nm, color });
    else updateProject(project.id, { name:nm, color });
    close(); notify();
  });

  return { close };
}

function toast(msg){
  const t = el('div',{class:'toast'}, msg);
  document.body.appendChild(t);
  setTimeout(()=>{ t.remove(); }, 1800);
}

