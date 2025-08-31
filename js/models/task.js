export function minutes(h, m){ return h*60 + m; }

export function createTimedTask({ projectId, title, date, startMin, endMin }){
  if(!title) throw new Error('title required');
  if(!(startMin < endMin)) throw new Error('invalid time range');
  const now = Date.now();
  return { id:crypto.randomUUID(), projectId, title, type:'timed', date, startMin, endMin, done:false, priority:'m', notes:'', createdAt:now, updatedAt:now };
}

