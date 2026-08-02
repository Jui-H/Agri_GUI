const state = {
  running: false,
  paused: false,
  emergency: false,
  battery: 82,
  progress: 45,
  completed: 29,
  currentZone: 4,
  sprayTimer: null,
  sprayProgress: 0
};

const prescriptions = [
  {zone:"Z-01",n:45,p:20,k:110,rn:5,rp:0,rk:0,time:8,status:"Completed"},
  {zone:"Z-02",n:40,p:16,k:105,rn:8,rp:5,rk:0,time:13,status:"Completed"},
  {zone:"Z-03",n:28,p:14,k:90,rn:12,rp:8,rk:0,time:18,status:"Pending"},
  {zone:"Z-04",n:35,p:18,k:125,rn:10,rp:5,rk:0,time:15,status:"Pending"},
  {zone:"Z-05",n:60,p:25,k:140,rn:0,rp:0,rk:0,time:0,status:"Not required"}
];

const defaultSensorRows = [
  {timestamp:"2026-08-02T20:41:32+06:00",zone:"Z-04",n:35,p:18,k:125,status:"Valid"},
  {timestamp:"2026-08-02T20:38:10+06:00",zone:"Z-03",n:28,p:14,k:90,status:"Valid"},
  {timestamp:"2026-08-02T20:35:02+06:00",zone:"Z-02",n:40,p:16,k:105,status:"Valid"},
  {timestamp:"2026-08-02T20:31:48+06:00",zone:"Z-01",n:45,p:20,k:110,status:"Valid"}
];

function loadSensorRows(){
  try {
    const saved=localStorage.getItem("agriroverSensorHistory");
    return saved ? JSON.parse(saved) : [...defaultSensorRows];
  } catch(error){
    console.error("Could not load sensor history",error);
    return [...defaultSensorRows];
  }
}

let sensorRows=loadSensorRows();
let lastSensorUpdate=sensorRows.length ? new Date(sensorRows[0].timestamp) : null;

function toast(message){
  const el=document.getElementById("toast");
  el.textContent=message; el.classList.add("show");
  clearTimeout(el.timer); el.timer=setTimeout(()=>el.classList.remove("show"),2600);
}

function updateClock(){
  document.getElementById("clockText").textContent=new Date().toLocaleString();
}
setInterval(updateClock,1000); updateClock();

function navigate(id){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
  document.querySelector(`.nav-item[data-page="${id}"]`)?.classList.add("active");
  document.getElementById("sidebar").classList.remove("open");
}
document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>navigate(btn.dataset.page)));
document.querySelectorAll("[data-page-link]").forEach(btn=>btn.addEventListener("click",()=>navigate(btn.dataset.pageLink)));
document.getElementById("menuBtn").onclick=()=>document.getElementById("sidebar").classList.toggle("open");

function createMap(containerId, rows=8, cols=8){
  const map=document.getElementById(containerId);
  if(!map) return;
  map.innerHTML="";
  map.style.gridTemplateColumns=`repeat(${cols},1fr)`;
  for(let i=1;i<=rows*cols;i++){
    const z=document.createElement("button");
    z.className="zone";
    if(i<=18) z.classList.add("sampled");
    if([3,12,22,30].includes(i)) z.className="zone needs";
    if([4,20].includes(i)) z.className="zone done";
    if(i===state.currentZone) z.classList.add("current");
    z.textContent=`Z-${String(i).padStart(2,"0")}`;
    z.onclick=()=>selectZone(i);
    map.appendChild(z);
  }
}
createMap("fieldMap"); createMap("largeMap");

function selectZone(i){
  state.currentZone=i;
  document.querySelectorAll(".zone").forEach(z=>z.classList.remove("current"));
  document.querySelectorAll(".zone").forEach(z=>{
    if(z.textContent===`Z-${String(i).padStart(2,"0")}`) z.classList.add("current");
  });
  const row=prescriptions[(i-1)%prescriptions.length];
  const name=`Z-${String(i).padStart(2,"0")}`;
  document.getElementById("currentZone").textContent=name;
  document.getElementById("zoneTitle").textContent=name;
  document.getElementById("controlZone").textContent=name;
  document.getElementById("zoneN").textContent=`${row.n} mg/kg`;
  document.getElementById("zoneP").textContent=`${row.p} mg/kg`;
  document.getElementById("zoneK").textContent=`${row.k} mg/kg`;
  document.getElementById("zoneDose").textContent=`N ${row.rn} ml · P ${row.rp} ml · K ${row.rk} ml`;
  toast(`${name} selected`);
}

