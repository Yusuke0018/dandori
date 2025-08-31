const listeners = new Set();

const state = {
  view: 'timeline',
  selectedDate: new Date().toISOString().slice(0,10)
};

export function todayYMD(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

export function getState(){
  return {...state};
}

export function setState(patch){
  let changed=false;
  for(const [k,v] of Object.entries(patch)){
    if(state[k]!==v){ state[k]=v; changed=true; }
  }
  if(changed){ for(const fn of listeners) fn(getState()); }
}

export function onStateChange(fn){ listeners.add(fn); }
export function offStateChange(fn){ listeners.delete(fn); }

