/* state.js — single mutable session state + emit bus, shared by engine + domain modules. */
import{CARGO}from'./data.js';
const listeners=new Set();
export function sub(fn){listeners.add(fn);return()=>listeners.delete(fn)}
let _v=0;export function ver(){return _v}
export function emit(){_v++;listeners.forEach(f=>f())}
const S={sp:null,net:null,origin:null,wp:null,cargo:CARGO[0],segs:[],len:0,sel:null,day:0,mode:'d',rain:null,rainBase:null,rainSrc:'sim',w:900,h:600,dpr:1,view:{lon:-80.68,lat:28.52,z:10},snap:null,hotSp:null,fly:null,nets:{},routeMid:null,routes:[],ri:0,rec:0,pinned:false,pickMode:false,far:null,farBlobs:null};
export {S};
