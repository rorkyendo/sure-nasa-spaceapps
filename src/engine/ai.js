/* ai.js — model gateway assessment (OpenAI-compatible). Deps injected via bindAI to avoid import cycles. */
import{$,f1}from'./util.js';
import{S}from'./state.js';
import{DAYS}from'./data.js';
export const aiDeps={};
export function bindAI(d){aiDeps.cur=d.cur;aiDeps.stats=d.stats;aiDeps.ctx=d.ctx}
const AIURL='https://model.cvmedandigitalinovasi.com/v1';
const AIDEF='sk-medio-c360b41f4acda24a46f8c1a364199c0c',AIOFF='sure_ai_off_v1';
try{if(!localStorage.getItem('sure_ai_key_v1')&&!localStorage.getItem(AIOFF))localStorage.setItem('sure_ai_key_v1',AIDEF)}catch(e){}
const aiKey=()=>{try{return localStorage.getItem('sure_ai_key_v1')||''}catch(e){return''}};
let aiTok=0,aiModelId=null,aiT=null,chatBusy=false;
const RK={green:0,yellow:1,red:2};
const esc=s=>String(s==null?'':s).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
async function aiModel(){if(aiModelId)return aiModelId;
 const r=await fetch(AIURL+'/models',{headers:{Authorization:'Bearer '+aiKey()}});if(!r.ok)throw new Error('models '+r.status);
 const j=await r.json(),m=(j.data||[]).map(d=>d.id).filter(id=>!/image|embed|tts|whisper/i.test(id));
 aiModelId=m.find(id=>/^gemini-3\.8-flash$/i.test(id))||m.find(id=>/3\.8-flash-tiered/i.test(id))||m.find(id=>/flash/i.test(id))||m[0];return aiModelId}
function aiRender(a){const box=$('#aibox');if(!box)return;
 const deg=S.aiPrev&&RK[a.risk]>RK[S.aiPrev.risk]?`<div class="deg">▲ Risk up since last check — ${({green:'LOW',yellow:'MODERATE',red:'HIGH'})[S.aiPrev.risk]||'?'} → ${({green:'LOW',yellow:'MODERATE',red:'HIGH'})[a.risk]||'?'}</div>`:'';
 const rows=[['Trade-off',a.reason],['Mitigation',a.mitigate],['Cargo',a.cargo],['ETA',a.eta],['Seasonal',a.seasonal],['Brief',a.pitch]].filter(p=>p[1]);
 const brief=rows.length?`<details class="aif"><summary>Operational brief · ${rows.length}</summary>${rows.map(p=>`<div class="br"><b>${p[0]}</b>${esc(p[1])}</div>`).join('')}</details>`:'';
 const chat=`<div class="ach">${(S.chat||[]).slice(-6).map(m=>`<div class="cm ${m.r}">${esc(m.t)}</div>`).join('')}${chatBusy?'<div class="cm a">…</div>':''}<div class="cr"><input id="acin" placeholder="Ask about this route…" maxlength="200" aria-label="Ask the AI about this route"><button id="acgo" class="btn">Ask</button></div></div>`;
 box.innerHTML=`<div class="airow ${a.risk}"><span class="aib">${({green:'LOW',yellow:'MODERATE',red:'HIGH'})[a.risk]||'—'}</span>${deg}<p>${esc(a.summary)}</p>${a.depart&&a.depart.day?`<div class="win">⌂ Best window <b>${esc(a.depart.day)}</b>${a.depart.note?` — ${esc(a.depart.note)}`:''}</div>`:''}${a.stormBrief?`<div class="sb">⛈ ${esc(a.stormBrief)}</div>`:''}${(a.tips||[]).map(t=>`<div class="tip">· ${esc(t)}</div>`).join('')}${brief}${chat}<div class="hint" style="margin-top:4px">${esc(a.model||'model')} · live gateway assessment</div></div>`;
 const go=$('#acgo'),inp=$('#acin');if(go&&inp){go.onclick=()=>{const q=(inp.value||'').trim();if(q){inp.value='';aiChatAsk(q)}};inp.onkeydown=e=>{if(e.key==='Enter')go.click()}}}
