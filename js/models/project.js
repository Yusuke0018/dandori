export function createProject({ name, color='theme/pastel/blue', memo='', deadline='' }){
  if(!name) throw new Error('name required');
  const now = Date.now();
  return { id: crypto.randomUUID(), name, color, memo, deadline, createdAt:now, updatedAt:now };
}

