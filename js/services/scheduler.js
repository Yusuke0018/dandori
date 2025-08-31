// 未完の day/timed を今日へ持ち越し（設定ON時）。
export function carryOverIfNeeded(today, deps){
  const { getSettings, updateSettings, getTasksByDate, hasOverlapOn, updateTask } = deps;
  const settings = getSettings();
  if(!settings.carryOver) return;
  const last = settings.lastOpenedYMD;
  if(last===today) return;
  if(!last){ updateSettings({ lastOpenedYMD: today }); return; }

  // 前回起動日（last）の未完タスクを today へ移動
  const tasks = getTasksByDate(last).filter(t=>!t.done && (t.type==='day' || t.type==='timed'));
  for(const t of tasks){
    if(t.type==='day'){
      updateTask(t.id, { type:'day', date: today });
    } else {
      const s=t.startMin, e=t.endMin;
      if(hasOverlapOn(today, s, e, t.id)){
        updateTask(t.id, { type:'day', date: today, startMin: undefined, endMin: undefined });
      } else {
        updateTask(t.id, { type:'timed', date: today, startMin: s, endMin: e });
      }
    }
  }
  updateSettings({ lastOpenedYMD: today });
}

