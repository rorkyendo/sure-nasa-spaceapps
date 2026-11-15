import { useEffect } from 'react';
import Icons from './ui/Icons';
import { mount, CARGO } from './engine/engine.js';

export default function App() {
  useEffect(() => { import('./lib/db.js').finally(() => mount()); }, []);

  return (
    <>
      <Icons />
      <div className="shell">
        <nav className="rail" aria-label="Tools">
          <div className="rlogo" title="SURE — Spaceport Supply Route Readiness"><img src="assets/patch.svg" alt="SURE mission patch" /></div>
          <span className="rbtn on" aria-current="page" title="Route map"><svg className="ri"><use href="#i-nav-map" /></svg><span className="rl">Map</span></span>
          <button className="rbtn" id="save" type="button" title="Save analysis"><svg className="ri"><use href="#i-nav-save" /></svg><span className="rl">Save</span></button>
          <button className="rbtn" id="hist" type="button" title="History"><svg className="ri"><use href="#i-nav-hist" /></svg><span className="rl">History</span><span id="hn">0</span></button>
          <button className="rbtn" id="dbbtn" type="button" title="Shared history &amp; keys — local only"><svg className="ri"><use href="#i-nav-db" /></svg><span className="rl">Keys</span></button>
          <div className="rsp" />
          <button className="rbtn" id="reset" type="button" title="Reset"><svg className="ri"><use href="#i-nav-reset" /></svg><span className="rl">Reset</span></button>
        </nav>

        <div className="main">
          <header className="top">
            <div><h1>SURE</h1><div className="sub">Spaceport Supply Route Readiness</div></div>
            <div className="sp" />
            <span className="pill mono" id="datePill">SAT 14 NOV 2026</span>
          </header>

          <div className="grid">
            <div className="cl">
              <div className="card mcard">
                <div className="eyebrow">Mission</div>
                <div className="fld"><div className="pills" id="pills" /></div>
                <div className="fld">
                  <label className="fl" htmlFor="pickText">Pickup point</label>
                  <div className="dc truck" id="dragTruck" role="button" tabIndex={0} aria-label="Drag the truck onto the map">
                    <svg id="dockTruck" viewBox="0 0 72 48"><use href="#i-truck-0" /></svg>
                    <span><b>Drag onto the map</b><small>Drop anywhere on land</small></span>
                  </div>
                  <div className="prow">
                    <input type="text" id="pickText" list="zones" placeholder="City, or lat, lon" autoComplete="off" />
                    <button className="btn" id="pickGo" type="button">Go</button>
                  </div>
                  <div className="prow">
                    <button className="btn ghostb" id="pickMap" type="button"><svg className="bi"><use href="#i-nav-pick" /></svg>Pick on map</button>
                  </div>
                  <datalist id="zones" />
                </div>
                <div className="fld">
                  <label className="fl" htmlFor="cargo">Cargo</label>
                  <select id="cargo">{CARGO.map((c: string) => <option key={c}>{c}</option>)}</select>
                </div>
              </div>

              <div className="card fcard">
                <div className="fhead">
                  <div>
                    <div className="eyebrow">Look ahead</div>
                    <div className="ttl" id="fttl">Daily rain forecast</div>
                  </div>
                  <div className="segctl" id="modes">
                    <button className="qc on" data-m="d" type="button">Daily · 8 days</button>
                    <button className="qc" data-m="m" type="button">Monthly · 5 years</button>
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
                    <div className="fday mono" id="fday">-</div>
                    <div id="fread" />
                    <div className="panelnote" id="fnote" />
                  </div>
                </div>
              </div>
            </div>

            <div className="card mapcard">
              <div className="maphead">
                <div>
                  <div className="eyebrow" id="mapEyebrow">Route</div>
                  <div className="ttl" id="mapTitle">Route</div>
                </div>
              </div>
              <div className="mtools">
                <div className="leg">
                  <span><i style={{ background: 'var(--g)' }} />Green</span>
                  <span><i style={{ background: 'var(--y)' }} />Yellow</span>
                  <span><i style={{ background: 'var(--r)' }} />Red</span>
                  <span><i style={{ background: 'var(--bl)' }} />Wet-prone</span>
                </div>
                <label className="tog"><input type="checkbox" id="togWet" defaultChecked /> Wet-prone</label>
                <label className="tog"><input type="checkbox" id="togRadar" defaultChecked /> <span id="radarLbl">Rain radar</span></label>
                <div className="sp" />
                <div className="leg segctl" id="bmap" role="group" aria-label="Basemap layer">
                  <button className="bm on" data-b="sat" type="button">Satellite</button>
                  <button className="bm" data-b="osm" type="button">OSM</button>
                  <button className="bm" data-b="hyb" type="button">Hybrid</button>
                </div>
              </div>
              <div className="stage" id="stage">
                <canvas id="base" />
                <svg className="ov" id="ov" />
                <div className="rainov" id="rainov" />
                <div className="zoomc">
                  <button className="zb" id="zin" aria-label="Zoom in">+</button>
                  <button className="zb" id="zout" aria-label="Zoom out">−</button>
                  <button className="zb w" id="zcity">City</button>
                  <button className="zb w" id="zglobal">Global</button>
                  <div className="zl" id="zl">City</div>
                </div>
                <div className="hint2" id="hint2">Drag the truck or type a city · ○ airport · ◆ port</div>
                <div className="scale" id="scale" />
                <div className="credit">Sea routes: water-graph A* on Natural Earth coast (not measured lanes) · waves: Open-Meteo Marine · roads: OSM·OSRM else simulated · radar values simulated · imagery: NASA GIBS VIIRS · map: © OSM/CARTO</div>
                <div className="coach" id="coach" aria-hidden="true">
                  <svg className="ctr"><line id="ctl" x1="0" y1="0" x2="0" y2="0" stroke="#35e0ee" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" /></svg>
                  <div className="cr" id="ccr" />
                  <svg className="cg" viewBox="0 0 72 48"><use href="#i-truck-0" /></svg>
                  <svg className="ch" viewBox="0 0 24 24"><path d="M5 3l14 9-6.2 1.4L16.4 20l-3 1.4-3.5-6.5L5 19z" fill="#fff" stroke="#06080f" strokeWidth="1.4" strokeLinejoin="round" /></svg>
                </div>
                <div className="tip" id="tip" />
              </div>
            </div>

            <div className="rin">
              <div className="card" id="routes" />
              <div className="card" id="detail" />
            </div>
          </div>
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
        <div className="eyebrow" style={{ marginTop: 16 }}>AI route assessment</div>
        <div className="ttl" style={{ margin: '2px 0 0', fontSize: 15 }}>Model gateway</div>
        <div className="hint" style={{ marginTop: 6 }}>Route stats, segment flags and live weather are sent to <code>model.cvmedandigitalinovasi.com</code> (OpenAI-compatible) for a risk assessment. Paste a Bearer key — it stays in this browser.</div>
        <div className="row" style={{ marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
          <input type="password" id="aitok" placeholder="sk-… API key" autoComplete="off" style={{ flex: 1, minWidth: 220 }} />
          <button className="btn" id="aisave">Connect</button><button className="btn" id="aioff">Disconnect</button>
        </div>
        <div className="hint" id="aistat" style={{ marginTop: 8 }} />
      </div></div>

      <div className="toast" id="toast" />
    </>
  );
}
