/* SURE engine — orchestrator: canvas map, SVG overlay, panels, pointer, mount.
   Domain logic lives in ./util ./data ./state ./geo ./routes ./ai */
import './geo-data.js';
import{sub,ver,emit,S}from'./state.js';
import{$,$$,COL,LBL,RANK,f1,fe,fmtT,rng,H,VN,W,rl,st1,st2,st8,stv1,worst,risk,hv,RAD,toV,fromV,vcross,vdot,hav,unw,wrapL,mer,merYinv,MONn,monthLabel}from'./util.js';
import{SP,CARGO,PICKS,DAYS,DSH,setDayLabels,AIRPORTS,PORTS,ALLT,TERM,DOC,VREF,MODEL,MORD,MODEV,SEAVIA,SEACCESS,PARTS,PEAK,OPS,OPQ,TILESETS,HK,DIRS}from'./data.js';
import{L110,L50,L10,relPad,isLandIn,isLand,isLand10,landId,seaMask,fineMask,mkWaterFast,segWater,waterFrac,chaikinW,seaGraph,seaAStar,seaPaths,waterReady,gcPts,chaikin,viaPoly,arcPoly,polyKm,landFrac,unwrapBack,modeBlobs}from'./geo.js';
import{legPolys,legSegs,mkLegSet,legAcc,legBest,legRec,mkModeRoute,modeAlts,applyWeather,worstTxt,fetchSeaWx,seaWxAt}from'./routes.js';
import{queueAI,routeSrcTag,bindAI}from'./ai.js';
const TS=()=>'i-truck-'+Math.max(0,CARGO.indexOf(S.cargo));

/* ---------- coastline data ---------- */

/* ---------- state ---------- */
let stage,cv,ov;
const ws=()=>256*Math.pow(2,S.view.z);
const GR=()=>ws()/(2*Math.PI);
function updView(){S.R=GR();S.cx=S.w/2;S.cy=S.h/2;S.mv=mer(S.view.lon,S.view.lat)}
function P(lon,lat){const m=mer(lon,lat);let dx=m[0]-S.mv[0];dx-=Math.round(dx);return[S.cx+dx*ws(),S.cy+(m[1]-S.mv[1])*ws(),1]}
function U(px,py){const y=S.mv[1]+(py-S.cy)/ws(),lon=(S.mv[0]+(px-S.cx)/ws())*360-180;return[S.view.lon+wrapL(lon-S.view.lon),merYinv(y)]}
function ringV(r){if(r.v)return r.v;const n=r.lon.length,v=new Float32Array(n*3);for(let j=0;j<n;j++){const a=r.lon[j]*Math.PI/180,b=r.lat[j]*Math.PI/180,cb=Math.cos(b);v[j*3]=cb*Math.cos(a);v[j*3+1]=cb*Math.sin(a);v[j*3+2]=Math.sin(b)}
 const m=[(r.b[0]+r.b[2])/2*Math.PI/180,(r.b[1]+r.b[3])/2*Math.PI/180];r.cv=[Math.cos(m[1])*Math.cos(m[0]),Math.cos(m[1])*Math.sin(m[0]),Math.sin(m[1])];r.rad=Math.hypot(r.b[2]-r.b[0],r.b[3]-r.b[1])/2*Math.PI/180;r.v=v;return v}

/* ---------- land/coast mask on real Natural Earth coastline ---------- */
const masks={};
function mkMask(sp){
 if(masks[sp.id])return masks[sp.id];
 const lat0=sp.lat,lon0=sp.lon,kx=111.32*Math.cos(lat0*Math.PI/180),ky=110.57;
 const HX=36,HY=26,RES=.1,MW=Math.round(2*HX/RES),MH=Math.round(2*HY/RES);
 const c=document.createElement('canvas');c.width=MW;c.height=MH;const g=c.getContext('2d',{willReadFrequently:true});
 g.fillStyle='#000';g.fillRect(0,0,MW,MH);g.fillStyle='#fff';g.beginPath();
 const lonW=lon0-HX/kx*1.3,lonE=lon0+HX/kx*1.3,latS=lat0-HY/ky*1.3,latN=lat0+HY/ky*1.3;
 for(const r of L10){const b=r.b;if(b[2]<lonW||b[0]>lonE||b[3]<latS||b[1]>latN)continue;for(let j=0;j<r.lon.length;j++){const x=((r.lon[j]-lon0)*kx+HX)/RES,y=(HY-(r.lat[j]-lat0)*ky)/RES;j?g.lineTo(x,y):g.moveTo(x,y)}g.closePath()}
 g.fill('evenodd');g.strokeStyle='#fff';g.lineWidth=16;g.lineJoin='round';g.stroke();
 const img=g.getImageData(0,0,MW,MH).data;
 const land=(x,y)=>{const i=Math.floor((x+HX)/RES),j=Math.floor((HY-y)/RES);return i>=0&&j>=0&&i<MW&&j<MH&&img[(j*MW+i)*4]>127};
 const coast=[];for(let j=6;j<MH-6;j+=4)for(let i=6;i<MW-6;i+=4){if(img[(j*MW+i)*4]>127&&(img[(j*MW+i+5)*4]<128||img[(j*MW+i-5)*4]<128||img[((j+5)*MW+i)*4]<128||img[((j-5)*MW+i)*4]<128))coast.push([i*RES-HX,HY-j*RES])}
 const coastDist=(x,y)=>{let m=1e9;for(const p of coast){const d=(p[0]-x)**2+(p[1]-y)**2;if(d<m)m=d}return Math.sqrt(m)};
 return masks[sp.id]={land,coastDist};
}
/* ---------- procedural road network on real coastline ---------- */
function genNet(sp){
 if(S.nets[sp.id])return S.nets[sp.id];
 const R=rng(sp.seed*977+13),lat0=sp.lat,lon0=sp.lon,kx=111.32*Math.cos(lat0*Math.PI/180),ky=110.57;
 const HX=36,HY=26;
 const{land,coastDist}=mkMask(sp);
 const ll=(x,y)=>[lon0+x/kx,lat0+y/ky];
 const nodes=[],grid=[],cols=21,rows=14;
 nodes.push({id:0,x:0,y:0,adj:[],ll:ll(0,0)});
 for(let r=0;r<rows;r++){grid[r]=[];for(let c2=0;c2<cols;c2++){const x=-33+c2*3.3+(R()-.5)*1.7,y=-23+r*3.55+(R()-.5)*1.7;grid[r][c2]=-1;if(Math.hypot(x,y)<1.8||!land(x,y))continue;grid[r][c2]=nodes.length;nodes.push({id:nodes.length,x,y,adj:[],ll:ll(x,y)})}}
 const edges=[],emap=new Map();
 const addE=(a,b,needMid=true)=>{if(a==null||b==null||a<0||b<0||a===b)return;const k=a<b?a+','+b:b+','+a;if(emap.has(k))return;const A=nodes[a],B=nodes[b];const mx=(A.x+B.x)/2+(R()-.5)*1.6,my=(A.y+B.y)/2+(R()-.5)*1.6;if(needMid&&!land(mx,my)&&Math.hypot(A.x-B.x,A.y-B.y)>5)return;const pts=[[A.x,A.y],[mx,my],[B.x,B.y]];const len=Math.hypot(mx-A.x,my-A.y)+Math.hypot(B.x-mx,B.y-my);const e={a,b,pts,len,ll:pts.map(p=>ll(p[0],p[1]))};edges.push(e);emap.set(k,e);A.adj.push({to:b,e});B.adj.push({to:a,e})};
 for(let r=0;r<rows;r++)for(let c2=0;c2<cols;c2++){
  if(c2<cols-1)addE(grid[r][c2],grid[r][c2+1]);
  if(r<rows-1&&(c2%3===0||R()<.7))addE(grid[r][c2],grid[r+1][c2]);
  if(r<rows-1&&c2<cols-1&&R()<.3)addE(grid[r][c2],grid[r+1][c2+1]);
 }
 const near=nodes.slice(1).map(n=>[Math.hypot(n.x,n.y),n.id]).sort((a,b)=>a[0]-b[0]).slice(0,3);
 near.forEach(p=>{if(p[0]<10)addE(0,p[1],false)});
 const net={sp,nodes,edges,emap,kx,ky,lat0,lon0,coastDist,land,pad:0,cache:{},ll,blobs:[]};
 const reach=dij(net,0);net.dist=reach.dist;
 const rn=nodes.filter(n=>isFinite(reach.dist[n.id])&&n.id!==0);
 for(let i=0;i<5&&rn.length;i++){const n=rn[Math.floor(R()*rn.length)];net.blobs.push([n.x,n.y,2.4+R()*2.8,2.2+R()*2.4])}
 net.reachN=rn.length;S.nets[sp.id]=net;return net;
}
function dij(net,src){
 if(net.cache[src])return net.cache[src];
 const n=net.nodes.length,dist=Array(n).fill(Infinity),prev=Array(n).fill(null),done=Array(n).fill(false);dist[src]=0;
 for(;;){let u=-1,b=Infinity;for(let i=0;i<n;i++)if(!done[i]&&dist[i]<b){b=dist[i];u=i}if(u<0)break;done[u]=true;for(const a of net.nodes[u].adj){const nd=dist[u]+a.e.len;if(nd<dist[a.to]){dist[a.to]=nd;prev[a.to]=u}}}
 return net.cache[src]={dist,prev};
}
function pathNodes(net,src,dst){const r=dij(net,src);if(!isFinite(r.dist[dst]))return null;const out=[dst];let c=dst;while(c!==src){c=r.prev[c];out.push(c)}return out.reverse()}

/* ---------- real road graph: Overpass (OSM) → same net shape → Dijkstra ---------- */
async function fetchOSMWays(sp){
 const dLa=.28,dLo=Math.min(1.4,.28/Math.cos(sp.lat*Math.PI/180)),STEP=.15,tiles=[];
 for(let la=sp.lat-dLa;la<sp.lat+dLa-.01;la+=STEP)for(let lo=sp.lon-dLo;lo<sp.lon+dLo-.01;lo+=STEP)
  tiles.push([la,lo,Math.min(la+STEP,sp.lat+dLa),Math.min(lo+STEP,sp.lon+dLo)]);
 const got=new Array(tiles.length).fill(false),ways=new Map();
 for(const u of OPS){
  for(let i=0;i<tiles.length;i+=5){
   await Promise.allSettled(tiles.slice(i,i+5).map(async(b,k)=>{
    const ti=i+k;if(got[ti])return;
    try{const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),45000);
     const r=await fetch(u,{method:'POST',body:'data='+encodeURIComponent(OPQ.replace('%B',b.join(','))),signal:ctl.signal});clearTimeout(to);
     if(!r.ok)throw 0;const j=await r.json();
     (j.elements||[]).forEach(e=>{if(e.type==='way')ways.set(e.id,e)});got[ti]=true}catch(e){}
   }));
  }
  if(got.filter(Boolean).length>=tiles.length*.6)break}
 if(!ways.size)throw new Error('overpass empty');
 return{elements:[...ways.values()],cover:got.filter(Boolean).length/tiles.length}}
function osmNet(sp,json){
 const lat0=sp.lat,lon0=sp.lon,kx=111.32*Math.cos(lat0*Math.PI/180),ky=110.57;
 const ll=(x,y)=>[lon0+x/kx,lat0+y/ky],{land,coastDist}=mkMask(sp);
 const R2=34*34,ways=[];
 for(const el of json.elements){if(el.type!=='way'||!el.nodes||!el.geometry||el.nodes.length<2)continue;
  const g=el.geometry.map(q=>[q.lon,q.lat]);
  if(!g.some(p=>{const dx=(p[0]-lon0)*kx,dy=(p[1]-lat0)*ky;return dx*dx+dy*dy<=R2}))continue;
  ways.push({n:el.nodes,g})}
 const use=new Map();
 ways.forEach(w=>{use.set(w.n[0],(use.get(w.n[0])||0)+2);use.set(w.n[w.n.length-1],(use.get(w.n[w.n.length-1])||0)+2);for(let i=1;i<w.n.length-1;i++)use.set(w.n[i],(use.get(w.n[i])||0)+1)});
 const nodes=[{id:0,x:0,y:0,adj:[],ll:[lon0,lat0]}],idOf=new Map();
 const nodeId=(o,p)=>{if(!idOf.has(o)){const[lon,lat]=p;idOf.set(o,nodes.length);nodes.push({id:nodes.length,x:(lon-lon0)*kx,y:(lat-lat0)*ky,adj:[],ll:[lon,lat]})}return idOf.get(o)};
 const edges=[],emap=new Map();
 const addE=(a,b,pll)=>{if(a===b||!pll.length)return;const k=a<b?a+','+b:b+','+a;if(emap.has(k))return;
  const pts=pll.map(p=>[(p[0]-lon0)*kx,(p[1]-lat0)*ky]);let len=0;for(let i=1;i<pts.length;i++)len+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);
  if(len<0.05)return;const e={a,b,pts,len,ll:pll};edges.push(e);emap.set(k,e);nodes[a].adj.push({to:b,e});nodes[b].adj.push({to:a,e})};
 ways.forEach(w=>{let cur=[0];
  for(let i=1;i<w.n.length;i++){const o=w.n[i];
   if((use.get(o)||0)>1||i===w.n.length-1){addE(nodeId(w.n[cur[0]],w.g[cur[0]]),nodeId(o,w.g[i]),cur.concat(i).map(k=>w.g[k]));cur=[i]}}});
 let bp=-1,bd=1e9;for(let i=1;i<nodes.length;i++){const d=Math.hypot(nodes[i].x,nodes[i].y);if(d<bd){bd=d;bp=i}}
 const net={sp,nodes,edges,emap,kx,ky,lat0,lon0,coastDist,land,pad:0,cache:{},ll,blobs:[],real:true};
 if(bp>=0&&bd<25){const e={a:0,b:bp,pts:[[0,0],[nodes[bp].x,nodes[bp].y]],len:bd,ll:[[lon0,lat0],nodes[bp].ll],access:true};edges.push(e);emap.set('0,'+bp,e);nodes[0].adj.push({to:bp,e});nodes[bp].adj.push({to:0,e})}
 const reach=dij(net,0);net.dist=reach.dist;
 const R=rng(sp.seed*977+13),rn=nodes.filter(n=>isFinite(reach.dist[n.id])&&n.id!==0);
 for(let i=0;i<5&&rn.length;i++){const n=rn[Math.floor(R()*rn.length)];net.blobs.push([n.x,n.y,2.4+R()*2.8,2.2+R()*2.4])}
 net.reachN=rn.length;return net;
}
let netTok=0;
async function upgradeOSMNet(sp){
 const tok=++netTok;
 if(S.nets[sp.id]&&S.nets[sp.id].real){S.routeSrc='osm';routeSrcTag();if(!S.roadWx)fetchRoadWx();return}
 try{const j=await fetchOSMWays(sp);if(tok!==netTok)return;
  const net=osmNet(sp,j);if(net.reachN<8)throw new Error('sparse');
  S.nets[sp.id]=net;S.net=net;S.origin=demoOrigin();S.wp=null;S.pinned=false;
  buildRoutes();S.sel=weakestIdx();renderStats();renderDay();req();
  fetchRoadWx();
  routeSrcTag();toast(`Real OSM road graph: ${net.edges.length} road segments loaded — routes now run Dijkstra on live map data.`);
 }catch(e){routeSrcTag()}
}

