import { setState } from './state.js';

function parseHash(){
  const m = location.hash.match(/^#\/(timeline|day|board|projects)\/?(\d{4}-\d{2}-\d{2})?/);
  if(!m) return { view:'timeline', date: new Date().toISOString().slice(0,10) };
  const view = m[1];
  const date = m[2] || new Date().toISOString().slice(0,10);
  return { view, date };
}

export function navigate(hash){
  if(location.hash===hash) return onHashChange();
  location.hash = hash;
}

export function routerStart(){
  window.addEventListener('hashchange', onHashChange);
  onHashChange();
}

function onHashChange(){
  const { view, date } = parseHash();
  const v = (view==='day'||view==='board'||view==='projects')?view:'timeline';
  setState({ view: v, selectedDate: date });
}
