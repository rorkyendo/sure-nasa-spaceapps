/* routes.js — far-pickup route construction: leg polylines, segment builders, sea/air mode assembly, weather. */
import{rng,VN,st1,st2,worst,rl,f1,hav,hv}from'./util.js';
import{S}from'./state.js';
import{SEAVIA,SEACCESS}from'./data.js';
import{relPad,polyKm,landFrac,unwrapBack,modeBlobs,arcPoly,viaPoly,seaPaths,waterFrac,waterReady}from'./geo.js';
function legPolys(a,b,key){
 const R=rng(key),out=[];let raw=[];
 for(const am of [0,.2,-.2,.35,-.35,.5,-.5]){const pl=arcPoly(a,b,am,R);unwrapBack(pl);const km=pl.reduce((t,q,i)=>i?t+hv(pl[i-1],q):0,0);
  raw.push({pl,km,ok:(1-landFrac(pl))*km<=55})}
 let pass=raw.filter(x=>x.ok);if(!pass.length)pass=[raw[0]];
 const m=Math.min(...pass.map(x=>x.km));pass=pass.filter(x=>x.km<=m*1.3);
 return pass.slice(0,3).map(x=>x.pl)}
function legSegs(poly,blobs,sp,Dk){
 const cum=polyKm(poly),Lt=cum[cum.length-1],n=Math.max(3,Math.round(Lt/35)),sd=sp.seed,cell=Math.max(1.4,Dk/25),segs=[];
 const at=s=>{s=Math.max(0,Math.min(Lt,s));let i=1;while(i<cum.length-1&&cum[i]<s)i++;const u=(s-cum[i-1])/((cum[i]-cum[i-1])||1);return[poly[i-1][0]+(poly[i][0]-poly[i-1][0])*u,poly[i-1][1]+(poly[i][1]-poly[i-1][1])*u]};
 for(let i=0;i<n;i++){const s0=Lt*i/n,s1=Lt*(i+1)/n,pts=[at(s0)];for(let j=1;j<poly.length-1;j++)if(cum[j]>s0&&cum[j]<s1)pts.push(poly[j]);pts.push(at(s1));
  const c=at((s0+s1)/2),xk=c[0]*100,yk=c[1]*111;let w=0;for(const b of blobs){const d=hav(c,[b.lon,b.lat])/b.r;w=Math.max(w,Math.exp(-d*d*1.1))}
  const k1=Math.max(.3,.6+7.2*Math.pow(w,1.15)+VN(xk,yk,sd+1,cell)*1.3+(VN(xk,yk,sd+7,cell*3.5)-.5)*3.4+(sp.clim-1)*.4);
  const k2=sp.gunw?(VN(xk,yk,sd+2,cell)-.5)*5-14*w*(VN(xk,yk,sd+3,cell)*.7+.3):null;
  const s1k=st1(k1),s2k=k2==null?'g':st2(k2),k4=worst(s1k,s2k);
  segs.push({i,km0:s0,km1:s1,pts,ll:pts,c:[xk,yk],k1,k2,v1:45,vm:45,k4,s1k,s2k,wet:k1>=3,ser:[k1,k1,k1,k1,k1,k1],mode:'land',pv:[]})}
 return{poly,km:Lt,segs}}
function mkLegSet(polys,role,from,to,sp,Dk){
 const cum=polyKm(polys[0]),Lt=cum[cum.length-1],bl=[.3,.7].map(t=>{let i=1;while(i<cum.length-1&&cum[i]<Lt*t)i++;const q=polys[0][i];return{lon:q[0],lat:q[1],r:Math.max(12,Lt*.15)}});
 return{role,from,to,sel:0,c:polys.map(pl=>legSegs(pl,bl,sp,Dk))}}