function aiSig(){return JSON.stringify([S.sp&&S.sp.id,S.origin,S.far&&S.far.name,S.day,S.cargo,S.routes.length,S.ri,S.len&&S.len.toFixed(0),S.storm&&S.storm.t,S.rain&&S.rain[0]])}
function aiCtxText(){const st=aiDeps.stats(),c=aiDeps.cur(),r=S.routes[S.ri],x=aiDeps.ctx?aiDeps.ctx():null;
 const bad=S.segs.filter(s=>s.k4!=='g').map(s=>({i:s.i,km:+(s.km1-s.km0).toFixed(2),k4:s.k4,k1:+s.k1.toFixed(1)}));
 const fc=(S.rain||[]).slice(0,8).map((mm,i)=>[((S.rainDates&&S.rainDates[i])||DAYS[i]||('+'+i+'d')),+Math.max(...mm).toFixed(1)]);
 const se=S.storm&&(S.eonet||[]).find(e=>e.t===S.storm.t);
 const storm=S.storm?{name:S.storm.t,category:S.storm.cat,distanceKm:S.storm.km,recentTrackLonLat:se?se.trk:[]}:null;
 return `Spaceport: ${S.sp.name}. Pickup: ${S.far?S.far.name:'local road pickup'}. Cargo: ${S.cargo}. Day: ${c.l}, forecast rain ${c.v} mm.
Route: ${r.label}, ${f1(S.len)} km, readiness ${Math.round(st.score)}/100, weakest segment #${st.weak.i+1} (${st.weak.k4}, k1=${st.weak.k1.toFixed(1)}).
Roads: ${S.net&&S.net.real?'real OpenStreetMap graph routed by Dijkstra with hazard weights':'simulated road network'}.
Problem segments (k1=radar change index, k4=g/y/r): ${JSON.stringify(bad.slice(0,12))}. Empty means all green.
All route options: ${x?JSON.stringify(x.rows):'n/a'}. Score breakdown of selected (minutes): ${x?JSON.stringify(x.sc):'n/a'}.
Truck leg options per transfer: ${x?JSON.stringify(x.legs):'n/a'}.
Daily forecast [label, max mm across corridor] next ${fc.length} days, index 0 = today: ${JSON.stringify(fc)}.
Monthly rain medians next 12 months (mm, ${x?x.climSrc:'sim'}): ${x?JSON.stringify(x.monthlyMedMm):'n/a'}.
Nearest tracked event (NASA EONET): ${storm?JSON.stringify(storm):'none'}.`}
async function aiJSON(user,temperature){const model=await aiModel();
 const res=await fetch(AIURL+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+aiKey()},body:JSON.stringify({model,messages:[{role:'user',content:user}],temperature})});
 if(!res.ok)throw new Error('ai '+res.status);
 const j=await res.json(),txt=(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content||'').replace(/```json|```/g,'').trim();
 const a=JSON.parse(txt);a.model=model;return a}
async function aiAssess(){
 const tok=++aiTok,box=$('#aibox');if(!box)return;
 const sig=aiSig();
 if(S._aiSig===sig&&S.ai){aiRender(S.ai);return}
 const key=aiKey();
 if(!key){box.innerHTML='<div class="hint">Add an AI gateway key in <b>Keys</b> (rail, left) for a live model assessment.</div>';return}
 box.innerHTML='<div class="hint">Asking the model…</div>';
 try{
  if(!S.routes[S.ri])return;
  const ctx=aiCtxText();
  const core=`You are a NASA logistics risk analyst for spaceport ground supply routes. Respond in STRICT JSON only (no markdown): {"risk":"green|yellow|red","summary":"2-3 sentences, concrete","depart":{"day":"<one of the forecast day labels>","note":"reason, <=12 words"},"stormBrief":"<one sentence on the storm's bearing on this corridor, '' if none>","tips":["action","action","action"],"weakest":<segment index>}.
${ctx}
For "depart" pick the best departure day weighing rain and the storm.`;
  const brief=`You are a NASA logistics risk analyst for spaceport ground supply routes. Respond in STRICT JSON only (no markdown): {"reason":"why the recommended option wins vs the others, <=20 words","mitigate":"concrete fix for the worst problem segment — alternate leg, staging, or delay; '' if all green","cargo":"one-line handling brief for this cargo class","eta":"confidence band like '4d 8h ±9h — delay driver: port handoff'","seasonal":"best campaign window in the monthly data, <=15 words","pitch":"2-sentence exec summary naming the live data sources (Open-Meteo forecast, OSM/OSRM roads, NASA GIBS IMERG radar, EONET storms, POWER climatology)"}.
${ctx}`;
  const [c1,b1]=await Promise.all([aiJSON(core,.3),aiJSON(brief,.5).catch(()=>({}))]);
  if(tok!==aiTok)return;
  const a={...c1,...b1,model:c1.model};if(S.ai)S.aiPrev=S.ai;S.chat=[];S.ai=a;S._aiSig=sig;aiRender(a);
 }catch(e){if(tok!==aiTok)return;box.innerHTML=`<div class="hint">Assessment unavailable (${esc(e.message)}). Check the AI key in Keys.</div>`}
}
async function aiChatAsk(q){if(chatBusy)return;const key=aiKey();if(!key)return;
 S.chat=S.chat||[];S.chat.push({r:'u',t:q});chatBusy=true;if(S.ai)aiRender(S.ai);
 try{const model=await aiModel();
  const msgs=[{role:'system',content:'You are a NASA logistics risk analyst for spaceport supply routes. Answer briefly (<=80 words), concrete, plain text, no markdown. Current route context:\n'+aiCtxText()},...S.chat.slice(-6).map(m=>({role:m.r==='u'?'user':'assistant',content:m.t}))];
  const res=await fetch(AIURL+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({model,messages:msgs,temperature:.4})});
  if(!res.ok)throw new Error('ai '+res.status);
  const j=await res.json(),txt=(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content||'').trim();
  S.chat.push({r:'a',t:txt||'(no answer)'});
 }catch(e){S.chat.push({r:'a',t:'Unavailable: '+e.message})}
 chatBusy=false;if(S.ai)aiRender(S.ai);
}
function queueAI(){clearTimeout(aiT);aiT=setTimeout(aiAssess,450)}
function routeSrcTag(){const e=$('#routeSrc');if(!e)return;
 e.textContent=S.far?(S.routeSrc==='osm'?'truck legs: OSM/OSRM':S.routeSrc==='fetch'?'fetching roads…':'legs: simulated')
  :(S.net&&S.net.real?`OSM graph · Dijkstra${S.roadWx?' · wx live':''}`:S.routeSrc==='fetch'?'loading OSM…':'simulated roads')}
export {queueAI,routeSrcTag};
