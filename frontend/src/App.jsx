import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Bot, BrainCircuit,
  CheckCircle2, ChevronRight, CircleDot, ClipboardList, CloudUpload, Cpu,
  Gauge, Layers3, MapPinned, RefreshCw, Route, ShieldAlert, Siren, Sparkles,
  Upload, Waves, X
} from "lucide-react";
import { createIncident, detectImage, getIncidents, getPlan, getVisionStatus, replan, resolveIncident } from "./api";

const SEV = { Critical: "#ff4d6d", High: "#ff9d45", Medium: "#f5ca62", Low: "#50d6b0" };
const fmt = (v) => Number(v || 0).toFixed(1);

function Stat({ label, value, detail, icon: Icon, tone = "mint" }) {
  return <div className="stat-card">
    <div className={`stat-icon ${tone}`}><Icon size={19}/></div>
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
    <div className="stat-detail">{detail}</div>
  </div>;
}

function Badge({ children, tone = "neutral" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export default function App() {
  const [page, setPage] = useState("Overview");
  const [incidents, setIncidents] = useState([]);
  const [plan, setPlan] = useState(null);
  const [vision, setVision] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [visionResult, setVisionResult] = useState(null);
  const [form, setForm] = useState({
    hazard_type: "Pothole", latitude: "12.3108", longitude: "76.6080",
    location_label: "", severity: "High", confidence: "0.7",
    road_importance: "3", source: "Bus camera demo", evidence_note: ""
  });

  const refresh = useCallback(async () => {
    try {
      const [i, p, v] = await Promise.all([getIncidents(), getPlan(), getVisionStatus()]);
      setIncidents(i); setPlan(p); setVision(v); setError("");
    } catch (e) { setError(`${e.message}. Is the FastAPI backend running on port 8000?`); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const openIncidents = incidents.filter(i => i.status !== "Resolved");
  const critical = openIncidents.filter(i => ["Critical", "High"].includes(i.severity)).length;
  const average = openIncidents.length ? openIncidents.reduce((sum, x) => sum + Number(x.priority_score || 0), 0) / openIncidents.length : 0;

  async function submitIncident(e) {
    e.preventDefault(); setBusy(true); setNotice(""); setError("");
    try {
      const result = await createIncident({
        ...form, latitude: Number(form.latitude), longitude: Number(form.longitude),
        confidence: Number(form.confidence), road_importance: Number(form.road_importance)
      });
      setNotice(result.merged ? `Observation fused with ${result.incident.incident_code} (${result.distance_m} m away).` : `New incident ${result.incident.incident_code} created.`);
      setForm(f => ({ ...f, location_label: "", evidence_note: "" }));
      await refresh();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function runReplan() {
    setBusy(true); setError(""); setNotice("");
    try { const result = await replan(); setPlan(result); setNotice("Planning cycle completed. The assignment plan has been refreshed."); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function resolve(code) {
    try { await resolveIncident(code); setNotice(`${code} marked resolved.`); await refresh(); }
    catch (e) { setError(e.message); }
  }

  async function runVision(e) {
    e.preventDefault();
    if (!imageFile) return;
    setBusy(true); setVisionResult(null); setError(""); setNotice("");
    try { setVisionResult(await detectImage(imageFile)); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const nav = [
    { name: "Overview", icon: Gauge }, { name: "Incident fusion", icon: Layers3 },
    { name: "Vision lab", icon: Cpu }, { name: "Autonomous planner", icon: BrainCircuit }
  ];

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Activity size={22}/></div><div><b>urbanpulse<span> x</span></b><small>ROAD INTELLIGENCE</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map(n => <button key={n.name} className={`nav-item ${page === n.name ? "active" : ""}`} onClick={() => setPage(n.name)}><n.icon size={17}/>{n.name}{page === n.name && <ChevronRight size={15} className="nav-arrow"/>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="system-status"><span className="pulse-dot"/><div><b>Prototype system</b><small>API-connected workspace</small></div></div>
        <div className="sidebar-footer">INFOTHON 7.0 <span>•</span> PS #07</div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumb">Urban intelligence <span>/</span> <b>{page}</b></div>
        <div className="top-actions"><Badge tone="mint">● Demo environment</Badge><button className="icon-button" onClick={refresh} title="Refresh"><RefreshCw size={16}/></button><div className="avatar">UP</div></div>
      </header>

      <div className="content">
        {error && <div className="alert error"><AlertTriangle size={17}/><span>{error}</span><button onClick={() => setError("")}><X size={15}/></button></div>}
        {notice && <div className="alert success"><CheckCircle2 size={17}/><span>{notice}</span><button onClick={() => setNotice("")}><X size={15}/></button></div>}

        {page === "Overview" && <>
          <div className="page-heading"><div><div className="eyebrow"><span/> LIVE CITY OPERATIONS</div><h1>Road intelligence, <em>in motion.</em></h1><p>Transforming mobile observations into a coordinated, adaptive road-maintenance plan.</p></div><button className="primary-button" onClick={() => setPage("Incident fusion")}><AlertTriangle size={16}/> Report an incident</button></div>
          <div className="stat-grid">
            <Stat label="OPEN INCIDENTS" value={openIncidents.length.toString().padStart(2,"0")} detail="Across monitored road segments" icon={ShieldAlert} tone="coral"/>
            <Stat label="HIGH PRIORITY" value={critical.toString().padStart(2,"0")} detail="Critical and high severity" icon={Siren} tone="amber"/>
            <Stat label="OBSERVATIONS FUSED" value={incidents.reduce((s,i)=>s+Number(i.observations||1),0).toString().padStart(2,"0")} detail="Repeat sightings consolidated" icon={Layers3} tone="blue"/>
            <Stat label="MEAN PRIORITY" value={fmt(average)} detail="Transparent heuristic / 100" icon={Activity} tone="mint"/>
          </div>

          <div className="section-grid">
            <section className="panel map-panel">
              <div className="panel-heading"><div><h2>Incident landscape</h2><p>Sample coordinates • OpenStreetMap</p></div><Badge>MAP VIEW</Badge></div>
              <div className="map-wrap"><MapContainer center={[12.2958,76.6394]} zoom={12} scrollWheelZoom={true} style={{height:"100%",width:"100%"}}><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{openIncidents.map(i=><CircleMarker key={i.incident_code} center={[i.latitude,i.longitude]} radius={Math.max(7,Math.min(14,Number(i.priority_score||20)/7))} pathOptions={{color:SEV[i.severity]||"#50d6b0",fillColor:SEV[i.severity]||"#50d6b0",fillOpacity:.75,weight:2}}><Popup><b>{i.hazard_type}</b><br/>{i.location_label}<br/>Priority: {i.priority_score}</Popup></CircleMarker>)}</MapContainer></div>
              <div className="map-legend"><span><i style={{background:SEV.Critical}}/>Critical</span><span><i style={{background:SEV.High}}/>High</span><span><i style={{background:SEV.Medium}}/>Medium</span><span><i style={{background:SEV.Low}}/>Low</span></div>
            </section>
            <section className="panel">
              <div className="panel-heading"><div><h2>Priority queue</h2><p>Ranked by transparent risk score</p></div><button className="text-button" onClick={() => setPage("Incident fusion")}>View all <ChevronRight size={14}/></button></div>
              <div className="priority-list">{openIncidents.slice().sort((a,b)=>b.priority_score-a.priority_score).slice(0,5).map((i,idx)=><div className="priority-row" key={i.incident_code}><div className="rank">{String(idx+1).padStart(2,"0")}</div><div className="priority-main"><b>{i.hazard_type}</b><small>{i.location_label} · {i.observations} observation(s)</small><div className="score-track"><span style={{width:`${i.priority_score}%`,background:SEV[i.severity]||"#50d6b0"}}/></div></div><div className="priority-score"><b>{fmt(i.priority_score)}</b><small>/100</small></div></div>)}</div>
              <div className="panel-footnote"><Sparkles size={14}/> Repeat observations increase priority; uncertain detections still require verification.</div>
            </section>
          </div>

          <section className="panel table-panel"><div className="panel-heading"><div><h2>Latest incidents</h2><p>Consolidated observations from mobile sources</p></div><Badge tone="mint">{incidents.length} RECORDS</Badge></div><IncidentTable incidents={incidents.slice(0,6)} onResolve={resolve}/></section>
        </>}

        {page === "Incident fusion" && <><div className="page-heading"><div><div className="eyebrow"><span/> MULTI-SOURCE SENSING</div><h1>Incident <em>fusion.</em></h1><p>Submit a bus-camera or field observation. Nearby reports of the same hazard are merged.</p></div></div>
          <div className="two-col"><section className="panel form-panel"><div className="panel-heading"><div><h2>New observation</h2><p>Coordinates are used for fusion.</p></div><MapPinned size={19}/></div>
            <form onSubmit={submitIncident} className="form-grid">
              <label>Hazard type<select value={form.hazard_type} onChange={e=>setForm({...form,hazard_type:e.target.value})}>{["Pothole","Road damage","Waterlogging","Obstruction","Traffic congestion","Other"].map(x=><option key={x}>{x}</option>)}</select></label>
              <label>Severity<select value={form.severity} onChange={e=>setForm({...form,severity:e.target.value})}>{["Low","Medium","High","Critical"].map(x=><option key={x}>{x}</option>)}</select></label>
              <label className="full">Location / road segment<input required value={form.location_label} onChange={e=>setForm({...form,location_label:e.target.value})} placeholder="e.g. Ring Road, junction name"/></label>
              <label>Latitude<input required type="number" step="any" value={form.latitude} onChange={e=>setForm({...form,latitude:e.target.value})}/></label>
              <label>Longitude<input required type="number" step="any" value={form.longitude} onChange={e=>setForm({...form,longitude:e.target.value})}/></label>
              <label>Confidence (0–1)<input type="number" min="0" max="1" step=".01" value={form.confidence} onChange={e=>setForm({...form,confidence:e.target.value})}/></label>
              <label>Road importance (1–5)<input type="number" min="1" max="5" value={form.road_importance} onChange={e=>setForm({...form,road_importance:e.target.value})}/></label>
              <label className="full">Evidence notes<textarea rows="3" value={form.evidence_note} onChange={e=>setForm({...form,evidence_note:e.target.value})} placeholder="Optional context or model evidence"/></label>
              <button className="primary-button full" disabled={busy}><Layers3 size={16}/>{busy?"Processing…":"Submit and fuse observation"}</button>
            </form>
          </section>
          <section className="panel"><div className="panel-heading"><div><h2>Fusion logic</h2><p>Transparent spatial matching</p></div><Layers3 size={19}/></div><div className="logic-steps"><LogicStep n="01" title="Normalize hazard" text="Standardize hazard labels before comparing reports."/><LogicStep n="02" title="Check spatial distance" text="Haversine distance checks whether reports are within 35 metres."/><LogicStep n="03" title="Merge evidence" text="Increase observation count and retain the highest reported severity and confidence."/><LogicStep n="04" title="Re-score incident" text="Updated evidence feeds into the priority queue and maintenance planner."/></div><div className="callout"><AlertTriangle size={16}/><span>Prototype limitation: fusion uses type + distance only. A production system should add a time window, image similarity and manual review.</span></div></section></div>
          <section className="panel table-panel"><div className="panel-heading"><div><h2>Incident register</h2><p>Resolve items only after simulated verification.</p></div></div><IncidentTable incidents={incidents} onResolve={resolve}/></section>
        </>}

        {page === "Vision lab" && <><div className="page-heading"><div><div className="eyebrow"><span/> COMPUTER VISION</div><h1>Vision <em>laboratory.</em></h1><p>Run an uploaded road image through a configured model and inspect detections.</p></div></div>
          <div className="two-col"><section className="panel vision-panel"><div className="panel-heading"><div><h2>Inference workspace</h2><p>Image upload • API inference</p></div><Cpu size={19}/></div>
            <form onSubmit={runVision} className="upload-box"><input type="file" accept="image/*" onChange={e=>{setImageFile(e.target.files?.[0]||null);setVisionResult(null);}}/><div className="upload-icon"><CloudUpload size={26}/></div><b>Choose a road image</b><small>JPG / PNG · max 12 MB</small><button className="primary-button" disabled={!imageFile||busy}><Upload size={16}/>{busy?"Running inference…":"Run model inference"}</button></form>
            {visionResult && <div className="result-box"><h3>Inference result</h3><p>{visionResult.note}</p><Badge tone="mint">{visionResult.detections.length} detections</Badge>{visionResult.detections.map((d,i)=><div className="detection-row" key={i}><b>{d.label}</b><span>{(d.confidence*100).toFixed(1)}%</span><small>{d.xyxy.map(v=>Math.round(v)).join(", ")}</small></div>)}</div>}
          </section><section className="panel"><div className="panel-heading"><div><h2>Model readiness</h2><p>Inference is only enabled with weights.</p></div><Bot size={19}/></div>
            <div className="model-status"><div className={`model-status-icon ${vision?.configured?"ready":"waiting"}`}>{vision?.configured?<CheckCircle2 size={24}/>:<Cpu size={24}/>}</div><div><b>{vision?.configured?"Model file configured":"Road model not configured"}</b><p>{vision?.message||"Checking backend…"}</p></div></div>
            <div className="callout"><ShieldAlert size={16}/><span>A generic object detector is not a road-hazard model. Use weights trained for the target hazard classes; never interpret empty output as proof that a road is safe.</span></div>
            <div className="mini-code"><span>EXPECTED ENV CONFIG</span><code>ROAD_MODEL_PATH=models/road_hazards.pt</code></div>
          </section></div>
        </>}

        {page === "Autonomous planner" && <><div className="page-heading"><div><div className="eyebrow"><span/> CLOSED-LOOP DECISION SUPPORT</div><h1>Autonomous <em>planner.</em></h1><p>Prioritize incidents and assign simulated maintenance teams with capacity and skill constraints.</p></div><button className="primary-button" onClick={runReplan} disabled={busy}><RefreshCw size={16}/>{busy?"Replanning…":"Run planning cycle"}</button></div>
          <div className="stat-grid planner-stats"><Stat label="OPEN WORK ITEMS" value={openIncidents.length} detail="Not yet resolved" icon={ClipboardList} tone="coral"/><Stat label="TEAM ASSIGNMENTS" value={plan?.assignments?.length??"—"} detail="Capacity-aware allocation" icon={Route} tone="blue"/><Stat label="UNASSIGNED" value={plan?.unassigned?.length??"—"} detail="No eligible capacity / skills" icon={AlertTriangle} tone="amber"/><Stat label="PLANNING METHOD" value="Greedy" detail="Transparent baseline algorithm" icon={BrainCircuit} tone="mint"/></div>
          <section className="panel table-panel"><div className="panel-heading"><div><h2>Recommended assignments</h2><p>Sorted by incident priority; nearest eligible team chosen.</p></div><Badge tone="mint">{plan?.assignments?.length??0} ASSIGNMENTS</Badge></div>
            {!plan?.assignments?.length?<div className="empty-state">No assignments available. Refresh or add incidents.</div>:<div className="assignment-list">{plan.assignments.map((a,i)=><div className="assignment" key={a.incident_code}><div className="assignment-number">{String(i+1).padStart(2,"0")}</div><div className="assignment-main"><b>{a.hazard_type} <span>· {a.incident_code}</span></b><small>{a.location_label}</small><p>{a.reason}</p></div><div className="assignment-team"><b>{a.team_name}</b><small>{a.approx_distance_km} km approx.</small></div><Badge tone={a.priority_score>75?"coral":a.priority_score>50?"amber":"mint"}>{fmt(a.priority_score)}</Badge></div>)}</div>}
            {!!plan?.unassigned?.length&&<><h3 className="subheading">Needs manual allocation</h3>{plan.unassigned.map(x=><div className="unassigned" key={x.incident_code}><AlertTriangle size={16}/><span><b>{x.incident_code}</b> — {x.reason}</span></div>)}</>}
            <div className="callout"><Sparkles size={16}/><span>{plan?.warning||"Assignments are recommendations only."}</span></div>
          </section>
          <section className="panel"><div className="panel-heading"><div><h2>Autonomy loop</h2><p>Observe → fuse → prioritize → plan → re-evaluate</p></div><RefreshCw size={19}/></div><div className="loop-grid"><div><CircleDot/><b>Observe</b><small>New bus/citizen report</small></div><ArrowDownRight/><div><Layers3/><b>Fuse</b><small>Merge nearby evidence</small></div><ArrowDownRight/><div><BrainCircuit/><b>Plan</b><small>Assign by risk and capacity</small></div><ArrowDownRight/><div><Waves/><b>Adapt</b><small>Replan after change</small></div></div></section>
        </>}
        <footer className="app-footer"><span>URBANPULSE X</span><span>Prototype • Simulated seed data • Human verification required</span><span>Infothon 7.0 / PS #07</span></footer>
      </div>
    </main>
  </div>;
}

function LogicStep({n,title,text}) { return <div className="logic-step"><span>{n}</span><div><b>{title}</b><p>{text}</p></div></div>; }

function IncidentTable({incidents,onResolve}) {
  if (!incidents.length) return <div className="empty-state">No incidents found.</div>;
  return <div className="table-scroll"><table><thead><tr><th>INCIDENT</th><th>HAZARD</th><th>LOCATION</th><th>SEVERITY</th><th>OBS.</th><th>PRIORITY</th><th>STATUS</th><th></th></tr></thead><tbody>{incidents.map(i=><tr key={i.incident_code}><td className="mono">{i.incident_code}</td><td><b>{i.hazard_type}</b><small className="cell-sub">{i.source}</small></td><td>{i.location_label}<small className="cell-sub">{Number(i.latitude).toFixed(4)}, {Number(i.longitude).toFixed(4)}</small></td><td><Badge tone={i.severity==="Critical"||i.severity==="High"?"coral":i.severity==="Medium"?"amber":"mint"}>{i.severity}</Badge></td><td>{i.observations}</td><td><b>{fmt(i.priority_score)}</b></td><td><Badge tone={i.status==="Resolved"?"mint":"neutral"}>{i.status}</Badge></td><td>{i.status!=="Resolved"&&<button className="resolve-button" onClick={()=>onResolve(i.incident_code)} title="Mark resolved"><CheckCircle2 size={15}/></button>}</td></tr>)}</tbody></table></div>;
}
