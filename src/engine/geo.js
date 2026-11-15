/* geo.js — Natural Earth coastline decode, land/water masks, polyline math, sea A* grid routing. */
import './geo-data.js';
import{S}from'./state.js';
import{hav,toV,fromV,vcross,vdot,unw}from'./util.js';
const GEO=window.GEO;
function b64bytes(s){const bin=atob(s),n=bin.length,u=new Uint8Array(n);for(let i=0;i<n;i++)u[i]=bin.charCodeAt(i);return u}
function decodeLand(s,q){const u=b64bytes(s);let p=0;const vi=()=>{let r=0,m=1,b;do{b=u[p++];r+=(b&127)*m;m*=128}while(b&128);return r%2?-(r+1)/2:r/2};
 const nr=vi(),rings=[];
 for(let i=0;i<nr;i++){const n=vi(),lon=new Float32Array(n),lat=new Float32Array(n),mx=new Float32Array(n),my=new Float32Array(n);let a=0,b=0,x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  for(let j=0;j<n;j++){a+=vi();b+=vi();const lo=a/q,la=b/q;lon[j]=lo;lat[j]=la;mx[j]=(lo+180)/360;const l=Math.max(-85.0511,Math.min(85.0511,la)),sn=Math.sin(l*Math.PI/180);my[j]=.5-Math.log((1+sn)/(1-sn))/(4*Math.PI);if(lo<x0)x0=lo;if(lo>x1)x1=lo;if(la<y0)y0=la;if(la>y1)y1=la}
  rings.push({lon,lat,mx,my,b:[x0,y0,x1,y1]})}
 return rings}
const L110=decodeLand(GEO.L110,100),L50=decodeLand(GEO.L50,1000),L10=decodeLand(GEO.L10,10000);
const relPad=l=>S.sp.lon+(((l-S.sp.lon+540)%360+360)%360-180);
function isLandIn(L,lon,lat){
 lon=((lon+540)%360+360)%360-180;let inside=false;
 for(const r of L){const b=r.b;if(lon<b[0]||lon>b[2]||lat<b[1]||lat>b[3])continue;
  let c=false;const n=r.lon.length;for(let i=0,j=n-1;i<n;j=i++){const xi=r.lon[i],yi=r.lat[i],xj=r.lon[j],yj=r.lat[j];if((yi>lat)!==(yj>lat)&&lon<(xj-xi)*(lat-yi)/(yj-yi)+xi)c=!c}
  if(c)inside=!inside}
 return inside}
function isLand(lon,lat){return isLandIn(L50,lon,lat)}
const isLand10=(lon,lat)=>isLandIn(L10,lon,lat);
let SEAMASK=null;
function seaMask(){
 if(SEAMASK)return SEAMASK;
 const W=4800,H=2400,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d',{willReadFrequently:true});
 g.fillStyle='#000';g.fillRect(0,0,W,H);g.fillStyle='#fff';g.beginPath();
 for(const r of L50){const n=r.lon.length;for(let j=0;j<n;j++){const x=(r.lon[j]+180)*W/360,y=(90-r.lat[j])*H/180;j?g.lineTo(x,y):g.moveTo(x,y)}g.closePath()}
 g.fill('evenodd');
 const img=g.getImageData(0,0,W,H).data;
 SEAMASK=(lon,lat)=>{const x=((lon+540)%360-180+180)*W/360|0,y=(90-lat)*H/180|0;if(x<0||x>=W||y<0||y>=H)return true;return img[(y*W+x)*4]>127};
 return SEAMASK}
const FMASKS={};
function fineMask(lon0,lat0){
 const k=lon0.toFixed(1)+','+lat0.toFixed(1);if(FMASKS[k])return FMASKS[k];
 const W=320,RAD=2.0,c=document.createElement('canvas');c.width=W;c.height=W;const g=c.getContext('2d',{willReadFrequently:true});
 g.fillStyle='#000';g.fillRect(0,0,W,W);g.fillStyle='#fff';g.beginPath();
 const lo0=lon0-RAD,lo1=lon0+RAD,la0=lat0-RAD,la1=lat0+RAD;
 for(const r of L10){const b=r.b;if(b[2]<lo0||b[0]>lo1||b[3]<la0||b[1]>la1)continue;const n=r.lon.length;
  for(let j=0;j<n;j++){const x=(r.lon[j]-lo0)*W/(RAD*2),y=(la1-r.lat[j])*W/(RAD*2);j?g.lineTo(x,y):g.moveTo(x,y)}g.closePath()}
 g.fill('evenodd');
 const img=g.getImageData(0,0,W,W).data;
 const f=(lon,lat)=>{const x=(lon-lo0)*W/(RAD*2)|0,y=(la1-lat)*W/(RAD*2)|0;if(x<0||x>=W||y<0||y>=W)return seaMask()(lon,lat);return img[(y*W+x)*4]>127};
 f.lon0=lon0;f.lat0=lat0;return FMASKS[k]=f}