function heatColor(value){
  const hue=220-(value*2.2);
  return `hsl(${hue} 78% 52%)`;
}
function createHeatmap(id, offset=0){
  const root=document.getElementById(id); if(!root) return;
  root.innerHTML="";
  for(let i=0;i<96;i++){
    const cell=document.createElement("div");
    const v=(Math.sin((i+offset)/7)+1)*38 + (i%12)*2;
    cell.className="heat-cell"; cell.style.background=heatColor(Math.min(100,v));
    cell.title=`Value: ${Math.round(v)}`;
    root.appendChild(cell);
  }
}
createHeatmap("heatmapCanvas"); createHeatmap("largeHeatmap",8);
document.getElementById("heatmapType").onchange=e=>{
  const offsets={n:0,p:18,k:37}; createHeatmap("heatmapCanvas",offsets[e.target.value]); toast(`${e.target.options[e.target.selectedIndex].text} heatmap loaded`);
};

function renderPrescription(){
  const makeRow=r=>`<tr class="${r.zone==="Z-04"?"selected":""}"><td>${r.zone}</td><td>${r.n}</td><td>${r.p}</td><td>${r.k}</td><td>${r.rn} ml</td><td>${r.rp} ml</td><td>${r.rk} ml</td>${r.time!==undefined?`<td>${r.time}s</td>`:""}<td><span class="badge ${r.status==="Completed"?"green":r.status==="Pending"?"amber":"blue"}">${r.status}</span></td></tr>`;
  document.getElementById("prescriptionBody").innerHTML=prescriptions.map(r=>`<tr class="${r.zone==="Z-04"?"selected":""}"><td>${r.zone}</td><td>${r.n}</td><td>${r.p}</td><td>${r.k}</td><td>${r.rn} ml</td><td>${r.rp} ml</td><td>${r.rk} ml</td><td><span class="badge ${r.status==="Completed"?"green":r.status==="Pending"?"amber":"blue"}">${r.status}</span></td></tr>`).join("");
  document.getElementById("prescriptionBody2").innerHTML=prescriptions.map(makeRow).join("");
}
renderPrescription();

function formatTimestamp(dateValue){
  const date=dateValue instanceof Date ? dateValue : new Date(dateValue);
  return date.toLocaleString("en-GB",{
    day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true
  });
}

function saveSensorRows(){
  localStorage.setItem("agriroverSensorHistory",JSON.stringify(sensorRows));
}

function statusBadge(status){
  return status==="Valid" ? "green" : "amber";
}

function renderSensorHistory(rows=sensorRows){
  const body=document.getElementById("sensorHistory");
  if(!body) return;
  if(!rows.length){
    body.innerHTML='<tr><td colspan="7" class="empty-state">No stored samples match this filter.</td></tr>';
  } else {
    body.innerHTML=rows.map(sample=>`<tr>
      <td>${formatTimestamp(sample.timestamp)}</td>
      <td>${sample.zone}</td>
      <td>${sample.n} mg/kg</td>
      <td>${sample.p} mg/kg</td>
      <td>${sample.k} mg/kg</td>
      <td><span class="badge ${statusBadge(sample.status)}">${sample.status}</span></td>
      <td><button class="btn small view-sample" data-time="${sample.timestamp}">View</button></td>
    </tr>`).join("");
  }
  const summary=document.getElementById("historySummary");
  if(summary) summary.textContent=`Showing ${rows.length} of ${sensorRows.length} stored sample${sensorRows.length===1?"":"s"}`;
  document.querySelectorAll(".view-sample").forEach(button=>button.onclick=()=>viewHistoricalSample(button.dataset.time));
}

function populateZoneFilter(){
  const select=document.getElementById("historyZone");
  if(!select) return;
  const selected=select.value;
  const zones=[...new Set(sensorRows.map(row=>row.zone))].sort();
  select.innerHTML='<option value="all">All zones</option>'+zones.map(zone=>`<option value="${zone}">${zone}</option>`).join("");
  if(zones.includes(selected)) select.value=selected;
}

function updateTimestampDisplay(){
  const stamp=document.getElementById("sensorTimestamp");
  if(stamp) stamp.textContent=lastSensorUpdate ? formatTimestamp(lastSensorUpdate) : "No data received";
}