/* ---------- global pickup: illustrative long-distance paths ---------- */
/* ---------- raster water masks: canvas fill does point-in-poly, O(1) lookups ---------- */

function mkFar(lon,lat,name){
 lon=relPad(lon);let nm=name;
 if(!nm){let b=null,bd=90;PICKS.forEach(p=>{const d=hav([lon,lat],[p[1],p[2]]);if(d<bd){bd=d;b=p[0]}});nm=b||`${lat.toFixed(1)}, ${(((lon+540)%360)-180).toFixed(1)}`}
 return{name:nm,lon,lat,h:Math.abs(Math.round(lon*10)*31+Math.round(lat*10)*17)%100003}}
function farGeom(sp,p,tryN){
 const A=toV(p.lon,p.lat),B=toV(sp.lon,sp.lat),Dk=hav([p.lon,p.lat],[sp.lon,sp.lat]);
 let ax=vcross(A,B),an=Math.hypot(ax[0],ax[1],ax[2]);if(an<1e-6){ax=[0,0,1];an=1}ax=ax.map(x=>x/an);
 const ang=Math.max(1e-6,Math.acos(Math.max(-1,Math.min(1,vdot(A,B))))),sn=Math.sin(ang);
 const R=rng((p.h*7919+sp.seed*104729+tryN*1301)>>>0);
 const amps=[0,.11+R()*.05,-(.11+R()*.05),.24+R()*.07,-(.24+R()*.07)];
 const angE=Math.min(ang,.5);
 const base=t=>{const a=Math.sin((1-t)*ang)/sn,b=Math.sin(t*ang)/sn;return[A[0]*a+B[0]*b,A[1]*a+B[1]*b,A[2]*a+B[2]*b]};
 const mkPoly=(am)=>{const ph=R()*6.28,wa=(.025+R()*.02)*Math.min(ang,.5),M=64,poly=[];
  for(let k=0;k<=M;k++){const t=k/M,q=base(t),o=am*angE*Math.sin(Math.PI*t)+wa*Math.sin(4*Math.PI*t+ph)*Math.sin(Math.PI*t);poly.push(fromV([q[0]+ax[0]*o,q[1]+ax[1]*o,q[2]+ax[2]*o]))}
  poly[M]=[sp.lon,sp.lat];for(let k=M-1;k>=0;k--)poly[k][0]=unw(poly[k][0],poly[k+1][0]);return poly};
 const plKm=pl=>{let s=0;for(let i=1;i<pl.length;i++)s+=hv(pl[i-1],pl[i]);return s},okL=pl=>(1-landFrac(pl))*plKm(pl)<=55,used=[];let polys=[];
 amps.forEach(am=>{const pl=mkPoly(am);if(okL(pl)){polys.push(pl);used.push(am)}});
 for(let am=-.95;am<=.95&&polys.length<5;am+=.065){if(used.some(u=>Math.abs(u-am)<.06))continue;const pl=mkPoly(am);if(okL(pl)){polys.push(pl);used.push(am)}}

 if(!polys.length)return{routes:[],blobs:[]};
 const blobs=[.22,.45,.68,.86].map(t=>{const q=base(t),o=(R()-.5)*.5*angE*(1+t),pt=fromV([q[0]+ax[0]*o,q[1]+ax[1]*o,q[2]+ax[2]*o]),ref=polys[0][Math.round(t*64)][0];return{lon:unw(pt[0],ref),lat:pt[1],r:Math.max(14,Dk*(.05+R()*.06))}});
 const Lb='ABCDE',N=22,sd=sp.seed;
 const routes=polys.map((poly,ri)=>{
  const cum=[0];for(let k=1;k<poly.length;k++)cum.push(cum[k-1]+hav(poly[k-1],poly[k]));const Lt=cum[cum.length-1];
  const atKm=s=>{s=Math.max(0,Math.min(Lt,s));let i=1;while(i<cum.length-1&&cum[i]<s)i++;const u=(s-cum[i-1])/((cum[i]-cum[i-1])||1);return[poly[i-1][0]+(poly[i][0]-poly[i-1][0])*u,poly[i-1][1]+(poly[i][1]-poly[i-1][1])*u]};
  const cell=Math.max(1.4,Dk/25),segs=[];
  for(let i=0;i<N;i++){
   const s0=Lt*i/N,s1=Lt*(i+1)/N,pts=[atKm(s0)];for(let j=1;j<poly.length-1;j++)if(cum[j]>s0&&cum[j]<s1)pts.push(poly[j]);pts.push(atKm(s1));
   const c=atKm((s0+s1)/2),xk=c[0]*100,yk=c[1]*111;let w=0;for(const b of blobs){const d=hav(c,[b.lon,b.lat])/b.r;w=Math.max(w,Math.exp(-d*d*1.1))}
   const k1=Math.max(.3,.6+7.2*Math.pow(w,1.15)+VN(xk,yk,sd+1,cell)*1.3+(VN(xk,yk,sd+7,cell*3.5)-.5)*3.4+(sp.clim-1)*.4);
   const k2=sp.gunw?(VN(xk,yk,sd+2,cell)-.5)*5-14*w*(VN(xk,yk,sd+3,cell)*.7+.3):null;
   const v1=Math.max(35,Math.min(98,94-38*w-VN(xk,yk,sd+4,cell)*9));
   const ser=[];for(let j=0;j<5;j++)ser.push(k1>=3?.5+VN(xk,yk,sd+10+j,cell*.8)*1.2:Math.max(.2,k1*(.5+VN(xk,yk,sd+20+j,cell*.8)*.9)));ser.push(k1);
   const s1k=st1(k1),s2k=k2==null?'g':st2(k2),k4=worst(s1k,s2k);
   segs.push({i,km0:s0,km1:s1,pts,ll:pts,c:[xk,yk],k1,k2,v1,k4,s1k,s2k,wet:k1>=3,ser});
  }
  return{idx:ri,label:'Route '+Lb[ri],short:Lb[ri],custom:false,far:true,nodes:[],segs,len:Lt,at:null,atLL:f=>atKm(Lt*f),polyLL:poly,midLL:atKm(Lt/2)}});
 return{routes,blobs,Dk};
}
async function buildFar(tok){
 const sp=S.sp,p=S.far;let best=null;
 for(let t=0;t<30;t++){if(anaTok!==tok)return[];
  const g=farGeom(sp,p,t);if(!best)best=g;
  const rec=v=>{let b=0,m=1e9;g.routes.forEach((r,i)=>{const e=scoreRoute(r,v).eff;if(e<m){m=e;b=i}});return b};
  if(rec(5)!==rec(60)&&rec(5)!==rec(40)){best=g;break}
  ldPct(Math.min(40,14+t));await tick()}
 S.farBlobs=best.blobs;return best.routes}
async function setFar(p){
 if(hav([p.lon,p.lat],[S.sp.lon,S.sp.lat])<8){toast('That is almost at the spaceport. Pick a point farther away.');drawOverlay();return}
 S.far=p;S.wp=null;S.pinned=false;await recomputeUI(false,false);
 toast(`Pickup: ${p.name}. Recommended transport: ${S.recM?MODEL[S.recM]:'none, no safe mode'}.`)}

/* ---------- transport modes: land, sea, air ---------- */
function vehHTML(r){if(r.mode==='land')return `<b>${MODEV.land}</b>`;
 const d=DOC[r.mode],a=d[r.tA.c]||null,b=d[r.tB.c]||null;let nm,ev=false;
 if(r.mode==='air'){const x=a&&b?a.filter(n=>b.includes(n)):[];if(x.length){nm=x.join(' / ');ev=true}else nm='An-124 class outsized freighter'}
 else{if(r.tA.c==='Michoud'&&r.tB.c==='Port Canaveral'){nm='Pegasus barge';ev=true}else nm='Ro-ro or heavy-lift ship (RocketShip class)'}
 return `<b>${nm}</b>`}
function noneBanner(c,M){return `<div class="tmwarn">⛔ <b>No transport mode is recommended on ${c.l}.</b> ${MORD.map(m=>`${MODEL[m]}: ${!M[m].ok?M[m].why:(M[m].txt||'blocked by weather')}`).join('; ')}.</div>`}
function refHTML(){return `<details class="tmref"><summary>NASA transport reference</summary><table><tr><th>Vehicle</th><th>Carries</th><th>Documented at</th></tr>${VREF.map(v=>`<tr><td><b>${v.n}</b><br><span class="hint">${v.o}</span></td><td>${v.u}</td><td>${v.t}</td></tr>`).join('')}</table><div class="hint">Terminals marked ✓ on the map are documented for NASA cargo. Other terminals are assumed. No schedule is published, so times here are simulated.</div></details>`}
const nearestT=(L,lon,lat,max)=>{let b=null,bd=max;L.forEach(a=>{const d=hav([lon,lat],[relPad(a.lon),a.lat]);if(d<bd){bd=d;b=a}});return b?{t:b,km:bd}:null};
/* ---------- sea legs: A* over a water grid on real Natural Earth coast ---------- */
function bestRed(g,mm){g.routes.forEach(r=>applyWeather(r,[mm,mm,mm]));let b=null,m=1e9;g.routes.forEach(r=>{const e=scoreRoute(r,mm).eff;if(e<m){m=e;b=r}});return b.segs.filter(s=>s.k4==='r').length}
function buildTM(mode,list,maxKm,B,noun,sp,p,Dk){
 const k=mode==='air'?'ap':'pt',out={ok:false,routes:[],blobs:[],why:'',A:null,B:{...B,k}},hit=nearestT(list,p.lon,p.lat,maxKm);
 if(!hit){out.why=`no ${noun} within ${maxKm} km of the pickup`;return out}
 const A={...hit.t,k};out.A=A;
 if(hav([relPad(A.lon),A.lat],[relPad(B.lon),B.lat])<150){out.why=`the ${noun} is too close to the spaceport`;return out}
 let best=null;
 for(let t=0;t<40;t++){const g=modeAlts(mode,A,out.B,t,sp,p,Dk);if(!g)continue;if(!best)best=g;
  const r5=bestRed(g,5),r60=bestRed(g,60);if(r5===0&&(mode==='sea'?r60>=1:r60<1)){best=g;break}}
 if(!best){out.why='no sea path found (needs a canal or a route this mockup does not model)';return out}
 out.routes=best.routes;out.blobs=best.blobs;out.ok=true;return out}
function mkIds(sp,p){const a=H(p.h,sp.seed,9),b=H(p.h,sp.seed,10),c=H(p.h,sp.seed,11),d=H(p.h,sp.seed,12);
 return{call:'SRE'+(100+Math.floor(a*900)),hex:(0xA00000+Math.floor(b*0x0fffff)).toString(16).toUpperCase(),imo:'9'+String(100000+Math.floor(c*899999)),mmsi:(sp.id==='ksc'?'366':'525')+String(100000+Math.floor(d*899999)),ship:'MV SURE Carrier'}}
/* ---------- analysis progress modal ---------- */
let anaTok=0,loadT0=0;
const tick=()=>new Promise(r=>requestAnimationFrame(()=>r()));
function ldPct(p,t){const P=$('#ldPct'),F=$('#ldFill');if(P)P.textContent=Math.round(p)+'%';if(F)F.style.width=p+'%';if(t){const s=$('#ldStage');if(s)s.textContent=t}}
function loadOn(name){const L=$('#load');if(!L)return;loadT0=performance.now();L.hidden=false;L.classList.remove('done');L.classList.add('show');ldPct(4,'Resolving pickup — '+name);const rs=$('#routes');if(rs)rs.innerHTML='<div class="eyebrow">Route options</div><div class="sk"></div><div class="sk"></div><div class="sk"></div>'}
function loadOff(){const L=$('#load');if(!L)return;ldPct(100,'Analysis complete');L.classList.add('done');setTimeout(()=>{L.classList.remove('show','done');L.hidden=true},Math.max(380,850-(performance.now()-loadT0)))}
async function buildModes(tok){
 const sp=S.sp,p=S.far,Dk=hav([p.lon,p.lat],[sp.lon,sp.lat]),G={};
 ldPct(14,'Land arcs — candidate corridors');await tick();if(anaTok!==tok)return;
 const lr=await buildFar(tok);if(anaTok!==tok)return;const land={routes:lr,blobs:S.farBlobs,ok:lr.length>0,why:lr.length?'':'no continuous land path in this mockup, every path crosses water'};
 lr.forEach(r=>{r.mode='land';r.label='Land '+r.short;r.legKm=0;r.fixedH=0;r.legH=0;r.segs.forEach(s=>{s.mode='land'})});
 if(landId(p.lon,p.lat)!==landId(sp.lon,sp.lat)){land.ok=false;land.why='no road link, a different landmass'}
 G.land=land;const T=TERM[sp.id];
 ldPct(42,'Air corridors — documented terminals');await tick();if(anaTok!==tok)return;
 G.air=buildTM('air',AIRPORTS,500,AIRPORTS.find(a=>a.c===T[0]),'airport',sp,p,Dk);
 ldPct(64,'Water corridor — A* over coast grid');await tick();if(anaTok!==tok)return;
 G.sea=buildTM('sea',PORTS,500,PORTS.find(a=>a.c===T[1]),'port',sp,p,Dk);
 ldPct(90,'Scoring and ranking options');await tick();if(anaTok!==tok)return;
 G.ids=mkIds(sp,p);S.geo=G;S.seaWx=null;
 if(G.sea&&G.sea.routes&&G.sea.routes.length)fetchSeaWx(G.sea.routes[0]).then(()=>{if(S.seaWx){refreshModes();renderDay()}req()})}
