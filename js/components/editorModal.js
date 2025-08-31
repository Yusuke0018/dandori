import { getProjects } from '../storage.js';
import { createTask as storageCreate, updateTask as storageUpdate, deleteTask as storageDelete } from '../storage.js';
import { todayYMD } from '../state.js';
import { notify } from '../state.js';

function el(tag, attrs={}, ...children){
  const e=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k==='class') e.className=v; else if(k==='style') Object.assign(e.style,v); else if(k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k,v);
  }
  for(const c of children){ if(c==null) continue; if(typeof c==='string') e.appendChild(document.createTextNode(c)); else e.appendChild(c); }
  return e;
}

function fmtHM(min){ const h=String(Math.floor(min/60)).padStart(2,'0'); const m=String(min%60).padStart(2,'0'); return `${h}:${m}`; }
function parseHM(str){ const m=str.split(':'); return (+m[0])*60 + (+m[1]); }

function buildTimeSelect(value){
  const sel = el('select',{class:'input'});
  for(let m=0;m<24*60;m+=15){
    const opt = el('option',{value:String(m)}, fmtHM(m));
    if(m===value) opt.selected=true;
    sel.appendChild(opt);
  }
  return sel;
}

export function showEditorModal({ mode='create', task=null, defaultType='timed', defaultDate=todayYMD(), defaultProjectId=null }={}){
  const overlay = el('div',{class:'modal-overlay', onclick:(e)=>{ if(e.target===overlay) close(); }});
  const dialog = el('div',{class:'modal shadow', role:'dialog', 'aria-modal':'true'});
  const header = el('div',{class:'modal-header'}, el('div',{class:'title'}, mode==='create'?'新規タスク':'タスク編集'));

  const title = el('input',{class:'input', placeholder:'タイトル', value: task?.title||''});
  const projs = getProjects();
  const projSel = el('select',{class:'input'});
  for(const p of projs){
    const opt = el('option',{value:p.id}, p.name);
    projSel.appendChild(opt);
  }
  if(task?.projectId) projSel.value = task.projectId;
  else if(defaultProjectId) projSel.value = defaultProjectId;

  const typeSel = el('select',{class:'input'});
  ['someday','day','timed'].forEach(t=>{
    const opt = el('option',{value:t}, t==='someday'?'いつかやる': t==='day'?'日':'時間あり');
    typeSel.appendChild(opt);
  });
  typeSel.value = task?.type || defaultType;

  const dateInput = el('input',{class:'input', type:'date'});
  dateInput.value = task?.date || defaultDate;

  const timeWrap = el('div',{class:'row', style:{gap:'8px'}});
  const startSel = buildTimeSelect(task?.startMin ?? 540);
  const endSel = buildTimeSelect(task?.endMin ?? 600);
  timeWrap.appendChild(startSel);
  timeWrap.appendChild(el('span',{},'〜'));
  timeWrap.appendChild(endSel);

  const body = el('div',{class:'modal-body'});
  const field = (label,node)=> el('div',{class:'field'}, el('div',{class:'label muted'},label), node);
  body.appendChild(field('タイトル', title));
  body.appendChild(field('プロジェクト', projSel));
  body.appendChild(field('種類', typeSel));
  body.appendChild(field('日付', dateInput));
  body.appendChild(field('時間', timeWrap));

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

  function applyVisibility(){
    const t = typeSel.value;
    dateInput.parentElement.style.display = (t==='day'||t==='timed')?'block':'none';
    timeWrap.parentElement.style.display = (t==='timed')?'block':'none';
  }
  typeSel.addEventListener('change', applyVisibility);
  applyVisibility();

  cancelBtn.addEventListener('click', close);
  if(delBtn){
    delBtn.addEventListener('click', ()=>{
      if(confirm('削除してよろしいですか？')){
        storageDelete(task.id);
        close();
        notify();
      }
    });
  }

  saveBtn.addEventListener('click', ()=>{
    const t = title.value.trim();
    const pid = projSel.value;
    const typ = typeSel.value;
    if(!t){ return toast('タイトルは必須です'); }
    if(typ==='timed'){
      if(!dateInput.value){ return toast('日付を入力してください'); }
      const s = parseInt(startSel.value,10); const e = parseInt(endSel.value,10);
      if(!(s<e)) return toast('終了は開始より後にしてください');
      if(mode==='create') storageCreate({ type:'timed', projectId:pid, title:t, date:dateInput.value, startMin:s, endMin:e });
      else storageUpdate(task.id, { projectId:pid, title:t, type:'timed', date:dateInput.value, startMin:s, endMin:e });
    } else if(typ==='day'){
      if(!dateInput.value){ return toast('日付を入力してください'); }
      if(mode==='create') storageCreate({ type:'day', projectId:pid, title:t, date:dateInput.value });
      else storageUpdate(task.id, { projectId:pid, title:t, type:'day', date:dateInput.value, startMin:undefined, endMin:undefined });
    } else {
      if(mode==='create') storageCreate({ type:'someday', projectId:pid, title:t });
      else storageUpdate(task.id, { projectId:pid, title:t, type:'someday', date:undefined, startMin:undefined, endMin:undefined });
    }
    close();
    notify();
  });

  return { close };
}

function toast(msg){
  const t = el('div',{class:'toast'}, msg);
  document.body.appendChild(t);
  setTimeout(()=>{ t.remove(); }, 1800);
}