function legAcc(segs,v,o){segs.forEach(s=>{const L=s.km1-s.km0,v1=s.vm||45,f=({g:1,y:.71,r:.47}[s.k4]);o.base+=L/v1*60;o.sat+=(L/(v1*f)-L/v1)*60;let sp=v1*f;if(s.wet){const sp2=sp*(1-.17*rl(v)*Math.min(1,s.k1/6));o.rain+=(L/sp2-L/sp)*60}})}
function legBest(ls,v){let bi=0,bm=1e9;ls.c.forEach((c,i)=>{const o={base:0,sat:0,rain:0};legAcc(c.segs,v,o);c.eff=o.base+o.sat+o.rain;if(c.eff<bm-1e-9){bm=c.eff;bi=i}});return ls.pin!=null&&ls.c[ls.pin]?ls.pin:bi}
function legRec(ls){let bi=0,bm=1e9;ls.c.forEach((c,i)=>{if(c.eff<bm-1e-9){bm=c.eff;bi=i}});return bi}
function mkModeRoute(mode,idx,A,B,main,blobs,sp,p,Dk){
 const pad=[sp.lon,sp.lat],pk=[p.lon,p.lat],a=main[0],b=main[main.length-1];
 const kseed=(p.h*131+sp.seed*17+idx*7+(mode==='sea'?1:2))>>>0,prePs=legPolys(pk,a,kseed),postPs=legPolys(b,pad,kseed+99),pre=prePs[0],post=postPs[0];
 const full=[...pre,...main.slice(1),...post.slice(1)].map(q=>[q[0],q[1]]),iA=pre.length-1,iB=iA+main.length-1;unwrapBack(full);
 const pp=full.slice(0,iA+1),mp=full.slice(iA,iB+1),qp=full.slice(iB),cum=polyKm(mp),Lt=cum[cum.length-1],preKm=polyKm(pp).pop(),postKm=polyKm(qp).pop();
 const dA=full[iA][0]-a[0],dB=full[iB][0]-b[0],shf=(ps,d)=>ps.map(pl=>pl.map(q=>[q[0]+d,q[1]]));
 const legSets=[mkLegSet(shf(prePs,dA),'pre',p.name,A.c,sp,Dk),mkLegSet(shf(postPs,dB),'post',B.c,sp.name,sp,Dk)];
 const atKm=s=>{s=Math.max(0,Math.min(Lt,s));let i=1;while(i<cum.length-1&&cum[i]<s)i++;const u=(s-cum[i-1])/((cum[i]-cum[i-1])||1);return[mp[i-1][0]+(mp[i][0]-mp[i-1][0])*u,mp[i-1][1]+(mp[i][1]-mp[i-1][1])*u]};
 const sd=sp.seed,cell=Math.max(1.4,Dk/25),N=22,segs=[];
 for(let i=0;i<N;i++){const s0=Lt*i/N,s1=Lt*(i+1)/N,pts=[atKm(s0)];for(let j=1;j<mp.length-1;j++)if(cum[j]>s0&&cum[j]<s1)pts.push(mp[j]);pts.push(atKm(s1));
  const c=atKm((s0+s1)/2),xk=c[0]*100,yk=c[1]*111;let w=0;for(const bl of blobs){const d=hav(c,[bl.lon,bl.lat])/bl.r;w=Math.max(w,Math.exp(-d*d*1.1))}
  segs.push({i,km0:s0,km1:s1,pts,ll:pts,c:[xk,yk],k1:.3,k2:null,v1:92,k4:'g',s1k:'g',s2k:'g',wet:false,ser:[.3,.3,.3,.3,.3,.3],mode,vm:mode==='sea'?(A.c==='Michoud'?10:26):800,w,b:VN(xk,yk,sd+5,cell),loc:(s0+s1)/2/Lt,pv:[]})}
 const L='ABCDE';
 return{idx,label:(mode==='sea'?'Sea ':'Air ')+L[idx],short:L[idx],custom:false,far:true,mode,nodes:[],segs,len:Lt+preKm+postKm,mainKm:Lt,legKm:preKm+postKm,legH:0,legSets,fixedH:mode==='sea'?24:9,at:null,atLL:f=>atKm(Lt*f),polyLL:full,midLL:atKm(Lt/2),vehLL:atKm(Lt*.5),tA:A,tB:B,_pp:pp,_mp:mp,_qp:qp,_Dk:Dk}}
function modeAlts(mode,A,B,tryN,sp,p,Dk){
 const R=rng((p.h*6151+sp.seed*7717+tryN*977+(mode==='sea'?1:2))>>>0),a=[relPad(A.lon),A.lat],b=[relPad(B.lon),B.lat];let polys=[];
 if(mode==='air')polys=[0,.12+R()*.04,-(.12+R()*.04)].map(am=>arcPoly(a,b,am,R));
 else{const accA=(SEACCESS[A.c]||[]).map(q=>[relPad(q[0]),q[1]]),accB=(SEACCESS[B.c]||[]).map(q=>[relPad(q[0]),q[1]]);
  const a2=accA.length?accA[accA.length-1]:a,b2=accB.length?accB[accB.length-1]:b;
  const wp=seaPaths(a2,b2);
  if(wp)polys=wp.map(pl=>[a,...accA,...pl,...accB.slice(0,-1).reverse(),b]);
  else{const via=SEAVIA[A.c+'|'+B.c];
   if(via)polys=[0,1.6,-1.6].map(d=>[a,...accA.slice(0,-1),...viaPoly([a2,...via.map((q,i)=>[relPad(q[0]),q[1]+(i>0?d:0)]),b2]),...accB.slice(0,-1).reverse(),b]);
   else polys=[0,.14+R()*.04,-(.14+R()*.04)].map(am=>[a,...accA.slice(0,-1),...arcPoly(a2,b2,am,R),...accB.slice(0,-1).reverse(),b])}
  if(waterReady()){const w=polys.filter(pl=>waterFrac(pl)<=.04);if(w.length)polys=w}
  polys=polys.filter(pl=>landFrac(pl)<=.18)}
 if(!polys.length)return null;
 const blobs=modeBlobs(polys[0],R,mode==='sea'?.09:.04);
 return{routes:polys.map((pl,i)=>mkModeRoute(mode,i,A,B,pl,blobs,sp,p,Dk)),blobs}}