/* ---------- live sea state: Open-Meteo Marine (free, keyless) ---------- */
function refreshModes(){
 if(!S.far||!S.geo)return false;
 const c=cur(),v=c.v,info={};
 MORD.forEach(m=>{const g=S.geo[m];if(m!=='land')g.routes.forEach(r=>applyWeather(r,c.p));
  if(!g.ok||!g.routes.length){info[m]={ok:false,why:g.why};return}
  let bi=0,bs=1e9,bsc=null;g.routes.forEach((r,i)=>{const sc=scoreRoute(r,v);if(sc.eff<bs){bs=sc.eff;bi=i;bsc=sc}});
  const r=g.routes[bi],red=r.segs.filter(s=>s.k4==='r').length;
  info[m]={ok:true,bi,t:bsc.t,red,blocked:m!=='land'&&red>=1,txt:m==='land'?'':worstTxt(r)}});
 let rec=['sea','land','air'].find(m=>info[m].ok&&!info[m].blocked);
 let fb=null;if(!rec){const ok=MORD.filter(m=>info[m].ok).sort((a,b)=>info[a].red-info[b].red||info[a].t-info[b].t);fb=ok[0]||null}
 S.mi=info;S.recM=rec;
 let sel=(S.tmUser&&info[S.tmUser]&&info[S.tmUser].ok)?S.tmUser:rec;if(!sel)sel=fb||'none';
 if(sel==='none'){const ch=S.tmCur!=='none';S.tmCur='none';S.routes=[];S.farBlobs=[];S.ri=-1;S.pinned=false;S.segs=[];S.sel=null;return ch}
 if(sel!==S.tmCur){S.tmCur=sel;S.routes=S.geo[sel].routes;S.farBlobs=S.geo[sel].blobs;S.ri=-1;S.pinned=false;return true}
 return false}
function setMode(m){const i=S.mi&&S.mi[m];if(!i)return;if(!i.ok){toast(`${MODEL[m]} is not available here: ${i.why}.`);return}
 S.tmUser=m===S.recM?null:m;renderDay();flyTo(fitBounds(),600)}
function modeBar(){
 if(!S.far||!S.mi){const r0=S.routes[S.ri]||S.routes[0];if(!r0)return '';
  const lt=fmtT(scoreRoute(r0,cur().v).t,1);'';
  return `<div class="tmbar"><button class="tmc on" disabled><span class="tmh"><svg class="mi"><use href="#i-m-land"/></svg><i class="dot8 g"></i>Land</span><small>${lt}</small></button><button class="tmc na" disabled title="Not used for a short local trip"><span class="tmh"><svg class="mi"><use href="#i-m-sea"/></svg><i class="dot8"></i>Sea</span><small>n/a</small></button><button class="tmc na" disabled title="Not used for a short local trip"><span class="tmh"><svg class="mi"><use href="#i-m-air"/></svg><i class="dot8"></i>Air</span><small>n/a</small></button></div>`}
 const c=cur(),M=S.mi,I=S.geo.ids;
 const chips=MORD.map(m=>{const i=M[m],on=m===S.tmCur,st=!i.ok?'':i.blocked?'r':i.red>0?'y':'g';
  return `<button class="tmc${on?' on':''}${i.ok?'':' na'}" data-m="${m}" title="${i.ok?'':i.why}"><span class="tmh"><svg class="mi"><use href="#i-m-${m}"/></svg><i class="dot8 ${st}"></i>${MODEL[m]}${m===S.recM?' ★':''}</span><small>${i.ok?fmtT(i.t,1):'n/a'}</small></button>`}).join('');
 const na='';
 const bl=MORD.filter(m=>M[m].ok&&M[m].blocked),alt=S.recM;
 const noneB=S.recM?'':noneBanner(c,M),refB=refHTML();const warn=!S.recM?'':bl.filter(m=>m===S.tmCur).map(m=>`<div class="tmwarn">⚠ <b>${MODEL[m]} not advised:</b> ${M[m].txt}.${alt&&alt!==m?` <button class="btn" id="tmrec" style="margin-left:6px">Use ${MODEL[alt]}</button>`:''}</div>`).join('');
 const r=S.routes[S.ri]||S.routes[0];if(!r)return `<div class="tmbar">${chips}</div>${na}${noneB}${refB}`;let v=vehHTML(r);
 if(S.tmCur!=='land')v+=` · ${r.tA.c} → ${r.tB.c}`;


 return `<div class="tmbar">${chips}</div>${na}${noneB}${warn}<div class="veh">${v}</div>${refB}`}

/* ---------- routes: alternatives, segments, scoring ---------- */
function dijW(net,src,dst,wf){
 const n=net.nodes.length,dist=Array(n).fill(Infinity),prev=Array(n).fill(null),done=Array(n).fill(false);dist[src]=0;
 for(;;){let u=-1,b=Infinity;for(let i=0;i<n;i++)if(!done[i]&&dist[i]<b){b=dist[i];u=i}if(u<0||u===dst)break;done[u]=true;for(const a of net.nodes[u].adj){const nd=dist[u]+wf(a.e);if(nd<dist[a.to]){dist[a.to]=nd;prev[a.to]=u}}}
 if(!isFinite(dist[dst]))return null;const out=[dst];let c=dst;while(c!==src){c=prev[c];out.push(c)}return out.reverse();
}
const edgeOf=(net,u,v)=>net.emap.get(u<v?u+','+v:v+','+u);
function pathsK(net,src,K,hz){
 const pen=new Map(),out=[],sets=[];let shortest=0;
 for(let it=0;it<120&&out.length<K;it++){
  const p=dijW(net,src,net.pad,e=>e.len*(1+(pen.get(e)||0)+(hz?hz(e):0)));if(!p)break;
  const es=[];for(let k=0;k<p.length-1;k++)es.push(edgeOf(net,p[k],p[k+1]));
  const tot=es.reduce((a,e)=>a+e.len,0);if(!shortest)shortest=tot;
  let ok=tot<=shortest*1.25;
  if(ok)for(const s of sets){let sh=0;es.forEach(e=>{if(s.has(e))sh+=e.len});if(sh/tot>.8){ok=false;break}}
  if(ok){out.push(p);sets.push(new Set(es))}
  es.forEach(e=>pen.set(e,(pen.get(e)||0)+.04));
 }
 return out;
}
function makeRoute(nodes,idx,label,short,custom){
 const net=S.net,sp=S.sp,sd=sp.seed;
 let poly=[];
 for(let k=0;k<nodes.length-1;k++){const u=nodes[k],v=nodes[k+1],e=edgeOf(net,u,v),fwd=e.a===u,pts=fwd?e.pts:[...e.pts].reverse();poly=poly.concat(poly.length?pts.slice(1):pts)}
 const cum=[0];for(let i=1;i<poly.length;i++)cum.push(cum[i-1]+Math.hypot(poly[i][0]-poly[i-1][0],poly[i][1]-poly[i-1][1]));
 const L=cum[cum.length-1];
 const at=s=>{s=Math.max(0,Math.min(L,s));let i=1;while(i<cum.length-1&&cum[i]<s)i++;const t=(s-cum[i-1])/((cum[i]-cum[i-1])||1);return[poly[i-1][0]+(poly[i][0]-poly[i-1][0])*t,poly[i-1][1]+(poly[i][1]-poly[i-1][1])*t]};
 const wB=(x,y)=>{let m=0;for(const b of net.blobs){const d=Math.hypot((x-b[0])/b[2],(y-b[1])/b[3]);m=Math.max(m,Math.exp(-d*d*1.1))}return m};
 const segs=[],n=Math.max(1,Math.ceil(L-.001));
 for(let i=0;i<n;i++){
  const s0=i,s1=Math.min(L,i+1);let pts=[at(s0)];
  for(let j=1;j<poly.length-1;j++)if(cum[j]>s0&&cum[j]<s1)pts.push(poly[j]);pts.push(at(s1));
  const c=at((s0+s1)/2),dC=net.coastDist(c[0],c[1]);
  const w=Math.max(wB(c[0],c[1]),Math.exp(-dC/2.2)*.7);
  const k1=Math.max(.3,.5+7.2*Math.pow(w,1.15)+VN(c[0],c[1],sd+1)*1.1+(VN(c[0],c[1],sd+7,5)-.5)*3.4+(sp.clim-1)*.4);
  const k2=sp.gunw?(VN(c[0],c[1],sd+2)-.5)*5-14*w*(VN(c[0],c[1],sd+3)*.7+.3):null;
  const v1=Math.max(35,Math.min(98,94-38*w-VN(c[0],c[1],sd+4)*9));
  const ser=[];for(let j=0;j<5;j++)ser.push(k1>=3?.5+VN(c[0],c[1],sd+10+j,1.1)*1.2:Math.max(.2,k1*(.5+VN(c[0],c[1],sd+20+j,1.1)*.9)));ser.push(k1);
  const s1k=st1(k1),s2k=k2==null?'g':st2(k2),k4=worst(s1k,s2k);
  segs.push({i,km0:s0,km1:s1,pts,ll:pts.map(p=>net.ll(p[0],p[1])),c,k1,k2,v1,k4,s1k,s2k,wet:k1>=3,ser});
 }
 return{idx,label,short,custom,nodes,segs,len:L,at,atLL:f=>net.ll(...at(L*f)),polyLL:poly.map(p=>net.ll(p[0],p[1])),midLL:net.ll(...at(L/2))};
}
function demoOrigin(){
 const net=S.net,base=defaultOrigin(net),cand=reachNodes().filter(n=>{const d=Math.hypot(n.x,n.y);return d>=14&&d<=32}).sort((a,b)=>Math.abs(Math.hypot(a.x,a.y)-24)-Math.abs(Math.hypot(b.x,b.y)-24)).slice(0,net.real?6:30);
 const probeK=net.real?3:5;
 for(const n of cand){const rs=pathsK(net,n.id,probeK).map((p,i)=>makeRoute(p,i,'','',false));if(rs.length<4)continue;
  const rec=v=>{let b=0,m=1e9;rs.forEach((r,i)=>{const e=scoreRoute(r,v).eff;if(e<m){m=e;b=i}});return b};
  if(rec(5)!==rec(60)&&rec(5)!==rec(40))return n.id}
 return base}
function applyRoute(r){S.segs=r.segs;S.len=r.len;S.polyLL=r.polyLL;S.midLL=r.midLL;S.routeNodes=r.nodes}
function scoreRoute(r,v){let base=((r.fixedH||0)+(r.legH||0))*60,sat=0,rain=0,red=0,nw=0,wk=0;const v0=r.far?72:45;r.segs.forEach(s=>{const L=s.km1-s.km0,v1=(s.vm||v0),f=({g:1,y:.71,r:.47}[s.k4]);base+=L/v1*60;sat+=(L/(v1*f)-L/v1)*60;let sp=v1*f;if(s.wet){nw++;wk+=L;const sp2=sp*(1-.17*rl(v)*Math.min(1,s.k1/6));rain+=(L/sp2-L/sp)*60;sp=sp2}if(s.k4==='r')red++});if(r.legSets){const o={base,sat,rain};let km=0;r.legSets.forEach(ls=>{const bi=legBest(ls,v);ls.sel=bi;km+=ls.c[bi].km;legAcc(ls.c[bi].segs,v,o)});base=o.base;sat=o.sat;rain=o.rain;r.legKm=km;r.len=r.mainKm+km}
 const eff=base+sat+rain;return{base,sat,rain,red,nw,wk,eff,t:eff/60}}
function weakestIdx(){let w=0;S.segs.forEach(s=>{if(RANK[s.k4]>RANK[S.segs[w].k4]||(RANK[s.k4]===RANK[S.segs[w].k4]&&s.k1>S.segs[w].k1))w=s.i});return w}
function refreshRec(){
 if(!S.routes.length)return false;const v=cur().v;let best=0,bs=1e9;
 S.routes.forEach((r,i)=>{const e=scoreRoute(r,v).eff;if(e<bs-1e-9){bs=e;best=i}});S.rec=best;
 if(!S.pinned&&S.ri!==best){S.ri=best;applyRoute(S.routes[best]);return true}return false;
}
async function buildRoutes(tok){
 const net=S.net;S.rain=genRain();S.mrain=genMonthly();S.rainSrc='sim';S.routeSrc='sim';refreshLiveRain();
 if(S.far){S.wp=null;S.pinned=false;S.ri=-1;await buildModes(tok);if(anaTok!==tok)return;S.tmCur=null;S.tmUser=null;S.routes=[];refreshModes();refreshRec();return}
 else{S.farBlobs=null;S.geo=null;S.mi=null;S.tmCur=null;S.tmUser=null}
 const L='ABCDE';S.routes=pathsK(net,S.origin,5,net.real?edgeHz:null).map((p,i)=>makeRoute(p,i,'Route '+L[i],L[i],false));
 S.pinned=S.wp!=null;S.ri=-1;
 if(S.wp!=null){const nodes=pathNodes(net,S.origin,S.wp).concat(pathNodes(net,S.wp,net.pad).slice(1));S.routes.push(makeRoute(nodes,S.routes.length,'Your route (via point)','You',true));S.ri=S.routes.length-1;applyRoute(S.routes[S.ri]);refreshRec()}
 else refreshRec();
}
function setRoute(i,pin){if(!S.routes[i])return;S.ri=i;S.pinned=pin&&i!==S.rec?true:(pin&&i===S.rec?false:S.pinned);applyRoute(S.routes[i]);S.sel=weakestIdx();renderStatsCore();renderDay()}

/* ---------- real roads: OSRM routing over OpenStreetMap (sim fallback) ---------- */
const OSRM='https://router.project-osrm.org/route/v1/driving/',osrmCache=new Map();let osrmTok=0;
async function osrmFetch(pts){
 const cs=pts.map(p=>p[0].toFixed(5)+','+p[1].toFixed(5)).join(';');
 if(osrmCache.has(cs))return osrmCache.get(cs);
 const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),10000);
 try{const r=await fetch(`${OSRM}${cs}?overview=full&geometries=geojson&alternatives=3&steps=false`,{signal:ctl.signal});
  clearTimeout(to);if(!r.ok)throw new Error('osrm '+r.status);
  const j=await r.json();if(j.code!=='Ok'||!j.routes||!j.routes.length)throw new Error('osrm '+j.code);
  if(osrmCache.size>60)osrmCache.delete(osrmCache.keys().next().value);
  osrmCache.set(cs,j.routes);return j.routes}
 catch(e){clearTimeout(to);throw e}
}
function legBls(pl){const cum=polyKm(pl),Lt=cum[cum.length-1];return[.3,.7].map(t=>{let i=1;while(i<cum.length-1&&cum[i]<Lt*t)i++;const q=pl[i];return{lon:q[0],lat:q[1],r:Math.max(12,Lt*.15)}})}
async function upgradeLegsOSRM(){
 const tok=++osrmTok;if(!S.far||!S.geo)return;
 S.routeSrc='fetch';routeSrcTag();let ok=false;
 for(const m of['sea','air']){const g=S.geo[m];if(!g||!g.routes)continue;
  for(const r of g.routes){if(!r.legSets)continue;
   for(const ls of r.legSets){
    const a=ls.role==='pre'?[S.far.lon,S.far.lat]:[r.tB.lon,r.tB.lat],b=ls.role==='pre'?[r.tA.lon,r.tA.lat]:[S.sp.lon,S.sp.lat];
    try{const rs=await osrmFetch([a,b]);if(tok!==osrmTok||!S.far)return;
     ls.c=rs.slice(0,3).map(rt=>{const pl=rt.geometry.coordinates.map(q=>[q[0],q[1]]);return legSegs(pl,legBls(pl),S.sp,r._Dk||25)});ls.osm=true;ls.pin=null;ok=true}
    catch(e){}}
   if(r._pp&&r._mp&&r._qp){const pre=r.legSets[0],post=r.legSets[1],bp=pre.c[legRec(pre)],bq=post.c[legRec(post)];
    if((bp&&bp.osmok!==false&&pre.osm)||(bq&&post.osm))r.polyLL=[...(pre.osm?bp.poly:r._pp),...r._mp.slice(1),...(post.osm?bq.poly:r._qp).slice(1)]}
  }}
 if(tok!==osrmTok)return;
 if(ok){S.routeSrc='osm'}else S.routeSrc='sim';
 routeSrcTag();if(ok){refreshRec();S.sel=weakestIdx();renderStats();renderDay();req()}
}