function updateDataAge(){
  const age=document.getElementById("sensorDataAge");
  if(!age) return;
  if(!lastSensorUpdate){ age.textContent="No data"; return; }
  const seconds=Math.max(0,Math.floor((Date.now()-lastSensorUpdate.getTime())/1000));
  if(seconds<60) age.textContent=`${seconds} sec ago`;
  else if(seconds<3600) age.textContent=`${Math.floor(seconds/60)} min ago`;
  else if(seconds<86400) age.textContent=`${Math.floor(seconds/3600)} hr ago`;
  else age.textContent=`${Math.floor(seconds/86400)} day(s) ago`;
}

function takeSample(){
  const n=Math.floor(30+Math.random()*20),p=Math.floor(14+Math.random()*14),k=Math.floor(105+Math.random()*35);
  const now=new Date();
  document.getElementById("nGauge").textContent=n;
  document.getElementById("pGauge").textContent=p;
  document.getElementById("kGauge").textContent=k;
  lastSensorUpdate=now;
  sensorRows.unshift({timestamp:now.toISOString(),zone:`Z-${String(state.currentZone).padStart(2,"0")}`,n,p,k,status:"Valid"});
  saveSensorRows();
  populateZoneFilter();
  renderSensorHistory();
  updateTimestampDisplay();
  updateDataAge();
  toast("New timestamped soil sample recorded");
}

function viewHistoricalSample(timestamp){
  const sample=sensorRows.find(row=>row.timestamp===timestamp);
  if(!sample) return toast("Historical sample not found");
  document.getElementById("nGauge").textContent=sample.n;
  document.getElementById("pGauge").textContent=sample.p;
  document.getElementById("kGauge").textContent=sample.k;
  document.getElementById("sensorTimestamp").textContent=formatTimestamp(sample.timestamp);
  document.getElementById("sensorDataAge").textContent="Historical record";
  toast(`Viewing ${sample.zone} data from ${formatTimestamp(sample.timestamp)}`);
}

function applyHistoryFilter(){
  const from=document.getElementById("historyFrom").value;
  const to=document.getElementById("historyTo").value;
  const zone=document.getElementById("historyZone").value;
  const filtered=sensorRows.filter(sample=>{
    const time=new Date(sample.timestamp).getTime();
    const after=!from || time>=new Date(`${from}T00:00:00`).getTime();
    const before=!to || time<=new Date(`${to}T23:59:59`).getTime();
    const zoneMatch=zone==="all" || sample.zone===zone;
    return after && before && zoneMatch;
  });
  renderSensorHistory(filtered);
}

function resetHistoryFilter(){
  document.getElementById("historyFrom").value="";
  document.getElementById("historyTo").value="";
  document.getElementById("historyZone").value="all";
  renderSensorHistory();
}

