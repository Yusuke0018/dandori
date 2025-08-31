export function makeDraggable(el, { onStart, onMove, onEnd }={}){
  let dragging=false; let startX=0, startY=0; let moved=false;
  const down = (e)=>{
    const p = getPoint(e);
    dragging=true; moved=false; startX=p.x; startY=p.y;
    el.classList.add('dragging');
    onStart && onStart({ x:p.x, y:p.y, target:el, event:e });
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once:true });
  };
  const move = (e)=>{
    if(!dragging) return;
    const p = getPoint(e);
    const dx=p.x-startX, dy=p.y-startY; if(Math.hypot(dx,dy)>4) moved=true; el.__drag_moved=moved;
    onMove && onMove({ x:p.x, y:p.y, dx, dy, target:el, event:e });
  };
  const up = (e)=>{
    if(!dragging) return;
    dragging=false; el.classList.remove('dragging');
    const p = getPoint(e);
    onEnd && onEnd({ x:p.x, y:p.y, target:el, event:e });
    window.removeEventListener('pointermove', move);
    setTimeout(()=>{ el.__drag_moved=false; },0);
  };
  el.addEventListener('pointerdown', down);
  // prevent click after drag
  const clickBlock = (e)=>{ if(el.__drag_moved){ e.stopPropagation(); e.preventDefault(); el.__drag_moved=false; } };
  el.addEventListener('click', clickBlock, true);
  return ()=>{ el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); };
}

export function withinRect(x,y, rect){ return x>=rect.left && x<=rect.right && y>=rect.top && y<=rect.bottom; }

export function snapMinutes(min, unit=15){ return Math.max(0, Math.min(24*60-1, Math.round(min/unit)*unit)); }

function getPoint(e){ return { x: e.clientX, y: e.clientY }; }
