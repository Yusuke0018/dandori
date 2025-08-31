import { getState, setState, onStateChange, todayYMD } from './state.js';
import { routerStart, navigate } from './router.js';
import { initStorage, getProjects, getTasksByDate } from './storage.js';
import { showEditorModal } from './components/editorModal.js';

const app = document.getElementById('app');

function el(tag, attrs={}, ...children){
  const e=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k==='class') e.className=v; else if(k==='style') Object.assign(e.style,v); else if(k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k,v);
  }
  for(const c of children){ if(c==null) continue; if(typeof c==='string') e.appendChild(document.createTextNode(c)); else e.appendChild(c); }
  return e;
}

function buildToolbar(){
  const title = el('div',{class:'title'},'ダンドリ');
  const date = el('div',{class:'chip'}, getState().selectedDate);
  const plusBtn = el('button',{class:'btn', onclick:()=>{
    const { view, selectedDate } = getState();
    const type = view==='timeline' ? 'timed' : view==='day' ? 'day' : 'someday';
    showEditorModal({ mode:'create', defaultType:type, defaultDate:selectedDate });
  }}, '＋');
  const todayBtn = el('button',{class:'btn', onclick:()=>navigate(`#/timeline/${todayYMD()}`)},'今日へ');
  return el('div',{class:'toolbar'}, title, date, el('div',{class:'spacer'}), plusBtn, todayBtn);
}

async function render(){
  app.innerHTML='';
  app.appendChild(buildToolbar());
  const content = el('div',{class:'content'});
  app.appendChild(content);
  const { view, selectedDate } = getState();
  if(view==='timeline'){
    const { mountTimeline } = await import('./views/timelineView.js');
    mountTimeline(content, { selectedDate, getProjects, getTasksByDate });
  } else if(view==='day'){
    const { mountDay } = await import('./views/dayView.js');
    mountDay(content, { selectedDate, getProjects, getTasksByDate });
  } else if(view==='board'){
    const { mountBoard } = await import('./views/boardView.js');
    const mod = await import('./storage.js');
    mountBoard(content, { getProjects, getSomedayTasks: mod.getSomedayTasks });
  } else {
    content.appendChild(el('div',{style:{padding:'16px'}},'準備中のビューです'));
  }
}

(async function start(){
  initStorage();
  const hash = location.hash;
  if(!hash || !hash.startsWith('#/')){
    navigate(`#/timeline/${todayYMD()}`);
  }
  routerStart();
  onStateChange(render);
  await render();
})();