/* ---------- edge hazard: sim weather field + live Open-Meteo road weather ---------- */
function wxAt(x,y){const wx=S.roadWx;if(!wx)return null;let sw=0,r=0,w=0;wx.pts.forEach((p,i)=>{const d=wx.days[i];if(!d||d.r[S.day]==null)return;const d2=(p[0]-x)**2+(p[1]-y)**2,wt=1/(d2+4);r+=d.r[S.day]*wt;w+=(d.w[S.day]||0)*wt;sw+=wt});return sw?{r:r/sw,w:w/sw}:null}
function edgeHz(e){
 if(e.hz0==null){const m=e.pts[Math.floor(e.pts.length/2)]||[0,0],dC=S.net.coastDist(m[0],m[1]);let w=0;
  for(const b of S.net.blobs){const d=Math.hypot((m[0]-b[0])/b[2],(m[1]-b[1])/b[3]);w=Math.max(w,Math.exp(-d*d*1.1))}
  e.hz0=Math.min(.9,Math.exp(-dC/2.2)*.35+w*.55)}
 let hz=e.hz0;const m=e.pts[Math.floor(e.pts.length/2)],wx=m&&wxAt(m[0],m[1]);
 if(wx)hz+=Math.min(.8,wx.r*.02+wx.w*.0015);
 return hz}