function exportHistoryCsv(){
  const header=["Timestamp","Zone","Nitrogen","Phosphorus","Potassium","Status"];
  const rows=sensorRows.map(s=>[s.timestamp,s.zone,s.n,s.p,s.k,s.status]);
  const csv=[header,...rows].map(row=>row.join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download="agrirover-sensor-history.csv";a.click();URL.revokeObjectURL(a.href);
  toast("Sensor history CSV exported");
}

populateZoneFilter();
renderSensorHistory();
updateTimestampDisplay();
updateDataAge();
setInterval(updateDataAge,1000);

document.getElementById("takeSample").onclick=takeSample;
document.getElementById("takeSample2").onclick=takeSample;
document.getElementById("filterHistory").onclick=applyHistoryFilter;
document.getElementById("resetHistoryFilter").onclick=resetHistoryFilter;
document.getElementById("exportHistoryCsv").onclick=exportHistoryCsv;

function updateMissionUI(){
  document.getElementById("batteryValue").textContent =
    `${Math.round(state.battery)}%`;

  document.getElementById("sideBattery").textContent =
    `${Math.round(state.battery)}%`;

  document.getElementById("batteryBar").style.width =
    `${state.battery}%`;

  document.getElementById("sideBatteryBar").style.width =
    `${state.battery}%`;

  document.getElementById("progressValue").textContent =
    `${Math.round(state.progress)}%`;

  document.getElementById("missionBar").style.width =
    `${state.progress}%`;

  document.getElementById("zonesValue").textContent =
    `${state.completed} / 64`;

  document.getElementById("sideZones").textContent =
    `${state.completed} / 64`;
}
document.getElementById("startMission").onclick=()=>{
  if(state.emergency) return toast("Reset emergency stop first");
  state.running=true; state.paused=false;
  document.getElementById("missionStatus").textContent="Sampling";
  document.getElementById("overviewState").textContent="Live";
  toast("Mission started");
};
document.getElementById("pauseMission").onclick=()=>{
  state.paused=!state.paused;
  document.getElementById("missionStatus").textContent=state.paused?"Paused":"Sampling";
  document.getElementById("pauseMission").textContent=state.paused?"Resume":"Pause";
  toast(state.paused?"Mission paused":"Mission resumed");
};
setInterval(()=>{
  if(state.running && !state.paused && !state.emergency && state.progress<100){
    state.battery=Math.max(0,state.battery-0.03);
    state.progress=Math.min(100,state.progress+0.08);
    state.completed=Math.floor(state.progress/100*64);
    updateMissionUI();
  }
},1000);

document.getElementById("emergencyBtn").onclick=()=>{
  state.emergency=!state.emergency;
  state.running=false;
  document.getElementById("missionStatus").textContent=state.emergency?"Emergency Stop":"Idle";
  document.getElementById("modeLabel").textContent=state.emergency?"Manual Lock":"Autonomous";
  document.getElementById("emergencyBtn").textContent=state.emergency?"Reset Emergency":"⏱ Emergency Stop";
  toast(state.emergency?"Emergency stop activated":"Emergency reset complete");
};

document.getElementById("toggleGrid").onclick=()=>document.getElementById("fieldMap").classList.toggle("hide-labels");
document.getElementById("resetMap").onclick=()=>{state.currentZone=4;createMap("fieldMap");selectZone(4)};
document.getElementById("generateGrid").onclick=()=>{
  const rows=+document.getElementById("fieldRows").value, cols=+document.getElementById("fieldCols").value;
  createMap("fieldMap",rows,cols); createMap("largeMap",rows,cols); toast(`Generated ${rows} × ${cols} field grid`);
};

function exportCsv(){
  const header=["Zone","N","P","K","Required N","Required P","Required K","Spray Time","Status"];
  const rows=prescriptions.map(r=>[r.zone,r.n,r.p,r.k,r.rn,r.rp,r.rk,r.time,r.status]);
  const csv=[header,...rows].map(r=>r.join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="agrirover-prescription.csv"; a.click(); URL.revokeObjectURL(a.href);
  toast("Prescription CSV exported");
}
document.getElementById("exportCsv").onclick=exportCsv;

function approve(){
  prescriptions.forEach(r=>{if(r.status==="Pending")r.status="Approved"});
  renderPrescription(); toast("Prescription approved and sent to fertilizer unit");
}
document.getElementById("approvePrescription").onclick=approve;
document.getElementById("approvePrescription2").onclick=approve;

document.querySelectorAll(".valve").forEach(v=>v.onclick=()=>{
  v.classList.toggle("on");
  const on=v.classList.contains("on");
  const b=v.querySelector("b"); if(b)b.textContent=on?"OPEN":"CLOSED";
  toast(`${v.dataset.valve||"Main"} valve ${on?"opened":"closed"}`);
});

function setSprayProgress(v){
  state.sprayProgress=Math.max(0,Math.min(100,v));
  document.getElementById("sprayProgress").textContent=`${Math.round(state.sprayProgress)}%`;
  document.getElementById("sprayBar").style.width=`${state.sprayProgress}%`;
}
document.getElementById("startSpray").onclick=()=>{
  clearInterval(state.sprayTimer); document.getElementById("pumpStatus").textContent="Running";
  state.sprayTimer=setInterval(()=>{setSprayProgress(state.sprayProgress+4); if(state.sprayProgress>=100){clearInterval(state.sprayTimer);document.getElementById("pumpStatus").textContent="Completed";document.getElementById("zoneFertState").textContent="Completed";toast("Fertilization completed")}},500);
  toast("Sprinkler started");
};
document.getElementById("pauseSpray").onclick=()=>{clearInterval(state.sprayTimer);document.getElementById("pumpStatus").textContent="Paused";toast("Sprinkler paused")};
document.getElementById("stopSpray").onclick=()=>{clearInterval(state.sprayTimer);setSprayProgress(0);document.getElementById("pumpStatus").textContent="Stopped";toast("Sprinkler stopped")};

const cropProfiles=[
  {name:"Rice",emoji:"🌾",base:88,reason:"Strong fit for warm, humid and high-moisture conditions."},
  {name:"Maize",emoji:"🌽",base:80,reason:"Suitable nutrient balance with moderate moisture demand."},
  {name:"Wheat",emoji:"🌿",base:65,reason:"Possible with lower moisture and cooler seasonal conditions."},
  {name:"Mustard",emoji:"🌼",base:55,reason:"Requires drier conditions and improved phosphorus."}
];
function runRecommendation(){
  const n=+document.getElementById("recN").value,p=+document.getElementById("recP").value,moist=+document.getElementById("recMoisture").value,temp=+document.getElementById("recTemp").value;
  const scores=cropProfiles.map((c,i)=>{
    let score=c.base;
    if(c.name==="Rice") score += moist>65?5:-12;
    if(c.name==="Maize") score += n>40?4:-3;
    if(c.name==="Wheat") score += temp<25?8:-7;
    if(p<18) score-=4;
    return {...c,score:Math.max(20,Math.min(98,Math.round(score)))};
  }).sort((a,b)=>b.score-a.score);
  document.getElementById("cropResults").innerHTML=scores.map((c,i)=>`<article class="result-card"><header><strong>${c.emoji} ${i+1}. ${c.name}</strong><span class="badge ${i===0?"green":"blue"}">${c.score}% suitable</span></header><p>${c.reason}</p><div class="progress"><i style="width:${c.score}%"></i></div></article>`).join("");
  document.getElementById("bestCrop").textContent=scores[0].name;
  document.getElementById("cropScore").textContent=`${scores[0].score}%`;
  document.getElementById("cropReason").textContent=scores[0].reason;
  toast("Crop recommendation generated");
}
document.getElementById("runCropModel").onclick=runRecommendation;
document.getElementById("generateRecommendation").onclick=()=>{navigate("crop");runRecommendation()};
runRecommendation();

document.querySelectorAll(".crop-alternatives button").forEach(b=>b.onclick=()=>toast(`${b.dataset.crop}: ${b.dataset.score}% suitability`));

document.querySelectorAll(".dpad button").forEach(b=>b.onclick=()=>{
  document.getElementById("manualCommand").textContent=`Command sent: ${b.dataset.command}`;
  toast(`${b.dataset.command} command sent`);
});
document.getElementById("manualSpeed").oninput=e=>document.getElementById("manualSpeedValue").textContent=`${e.target.value} m/s`;
document.getElementById("manualStop").onclick=()=>{document.getElementById("manualCommand").textContent="Emergency motor stop sent.";toast("Motor stopped")};

const allAlerts=[
  ["warning","⚠","Low N tank level","19% remaining","10:44 AM"],
  ["warning","🚧","Obstacle detected","0.7 m ahead; rover paused briefly","10:43 AM"],
  ["info","ℹ","Battery update","Rover battery at 82%","10:40 AM"],
  ["success","✓","NPK sensor","Calibration and communication normal","10:38 AM"],
  ["success","✓","GPS lock","12 satellites acquired","10:36 AM"],
  ["info","ℹ","Mission initialized","64-zone grid loaded","10:30 AM"]
];
function renderAlerts(){document.getElementById("allAlerts").innerHTML=allAlerts.map(a=>`<article class="alert ${a[0]}"><span>${a[1]}</span><div><strong>${a[2]}</strong><small>${a[3]}</small></div><time>${a[4]}</time></article>`).join("")}
renderAlerts();
document.getElementById("clearAlerts").onclick=()=>{document.getElementById("allAlerts").innerHTML="<p>No active alerts.</p>";toast("Alerts cleared")};

document.querySelectorAll(".mission-view").forEach(button=>button.onclick=()=>{
  const mission=button.dataset.mission;
  const detail=document.getElementById("missionDetail");
  detail.innerHTML=`<strong>${mission}</strong><span>Past mission summary loaded. Open Soil Sensor Data to filter and inspect timestamped sample records.</span><button class="btn small" id="openSensorHistory">Open sensor history</button>`;
  document.getElementById("openSensorHistory").onclick=()=>navigate("sensor");
});
