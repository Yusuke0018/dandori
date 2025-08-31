export function validate(data){
  if(!data || data.schemaVersion!==1) return false;
  if(!Array.isArray(data.projects) || !Array.isArray(data.tasks)) return false;
  return true;
}