async function fetchRoadWx(){
 if(!S.net||!S.net.real)return;
 const net=S.net,rn=net.nodes.filter(n=>isFinite(net.dist[n.id]));if(!rn.length)return;
 const xs=rn.map(n=>n.x),ys=rn.map(n=>n.y),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),pts=[];
 for(let gy=0;gy<3;gy++)for(let gx=0;gx<3;gx++)pts.push([x0+(x1-x0)*(gx+.5)/3,y0+(y1-y0)*(gy+.5)/3]);
 const lats=pts.map(p=>net.ll(p[0],p[1])[1].toFixed(3)).join(','),lons=pts.map(p=>net.ll(p[0],p[1])[0].toFixed(3)).join(',');
 try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&daily=precipitation_sum,wind_speed_10m_max&forecast_days=8&timezone=UTC`);
  if(!r.ok)throw new Error('wx '+r.status);const j=await r.json(),arr=Array.isArray(j)?j:[j];
  S.roadWx={pts,days:arr.map(d=>({r:d.daily.precipitation_sum,w:d.daily.wind_speed_10m_max}))};
  routeSrcTag();queueRoadRoute(0);
 }catch(e){}}
let rrT=null;
function queueRoadRoute(ms){clearTimeout(rrT);rrT=setTimeout(()=>{if(!S.net||!S.net.real||S.far)return;buildRoutes();S.sel=weakestIdx();renderStats();renderDay();req();routeSrcTag()},ms==null?350:ms)}

/* ---------- AI route assessment via gateway (user key, OpenAI-compatible) ---------- */
function genRain(){
 const sp=S.sp,R=rng(sp.seed*313+7),out=[];
 for(let d=0;d<8;d++)out.push([0,1,2].map(()=>Math.round(sp.clim*Math.pow(R(),2.4)*34)));
 if(sp.clim>=.9){const ds=2+(sp.seed%5);out[ds]=[Math.round(18+R()*14),Math.round(32+R()*26),Math.round(22+R()*16)]}
 const fo=.75+((OK()*37+(S.wp||0)*11)%10)/10*.6,fm=.8+((OK()*13+(S.wp||0)*29)%10)/10*.5;
 return out.map(a=>[Math.round(a[0]*fo),Math.round(a[1]*fm),a[2]]);
}
function genMonthly(){
 const sp=S.sp,R=rng(sp.seed*733+3),pk=PEAK[sp.id]??6,out=[];
 const fo=.75+((OK()*37+(S.wp||0)*11)%10)/10*.6,fm=.8+((OK()*13+(S.wp||0)*29)%10)/10*.5;
 const m0=new Date().getUTCMonth();
 for(let m=0;m<60;m++){const mo=(m0+m)%12,s=.5+.5*Math.cos(2*Math.PI*(mo-pk)/12),base=sp.clim*(8+40*Math.pow(s,1.6))*(.8+R()*.45);out.push([Math.round(base*fo),Math.round(base*fm),Math.round(base)])}
 return out;
}
/* ---------- live rain: Open-Meteo (K8 daily), sim fallback ---------- */
let rainTok=0;
const WDN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function todayLabels(){const a=[],b=[];for(let i=0;i<8;i++){const d=new Date(Date.now()+i*864e5);a.push(`${WDN[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`);b.push(`${WDN[d.getUTCDay()]} ${d.getUTCDate()}`)}return[a,b]}
function setDatePill(){const p=$('#datePill');if(!p)return;const d=new Date();p.textContent=`${WDN[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`.toUpperCase()}
function llOrigin(){if(S.far)return[S.far.lat,S.far.lon];const n=S.net&&S.net.nodes.find(n=>n.id===S.origin);return n?[n.ll[1],n.ll[0]]:null}
function rainPoints(){
 const o=llOrigin();if(!o)return null;
 const t=[S.sp.lat,S.sp.lon];
 return[o,[(o[0]+t[0])/2,(o[1]+t[1])/2],t];
}
async function refreshLiveRain(){
 const tok=++rainTok,pts=rainPoints();if(!pts)return;
 try{
  const url='https://api.open-meteo.com/v1/forecast?latitude='+pts.map(p=>p[0].toFixed(3)).join(',')+'&longitude='+pts.map(p=>p[1].toFixed(3)).join(',')+'&daily=precipitation_sum&forecast_days=8&timezone=UTC';
  const r=await fetch(url);if(!r.ok)throw 0;
  const j=await r.json(),arr=Array.isArray(j)?j:[j];
  if(tok!==rainTok||arr.length!==3||!arr[0].daily||!arr[0].daily.time)throw 0;
  const dates=arr[0].daily.time;S.rainDates=dates;
  setDayLabels(dates.map(t=>{const d=new Date(t+'T00:00:00Z');return `${WDN[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`}),
   dates.map(t=>{const d=new Date(t+'T00:00:00Z');return `${WDN[d.getUTCDay()]} ${d.getUTCDate()}`}));
  S.rain=dates.map((_,d)=>arr.map(a=>Math.round((a.daily.precipitation_sum[d]||0)*10)/10));
  S.rainSrc='live';renderDay();
 }catch(e){/* keep simulated values */}
}
const MODEM=()=>S.mode==='m';
const OK=()=>S.far?S.far.h:S.origin;
const cur=()=>{const i=S.day;if(MODEM()){const p=S.mrain[i],ml=monthLabel(i);return{v:Math.max(...p),l:ml.l,p}}return{v:Math.max(...S.rain[i]),l:DAYS[i],p:S.rain[i]}};
const k8of=d=>Math.max(...S.rain[d]);
function stats(){
 const sg=S.segs,N=sg.length,rr=sg.reduce((a,s)=>a+risk(s.k4),0),cnt={g:0,y:0,r:0};sg.forEach(s=>cnt[s.k4]++);
 let w=sg[0];sg.forEach(s=>{if(RANK[s.k4]>RANK[w.k4]||(RANK[s.k4]===RANK[w.k4]&&s.k1>w.k1))w=s});
 return{N,score:Math.round((1-rr/N)*1000)/10,cnt,weak:w,k7:w.k4};
}

/* ---------- base canvas ---------- */
function sizeCanvas(){const r=stage.getBoundingClientRect();S.w=Math.max(300,r.width);S.h=Math.max(300,r.height);S.dpr=Math.min(2,window.devicePixelRatio||1);cv.width=S.w*S.dpr;cv.height=S.h*S.dpr;ov.setAttribute('viewBox',`0 0 ${S.w} ${S.h}`)}
/* ---------- base canvas: real map tiles (Google / OpenStreetMap) ---------- */
if(!S.base)S.base='osm';
const tcache=new Map();
function tileAt(u,tz,tx,ty){
 const k=u+tz+'/'+tx+'/'+ty,t=tcache.get(k);if(t===null)return null;if(t)return t.complete&&t.naturalWidth?t:null;
 const im=new Image();im.src=u.replace('{z}',tz).replace('{x}',tx).replace('{y}',ty);
 im.onload=()=>req();im.onerror=()=>{tcache.set(k,null);req()};tcache.set(k,im);return null;
}
function drawBase(){
 const ctx=cv.getContext('2d'),w=S.w,h=S.h,z=S.view.z;ctx.setTransform(S.dpr,0,0,S.dpr,0,0);
 ctx.fillStyle='#060a14';ctx.fillRect(0,0,w,h);
 const tz=Math.max(0,Math.min(19,Math.round(z))),nt=1<<tz,ts=256*Math.pow(2,z-tz);
 const wx=S.mv[0]*ws(),wy=S.mv[1]*ws();
 const ix0=Math.floor((wx-S.cx)/ts),ix1=Math.floor((wx+S.cx)/ts),iy0=Math.max(0,Math.floor((wy-S.cy)/ts)),iy1=Math.min(nt-1,Math.floor((wy+S.cy)/ts));
 let drew=0;
 for(const t of TILESETS[S.base]||TILESETS.sat){
  const turl=t.u||t,iz=Math.min(tz,t.mz==null?19:t.mz),nt2=1<<iz,ts2=256*Math.pow(2,z-iz);
  const ix0=Math.floor((wx-S.cx)/ts2),ix1=Math.floor((wx+S.cx)/ts2),iy0=Math.max(0,Math.floor((wy-S.cy)/ts2)),iy1=Math.min(nt2-1,Math.floor((wy+S.cy)/ts2));
  let d2=0;
  for(let iy=iy0;iy<=iy1;iy++)for(let ix=ix0;ix<=ix1;ix++){const tx=((ix%nt2)+nt2)%nt2,px=S.cx+ix*ts2-wx,py=S.cy+iy*ts2-wy;
   const im=tileAt(turl,iz,tx,iy);if(im){ctx.drawImage(im,px,py,ts2+.6,ts2+.6);d2++}}
  drew=Math.max(drew,d2)}
 if(!drew){ctx.fillStyle='#0d1b30';ctx.strokeStyle='rgba(88,224,240,.45)';ctx.lineWidth=1;ctx.beginPath();
  for(const r of L50){let f=1;for(let j=0;j<r.lon.length;j++){const p=P(r.lon[j],r.lat[j]);f?ctx.moveTo(p[0],p[1]):ctx.lineTo(p[0],p[1]);f=0}ctx.closePath()}
  ctx.fill('evenodd');ctx.stroke()}
 // storm cells on a long-distance route
 if(S.far&&S.farBlobs){for(const b of S.farBlobs){const[x,y]=P(b.lon,b.lat),rpx=Math.max(14,b.r*1000/mpp(b.lat));const gr=ctx.createRadialGradient(x,y,0,x,y,rpx);gr.addColorStop(0,'rgba(90,168,255,.30)');gr.addColorStop(1,'rgba(90,168,255,0)');ctx.fillStyle=gr;ctx.fillRect(x-rpx,y-rpx,rpx*2,rpx*2)}}
 // simulated service-road layer (near-spaceport playfield)
 if(S.net&&!S.far&&z>=7.2){
  const net=S.net;
  for(const b of net.blobs){const bl=net.ll(b[0],b[1]),[x,y]=P(bl[0],bl[1]),rpx=b[2]*1000/mpp(bl[1]);const gr=ctx.createRadialGradient(x,y,0,x,y,rpx);gr.addColorStop(0,'rgba(90,168,255,.28)');gr.addColorStop(1,'rgba(90,168,255,0)');ctx.fillStyle=gr;ctx.fillRect(x-rpx,y-rpx,rpx*2,rpx*2)}
  const rw=Math.max(1.2,Math.min(5,1.2+(z-8)*.9));
  const draw=(col,wd)=>{ctx.strokeStyle=col;ctx.lineWidth=wd;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();for(const e of net.edges){if(!isFinite(net.dist[e.a])||!isFinite(net.dist[e.b]))continue;e.ll.forEach((q,i)=>{const[x,y]=P(q[0],q[1]);i?ctx.lineTo(x,y):ctx.moveTo(x,y)})}ctx.stroke()};
  draw('rgba(42,74,102,.9)',rw+1.6);draw('rgba(110,150,190,.85)',Math.max(.6,rw*.4));
 }
 if(S.radar&&S.radar.im){const[nw,se]=[S.radar.nw,S.radar.se],a=P(nw[0],nw[1]),b=P(se[0],se[1]);ctx.drawImage(S.radar.im,a[0],a[1],b[0]-a[0],b[1]-a[1])}
 const vg=ctx.createRadialGradient(S.cx,S.cy,Math.min(w,h)*.3,S.cx,S.cy,Math.max(w,h)*.78);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(2,5,12,.5)');ctx.fillStyle=vg;ctx.fillRect(0,0,w,h);
}
const mpp=lat=>156543.03392*Math.cos(((lat==null?S.view.lat:lat)*Math.PI)/180)/Math.pow(2,S.view.z);

/* ---------- live rain radar: Meteomatics WMS (user-supplied login, stays in browser) ---------- */
const mmAuth=()=>{try{return localStorage.getItem('sure_mm_auth_v1')||''}catch(e){return''}};
const m385=(lon,lat)=>[lon*20037508.34/180,Math.log(Math.tan(Math.PI/4+Math.max(-85.05,Math.min(85.05,lat))*Math.PI/360))*6378137];
let radarTok=0,radarT=null;const radarCache=new Map();
function radarDate(){const d=S.rainDates&&S.rainDates[S.day];return(d||new Date(Date.now()+S.day*864e5).toISOString().slice(0,10))+'T12:00:00Z'}
function scheduleRadar(){
 const tog=$('#togRadar'),lb=$('#radarLbl'),auth=mmAuth();
 if(lb)lb.textContent=auth?'Rain radar · live':'Rain radar · key via Keys';
 if(!tog||!tog.checked||MODEM()||!auth){if(S.radar){S.radar=null;req()}return}
 clearTimeout(radarT);radarT=setTimeout(()=>{
  const tok=++radarTok,nw=U(0,0),se=U(S.w,S.h);
  const[x0,y0]=m385(nw[0],se[1]),[x1,y1]=m385(se[0],nw[1]);
  const ci=auth.indexOf(':'),au=ci<0?'https://':('https://'+encodeURIComponent(auth.slice(0,ci))+':'+encodeURIComponent(auth.slice(ci+1))+'@');
  const url=au+'api.meteomatics.com/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=precip_1h:mm&CRS=EPSG:3857&BBOX='+x0.toFixed(0)+','+y0.toFixed(0)+','+x1.toFixed(0)+','+y1.toFixed(0)+'&WIDTH='+Math.min(1600,Math.round(S.w))+'&HEIGHT='+Math.min(1200,Math.round(S.h))+'&FORMAT=image/png&TRANSPARENT=TRUE&TIME='+encodeURIComponent(radarDate());
  const ch=radarCache.get(url);if(ch){S.radar={im:ch,nw,se};req();return}
  const im=new Image();im.onload=()=>{if(radarCache.size>24)radarCache.clear();radarCache.set(url,im);if(tok===radarTok){S.radar={im,nw,se};req()}};im.src=url;
 },550);
}
window.SUREMMCHANGE=()=>{radarCache.clear();S.radar=null;scheduleRadar()};

/* ---------- SVG overlay ---------- */
const dPath=pts=>{let d='',pen=false;for(const q of pts){const p=P(q[0],q[1]);if(p[2]<0){pen=false;continue}d+=(pen?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)+' ';pen=true}return d||'M-9 -9'};
function mk(x,y,sym,col,vb,w,hh,h2,extra=''){return `<g class="mk" ${extra}><ellipse cx="${x}" cy="${y+hh/2-(h2||0)-2}" rx="${w*.42}" ry="${w*.1}" fill="#000" opacity=".35"/><svg x="${x-w/2}" y="${y-hh/2-(h2||0)}" width="${w}" height="${hh}" viewBox="${vb}"><use href="#${sym}"/></svg></g>`}
const PH=(p,off=0)=>`animation-delay:-${(((performance.now()/1000+off)%p)).toFixed(3)}s`;
function truckMk(x,y,sym){const w=96,hh=64,h2=16;
 const pf=[0,.5,1].map(o=>`<circle class="tkp" cx="45.2" cy="9.5" r="2.4" fill="#d3dcee" style="${PH(1.5,o)}"/>`).join('');
 return `<g class="mk"><ellipse cx="${x}" cy="${y+hh/2-h2-2}" rx="${w*.42}" ry="${w*.1}" fill="#000" opacity=".35"/><svg x="${x-w/2}" y="${y-hh/2-h2}" width="${w}" height="${hh}" viewBox="0 0 72 48" style="overflow:visible"><g class="tkv" style="${PH(.26)}"><use href="#${sym}"/><rect x="43.8" y="9.5" width="2.8" height="9.5" rx="1" fill="#39435f"/><rect x="43.4" y="8.8" width="3.6" height="1.6" rx=".8" fill="#59647f"/>${pf}</g></svg></g>`}
function rocketMk(x,y){const w=92,hh=92,h2=14;
 const sm=[0,.53,1.06].map(o=>`<circle class="rsm" cx="32" cy="57" r="3" fill="#c8d4ea" style="${PH(1.6,o)}"/>`).join('');
 return `<g class="mk"><ellipse cx="${x}" cy="${y+hh/2-h2-2}" rx="${w*.42}" ry="${w*.1}" fill="#000" opacity=".35"/><svg x="${x-w/2}" y="${y-hh/2-h2}" width="${w}" height="${hh}" viewBox="0 0 64 64" style="overflow:visible"><g class="rkb" style="${PH(2.2)}"><g class="rkv" style="${PH(.12)}"><g transform="rotate(28 32 34) translate(0 2)">${sm}<ellipse class="fg" cx="32" cy="60" rx="10" ry="16" fill="#ff9a2e" style="${PH(.15)}"/><path class="fl" d="M26.4 49.5Q32 90 37.6 49.5Z" fill="url(#gFlame)" style="${PH(.13)}"/><path class="fl2" d="M29.2 49.5Q32 75 34.8 49.5Z" fill="#fffbd0" style="${PH(.1)}"/></g><use href="#i-rocket-nf"/></g></g></svg></g>`}
function drawOverlay(){
 if(!isFinite(S.view.lon+S.view.lat+S.view.z)){console.error('viewNaN',JSON.stringify(S.view));return}
 updView();const z=S.view.z,net=S.net;let h='';
 // spaceport pins
 SP.forEach(sp=>{const[x,y]=P(sp.lon,sp.lat);if(x<-60||y<-30||x>S.w+60||y>S.h+30)return;const on=S.sp&&sp.id===S.sp.id;if(on&&(z>=7.5||S.far))return;
  h+=`<g class="pin${on?' on':''}${S.hotSp===sp.id?' hot':''}" data-h="sp" data-id="${sp.id}"><circle class="halo" cx="${x}" cy="${y}" r="15"/><circle cx="${x}" cy="${y}" r="4.5" fill="${on?'#2fe48a':'#35e0ee'}"/><text x="${x+20}" y="${y+4}">${sp.name.toUpperCase()}</text></g>`});
 if(net&&S.segs.length&&(S.far||z>=5.5)){
  const wetOn=$('#togWet').checked&&cur().v>=30&&(S.far||z>=7);
  let sh='';
  S.routes.forEach((r,ri)=>{if(ri===S.ri)return;const cw=Math.max(4,Math.min(5.5,z-3.5));
   sh+=`<g class="alt" data-h="route" data-r="${ri}">`+r.segs.map(s=>`<path d="${dPath(s.ll)}" fill="none" stroke="${COL[s.k4]}" stroke-opacity=".42" stroke-width="${cw}" stroke-linecap="round"${s.mode==='air'?' stroke-dasharray="9 7"':''}/>`).join('')+`<path d="${dPath(r.polyLL)}" fill="none" stroke="transparent" stroke-width="20"/></g>`});
  S.segs.forEach(s=>{const d=dPath(s.ll),c=COL[s.k4],cw=Math.max(4.2,Math.min(7.5,z-2));
   sh+=`<g class="seg" data-h="seg" data-i="${s.i}">${wetOn&&s.wet?`<path class="wet show${cur().v>=50?' big':''}" d="${d}"/>`:''}<path d="${d}" fill="none" stroke="${c}" stroke-opacity=".3" stroke-width="${cw*2.4}" stroke-linecap="round"/><path class="core" d="${d}" fill="none" stroke="${c}" stroke-width="${cw}"${s.mode==='air'?' stroke-dasharray="10 8"':''}/><path d="${d}" fill="none" stroke="transparent" stroke-width="18"/></g>`});
  h+=sh;
  const AR=S.far&&S.routes[S.ri];
  if(AR&&AR.legSets)AR.legSets.forEach(ls=>{const cw2=Math.max(3,Math.min(5.5,z-3));
   ls.c.forEach((c,i)=>{if(i===ls.sel)return;h+=`<path d="${dPath(c.poly)}" fill="none" stroke="#ffb454" stroke-width="2.4" stroke-dasharray="3 6" stroke-linecap="round" opacity=".5"/>`});
   const c=ls.c[ls.sel];h+=`<path d="${dPath(c.poly)}" fill="none" stroke="#ffb454" stroke-opacity=".35" stroke-width="${cw2*2.2}" stroke-linecap="round"/>`+c.segs.map(s=>`<path d="${dPath(s.ll)}" fill="none" stroke="${COL[s.k4]}" stroke-width="${cw2}" stroke-linecap="round"/>`).join('')});
  if(S.far){
   for(const a of ALLT){const act=AR&&AR.tA&&((AR.tA.c===a.c&&AR.tA.k===a.k)||(AR.tB.c===a.c&&AR.tB.k===a.k));
    for(const kk of[0]){const[x,y]=P(a.lon+360*kk,a.lat);if(x<-30||y<-30||x>S.w+30||y>S.h+30)continue;
     const sh2=a.k==='ap'?`<circle cx="${x}" cy="${y}" r="${act?5.5:3.8}" fill="#e8f9ff" stroke="#35e0ee" stroke-width="1.6"/>`:`<path d="M${x} ${y-(act?7:5)}l${act?7:5} ${act?7:5}-${act?7:5} ${act?7:5}-${act?7:5}-${act?7:5}z" fill="#5ee0b0" stroke="#0a3a30" stroke-width="1.2"/>`;
     h+=`<g class="term">${act?`<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${a.k==='ap'?'#35e0ee':'#5ee0b0'}" stroke-width="1.6" opacity=".8"/>`:''}${sh2}${(act||z>=4.4||DOC[a.k==='ap'?'air':'sea'][a.c])?`<text x="${x+10}" y="${a.k==='ap'?y-8:y+16}" font-size="${act?11:9.5}" fill="${act?'#e8f9ff':'#9fb4d6'}" style="font-family:monospace">${(a.k==='ap'?(act?a.c+' · '+a.n:a.c):(act?a.n:a.c))+(DOC[a.k==='ap'?'air':'sea'][a.c]?' ✓':'')}</text>`:''}</g>`}}
   if(AR&&AR.mode&&AR.mode!=='land'){const[vx,vy]=P(...AR.vehLL),I=S.geo.ids,id=AR.mode==='air'?I.call:'IMO '+I.imo,w=AR.mode==='sea'?84:92,hh=Math.round(w*48/72),tw=id.length*6.4+14;
    h+=`<g class="mk" data-h="veh"><svg x="${vx-w/2}" y="${vy-hh/2-8}" width="${w}" height="${hh}" viewBox="0 0 72 48" style="overflow:visible"><g class="bob" style="${PH(2.4)}"><use href="#${AR.mode==='sea'?'i-ship':'i-plane'}"/></g></svg><g transform="translate(${vx},${vy+hh/2-2})"><rect x="${-tw/2}" y="-11" width="${tw}" height="16" rx="8" fill="#06202c" stroke="#35e0ee" stroke-opacity=".7"/><text text-anchor="middle" y="1" fill="#bff6fb" font-size="10" font-family="monospace" style="paint-order:normal;stroke:none">${id}</text></g></g>`}
  }
  if(S.sel!=null&&S.segs[S.sel])h+=`<path class="selp" d="${dPath(S.segs[S.sel].ll)}"/>`;
  const pad=P(S.sp.lon,S.sp.lat),o=S.far?(S.routes[0]?P(...S.routes[0].polyLL[0]):P(S.far.lon,S.far.lat)):P(...net.nodes[S.origin].ll);
  if(z>=6&&!S.far){
   // reroute handle
   if(S.wp==null){const[mx,my]=P(...S.midLL);h+=`<g class="mk" data-h="grip"><circle cx="${mx}" cy="${my}" r="12" fill="#e8f9ff" stroke="#35e0ee" stroke-width="2.5"/><path d="M${mx-6} ${my}h12M${mx-3} ${my-3}l-3 3 3 3M${mx+3} ${my-3}l3 3-3 3" stroke="#0a2a3a" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><title>Drag to reroute</title></g>`}
   else{const[wx,wy]=P(...net.nodes[S.wp].ll);h+=`<g class="mk" data-h="wp"><path d="M${wx} ${wy-13}l13 13-13 13-13-13z" fill="#e8f9ff" stroke="#35e0ee" stroke-width="2.5"/><text x="${wx}" y="${wy+4}" text-anchor="middle" font-size="11" font-weight="700" fill="#0a2a3a">via</text><title>Drag to move, click to remove</title></g>`}
  }
  S.routes.forEach((r,ri)=>{const f=.3+.11*ri,[lx2,ly2]=P(...r.atLL(f)),on=ri===S.ri,best=ri===S.rec,tx=`${best?'★ ':''}${r.short} · ${fe(r.len)} km`,wd=tx.length*6.6+16;
   h+=`<g class="rlab${on?' on':''}${best?' best':''}" data-h="route" data-r="${ri}"><rect x="${lx2-wd/2}" y="${ly2-10}" width="${wd}" height="20" rx="10"/><text x="${lx2}" y="${ly2+4}" text-anchor="middle">${tx}</text></g>`});
  h+=`<g data-h="rocket">`+rocketMk(pad[0],pad[1])+`</g>`;
  h+=`<g data-h="truck">`+truckMk(o[0],o[1],TS())+`</g>`;
  const lx=Math.max(80,Math.min(S.w-80,pad[0])),ox2=Math.max(80,Math.min(S.w-80,o[0]));
  h+=`<g transform="translate(${lx},${pad[1]-70})"><rect x="-58" y="-13" width="116" height="18" rx="9" fill="#06202c" stroke="#35e0ee" stroke-opacity=".7"/><text text-anchor="middle" y="0" fill="#bff6fb" font-size="10.5" font-family="monospace" style="paint-order:normal;stroke:none">${S.sp.name.toUpperCase()}</text></g>`;
  h+=`<g transform="translate(${ox2},${o[1]+30})"><rect x="-74" y="-13" width="148" height="18" rx="9" fill="#2a1d0b" stroke="#ffb454" stroke-opacity=".7"/><text text-anchor="middle" y="0" fill="#ffe0b5" font-size="10" font-family="monospace" style="paint-order:normal;stroke:none">${S.cargo.replace(/ \(.*\)$/,'')}</text></g>`;
 }
 if(S.snap){const q=S.snap,c=q.ok?(q.kind==='truck'?'#ffb454':'#35e0ee'):'#ff4d5e';h+=`<line x1="${q.x}" y1="${q.y}" x2="${q.nx}" y2="${q.ny}" stroke="${c}" stroke-dasharray="4 4" stroke-width="2"/><circle cx="${q.nx}" cy="${q.ny}" r="15" fill="none" stroke="${c}" stroke-width="2.5"/>`}
 ov.innerHTML=h;
}
function hud(){
 const z=S.view.z;$('#zl').textContent=z<3?'Global':z<6?'Country':z<9?'Region':'City';
 const m=mpp()*100;const nice=[50,100,200,500,1e3,2e3,5e3,1e4,2e4,5e4,1e5,2e5,5e5,1e6,2e6,5e6];let b=nice[0];for(const n of nice)if(n<=m)b=n;
 $('#scale').innerHTML=`<span>${b>=1000?b/1000+' km':b+' m'}</span><i style="width:${b/mpp()}px"></i>`;
 $('#hint2').style.display=(S.far||z>=7)?'block':'none';
}
let rq=false;function req(){if(rq)return;rq=true;requestAnimationFrame(()=>{rq=false;updView();drawBase();drawOverlay();hud();scheduleRadar();emit()})}

/* ---------- camera ---------- */
const clampZ=z=>Math.max(1.6,Math.min(13,z));
function fitBounds(){
 const net=S.net;let pts;
 if(S.far){pts=[];S.routes.forEach(r=>r.polyLL.forEach((q,i)=>{if(i%4===0)pts.push(q)}));pts.push([S.sp.lon,S.sp.lat])}
 else{pts=[net.nodes[S.origin].ll,net.ll(0,0)];if(S.wp!=null)pts.push(net.nodes[S.wp].ll)}
 const lon0=pts[0][0];let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
 pts.forEach(p=>{const m=mer(lon0+wrapL(p[0]-lon0),p[1]);x0=Math.min(x0,m[0]);x1=Math.max(x1,m[0]);y0=Math.min(y0,m[1]);y1=Math.max(y1,m[1])});
 const aw=Math.max(200,S.w-300),ah=Math.max(200,S.h-275);
 const z=clampZ(Math.min(Math.log2(aw/Math.max(8,(x1-x0)*256)),Math.log2(ah/Math.max(8,(y1-y0)*256))));
 const cl=merYinv((y0+y1)/2);
 return{lon:x1>-1e8?(x0+x1)/2*360-180:lon0,lat:Math.max(-80,Math.min(80,cl)),z};
}
function flyTo(t,ms=900){
 t={...t,lon:S.view.lon+wrapL(t.lon-S.view.lon)};const v0={...S.view},d=Math.hypot(t.lon-v0.lon,t.lat-v0.lat),bump=Math.min(3.5,d/18),t0=performance.now();S.fly=true;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){S.view={...t,z:clampZ(t.z)};updView();drawBase();drawOverlay();hud();S.fly=false;return}
 const step=now=>{const k=Math.min(1,(now-t0)/ms),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
  S.view={lon:v0.lon+(t.lon-v0.lon)*e,lat:v0.lat+(t.lat-v0.lat)*e,z:clampZ(v0.z+(t.z-v0.z)*e-bump*Math.sin(Math.PI*k))};
  updView();drawBase();drawOverlay();hud();if(k<1)requestAnimationFrame(step);else S.fly=false};
 requestAnimationFrame(step);
}
function zoomAt(z2,mx,my){const a=U(mx,my);S.view.z=clampZ(z2);updView();const b=U(mx,my);S.view.lon+=wrapL(a[0]-b[0]);S.view.lat=Math.max(-85,Math.min(85,S.view.lat+a[1]-b[1]));req()}
/* ---------- selection and panels ---------- */
function select(i){S.sel=i;drawOverlay();renderDetail();$$('.li').forEach(e=>e.classList.toggle('on',+e.dataset.i===i))}
function sparkline(s){
 const w=300,h=100,px=26,X=j=>px+j*(w-px-12)/5,Y=v=>h-22-Math.min(9,v)/9*(h-34);
 let o=`<svg class="spark" viewBox="0 0 ${w} ${h}">`;
 o+=`<rect x="${px}" y="${Y(3)}" width="${w-px-12}" height="${Y(0)-Y(3)}" fill="#2fe48a" opacity=".08"/><rect x="${px}" y="${Y(6)}" width="${w-px-12}" height="${Y(3)-Y(6)}" fill="#ffd23f" opacity=".08"/><rect x="${px}" y="${Y(9)}" width="${w-px-12}" height="${Y(6)-Y(9)}" fill="#ff4d5e" opacity=".08"/>`;
 [0,3,6,9].forEach(v=>{o+=`<text x="${px-5}" y="${Y(v)+3}" text-anchor="end" fill="#8996b6" font-size="8.5">${v}</text><line x1="${px}" x2="${w-12}" y1="${Y(v)}" y2="${Y(v)}" stroke="#2a3a60" stroke-dasharray="2 3"/>`});
 o+=`<polyline fill="none" stroke="#35e0ee" stroke-width="2" points="${s.ser.map((v,j)=>X(j)+','+Y(v)).join(' ')}"/>`;
 s.ser.forEach((v,j)=>{const dd=new Date(Date.now()+(S.day-(5-j)*12)*864e5);o+=`<circle cx="${X(j)}" cy="${Y(v)}" r="${j===5?4.5:2.8}" fill="${j===5?COL[st1(v)]:'#35e0ee'}"/><text x="${X(j)}" y="${h-6}" text-anchor="middle" fill="#8996b6" font-size="8.5">${dd.getUTCDate()} ${MON[dd.getUTCMonth()]}</text>`});
 return o+'</svg>';
}
function renderDetail(){
 const d=$('#detail');if(S.sel==null||!S.segs[S.sel]){d.innerHTML='<div class="empty">Click a segment on the map to see its details.</div>';return}
 const s=S.segs[S.sel],hot=[...S.segs].filter(x=>x.k4!=='g').sort((a,b)=>RANK[b.k4]-RANK[a.k4]||b.k1-a.k1).slice(0,5);
 const nl=s.mode&&s.mode!=='land';
 const k1txt=s.k1<3?'Radar reflection is almost unchanged. No sign of new water.':s.k1<6?'Radar reflection changed noticeably. The ground may be wet or flooded in places.':'Radar reflection changed a lot. There may be water on or next to the road.';
 d.innerHTML=`<div class="row" style="justify-content:space-between"><div><div class="eyebrow">Segment details</div><div class="ttl" style="margin:2px 0 0">${nl?(s.mode==="sea"?"Sea":"Air")+" segment":"Segment"} ${s.i+1} <span class="hint">· km ${f1(s.km0)}–${f1(s.km1)}</span></div></div><span class="st ${s.k4}">${LBL[s.k4]}</span></div>
 ${hot.length?`<div class="hot"><span class="hint">Needs a look</span>${hot.map(h=>`<button class="chp${h.i===s.i?' on':''}" data-i="${h.i}" title="Segment ${h.i+1}, ${LBL[h.k4]}"><i class="dot8 ${h.k4}"></i>${h.i+1}</button>`).join('')}</div>`:'<div class="hint" style="margin-top:8px">All segments are green.</div>'}
 ${nl?`<div class="kv">${s.pv.map(q=>`<div><small>${q.l}</small><b style="color:${COL[q.k]}">${q.v.toFixed(q.u==='kn'||q.u==='kt'?0:1)} ${q.u}</b></div>`).join('')}</div>
 <p class="hint" style="color:#c8d1e8;margin:0">${s.k4==='g'?'All readings are within limits.':s.k4==='y'?'Marginal readings. Expect delays on this stretch.':'Readings are beyond limits. This stretch should not be attempted.'}</p>`:`<div class="kv">
  <div><small>Radar change</small><b style="color:${COL[s.s1k]}">${f1(s.k1)} dB</b></div>
  <div><small>Ground sinking</small><b style="color:${s.k2==null?'#8996b6':COL[s.s2k]}">${s.k2==null?'no data':f1(Math.abs(s.k2))+' mm/yr'}</b></div>
  <div><small>Usable data</small><b style="color:${COL[stv1(s.v1)]}">${Math.round(s.v1)}%</b></div>
 </div>
 <p class="hint" style="color:#c8d1e8;margin:0">${k1txt}${s.k2==null?' Ground-sinking data does not cover this route yet.':''}</p>
 <div class="eyebrow" style="margin-top:10px">Radar change, last 6 passes (dB) · data 12 days old</div>${sparkline(s)}`}`;
 $$('#detail .chp').forEach(e=>e.addEventListener('click',()=>{select(+e.dataset.i);focusSeg(+e.dataset.i)}));
}
function renderHead(){
 if(!S.routes.length||!S.routes[S.ri])return;
 const st=stats(),tm=scoreRoute(S.routes[S.ri],cur().v).t;
 $('#mapTitle').textContent=`${S.cargo}  →  ${S.sp.name}`;
 $('#mapEyebrow').textContent=`${S.routes[S.ri].label}${S.ri===S.rec?' ★':''} · ${fe(S.len)} km · ${fmtT(tm)} · readiness ${Math.round(st.score)}%`;
}
function renderStatsCore(){renderHead()}
function renderStats(){renderStatsCore();renderDay()}
function focusSeg(i){const s=S.segs[i],c=s.ll[Math.floor(s.ll.length/2)];flyTo({lon:c[0],lat:c[1],z:Math.max(S.view.z,S.far?5.5:11.5)},600)}
function renderDay(){
 let mch=false;if(S.far&&S.geo)mch=refreshModes();
 if(S.routes.length&&(refreshRec()||mch)){S.sel=weakestIdx();renderStatsCore()}
 const d=S.day,c=cur(),v=c.v,k=st8(v),M=MODEM();
 $('#day').max=M?59:7;$('#day').value=d;
 $('#fday').textContent=c.l;
 $('#fsel').textContent=M?'Selected month':'Selected day';
 $('#fttl').textContent=M?'Monthly rain outlook, up to 5 years. Slide the month.':'Daily rain forecast';
 $('#fnote').textContent=M?'Beyond about two weeks no weather forecast exists. These bars show the typical heavy-rain day for each month, built from the seasonal pattern at this spaceport (simulated here). Use them to pick a launch-campaign window, not a delivery day.':('This is a weather forecast, not a radar measurement. Segment colours stay based on the latest satellite pass. The slider only changes the rain forecast and the wet-prone markers. '+(S.rainSrc==='live'?'Forecast: Open-Meteo, live.':'Forecast: simulated (Open-Meteo unreachable, fallback).'));
 $('#fnote').innerHTML='<details class="calc"><summary>About this forecast</summary><p>'+$('#fnote').textContent+'</p></details>';
 const wetN=S.segs.filter(s=>s.wet).length;
 $('#fread').innerHTML=`<div class="row" style="margin:4px 0"><span class="st ${k}">${LBL[k]}</span><b style="font-size:18px">${v} mm</b></div>
 <div class="hint" style="color:#c8d1e8">${k==='g'?'Light rain. No wet-prone markers.':k==='y'?`Fairly heavy rain. ${wetN} segments flagged by radar earlier are marked wet-prone.`:`Heavy rain. ${wetN} wet-prone segments are highlighted.`}</div>
 `;
 $('#rainov').style.opacity=v>=50?.3:v>=30?.14:0;
 $$('#qchips .qc').forEach(e=>e.classList.toggle('on',+e.dataset.d===d));
 $$('#modes .qc').forEach(e=>e.classList.toggle('on',(e.dataset.m==='m')===M));
 drawRain();renderDetail();renderRoutes();renderHead();drawOverlay();emit();
}
function drawRain(){
 const M=MODEM(),n=M?60:8,w=1000,h=120,px=40,pb=M?34:26,bw=(w-px-10)/n,Y=v=>h-pb-Math.min(90,v)/90*(h-pb-14);
 let o='';
 [[30,'30 mm (yellow)','#ffd23f'],[50,'50 mm (red)','#ff4d5e']].forEach(t=>{o+=`<line x1="${px}" x2="${w-6}" y1="${Y(t[0])}" y2="${Y(t[0])}" stroke="${t[2]}" stroke-opacity=".6" stroke-dasharray="4 4"/><text x="${w-8}" y="${Y(t[0])-3}" text-anchor="end" fill="${t[2]}" font-size="11.5">${t[1]}</text>`});
 o+=`<line x1="${px}" x2="${w-6}" y1="${Y(0)}" y2="${Y(0)}" stroke="#2a3a60"/>`;
 for(let d=0;d<n;d++){
  const v=M?Math.max(...S.mrain[d]):k8of(d),k=st8(v),on=d===S.day,x=px+d*bw+bw*(M?.1:.18),ww=bw*(M?.8:.64);
  o+=`<g class="b" data-d="${d}"><rect x="${px+d*bw}" y="0" width="${bw}" height="${h}" fill="transparent"/><rect x="${x}" y="${Y(v)}" width="${ww}" height="${Math.max(2,Y(0)-Y(v))}" rx="${M?1.5:4}" fill="${COL[k]}" opacity="${on?1:.55}" ${on?'stroke="#fff" stroke-width="'+(M?1.2:2)+'"':''}/>`;
  if(!M)o+=`<text x="${x+ww/2}" y="${Y(v)-5}" text-anchor="middle" fill="#e8edf8" font-size="13.5" font-weight="${on?700:400}">${v}</text><text x="${x+ww/2}" y="${h-8}" text-anchor="middle" fill="${on?'#35e0ee':'#8996b6'}" font-size="12.5">${DSH[d]}</text>`;
  else{const ml=monthLabel(d);if(d%6===0)o+=`<text x="${x+ww/2}" y="${h-18}" text-anchor="middle" fill="${on?'#35e0ee':'#8996b6'}" font-size="11">${ml.s}</text>`;if(ml.mo===0)o+=`<text x="${x}" y="${h-6}" fill="#bcd0f0" font-size="12" font-weight="600">${ml.yr}</text><line x1="${px+d*bw}" x2="${px+d*bw}" y1="14" y2="${h-pb}" stroke="#2a3a60" stroke-dasharray="2 3"/>`}
  o+=`</g>`}
 if(M){const c=cur();o+=`<text x="${px+4}" y="11" fill="#e8edf8" font-size="13">${c.l}: ${c.v} mm</text>`}
 $('#rain').innerHTML=o;
 $$('#rain .b').forEach(e=>e.addEventListener('click',()=>setDay(+e.dataset.d)));
}
function setDay(d){const before=S.ri,bm=S.tmCur;S.pinned=false;S.day=d;scheduleRadar();renderDay();if(S.net&&S.net.real&&!S.far)queueRoadRoute();if(S.far&&S.tmCur!==bm&&!S.tmUser)toast(`Recommended transport is now ${MODEL[S.tmCur]} for ${cur().l}.`);else if(S.ri!==before)toast(`Recommended route is now ${S.routes[S.rec].label} for ${cur().l}.`)}

/* ---------- actions ---------- */
function nearestNode(lon,lat,excl){const net=S.net,x=(lon-net.lon0)*net.kx,y=(lat-net.lat0)*net.ky;let b=1e9,id=-1;for(const n of net.nodes){if(n.id===net.pad||n.id===excl||!isFinite(net.dist[n.id]))continue;const d=Math.hypot(n.x-x,n.y-y);if(d<b){b=d;id=n.id}}return{id,km:b}}
function defaultOrigin(net){let b=null,bd=1e9;const target=Math.min(26,Math.max(...net.nodes.filter(n=>isFinite(net.dist[n.id])).map(n=>Math.hypot(n.x,n.y)))*.85);net.nodes.forEach(n=>{if(!isFinite(net.dist[n.id])||n.id===0)return;const d=Math.abs(Math.hypot(n.x,n.y)-target)+(n.x>0?4:0);if(d<bd){bd=d;b=n.id}});return b}
function loadSpaceport(id,instant){
 S.sp=SP.find(s=>s.id===id);S.net=genNet(S.sp);S.origin=demoOrigin();S.wp=null;S.roadWx=null;{const f=PICKS.find(p=>p[0]==={ksc:'Houston, USA',biak:'Jakarta, Indonesia'}[id]);S.far=f?mkFar(f[1],f[2],f[0]):null}
 S.pinned=false;recomputeUI(instant);upgradeOSMNet(S.sp);
}
async function recomputeUI(instant,keepView){
 const tok=++anaTok;
 if(S.far)loadOn(S.far.name);
 try{
  await buildRoutes(tok);
  if(anaTok!==tok)return;
  S.sel=weakestIdx();
  if($('#spsel'))$('#spsel').value=S.sp.id;
  syncPickup();
  renderStats();
  if(!keepView){const t=fitBounds();if(instant){S.view=t;req()}else flyTo(t,1000)}else req();
  if(S.far)upgradeLegsOSRM();else{S.routeSrc=S.net&&S.net.real?'osm':'sim';routeSrcTag()}
  queueAI();
  ldPct(97,'Rendering routes');await tick();
 }catch(e){console.error('route analysis failed',e);try{renderStats()}catch(_){};toast('Route analysis failed. Try another pickup point.')}
 finally{if(anaTok===tok)loadOff()}
}
function pickSpaceport(id,instant){
 if(S.sp&&S.sp.id===id&&!instant){flyTo(fitBounds(),700);return}
 S.day=0;loadSpaceport(id,instant);
 if(!instant)toast(`${S.sp.name}: ${S.sp.preset?'preset data':'sample data'}. Pickup point reset, drag the truck to change it.`);
}
function setOrigin(id){const was=!!S.far;S.far=null;S.origin=id;S.wp=null;S.pinned=false;recomputeUI(false,!was);toast(`Pickup moved. ${S.routes.length} route${S.routes.length>1?'s':''} found, ${S.routes[S.rec].label} is recommended.`)}
function setWaypoint(id){S.wp=id;recomputeUI(false,true);toast(`Your route via the new point: ${f1(S.len)} km, scored with the same formula.`)}
let tt;function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('on'),3400)}

/* ---------- pointer handling ---------- */
let ghost=null,dk=null,pan=null,pend=null,dragMoved=0,dragStart=null;
const stageXY=e=>{const r=stage.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
function startDrag(kind,e,fromMarker){
 if(kind==='truck')coachHide();
 e.preventDefault();dk=kind;dragMoved=0;dragStart=[e.clientX,e.clientY];
 ghost=document.createElement('div');ghost.className='ghost';
 const sym={rocket:'i-rocket3d',truck:TS(),grip:null,wp:null}[kind];
 ghost.innerHTML=sym?`<svg viewBox="${kind==='truck'?'0 0 72 48':'0 0 64 64'}"><use href="#${sym}"/></svg>`:`<svg viewBox="0 0 40 40"><path d="M20 4l16 16-16 16L4 20z" fill="#e8f9ff" stroke="#35e0ee" stroke-width="3"/></svg>`;
 if(kind==='truck'){ghost.style.width='110px';ghost.style.height='74px'}
 document.body.appendChild(ghost);mv(e);
 window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up,{once:true});window.addEventListener('pointercancel',up,{once:true});
}
function nearestPin(x,y){let best=null,bd=46;SP.forEach(sp=>{const[px,py]=P(sp.lon,sp.lat),d=Math.hypot(px-x,py-y);if(d<bd){bd=d;best=sp.id}});return best}
function mv(e){
 if(!ghost)return;ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';dragMoved=Math.hypot(e.clientX-dragStart[0],e.clientY-dragStart[1]);
 const[x,y]=stageXY(e),inside=x>=0&&y>=0&&x<=S.w&&y<=S.h;
 if(dk==='rocket'){const id=inside?nearestPin(x,y):null;if(id!==S.hotSp){S.hotSp=id;drawOverlay()}}
 else if(S.net){
  if(inside){const[lo,lat]=U(x,y),lon=relPad(lo),n=nearestNode(lon,lat,dk==='wp'?null:(S.far?null:S.origin)),nn=S.net.nodes[n.id],[nx,ny]=P(...nn.ll);if(n.km<7)S.snap={x,y,nx,ny,ok:true,kind:dk==='truck'?'truck':'grip'};else S.snap={x,y,nx:x,ny:y,ok:dk==='truck'&&isLand(lon,lat),kind:dk==='truck'?'truck':'grip'}}else S.snap=null;
  drawOverlay();
 }
}
function up(e){
 window.removeEventListener('pointermove',mv);const kind=dk,moved=dragMoved;
 if(ghost)ghost.remove();ghost=null;dk=null;S.snap=null;S.hotSp=null;
 const[x,y]=stageXY(e),inside=x>=0&&y>=0&&x<=S.w&&y<=S.h;
 if(kind==='rocket'){const id=inside?nearestPin(x,y):null;if(id){pickSpaceport(id)}else{toast('Drop the rocket on one of the spaceport pins. Zoom out to see the others.');drawOverlay()}}
 else if(kind==='truck'||kind==='grip'||kind==='wp'){
  if(kind==='wp'&&moved<5){S.wp=null;recomputeUI(false,true);toast('Waypoint removed.');return}
  if(!inside){drawOverlay();if(moved>5)toast('Drop it on the map.');return}
  const[lo,lat]=U(x,y),lon=relPad(lo),n=nearestNode(lon,lat,kind==='truck'&&!S.far?S.origin:null);
  if(n.km>=7){if(kind==='truck'){if(isLand(lon,lat))setFar(mkFar(lon,lat));else{toast('Drop the truck on land.');drawOverlay()}return}toast('Too far from the simulated roads around this spaceport. Zoom in and drop it on a road area.');drawOverlay();return}
  if(kind==='truck')setOrigin(n.id);else{if(n.id===S.origin&&!S.far){toast('Pick a point away from the pickup.');drawOverlay();return}setWaypoint(n.id)}
 }
}
function hget(){try{return JSON.parse(localStorage.getItem(HK)||'[]')}catch(e){return window.__mem||[]}}
function hset(a){try{localStorage.setItem(HK,JSON.stringify(a))}catch(e){window.__mem=a}}
function saveAnalysis(){
 const st=stats(),c=cur(),a=hget();
 a.unshift({id:Date.now(),at:new Date().toISOString(),sp:S.sp.id,spn:S.sp.name,cargo:S.cargo,o:S.origin,far:S.far,wp:S.wp,mode:S.mode,idx:S.day,when:c.l,rain:c.v,score:st.score,km:+S.len.toFixed(1),n:st.N,cnt:st.cnt,weak:st.weak.i+1,wk:st.k7,ri:S.ri,tm:S.tmUser,rl:S.routes[S.ri].label});
 hset(a.slice(0,50));renderHist();
 if(window.SUREDB&&SUREDB.enabled()){toast('Analysis saved. Syncing shared history…');
  SUREDB.push(hget(),'chore(db): save analysis').then(m=>{hset(m);renderHist();toast('Saved and synced to shared history.')}).catch(e=>toast('Saved locally; shared sync failed ('+e.message+').'))}
 else toast('Analysis saved to History.');
}
function renderHist(){
 const a=hget();$('#hn').textContent=a.length;
 $('#hlist').innerHTML=a.length?a.map((h,i)=>{const d=new Date(h.at),ds=d.toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const prev=a[i+1]&&a[i+1].sp===h.sp&&a[i+1].cargo===h.cargo?h.score-a[i+1].score:null;
  return `<div class="hrow"><div><b>${h.cargo} → ${h.spn}</b><div class="m"><span>${ds}</span><span>${h.km} km · ${h.n} segments</span><span>Readiness <b style="color:#e8edf8">${Math.round(h.score)}</b>${prev!=null?` (${prev>=0?'+':''}${Math.round(prev)} vs previous)`:''}</span><span class="st ${h.wk}">${LBL[h.wk]}</span><span>Weakest: segment ${h.weak}</span><span>${h.mode==='m'?'Outlook':'Forecast'} ${h.when}: ${h.rain} mm${h.wp!=null?' · rerouted':''}</span></div></div><div class="row"><button class="btn" data-o="${h.id}">Open</button><button class="btn" data-x="${h.id}">Delete</button></div></div>`}).join(''):'<div class="empty">Nothing saved yet. Press "Save analysis" to keep the current route.</div>';
 $$('#hlist [data-o]').forEach(b=>b.addEventListener('click',()=>openHist(+b.dataset.o)));
 $$('#hlist [data-x]').forEach(b=>b.addEventListener('click',()=>{const a=hget().filter(h=>h.id!==+b.dataset.x);hset(a);renderHist();
  if(window.SUREDB&&SUREDB.enabled())SUREDB.push(a,'chore(db): delete analysis',{replace:true}).catch(e=>toast('Shared delete failed ('+e.message+').'))}));
}
async function openHist(id){
 const h=hget().find(x=>x.id===id);if(!h)return;
 if(!SP.find(s=>s.id===h.sp)){toast('That saved analysis used a spaceport that is no longer in this mockup.');return}
 S.mode=h.mode;chips();loadSpaceport(h.sp,true);S.far=h.far||null;S.origin=h.o;S.wp=h.wp;S.cargo=h.cargo;$('#cargo').value=h.cargo;$('#dockTruck').innerHTML=`<use href="#${TS()}"/>`;S.day=h.idx;
 await recomputeUI(true);S.tmUser=h.tm||null;renderDay();if(h.ri!=null&&S.routes[h.ri]&&h.ri!==S.ri)setRoute(h.ri,true);$('#modal').classList.remove('on');toast('Saved analysis restored.');
}
/* ---------- route panels ---------- */
function cnt3(r){const c={g:0,y:0,r:0};r.segs.forEach(s=>c[s.k4]++);return c}
function bigPart(a,b){const d={base:a.base-b.base,sat:a.sat-b.sat,rain:a.rain-b.rain};let k='base',m=-1e9;for(const x in d)if(d[x]>m){m=d[x];k=x}return{k,v:m}}
function renderRoutes(){
 if(!$('#routes'))return;
 if(!S.routes.length){if(S.far&&S.mi){$('#routes').innerHTML=`<div class="eyebrow">Route options</div>${modeBar()}<div class="hint" style="margin-top:6px">No route is drawn because no transport mode is possible and safe for this pickup.</div>`;$('#detail').innerHTML='<div class="empty">No route to show.</div>';$('#mapEyebrow').textContent='NO RECOMMENDED ROUTE · '+S.far.name}return}
 const c=cur(),v=c.v,lv=rl(v),rows=S.routes.map((r,i)=>({r,i,sc:scoreRoute(r,v),cn:cnt3(r)})),ord=[...rows].sort((a,b)=>a.sc.eff-b.sc.eff),rec=rows[S.rec],act=rows[S.ri],two=act.i!==rec.i,fast=[...rows].sort((a,b)=>a.sc.t-b.sc.t)[0],f=(a,k)=>fe(a.sc[k]);
 const nl=!!(S.far&&act.r.mode&&act.r.mode!=='land'),PN=k=>nl&&k==='sat'?'rougher weather along the route':PARTS[k];
 let reason='';
 if(two){const d=act.sc.eff-rec.sc.eff,bp=bigPart(act.sc,rec.sc);reason=`${act.r.label} takes ${fe(d)} min longer than ${rec.r.label}, mainly from ${PN(bp.k)} (+${fe(bp.v)}).`}
 else{const ru=ord[1];if(ru){const d=ru.sc.eff-rec.sc.eff,bp=bigPart(ru.sc,rec.sc);reason=`${rec.r.label} beats ${ru.r.label} by ${fe(d)} min, because ${ru.r.label} has ${PN(bp.k)} (+${fe(bp.v)}).`}}
 const tl=`Travel time <b>${fmtT(act.sc.t)}</b>${two?` · ★ ${rec.r.short} ${fmtT(rec.sc.t)}`:''}${fast.i!==act.i&&fast.i!==rec.i?` · fastest ${fast.r.short} ${fmtT(fast.sc.t)}`:''}`;
 const bar=o=>{const n=o.r.segs.length;return `<span class="rbar" title="${o.cn.g} green · ${o.cn.y} yellow · ${o.cn.r} red segments"><i style="width:${o.cn.g/n*100}%;background:var(--g)"></i><i style="width:${o.cn.y/n*100}%;background:var(--y)"></i><i style="width:${o.cn.r/n*100}%;background:var(--r)"></i></span>`};
 const ci=(h,s)=>`<div class="ci"><b>${h}</b><span>${s}</span></div>`;

  $('#routes').innerHTML=`<div class="eyebrow">Route options</div>${modeBar()}<div class="ttl" style="margin-bottom:6px">${rows.length} route${rows.length>1?'s':''} · ${c.l} <span class="hint" id="routeSrc" style="float:right"></span></div>
 <div class="list" style="gap:5px">`+ord.map((o,k)=>`<div class="li rt${o.i===S.ri?' on':''}" data-r="${o.i}"><span class="rk${o.i===S.rec?' best':''}">${o.i===S.rec?'★':k+1}</span><span style="min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><b>${o.r.label}</b> <span class="hint"><span>${fe(o.r.len)} km · ${fmtT(o.sc.t,1)}</span></span></span><span class="sp"></span>${bar(o)}<span class="mono" title="Score = travel time in minutes (lower is better)" style="min-width:34px;text-align:right">${fe(o.sc.eff)}</span></div>`).join('')+`</div>
 ${S.pinned&&S.ri!==S.rec?'<button class="btn" id="backrec" style="margin-top:8px;padding:5px 10px;font-size:11.5px">Back to recommended</button>':''}
 <div class="reason">${reason}</div>
 <div class="mini"><div><small>Base min</small><b>${f(act,'base')}</b></div><div><small>${nl?'Weather':'Radar'} +min</small><b>${f(act,'sat')}</b></div><div><small>Rain +min</small><b>${f(act,'rain')}</b></div><div><small>Red segs</small><b>${act.sc.red}</b></div><div class="tot"><small>Score min</small><b>${f(act,'eff')}</b></div></div>
 <div class="tline">${tl}</div>
 <div id="aibox" style="margin-top:8px"></div>
 ${nl?legBox(act.r,v):''}
 <details class="calc"><summary>How this is scored</summary><div class="cg">${ci('Score','Travel time in minutes. The fastest route wins.')}${ci('Slowdown','Yellow runs at 71% speed, red at 47%, wet road up to 17% slower in heavy rain.')}${S.far?ci('Mode','Sea, then land, then air. A mode with a red segment is skipped.'):''}</div></details>`;
 routeSrcTag();queueAI();
 $$('#routes .rt').forEach(e=>e.addEventListener('click',()=>{setRoute(+e.dataset.r,true);focusRoute()}));
 $$('#routes .tmc').forEach(e=>e.addEventListener('click',()=>setMode(e.dataset.m)));
 $$('#routes .legopt').forEach(e=>e.addEventListener('click',()=>{const r=S.routes[S.ri];if(!r||!r.legSets)return;r.legSets[+e.dataset.l].pin=+e.dataset.i;S.pinned=true;renderDay()}));
 $$('#routes .legauto').forEach(e=>e.addEventListener('click',ev=>{ev.preventDefault();const r=S.routes[S.ri];if(r&&r.legSets){r.legSets[+e.dataset.l].pin=null;renderDay()}}));
 const tr=$('#tmrec');if(tr)tr.addEventListener('click',()=>{S.tmUser=null;renderDay();flyTo(fitBounds(),600)});
 const bk=$('#backrec');if(bk)bk.addEventListener('click',()=>{S.pinned=false;setRoute(S.rec,false)});
}
function legBox(r,v){
 const L=['A','B','C'];
 const rows=(r.legSets||[]).map((ls,li)=>{const bi=legBest(ls,v),rc=legRec(ls),b=ls.c[bi],red=b.segs.filter(s=>s.k4==='r').length;
  const opts=ls.c.map((c,i)=>`<button class="tmc legopt${i===bi?' on':''}" data-l="${li}" data-i="${i}" style="padding:4px 8px"><span class="tmh">Road ${L[i]}${i===rc?' ★':''}</span><small>${fe(c.km)} km · ${fmtT(c.eff/60,1)}</small></button>`).join('');
  return `<div class="ci"><b>${ls.from} to ${ls.to}</b>${ls.pin!=null&&ls.pin!==rc?`<span>+${fe(b.eff-ls.c[rc].eff)} min vs ★ <a href="#" class="legauto" data-l="${li}">Reset</a></span>`:''}<div class="tmbar" style="margin:6px 0 0">${opts}</div></div>`}).join('');
 return `<div class="eyebrow" style="margin-top:10px">Truck roads</div><div class="cg" style="margin-top:5px">${rows}</div>`}
function focusRoute(){const r=S.routes[S.ri];if(!r)return;flyTo(fitBounds(),500)}
/* ---------- pickup point input ---------- */
function nodeName(n){const k=Math.round(Math.atan2(n.y,n.x)/(Math.PI/4));return `${DIRS[((k%8)+8)%8]} sector, ${Math.round(Math.hypot(n.x,n.y))} km from pad`}
function reachNodes(){const net=S.net;return net.nodes.filter(n=>n.id!==net.pad&&isFinite(net.dist[n.id])).sort((a,b)=>Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y))}
function syncPickup(){
 if(!S.net||!$('#zones'))return;const seen=new Set(),L=reachNodes().filter(n=>Math.hypot(n.x,n.y)>=3),step=Math.max(1,Math.ceil(L.length/45)),opts=[];
 L.forEach((n,i)=>{if(i%step)return;const nm=nodeName(n);if(!seen.has(nm)){seen.add(nm);opts.push(nm)}});
 $('#zones').innerHTML=PICKS.map(p=>`<option value="${p[0]}">`).join('')+opts.map(o=>`<option value="${o}">`).join('');
 $('#pickText').value=S.far?S.far.name:nodeName(S.net.nodes[S.origin]);
}
function setPickMode(on){S.pickMode=on;stage.classList.toggle('pick',on);$('#pickMap').classList.toggle('on',on);if(on)toast('Click anywhere on land to set the pickup point.')}
function pickFromText(){
 const q=$('#pickText').value.trim().toLowerCase();if(!q||!S.net)return;
 const m=q.match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);let lon,lat,nm=null;
 if(m){lat=+m[1];lon=+m[2];if(Math.abs(lat)>85||Math.abs(lon)>180){toast('Use "lat, lon", for example 29.76, -95.37.');return}}
 else{const f=PICKS.find(p=>p[0].toLowerCase()===q)||PICKS.find(p=>p[0].toLowerCase().includes(q));
  if(f){lon=f[1];lat=f[2];nm=f[0]}
  else{const R=reachNodes(),g=R.find(n=>nodeName(n).toLowerCase()===q)||R.find(n=>nodeName(n).toLowerCase().includes(q));
   if(g){if(!S.far&&g.id===S.origin)toast('That is already the pickup point.');else setOrigin(g.id);return}
   toast('No match. Pick a city from the list, or type "lat, lon".');return}}
 lon=relPad(lon);const n=nearestNode(lon,lat,null);
 if(n.km<7){if(!S.far&&n.id===S.origin){toast('That is already the pickup point.');return}setOrigin(n.id);return}
 if(!isLand(lon,lat)){toast('That point is not on land. Try another place.');return}
 setFar(mkFar(lon,lat,nm));
}
let coachOn=true,coachT=null;
function coachShow(){
 const c=$('#coach');if(!coachOn||!S.net||!c)return;if(!S.mv){coachT=setTimeout(coachShow,600);return}
 const sr=stage.getBoundingClientRect(),dr=$('#dockTruck').getBoundingClientRect();if(!dr.width)return;
 const sx=dr.left-sr.left+dr.width/2,sy=dr.top-sr.top+dr.height/2;let tx,ty;
 if(S.far){const tg=[S.w*.36,S.h*.62],cp=P(S.far.lon,S.far.lat),cs=PICKS.map(p=>P(relPad(p[1]),p[2])).filter(q=>q[0]>70&&q[0]<S.w-150&&q[1]>170&&q[1]<S.h-80&&Math.hypot(q[0]-cp[0],q[1]-cp[1])>90).sort((a,b)=>Math.hypot(a[0]-tg[0],a[1]-tg[1])-Math.hypot(b[0]-tg[0],b[1]-tg[1]));[tx,ty]=cs[0]||tg}
 else{const[lon,lat]=U(S.w*.36,S.h*.62),n=nearestNode(lon,lat,S.origin);[tx,ty]=P(...S.net.nodes[n.id].ll)}
 c.style.setProperty('--sx',sx+'px');c.style.setProperty('--sy',sy+'px');c.style.setProperty('--tx',tx+'px');c.style.setProperty('--ty',ty+'px');
 const l=$('#ctl');l.setAttribute('x1',sx);l.setAttribute('y1',sy);l.setAttribute('x2',tx);l.setAttribute('y2',ty);
 const r=$('#ccr');r.style.left=tx+'px';r.style.top=ty+'px';
 c.classList.add('on');$('#dragTruck').classList.add('coachpulse');clearTimeout(coachT);coachT=setTimeout(coachHide,23000);
}
function coachHide(){coachOn=false;clearTimeout(coachT);const c=$('#coach');if(c)c.classList.remove('on');$('#dragTruck').classList.remove('coachpulse')}
function chips(){const L=MODEM()?[['This month',0],['+6 months',6],['+1 year',12],['+3 years',36],['+5 years',59]]:[['Today',0],['Tomorrow',1],['+3 days',3],['+7 days',7]];
 $('#qchips').innerHTML=L.map(a=>`<button class="qc" data-d="${a[1]}">${a[0]}</button>`).join('');$$('#qchips .qc').forEach(b=>b.addEventListener('click',()=>setDay(+b.dataset.d)))}
/* ---------- mount: wire DOM provided by the React shell ---------- */
export function mount(){
 stage=$('#stage');cv=$('#base');ov=$('#ov');
setDayLabels(...todayLabels());setDatePill();setInterval(setDatePill,6e4);
stage.addEventListener('wheel',e=>{e.preventDefault();const r=stage.getBoundingClientRect();zoomAt(S.view.z-e.deltaY*.0018,e.clientX-r.left,e.clientY-r.top)},{passive:false});
$('#dragTruck').addEventListener('pointerdown',e=>startDrag('truck',e,false));
$('#save').addEventListener('click',saveAnalysis);
$('#pickGo').addEventListener('click',pickFromText);
$('#zin').onclick=()=>flyTo({...S.view,z:clampZ(S.view.z+1)},260);
$('#zout').onclick=()=>flyTo({...S.view,z:clampZ(S.view.z-1)},260);
$('#zcity').onclick=()=>flyTo(fitBounds(),700);
$('#zglobal').onclick=()=>flyTo({lon:20,lat:15,z:clampZ(Math.log2(Math.min(S.w,S.h)*.9/256))},1100);

stage.addEventListener('pointerdown',e=>{
 if(e.target.closest('.dock,.zoomc'))return;
 const t=e.target.closest('[data-h]'),k=t&&t.dataset.h;
 if(k==='truck'||k==='rocket'||k==='grip'||k==='wp'){
  if(k==='rocket'){pend={type:'rocket'};}else{startDrag(k,e,true);return}
 }
 else if(k==='route')pend={type:'route',r:+t.dataset.r};
 else if(k==='seg')pend={type:'seg',i:+t.dataset.i};
 else if(k==='sp')pend={type:'sp',id:t.dataset.id};else pend=null;
 pan={x:e.clientX,y:e.clientY,m0:S.mv.slice(),moved:0};stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove',e=>{
 if(pan){const dx=e.clientX-pan.x,dy=e.clientY-pan.y;pan.moved=Math.max(pan.moved,Math.hypot(dx,dy));if(pan.moved>5){stage.classList.add('panning');const w0=ws(),mx=pan.m0[0]-dx/w0,my=Math.max(0,Math.min(1,pan.m0[1]-dy/w0));S.view.lon=S.view.lon+wrapL(mx*360-180-S.view.lon);S.view.lat=merYinv(my);req();$('#tip').style.display='none'}return}
 const rt=e.target.closest&&e.target.closest('[data-h="route"]'),t=e.target.closest&&e.target.closest('[data-h="seg"]'),tp=$('#tip');
 if(rt&&!t){const r=S.routes[+rt.dataset.r],sc=scoreRoute(r,cur().v),[x,y]=stageXY(e);tp.style.display='block';tp.innerHTML=`${r.label} · ${fe(r.len)} km · ${fmtT(sc.t)} · ${fe(sc.eff)} min${+rt.dataset.r===S.rec?' · <b style="color:#ffd23f">recommended</b>':' · click to see why'}`;tp.style.left=Math.min(S.w-300,x+14)+'px';tp.style.top=(y+14)+'px'}
 else if(t){const s=S.segs[+t.dataset.i],[x,y]=stageXY(e);tp.style.display='block';tp.innerHTML=`Segment ${s.i+1} · km ${f1(s.km0)}–${f1(s.km1)} · <b style="color:${COL[s.k4]}">${LBL[s.k4]}</b>`;tp.style.left=Math.min(S.w-240,x+14)+'px';tp.style.top=(y+14)+'px'}else tp.style.display='none';
});
stage.addEventListener('pointerup',e=>{
 if(!pan)return;const moved=pan.moved;pan=null;stage.classList.remove('panning');
 if(moved<5&&pend){if(pend.type==='seg')select(pend.i);else if(pend.type==='route')setRoute(pend.r,true);else if(pend.type==='sp')pickSpaceport(pend.id);else if(pend.type==='rocket')flyTo(fitBounds(),600)}
 else if(moved<5&&S.pickMode&&S.net){const[x,y]=stageXY(e),[lo,lat]=U(x,y),lon=relPad(lo),n=nearestNode(lon,lat,S.far?null:S.origin);if(n.km<7){setPickMode(false);setOrigin(n.id)}else if(isLand(lon,lat)){setPickMode(false);setFar(mkFar(lon,lat))}else toast('Click on land to set the pickup.')}
 pend=null;
});
stage.addEventListener('dblclick',e=>{if(e.target.closest('[data-h],.dock,.zoomc'))return;const[x,y]=stageXY(e);zoomAt(S.view.z+1,x,y)});
stage.addEventListener('mouseleave',()=>$('#tip').style.display='none');

/* ---------- history ---------- */
$('#hist').addEventListener('click',()=>{renderHist();$('#modal').classList.add('on');
 if(window.SUREDB)SUREDB.pull().then(r=>{hset(SUREDB.merge(hget(),r));renderHist()}).catch(()=>{})});
$('#hclose').addEventListener('click',()=>$('#modal').classList.remove('on'));
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')$('#modal').classList.remove('on')});
$('#hclear').addEventListener('click',()=>{hset([]);renderHist();
 if(window.SUREDB&&SUREDB.enabled())SUREDB.push([],'chore(db): clear analyses',{replace:true}).catch(e=>toast('Shared clear failed ('+e.message+').'))});

$('#pickText').addEventListener('keydown',e=>{if(e.key==='Enter')pickFromText()});
$('#pickText').addEventListener('change',pickFromText);
$('#pickMap').addEventListener('click',()=>setPickMode(!S.pickMode));
/* ---------- init ---------- */
$('#cargo').addEventListener('change',e=>{S.cargo=e.target.value;$('#dockTruck').innerHTML=`<use href="#${TS()}"/>`;renderStats()});
$('#pills').innerHTML='<label class="lb" for="spsel">Spaceport</label><select id="spsel">'+SP.map(s=>`<option value="${s.id}">${s.name} (${s.ctry})</option>`).join('')+'</select>';
$('#spsel').addEventListener('change',e=>pickSpaceport(e.target.value));
$$('#modes .qc').forEach(b=>b.addEventListener('click',()=>{S.mode=b.dataset.m;S.day=0;S.pinned=false;chips();renderDay()}));
chips();
$('#day').addEventListener('input',e=>setDay(+e.target.value));
$('#togWet').addEventListener('change',drawOverlay);
$('#togRadar').addEventListener('change',()=>{S.radar=null;scheduleRadar()});
$$('#bmap .bm').forEach(b=>b.addEventListener('click',()=>{S.base=b.dataset.b;$$('#bmap .bm').forEach(x=>x.classList.toggle('on',x===b));req()}));
$('#reset').addEventListener('click',()=>{S.day=0;S.mode='d';chips();S.cargo=CARGO[0];$('#cargo').value=CARGO[0];$('#dockTruck').innerHTML='<use href="#i-truck-0"/>';S.nets={};loadSpaceport('ksc',true);toast('View reset.');coachOn=true;setTimeout(coachShow,300)});
new ResizeObserver(()=>{sizeCanvas();req()}).observe(stage);
sizeCanvas();
renderHist();
if(window.SUREDB)SUREDB.pull().then(r=>{hset(SUREDB.merge(hget(),r));renderHist()}).catch(()=>{});
loadSpaceport('ksc',true);
setTimeout(coachShow,500);
window.__S=S;
 emit();
}
export{S,SP,CARGO,PICKS,MODEL,MORD,COL,LBL,RANK,fmtT,fe,f1,cur,stats,scoreRoute,cnt3,bigPart,PARTS,setDay,setRoute,setMode,select,focusSeg,focusRoute,fitBounds,flyTo,zoomAt,pickSpaceport,loadSpaceport,setOrigin,setWaypoint,setFar,mkFar,isLand,landId,nearestNode,nodeName,reachNodes,setPickMode,pickFromText,saveAnalysis,openHist,hget,hset,renderHist,renderDay,renderStats,renderDetail,renderRoutes,drawOverlay,req,toast,coachShow,monthLabel,legBest,legRec,applyWeather,worstTxt,vehHTML,refHTML,legBox,sparkline,modeBar,noneBanner,weakestIdx,mpp,P,U,mer,wrapL,relPad,scheduleRadar,mmAuth,MODEM,st1,st2,st8,stv1,rl,risk,worst,TS};

bindAI({cur,stats});