function mkWaterFast(a,b){
 const fm=[fineMask(a[0],a[1]),fineMask(b[0],b[1])],sm=seaMask();
 return(lon,lat)=>{for(const f of fm){if(Math.abs(lon-f.lon0)<=2&&Math.abs(lat-f.lat0)<=2)return!f(lon,lat)}return!sm(lon,lat)}}
function gcPts(a,b,n){const A=toV(a[0],a[1]),B=toV(b[0],b[1]),ang=Math.acos(Math.max(-1,Math.min(1,vdot(A,B))));if(ang<1e-6)return[[a[0],a[1]],[b[0],b[1]]];const sn=Math.sin(ang),out=[];for(let k=0;k<=n;k++){const u=k/n,x=Math.sin((1-u)*ang)/sn,y=Math.sin(u*ang)/sn;out.push(fromV([A[0]*x+B[0]*y,A[1]*x+B[1]*y,A[2]*x+B[2]*y]))}out[0]=[a[0],a[1]];out[n]=[b[0],b[1]];return out}
function chaikin(p,n){for(let r=0;r<n;r++){const o=[p[0]];for(let i=0;i<p.length-1;i++){const A=p[i],B=p[i+1];o.push([A[0]*.75+B[0]*.25,A[1]*.75+B[1]*.25],[A[0]*.25+B[0]*.75,A[1]*.25+B[1]*.75])}o.push(p[p.length-1]);p=o}return p}
function viaPoly(w){let out=[];for(let i=0;i<w.length-1;i++){const d=hav(w[i],w[i+1]),s=gcPts(w[i],w[i+1],Math.max(2,Math.round(d/120)));out=out.concat(i?s.slice(1):s)}return chaikin(out,2)}
function arcPoly(a,b,am,R){const A=toV(a[0],a[1]),B=toV(b[0],b[1]);let ax=vcross(A,B),an=Math.hypot(ax[0],ax[1],ax[2]);if(an<1e-6){ax=[0,0,1];an=1}ax=ax.map(x=>x/an);
 const ang=Math.max(1e-6,Math.acos(Math.max(-1,Math.min(1,vdot(A,B))))),sn=Math.sin(ang),angE=Math.min(ang,.5),ph=R()*6.28,wa=(.02+R()*.02)*angE,M=Math.max(8,Math.round(ang*6371/120)),out=[];
 for(let k=0;k<=M;k++){const u=k/M,x=Math.sin((1-u)*ang)/sn,y=Math.sin(u*ang)/sn,q=[A[0]*x+B[0]*y,A[1]*x+B[1]*y,A[2]*x+B[2]*y],o=am*angE*Math.sin(Math.PI*u)+wa*Math.sin(4*Math.PI*u+ph)*Math.sin(Math.PI*u);out.push(fromV([q[0]+ax[0]*o,q[1]+ax[1]*o,q[2]+ax[2]*o]))}
 out[0]=[a[0],a[1]];out[M]=[b[0],b[1]];return out}
const polyKm=p=>{const c=[0];for(let k=1;k<p.length;k++)c.push(c[k-1]+hav(p[k-1],p[k]));return c};
/* fraction of the polyline DISTANCE that runs over land — sampled by km, not by vertex
   (vertex sampling lets a dense access-channel polyline dominate the count and kill the route) */
function landFrac(p){const cum=polyKm(p),Lt=cum[cum.length-1],n=Math.max(10,Math.ceil(Lt/10));let land=0,tot=0;
 for(let k=1;k<n;k++){const s=Lt*k/n;let i=1;while(i<cum.length-1&&cum[i]<s)i++;const u=(s-cum[i-1])/((cum[i]-cum[i-1])||1),x=Math.max(-179.9999,Math.min(179.9999,p[i-1][0]+(p[i][0]-p[i-1][0])*u)),y=p[i-1][1]+(p[i][1]-p[i-1][1])*u;tot++;if(isLand(x,y))land++}
 return tot?land/tot:0}
