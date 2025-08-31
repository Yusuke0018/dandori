export function computeLanes(tasks){
  const timed = tasks.filter(t=>t.type==='timed').slice().sort((a,b)=> a.startMin - b.startMin || a.endMin - b.endMin);
  const active=[]; // {id, end, lane, cluster}
  const lanesById={};
  let cluster=0;
  const clusterMaxLane=new Map();
  for(const t of timed){
    // clear finished
    for(let i=active.length-1;i>=0;i--){ if(active[i].end<=t.startMin){ active.splice(i,1); } }
    if(active.length===0) cluster++;
    const used = new Set(active.map(a=>a.lane));
    let lane=0; while(used.has(lane)) lane++;
    active.push({ id:t.id, end:t.endMin, lane, cluster });
    lanesById[t.id]={ lane, cluster };
    clusterMaxLane.set(cluster, Math.max(clusterMaxLane.get(cluster)||0, lane));
  }
  const result={};
  for(const [id, info] of Object.entries(lanesById)){
    const count = (clusterMaxLane.get(info.cluster) ?? 0) + 1;
    result[id]={ lane:info.lane, lanes:count };
  }
  return result; // map id -> { lane, lanes }
}

