/* util.js — pure helpers: formatting, seeded RNG/noise, geo vector math. No DOM reads, no state. */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const COL={g:'#2fe48a',y:'#ffd23f',r:'#ff4d5e'},LBL={g:'GREEN',y:'YELLOW',r:'RED'},RANK={g:0,y:1,r:2};
const f1=n=>n.toFixed(1),fe=n=>n>=100?Math.round(n).toLocaleString('en-US'):n.toFixed(1);
const fmtT=(h,c)=>{const m=Math.round(h*60),U=c?['m','h','d']:['min','h','d'],sp=c?'':' ';if(m<60)return Math.max(1,m)+sp+U[0];if(m<2880){const hh=Math.floor(m/60),mm=m%60;return hh+sp+U[1]+(mm?' '+mm+sp+U[0]:'')}const d=Math.floor(m/1440),hh=Math.round((m%1440)/60);return d+sp+U[2]+(hh?' '+hh+sp+U[1]:'')};
function rng(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const H=(i,j,s)=>{let h=Math.imul(i|0,374761393)^Math.imul(j|0,668265263)^Math.imul(s|0,2246822519);h=Math.imul(h^h>>>13,1274126177);h^=h>>>16;return(h>>>0)/4294967296};
const VN=(x,y,s,cell=1.4)=>{const gx=x/cell,gy=y/cell,i=Math.floor(gx),j=Math.floor(gy),fx=gx-i,fy=gy-j,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),a=H(i,j,s),b=H(i+1,j,s),c=H(i,j+1,s),d=H(i+1,j+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v};
const W={sat:1,rain:6,red:4},rl=v=>v<30?0:v<50?.5:1;
const st1=v=>v<3?'g':v<6?'y':'r',st2=v=>{const a=Math.abs(v);return a<5?'g':a<=15?'y':'r'},st8=v=>v<30?'g':v<50?'y':'r',stv1=v=>v>70?'g':v>=50?'y':'r';
const worst=(a,b)=>RANK[a]>=RANK[b]?a:b,risk=s=>({g:0,y:.29,r:.53}[s]);
const mer=(lon,lat)=>{const l=Math.max(-85.0511,Math.min(85.0511,lat)),sn=Math.sin(l*Math.PI/180);return[(lon+180)/360,.5-Math.log((1+sn)/(1-sn))/(4*Math.PI)]};
const wrapL=d=>((d+540)%360+360)%360-180;
const merYinv=y=>{const s=Math.tanh(Math.PI*(1-2*Math.max(0,Math.min(1,y))));return Math.asin(Math.max(-1,Math.min(1,s)))*180/Math.PI};
const RAD=Math.PI/180;
const toV=(lon,lat)=>{const a=lon*RAD,b=lat*RAD;return[Math.cos(b)*Math.cos(a),Math.cos(b)*Math.sin(a),Math.sin(b)]};
const fromV=v=>{const n=Math.hypot(v[0],v[1],v[2]);return[Math.atan2(v[1],v[0])/RAD,Math.asin(v[2]/n)/RAD]};
const vcross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const vdot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const hav=(a,b)=>6371*Math.acos(Math.max(-1,Math.min(1,vdot(toV(a[0],a[1]),toV(b[0],b[1])))));
const unw=(lon,ref)=>lon+360*Math.round((ref-lon)/360);
const hv=(a,b)=>{const R=6371,r=Math.PI/180,dl=(b[1]-a[1])*r,dn=(b[0]-a[0])*r,x=Math.sin(dl/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))};
const MONn=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function monthLabel(m){const n=new Date(),q=n.getUTCFullYear()*12+n.getUTCMonth()+m,mo=q%12,yr=Math.floor(q/12);return{l:MONn[mo]+' '+yr,s:MONn[mo],yr,mo}}
export {$,$$,COL,LBL,RANK,f1,fe,fmtT,rng,H,VN,W,rl,st1,st2,st8,stv1,worst,risk,hv,RAD,toV,fromV,vcross,vdot,hav,unw,wrapL,mer,merYinv,MONn,monthLabel};