function unwrapBack(p){for(let k=p.length-2;k>=0;k--)p[k]=[unw(p[k][0],p[k+1][0]),p[k][1]];return p}
function modeBlobs(poly,R,rm){const cum=polyKm(poly),Lt=cum[cum.length-1];return[.3,.52,.74].map(t=>{let i=1;while(i<cum.length-1&&cum[i]<Lt*t)i++;const q=poly[i];return{lon:relPad(q[0]+(R()-.5)*3),lat:q[1]+(R()-.5)*3,r:Math.max(170,Lt*(rm+R()*.03))}})}
let WATER=null;
function segWater(a,b){const d=hav(a,b),n=Math.max(2,Math.ceil(d/6));for(let k=1;k<n;k++){const u=k/n;if(!WATER(a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u))return false}return true}
function waterFrac(p){const cum=polyKm(p),Lt=cum[cum.length-1],n=Math.max(10,Math.ceil(Lt/8)),ap=Math.min(60,Lt*.08);let land=0,tot=0;for(let k=1;k<n;k++){const s=Lt*k/n;if(s<ap||s>Lt-ap)continue;let i=1;while(i<cum.length-1&&cum[i]<s)i++;const u=(s-cum[i-1])/((cum[i]-cum[i-1])||1),x=Math.max(-179.9999,Math.min(179.9999,p[i-1][0]+(p[i][0]-p[i-1][0])*u)),y=p[i-1][1]+(p[i][1]-p[i-1][1])*u;tot++;if(!WATER(x,y))land++}return tot?land/tot:0}
function chaikinW(pts){
 if(pts.length<3)return pts;
 for(let k=0;k<2;k++){
  const n=pts.length,keep=new Array(n).fill(false);
  for(let i=1;i<n-1;i++){const R=[pts[i-1][0]*.25+pts[i][0]*.75,pts[i-1][1]*.25+pts[i][1]*.75],Q=[pts[i][0]*.75+pts[i+1][0]*.25,pts[i][1]*.75+pts[i+1][1]*.25];if(!segWater(R,Q))keep[i]=true}
  const o=[pts[0]];
  for(let i=0;i<n-1;i++){const A=pts[i],B=pts[i+1];o.push([A[0]*.75+B[0]*.25,A[1]*.75+B[1]*.25],[A[0]*.25+B[0]*.75,A[1]*.25+B[1]*.75]);if(i+1<n-1&&keep[i+1])o.push(B)}
  o.push(pts[n-1]);pts=o}
 return pts}
function seaGraph(a,b,M){
 WATER=mkWaterFast(a,b);
 const lo0=Math.min(a[0],b[0])-M,lo1=Math.max(a[0],b[0])+M,la0=Math.max(-78,Math.min(a[1],b[1])-M),la1=Math.min(78,Math.max(a[1],b[1])+M),ST=1.1,FS=.13,FR=1.4;
 const cells=[],nearEnd=p=>Math.hypot(p[0]-a[0],p[1]-a[1])<=FR||Math.hypot(p[0]-b[0],p[1]-b[1])<=FR;
 const add=(lon,lat,reach)=>{if(WATER(lon,lat))cells.push({lon,lat,reach,adj:[]})};
 for(let lat=la0;lat<=la1+.001;lat+=ST)for(let lon=lo0;lon<=lo1+.001;lon+=ST)if(!nearEnd([lon,lat]))add(lon,lat,ST*2.35);
 for(let lat=la0;lat<=la1+.001;lat+=FS)for(let lon=lo0;lon<=lo1+.001;lon+=FS)if(nearEnd([lon,lat]))add(lon,lat,FS*3.2);
 const BUK=1.0,buk=new Map(),bk=(lon,lat)=>Math.floor(lon/BUK)+','+Math.floor(lat/BUK);
 cells.forEach((c,i)=>{const k=bk(c.lon,c.lat);(buk.get(k)||buk.set(k,[]).get(k)).push(i)});
 const RMAX=ST*2.35,RB=Math.ceil(RMAX/BUK);
 for(let i=0;i<cells.length;i++){const c=cells[i],bi=Math.floor(c.lon/BUK),bj=Math.floor(c.lat/BUK);
  for(let dj=-RB;dj<=RB;dj++)for(let di=-RB;di<=RB;di++){const l=buk.get((bi+di)+','+(bj+dj));if(!l)continue;
   for(const t of l){if(t===i)continue;const o=cells[t],d=Math.hypot(c.lon-o.lon,c.lat-o.lat);
    if(d>Math.max(c.reach,o.reach)||d<1e-6)continue;
    if(segWater([c.lon,c.lat],[o.lon,o.lat]))c.adj.push({to:t,w:hav([c.lon,c.lat],[o.lon,o.lat])})}}}
 const nearW=p=>{const ix=cells.map((c,i)=>[i,(c.lon-p[0])**2+(c.lat-p[1])**2]).sort((x,y)=>x[1]-y[1]).slice(0,40);for(const e of ix)if(segWater(p,[cells[e[0]].lon,cells[e[0]].lat]))return e[0];return ix.length?ix[0][0]:-1};
 return{cells,ia:nearW(a),ib:nearW(b)}}
