/* Aurenix Engine — manipuladores 3D por toque, sem bibliotecas externas.
   Seis alças: laterais (+/- X, +/- Z), topo/base (+/- Y).
   Redimensionamento por eixo local, respeitando rotação e mantendo a face oposta fixa. */
(function(global){
  'use strict';
  const RAD=Math.PI/180;
  const dimensions={x:'w',y:'h',z:'d'};
  const colors={x:'#ff7d99',y:'#8bea9e',z:'#85a9ff'};
  const handles=[['x',-1],['x',1],['z',-1],['z',1],['y',1],['y',-1]];
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  function rotateAxis(o,axis){
    let x=axis==='x'?1:0,y=axis==='y'?1:0,z=axis==='z'?1:0;
    const a=(Number(o.rz)||0)*RAD,b=(Number(o.rx)||0)*RAD,c=(Number(o.ry)||0)*RAD;
    let t=x*Math.cos(a)-y*Math.sin(a);y=x*Math.sin(a)+y*Math.cos(a);x=t;
    t=y*Math.cos(b)-z*Math.sin(b);z=y*Math.sin(b)+z*Math.cos(b);y=t;
    t=x*Math.cos(c)+z*Math.sin(c);z=-x*Math.sin(c)+z*Math.cos(c);x=t;
    return {x,y,z};
  }
  function coords(o,axis,sign){
    const d=dimensions[axis],size=Math.max(0.1,Number(o[d])||1);
    const v=rotateAxis(o,axis);
    return [Number(o.x||0)+v.x*sign*size/2,
            Number(o.y||0)+v.y*sign*size/2,
            Number(o.z||0)+v.z*sign*size/2];
  }
  function create(options){
    const {viewport,scene3dCanvas,getProject,getSelected,getRenderer,onStart,onChange,onEnd,getSnap}=options;
    const canvas=document.createElement('canvas');
    canvas.id='ax3dHandles';
    canvas.setAttribute('aria-hidden','true');
    canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:8;';
    viewport.appendChild(canvas);
    const ctx=canvas.getContext('2d');
    let spots=[],drag=null;
    const ready=()=>getProject()?.mode==='3d'&&getRenderer()?.vp&&getSelected()?.visible&&!getSelected()?.editorLocked;
    function draw(){
      if(!ready()){spots=[];ctx?.clearRect(0,0,canvas.width,canvas.height);return;}
      const bounds=scene3dCanvas.getBoundingClientRect();
      if(!bounds.width||!bounds.height||!ctx)return;
      const dpr=Math.min(window.devicePixelRatio||1,2);
      const w=Math.round(bounds.width*dpr),h=Math.round(bounds.height*dpr);
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,bounds.width,bounds.height);
      const o=getSelected(),renderer=getRenderer(),center=renderer.project([o.x||0,o.y||0,o.z||0]);
      if(!center)return;
      spots=[];
      for(const [axis,sign] of handles){
        const projected=renderer.project(coords(o,axis,sign));
        if(!projected||!Number.isFinite(projected.x)||!Number.isFinite(projected.y))continue;
        const spot={axis,sign,x:projected.x,y:projected.y};
        spots.push(spot);
        ctx.beginPath();ctx.moveTo(center.x,center.y);ctx.lineTo(spot.x,spot.y);
        ctx.strokeStyle=colors[axis]+'99';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.stroke();ctx.setLineDash([]);
      }
      for(const s of spots){
        const active=!!drag&&drag.axis===s.axis&&drag.sign===s.sign;
        ctx.save();ctx.shadowColor=colors[s.axis];ctx.shadowBlur=active?21:9;
        ctx.beginPath();ctx.arc(s.x,s.y,active?14:11,0,2*Math.PI);
        ctx.fillStyle='#102738';ctx.fill();ctx.strokeStyle=colors[s.axis];ctx.lineWidth=active?4:3;ctx.stroke();
        ctx.shadowBlur=0;
        ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#ffffff';
        ctx.fillText(s.sign>0?'+':'−',s.x,s.y+.4);
        ctx.restore();
      }
      ctx.save();ctx.font='bold 11px system-ui';ctx.textAlign='center';
      ctx.fillStyle='rgba(10,18,34,.88)';ctx.strokeStyle='#4f7b91';
      const text='ARRASTE OS PONTOS PARA REDIMENSIONAR';
      const labelWidth=Math.min(275,bounds.width-16),labelX=clamp(center.x-labelWidth/2,8,Math.max(8,bounds.width-labelWidth-8));
      const labelY=clamp(center.y+37,28,Math.max(28,bounds.height-33));
      ctx.beginPath();ctx.roundRect(labelX,labelY,labelWidth,24,8);ctx.fill();ctx.stroke();
      ctx.fillStyle='#c2e3f1';ctx.fillText(text,labelX+labelWidth/2,labelY+16);
      ctx.restore();
    }
    function hitTest(e){
      if(!ready())return null;
      const b=scene3dCanvas.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top;
      let target=null,best=27;
      for(const s of spots){const dist=Math.hypot(x-s.x,y-s.y);if(dist<best){best=dist;target=s;}}
      return target;
    }
    function start(e){
      if(drag||e.button===2||!ready())return false;
      const s=hitTest(e);if(!s)return false;
      const o=getSelected(),renderer=getRenderer(),origin={x:Number(o.x)||0,y:Number(o.y)||0,z:Number(o.z)||0,w:Number(o.w)||1,h:Number(o.h)||1,d:Number(o.d)||1};
      const axisV=rotateAxis(o,s.axis),p=renderer.project([origin.x,origin.y,origin.z]);
      const one=renderer.project([origin.x+axisV.x,origin.y+axisV.y,origin.z+axisV.z]);
      if(!p||!one)return false;
      const vx=one.x-p.x,vy=one.y-p.y,scale=vx*vx+vy*vy;
      if(scale<1.5)return false;
      drag={axis:s.axis,sign:s.sign,id:o.id,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,axisV,vx,vy,scale,origin,changed:false};
      e.preventDefault();return true;
    }
    function move(e){
      if(!drag||e.pointerId!==drag.pointerId)return false;
      const o=getSelected();if(!o||o.id!==drag.id){drag=null;return false;}
      const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
      const worldDelta=(dx*drag.vx+dy*drag.vy)/drag.scale;
      const key=dimensions[drag.axis],before=drag.origin[key],raw=clamp(before+drag.sign*worldDelta,.1,10000);
      const snapped=getSnap?.()?Math.round(raw*4)/4:raw,after=clamp(snapped,.1,10000);
      if(Math.abs(after-before)<.00001 && !drag.changed)return true;
      if(!drag.changed){drag.changed=true;onStart?.();}
      const shift=drag.sign*(after-before)/2;
      o[key]=Math.round(after*1000)/1000;
      for(const ax of ['x','y','z'])o[ax]=Math.round((drag.origin[ax]+drag.axisV[ax]*shift)*1000)/1000;
      onChange?.();
      e.preventDefault();return true;
    }
    function end(e){
      if(!drag||e.pointerId!==drag.pointerId)return false;
      const changed=drag.changed;drag=null;if(changed)onEnd?.();
      e.preventDefault();return true;
    }
    return {draw,start,move,end,hitTest};
  }
  global.AurenixGizmo={create,rotateAxis,coords};
})(window);
