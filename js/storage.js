import { todayYMD } from './state.js';

const KEY = 'dandori_v1';

function uuid(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
    const v = c==='x'? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

let cache = null;

export function initStorage(){
  const raw = localStorage.getItem(KEY);
  if(raw){
    try{ cache = JSON.parse(raw); return; }catch{ /* fallthrough */ }
  }
  const now = Date.now();
  const projId = uuid();
  const tId = uuid();
  const date = todayYMD();
  cache = {
    schemaVersion:1,
    projects:[{ id:projId, name:'マイプロジェクト', color:'theme/pastel/blue', memo:'', deadline:'', createdAt:now, updatedAt:now }],
    tasks:[{ id:tId, projectId:projId, title:'ダミータスク', type:'timed', date, startMin:600, endMin:660, done:false, priority:'m', notes:'', createdAt:now, updatedAt:now }],
    settings:{ carryOver:true, timeUnitMin:15, theme:'dark' }
  };
  commit();
}

function commit(){
  const tmpKey = KEY + '_tmp';
  localStorage.setItem(tmpKey, JSON.stringify(cache));
  localStorage.setItem(KEY, localStorage.getItem(tmpKey));
  localStorage.removeItem(tmpKey);
}

export function getAll(){ return cache; }
export function getProjects(){ return cache.projects.slice(); }
export function getProjectById(id){ return cache.projects.find(p=>p.id===id); }
export function getTasksByDate(date){ return cache.tasks.filter(t=>t.date===date); }
export function toggleTaskDone(id){
  const t = cache.tasks.find(x=>x.id===id);
  if(!t) return;
  t.done = !t.done; t.updatedAt = Date.now();
  commit();
}

