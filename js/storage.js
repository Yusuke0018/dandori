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
  const tDayId = uuid();
  const tSomeId = uuid();
  const date = todayYMD();
  cache = {
    schemaVersion:1,
    projects:[{ id:projId, name:'マイプロジェクト', color:'theme/pastel/blue', memo:'', deadline:'', createdAt:now, updatedAt:now }],
    tasks:[
      { id:tId, projectId:projId, title:'ダミータスク（時間あり）', type:'timed', date, startMin:600, endMin:660, done:false, priority:'m', notes:'', createdAt:now, updatedAt:now },
      { id:tDayId, projectId:projId, title:'ダミータスク（時間未定）', type:'day', date, done:false, priority:'m', notes:'', createdAt:now, updatedAt:now },
      { id:tSomeId, projectId:projId, title:'いつかやる（サンプル）', type:'someday', done:false, priority:'m', notes:'', createdAt:now, updatedAt:now }
    ],
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

export function getSomedayTasks(){ return cache.tasks.filter(t=>t.type==='someday'); }

export function createTask(payload){
  const now = Date.now();
  const id = uuid();
  const base = { id, projectId:payload.projectId, title:payload.title, done:false, priority:'m', notes:'', createdAt:now, updatedAt:now };
  let t;
  if(payload.type==='timed'){
    t = { ...base, type:'timed', date:payload.date, startMin:payload.startMin, endMin:payload.endMin };
  } else if(payload.type==='day'){
    t = { ...base, type:'day', date:payload.date };
  } else {
    t = { ...base, type:'someday' };
  }
  cache.tasks.push(t);
  commit();
  return t;
}

export function updateTask(id, patch){
  const t = cache.tasks.find(x=>x.id===id);
  if(!t) return;
  Object.assign(t, patch);
  // cleanup invalid fields by type
  if(t.type==='someday'){
    delete t.date; delete t.startMin; delete t.endMin;
  } else if(t.type==='day'){
    delete t.startMin; delete t.endMin;
  }
  t.updatedAt = Date.now();
  commit();
}

export function deleteTask(id){
  const idx = cache.tasks.findIndex(x=>x.id===id);
  if(idx>=0){ cache.tasks.splice(idx,1); commit(); }
}
