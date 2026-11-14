import { useEffect } from 'react';
import Icons from './ui/Icons';
import { mount, CARGO } from './engine/engine.js';

export default function App() {
  useEffect(() => { import('./lib/db.js').finally(() => mount()); }, []);

  return (
    <>
      <Icons />
      <div className="main">
        <div className="top">
          <div className="logo"><img src="assets/patch.svg" alt="SURE mission patch — Dancing with the SARs" /></div>
          <div><h1>SURE</h1><div className="sub">Spaceport Supply Route Readiness</div></div>
          <div className="sp" />
          <span className="pill mono">SAT 14 NOV 2026</span>
          <button className="btn" id="save">Save analysis</button>
          <button className="btn" id="hist">History <span id="hn" className="pill" style={{ padding: '1px 7px' }}>0</span></button>
          <button className="btn" id="dbbtn" title="Shared history stored in the GitHub repo">DB: local</button>
          <button className="btn" id="reset">Reset</button>
        </div>

        <div className="grid">
          <div className="col">
            <div className="card mapcard">
              <div className="maphead">
                <div>
                  <div className="eyebrow" id="mapEyebrow">Route</div>
                  <div className="ttl" id="mapTitle" style={{ margin: '2px 0 0' }}>Route</div>
                </div>
                <div className="sp" />
                <div className="pills" id="pills" style={{ padding: 0 }} />
                <div className="leg">
                  <span><i style={{ background: 'var(--g)' }} />Green</span>
                  <span><i style={{ background: 'var(--y)' }} />Yellow</span>
                  <span><i style={{ background: 'var(--r)' }} />Red</span>
                  <span><i style={{ background: '#5aa8ff' }} />Wet-prone</span>
                </div>
                <label className="tog"><input type="checkbox" id="togWet" defaultChecked /> Show wet-prone</label>
                <label className="tog"><input type="checkbox" id="togRadar" defaultChecked /> <span id="radarLbl">Rain radar</span></label>
              </div>
              <div className="stage" id="stage">
                <canvas id="base" />
                <svg className="ov" id="ov" />
                <div className="rainov" id="rainov" />
                <div className="dock">
                  <div className="dc truck" id="dragTruck" role="button" tabIndex={0} aria-label="Drag the truck onto the map">
                    <svg id="dockTruck" viewBox="0 0 72 48"><use href="#i-truck-0" /></svg>
                    <span><b>Pickup point</b><small>Drag it anywhere on land</small></span>
                  </div>
                  <div className="cargo"><label htmlFor="cargo">Cargo</label>
                    <select id="cargo">{CARGO.map((c: string) => <option key={c}>{c}</option>)}</select>
                  </div>
                  <div className="cargo" id="pickbox"><label htmlFor="pickText">Pickup point</label>
                    <div className="row" style={{ gap: 6 }}>
                      <input type="text" id="pickText" list="zones" placeholder="City, or lat, lon" autoComplete="off" />
                      <button className="btn" id="pickGo" type="button">Go</button>
                      <button className="btn" id="pickMap" type="button">Pick on map</button>
                    </div>
                    <datalist id="zones" />
                  </div>
                </div>
                <div className="zoomc">
                  <button className="zb" id="zin" aria-label="Zoom in">+</button>
                  <button className="zb" id="zout" aria-label="Zoom out">−</button>
                  <button className="zb w" id="zcity">City</button>
                  <button className="zb w" id="zglobal">Global</button>
                  <div className="zl" id="zl">City</div>
                </div>
                <div className="hint2" id="hint2">Drag the truck or type a city · ○ airport · ◆ port</div>
                <div className="scale" id="scale" />
                <div className="credit">Roads, long-distance paths and radar values are simulated · rain radar: Meteomatics · imagery: Esri</div>
                <div className="coach" id="coach" aria-hidden="true">
                  <svg className="ctr"><line id="ctl" x1="0" y1="0" x2="0" y2="0" stroke="#35e0ee" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" /></svg>
                  <div className="cr" id="ccr" />
                  <svg className="cg" viewBox="0 0 72 48"><use href="#i-truck-0" /></svg>
                  <svg className="ch" viewBox="0 0 24 24"><path d="M5 3l14 9-6.2 1.4L16.4 20l-3 1.4-3.5-6.5L5 19z" fill="#fff" stroke="#06080f" strokeWidth="1.4" strokeLinejoin="round" /></svg>
                </div>
                <div className="tip" id="tip" />
              </div>
            </div>

            <div className="card">
              <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div>
                  <div className="eyebrow">Look ahead</div>
                  <div className="ttl" id="fttl" style={{ marginBottom: 6 }}>Daily rain forecast</div>
                </div>
                <div className="chips" id="modes" style={{ margin: 0 }}>
                  <button className="qc on" data-m="d">Daily · 8 days</button>
                  <button className="qc" data-m="m">Monthly · 5 years</button>
                </div>
              </div>
              <div className="fgrid">
                <div>
                  <div className="chips" id="qchips" />
                  <input type="range" id="day" min={0} max={7} step={1} defaultValue={0} aria-label="Forecast date" />
                  <svg className="rain" id="rain" viewBox="0 0 1000 120" aria-label="Daily rain forecast chart" />
                </div>
                <div>
                  <div className="eyebrow" id="fsel">Selected day</div>
                  <div style={{ fontSize: 22, fontWeight: 700, margin: '4px 0' }} id="fday">-</div>
                  <div id="fread" />
                  <div className="panelnote" id="fnote" />
                </div>
              </div>
            </div>
          </div>

          <div className="col r"><div className="rin">
            <div className="card" id="routes" />
            <div className="card" id="detail" />
          </div></div>
        </div>
      </div>

      <div className="modal" id="modal"><div className="mbox">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div><div className="eyebrow">Saved analyses</div><div className="ttl" style={{ margin: '2px 0 0' }}>History</div></div>
          <div className="row"><button className="btn" id="hclear">Clear all</button><button className="btn" id="hclose">Close</button></div>
        </div>
        <div className="hint" style={{ marginTop: 6 }}>Each entry is a snapshot of the route and its readiness at the time of saving. It is kept in this browser only. Open an entry to restore that route.</div>
        <div id="hlist" />
      </div></div>

      <div className="modal" id="dbmodal"><div className="mbox">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div><div className="eyebrow">Shared history</div><div className="ttl" style={{ margin: '2px 0 0' }}>GitHub as the database</div></div>
          <div className="row"><button className="btn" id="dbclose">Close</button></div>
        </div>
        <div className="hint" style={{ marginTop: 6 }}>Saved analyses live in <code>data/db/analyses.json</code> inside the public repo <b>rorkyendo/sure-nasa-spaceapps</b>. Anyone can read them. To save into the shared file, paste a GitHub token that has <b>contents:write</b> on that repo. The token stays in this browser and is only sent to api.github.com.</div>
        <div className="hint" id="dbstat" style={{ marginTop: 8 }} />
        <div className="row" style={{ marginTop: 10, flexWrap: 'wrap', gap: 6 }}>
          <input type="password" id="dbtok" placeholder="github_pat_… or ghp_…" autoComplete="off" style={{ flex: 1, minWidth: 220 }} />
          <button className="btn" id="dbsave">Connect</button><button className="btn" id="dboff">Disconnect</button>
        </div>
        <div className="hint" style={{ marginTop: 8 }}>No token? Everything still works — history is kept in this browser only.</div>
        <div className="eyebrow" style={{ marginTop: 16 }}>Live rain radar</div>
        <div className="ttl" style={{ margin: '2px 0 0', fontSize: 15 }}>Meteomatics WMS</div>
        <div className="hint" style={{ marginTop: 6 }}>The precipitation overlay calls api.meteomatics.com straight from your browser. Paste your account login as <code>user:password</code> — it stays in this browser and is only sent to Meteomatics.</div>
        <div className="row" style={{ marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
          <input type="password" id="mmtok" placeholder="meteomatics user:password" autoComplete="off" style={{ flex: 1, minWidth: 220 }} />
          <button className="btn" id="mmsave">Connect</button><button className="btn" id="mmoff">Disconnect</button>
        </div>
        <div className="hint" id="mmstat" style={{ marginTop: 8 }} />
      </div></div>

      <div className="toast" id="toast" />
    </>
  );
}
