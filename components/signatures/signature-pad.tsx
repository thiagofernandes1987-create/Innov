"use client";

import { useEffect, useRef, useState } from "react";

export function SignaturePad({name="signatureData",label="Assine no campo abaixo"}:{name?:string;label?:string}){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const[drawing,setDrawing]=useState(false);
  const[value,setValue]=useState("");

  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ratio=Math.max(window.devicePixelRatio||1,1);
    const width=canvas.clientWidth;const height=canvas.clientHeight;
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    const context=canvas.getContext("2d");if(!context)return;
    context.scale(ratio,ratio);context.lineWidth=2.2;context.lineCap="round";context.lineJoin="round";context.strokeStyle="#12212b";
  },[]);

  function point(event:React.PointerEvent<HTMLCanvasElement>){
    const rect=event.currentTarget.getBoundingClientRect();
    return{x:event.clientX-rect.left,y:event.clientY-rect.top};
  }
  function start(event:React.PointerEvent<HTMLCanvasElement>){
    event.currentTarget.setPointerCapture(event.pointerId);
    const context=event.currentTarget.getContext("2d");if(!context)return;
    const current=point(event);context.beginPath();context.moveTo(current.x,current.y);setDrawing(true);
  }
  function move(event:React.PointerEvent<HTMLCanvasElement>){
    if(!drawing)return;const context=event.currentTarget.getContext("2d");if(!context)return;
    const current=point(event);context.lineTo(current.x,current.y);context.stroke();
  }
  function finish(){
    const canvas=canvasRef.current;if(!canvas)return;setDrawing(false);setValue(canvas.toDataURL("image/png"));
  }
  function clear(){
    const canvas=canvasRef.current;if(!canvas)return;const context=canvas.getContext("2d");
    context?.clearRect(0,0,canvas.width,canvas.height);setValue("");
  }

  return <div className="signature-pad">
    <label>{label}</label>
    <canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}
      style={{width:"100%",height:180,touchAction:"none",border:"1px solid var(--border)",borderRadius:12,background:"#fff"}} aria-label={label}/>
    <input type="hidden" name={name} value={value}/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginTop:8}}>
      <small className="muted">Use o dedo, mouse ou caneta. O desenho será convertido em PNG e autenticado por SHA-256.</small>
      <button type="button" className="button button-secondary" onClick={clear}>Limpar</button>
    </div>
  </div>;
}
