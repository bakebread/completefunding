/* Review controls. All query parameters are allowlisted and never interpreted as HTML. */
(()=>{"use strict";
const u=new URL(location.href);
if(document.documentElement.dataset.review==="brand"){
 const n=u.searchParams.get("hero");
 document.documentElement.dataset.hero=["1","2","3"].includes(n)?n:"1";
 if(u.searchParams.get("design")!=="1"){u.searchParams.set("design","1");history.replaceState(null,"",u);}
}
document.addEventListener("DOMContentLoaded",()=>{
 if(document.documentElement.dataset.review==="brand"){
  const k=Number(document.documentElement.dataset.hero)||1,p=document.querySelector(".cf-review");
  p.querySelectorAll("a")[k-1].setAttribute("aria-current","page");
  p.querySelector("span").textContent=["01: Signature Outline","02: Solid Authority","03: Executive Wordmark"][k-1]+" · Signature Teal";
 }else{
  const names=["Signature Teal","Executive Titanium","Platinum Fusion"];
  let i=["1","2","3"].includes(u.searchParams.get("design"))?Number(u.searchParams.get("design"))-1:0;
  const p=document.createElement("nav"),label=document.createElement("span"),row=document.createElement("div");
  p.className="cf-review";p.setAttribute("aria-label","Logo design review");label.id="cf-mode";p.append(label,row);
  const buttons=["01 Teal","02 Titanium","03 Platinum"].map((name,j)=>{
   const b=document.createElement("button");b.type="button";b.textContent=name;
   b.addEventListener("click",()=>{i=j;const v=new URL(location.href);v.searchParams.set("design",String(i+1));history.replaceState(null,"",v);window.orbit?.setDesign?.(i);sync()});
   row.append(b);return b;
  });
  function sync(){label.textContent=names[i];buttons.forEach((b,j)=>b.setAttribute("aria-pressed",String(i===j)))}
  document.body.append(p);sync();
 }
},{once:true});
})();