function applyWeather(r,pv){
 if(r.mode==='land')return;
 r.segs.forEach(s=>{const x=s.loc,mm=x<.5?pv[0]+(pv[1]-pv[0])*x*2:pv[1]+(pv[2]-pv[1])*(x-.5)*2,f=s.w*Math.min(1.25,mm/45),b=s.b;
  if(r.mode==='sea'){const wv=seaWxAt(s.c[0]/100,s.c[1]/111),hs=wv!=null?Math.max(.2,wv*(.9+.25*b)):.7+1.3*b+4.6*f,wd=9+9*b+34*f,st=Math.min(10,f*10.5+1.2*b);
   s.pv=[{l:'Wave height',v:hs,u:'m',k:hs>=3?'r':hs>=2?'y':'g'},{l:'Wind',v:wd,u:'kn',k:wd>=22?'r':wd>=17?'y':'g'}]}
  else{const vis=Math.max(.5,22-4*b-19*f),cw=7+10*b+36*f,st=Math.min(10,f*8+1.2*b);
   s.pv=[{l:'Visibility',v:vis,u:'km',k:vis<5?'r':vis<8?'y':'g'},{l:'Crosswind',v:cw,u:'kt',k:cw>=25?'r':cw>=20?'y':'g'},{l:'Thunderstorm distance',v:Math.max(0,160-150*st/10),u:'nm',k:(160-150*st/10)<20?'r':'g'}]}
  s.k4=s.pv.reduce((a,q)=>worst(a,q.k),'g')})}
function worstTxt(r){const g=l=>r.segs.map(s=>(s.pv.find(q=>q.l===l)||{v:0}).v);
 if(r.mode==='sea')return `waves up to ${f1(Math.max(...g('Wave height')))} m and wind up to ${Math.round(Math.max(...g('Wind')))} kn`;
 return `visibility down to ${f1(Math.min(...g('Visibility')))} km and crosswind up to ${Math.round(Math.max(...g('Crosswind')))} kt`}
async function fetchSeaWx(r0){
 if(!r0||!r0._mp)return;
 const p=r0._mp,cum=polyKm(p),Lt=cum[cum.length-1],pts=[.22,.5,.78].map(t=>{const s=Lt*t;let i=1;while(i<cum.length-1&&cum[i]<s)i++;const u=(s-cum[i-1])/((cum[i]-cum[i-1])||1);return[p[i-1][0]+(p[i][0]-p[i-1][0])*u,p[i-1][1]+(p[i][1]-p[i-1][1])*u]});
 try{const r=await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${pts.map(q=>q[1].toFixed(3)).join(',')}&longitude=${pts.map(q=>q[0].toFixed(3)).join(',')}&daily=wave_height_max&forecast_days=8&timezone=UTC`);
  if(!r.ok)throw new Error('sea wx '+r.status);const j=await r.json(),arr=Array.isArray(j)?j:[j];
  S.seaWx={pts,h:arr.map(d=>d.daily.wave_height_max||[])};
 }catch(e){}}
function seaWxAt(lon,lat){const w=S.seaWx;if(!w)return null;let sw=0,h=0;w.pts.forEach((p,i)=>{const a=w.h[i];if(!a||a[S.day]==null)return;const d=(p[0]-lon)**2+(p[1]-lat)**2,wt=1/(d+9);h+=a[S.day]*wt;sw+=wt});return sw?h/sw:null}
export {legPolys,legSegs,mkLegSet,legAcc,legBest,legRec,mkModeRoute,modeAlts,applyWeather,worstTxt,fetchSeaWx,seaWxAt};