function seaAStar(g,src,dst,pen){
 const N=g.cells.length,dist=new Float64Array(N).fill(Infinity),prev=new Int32Array(N).fill(-1),done=new Uint8Array(N);dist[src]=0;
 const goal=[g.cells[dst].lon,g.cells[dst].lat],key=i=>dist[i]+hav([g.cells[i].lon,g.cells[i].lat],goal);
 const H=[src],swap=(i,j)=>{const t=H[i];H[i]=H[j];H[j]=t},up=i=>{for(;i>0;){const p=(i-1)>>1;if(key(H[p])<=key(H[i]))break;swap(p,i);i=p}},dn=i=>{for(;;){const l=2*i+1,r=l+1;let m=i;if(l<H.length&&key(H[l])<key(H[m]))m=l;if(r<H.length&&key(H[r])<key(H[m]))m=r;if(m===i)break;swap(m,i);i=m}};
 while(H.length){const u=H[0];H[0]=H[H.length-1];H.pop();if(H.length)dn(0);
  if(u===dst)break;if(done[u])continue;done[u]=1;
  for(const a of g.cells[u].adj){const nd=dist[u]+a.w*(1+(pen?pen(u,a.to):0));if(nd<dist[a.to]){dist[a.to]=nd;prev[a.to]=u;H.push(a.to);up(H.length-1)}}}
 if(!isFinite(dist[dst]))return null;
 const idx=[dst];let c=dst;for(;;){c=prev[c];if(c<0)break;idx.push(c);if(c===src)break}
 return idx.reverse()}
function seaPaths(a,b){
 let g=null;
 for(const M of [2.6,5,9,15,24]){const t=seaGraph(a,b,M);if(t.ia<0||t.ib<0)continue;g=t;if(seaAStar(g,g.ia,g.ib))break;g=null}
 if(!g)return null;
 const cp=new Float64Array(g.cells.length),out=[],seen=[];
 for(let k=0;k<5&&out.length<3;k++){
  const idx=seaAStar(g,g.ia,g.ib,(u,v)=>(cp[u]+cp[v])*.5);if(!idx)break;
  const poly=chaikinW(idx.map(i=>[g.cells[i].lon,g.cells[i].lat]));
  let dup=false;for(const q of seen){const s=new Set(q);let same=0;idx.forEach(i=>{if(s.has(i))same++});if(same/idx.length>.8){dup=true;break}}
  if(!dup){out.push(poly);seen.push(new Set(idx))}
  for(const i of idx){cp[i]+=1.2;for(const a of g.cells[i].adj)cp[a.to]+=.55}}
 return out.length?out:null}
function landId(lon,lat){lon=((lon+540)%360+360)%360-180;let id=-1,ba=-1;
 L50.forEach((r,ix)=>{const b=r.b;if(lon<b[0]||lon>b[2]||lat<b[1]||lat>b[3])return;const ar=(b[2]-b[0])*(b[3]-b[1]);if(ar<=ba)return;
  let c=false;const n=r.lon.length;for(let i=0,j=n-1;i<n;j=i++){const xi=r.lon[i],yi=r.lat[i],xj=r.lon[j],yj=r.lat[j];if((yi>lat)!==(yj>lat)&&lon<(xj-xi)*(lat-yi)/(yj-yi)+xi)c=!c}
  if(c){ba=ar;id=ix}});return id}
function waterReady(){return !!WATER}
export {L110,L50,L10,relPad,isLandIn,isLand,isLand10,landId,seaMask,fineMask,mkWaterFast,segWater,waterFrac,chaikinW,seaGraph,seaAStar,seaPaths,waterReady,gcPts,chaikin,viaPoly,arcPoly,polyKm,landFrac,unwrapBack,modeBlobs};
