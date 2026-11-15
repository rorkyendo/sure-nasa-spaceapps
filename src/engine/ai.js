/* ai.js — model gateway assessment (OpenAI-compatible). Deps injected via bindAI to avoid import cycles. */
import{$,f1}from'./util.js';
import{S}from'./state.js';
import{DAYS}from'./data.js';
export const aiDeps={};
export function bindAI(d){aiDeps.cur=d.cur;aiDeps.stats=d.stats}
const AIURL='https://model.cvmedandigitalinovasi.com/v1';
const AIDEF='sk-medio-c360b41f4acda24a46f8c1a364199c0c',AIOFF='sure_ai_off_v1';
try{if(!localStorage.getItem('sure_ai_key_v1')&&!localStorage.getItem(AIOFF))localStorage.setItem('sure_ai_key_v1',AIDEF)}catch(e){}
const aiKey=()=>{try{return localStorage.getItem('sure_ai_key_v1')||''}catch(e){return''}};
let aiTok=0,aiModelId=null,aiT=null;
const esc=s=>String(s==null?'':s).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
async function aiModel(){if(aiModelId)return aiModelId;
 const r=await fetch(AIURL+'/models',{headers:{Authorization:'Bearer '+aiKey()}});if(!r.ok)throw new Error('models '+r.status);
 const j=await r.json(),m=(j.data||[]).map(d=>d.id).filter(id=>!/image|embed|tts|whisper/i.test(id));
 aiModelId=m.find(id=>/^gemini-3\.8-flash$/i.test(id))||m.find(id=>/3\.8-flash-tiered/i.test(id))||m.find(id=>/flash/i.test(id))||m[0];return aiModelId}
function aiRender(a){const box=$('#aibox');if(!box)return;
 box.innerHTML=`<div class="airow ${a.risk}"><span class="aib">${({green:'LOW',yellow:'MODERATE',red:'HIGH'})[a.risk]||'—'}</span><p>${esc(a.summary)}</p>${a.depart&&a.depart.day?`<div class="win">⌂ Best window <b>${esc(a.depart.day)}</b>${a.depart.note?` — ${esc(a.depart.note)}`:''}</div>`:''}${a.stormBrief?`<div class="sb">⛈ ${esc(a.stormBrief)}</div>`:''}${(a.tips||[]).map(t=>`<div class="tip">· ${esc(t)}</div>`).join('')}<div class="hint" style="margin-top:4px">${esc(a.model||'model')} · live gateway assessment</div></div>`}
function aiSig(){return JSON.stringify([S.sp&&S.sp.id,S.origin,S.far&&S.far.name,S.day,S.cargo,S.routes.length,S.ri,S.len&&S.len.toFixed(0),S.storm&&S.storm.t,S.rain&&S.rain[0]])}
async function aiAssess(){
 const tok=++aiTok,box=$('#aibox');if(!box)return;
 const sig=aiSig();
 if(S._aiSig===sig&&S.ai){aiRender(S.ai);return}
 const key=aiKey();
 if(!key){box.innerHTML='<div class="hint">Add an AI gateway key in <b>Keys</b> (rail, left) for a live model assessment.</div>';return}
 box.innerHTML='<div class="hint">Asking the model…</div>';
 try{
  const model=await aiModel();if(tok!==aiTok)return;
  const st=aiDeps.stats(),c=aiDeps.cur(),r=S.routes[S.ri];if(!r)return;
  const bad=S.segs.filter(s=>s.k4!=='g').map(s=>({i:s.i,km:+(s.km1-s.km0).toFixed(2),k4:s.k4,k1:+s.k1.toFixed(1)}));
  const fc=(S.rain||[]).slice(0,8).map((mm,i)=>[((S.rainDates&&S.rainDates[i])||DAYS[i]||('+'+i+'d')),+Math.max(...mm).toFixed(1)]);
  const se=S.storm&&(S.eonet||[]).find(e=>e.t===S.storm.t);
  const storm=S.storm?{name:S.storm.t,category:S.storm.cat,distanceKm:S.storm.km,recentTrackLonLat:se?se.trk:[]}:null;
  const prompt=`You are a NASA logistics risk analyst for spaceport ground supply routes. Respond in STRICT JSON only (no markdown): {"risk":"green|yellow|red","summary":"2-3 sentences, concrete","depart":{"day":"<one of the forecast day labels>","note":"reason, <=12 words"},"stormBrief":"<one sentence on the storm's bearing on this corridor, '' if none>","tips":["action","action","action"],"weakest":<segment index>}.
Spaceport: ${S.sp.name}. Pickup: ${S.far?S.far.name:'local road pickup'}. Cargo: ${S.cargo}. Day: ${c.l}, forecast rain ${c.v} mm.
Route: ${r.label}, ${f1(S.len)} km, readiness ${Math.round(st.score)}/100, weakest segment #${st.weak.i+1} (${st.weak.k4}, k1=${st.weak.k1.toFixed(1)}).
Roads: ${S.net&&S.net.real?'real OpenStreetMap graph routed by Dijkstra with hazard weights':'simulated road network'}.
Problem segments (k1=radar change index, k4=g/y/r): ${JSON.stringify(bad.slice(0,12))}. Empty means all green.
Daily forecast [label, max mm across corridor] next ${fc.length} days, index 0 = today: ${JSON.stringify(fc)}. For "depart" pick the best departure day weighing rain and the storm.
Nearest tracked event (NASA EONET): ${storm?JSON.stringify(storm):'none'}.`;
  const res=await fetch(AIURL+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({model,messages:[{role:'user',content:prompt}],temperature:.3})});
  if(!res.ok)throw new Error('ai '+res.status);
  const j=await res.json(),txt=(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content||'').replace(/```json|```/g,'').trim();
  const a=JSON.parse(txt);if(tok!==aiTok)return;a.model=model;S.ai=a;S._aiSig=sig;aiRender(a);
 }catch(e){if(tok!==aiTok)return;box.innerHTML=`<div class="hint">Assessment unavailable (${esc(e.message)}). Check the AI key in Keys.</div>`}
}
function queueAI(){clearTimeout(aiT);aiT=setTimeout(aiAssess,450)}
function routeSrcTag(){const e=$('#routeSrc');if(!e)return;
 e.textContent=S.far?(S.routeSrc==='osm'?'truck legs: OSM/OSRM':S.routeSrc==='fetch'?'fetching roads…':'legs: simulated')
  :(S.net&&S.net.real?`OSM graph · Dijkstra${S.roadWx?' · wx live':''}`:S.routeSrc==='fetch'?'loading OSM…':'simulated roads')}
export {queueAI,routeSrcTag};
