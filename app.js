/* =========================================================
   AGRIROVER GUI V12
   Autonomous crop assignment -> sampling -> deficiency map
   -> autonomous fertilization

   TELEMETRY (18 fields):
   PACKET_NUMBER,LATITUDE,LONGITUDE,TEMPERATURE,HUMIDITY,
   NITROGEN,PHOSPHORUS,POTASSIUM,
   REQUIRED_N,REQUIRED_P,REQUIRED_K,
   ROLL,PITCH,YAW,ACC_X,ACC_Y,ACC_Z,BATTERY_PERCENT

   Rover status strings supported:
   ROVER,SAMPLING_STARTED
   ROVER,SAMPLING_DONE
   ROVER,FERTILIZING
   ROVER,MISSION_DONE
   ROVER,CROP_ACK,<CROP_KEY>
========================================================= */

/* =========================================================
   CROP DATA — BARC 2018 optimum maxima from supplied dataset
========================================================= */
const CROP_DATA = [
  { key:"LENTIL", name:"Lentil", bangla:"মসুর", type:"Pulse", n:7, p:6, k:7, condition:"All fertilizers basal during final land preparation." },
  { key:"CHICKPEA", name:"Chickpea", bangla:"ছোলা", type:"Pulse", n:9, p:6, k:8, condition:"All fertilizers basal during final land preparation." },
  { key:"MUNGBEAN", name:"Mungbean", bangla:"মুগ", type:"Pulse", n:6, p:6, k:8, condition:"Same method as lentil/chickpea; basal during final land preparation." },
  { key:"BLACKGRAM", name:"Blackgram", bangla:"মাষকলাই", type:"Pulse", n:6, p:5, k:6, condition:"All fertilizers basal during final land preparation." },
  { key:"GRASSPEA", name:"Grasspea", bangla:"খেসারি", type:"Pulse", n:5, p:5, k:6, condition:"WITH TILLAGE only: all N, P, K and S basal during final land preparation." },
  { key:"COWPEA", name:"Cowpea", bangla:"কাউপিয়া / ফেলন", type:"Pulse", n:5, p:5, k:6, condition:"All fertilizers basal during final land preparation." },
  { key:"FOXTAIL_MILLET", name:"Foxtail millet", bangla:"কাউন", type:"Cereal", n:20, p:8, k:14, condition:"RAINFED CULTURE only: all fertilizers during final land preparation." },
  { key:"MUSTARD", name:"Mustard", bangla:"সরিষা", type:"Oilseed", n:40, p:12, k:30, condition:"RAINFED only; envelope across BARC mustard groups." },
  { key:"SESAME", name:"Sesame", bangla:"তিল", type:"Oilseed", n:25, p:10, k:20, condition:"RAINFED condition only: all fertilizers basal during final land preparation." },
  { key:"GROUNDNUT", name:"Groundnut", bangla:"চিনাবাদাম", type:"Oilseed/legume", n:12, p:12, k:15, condition:"RAINFED condition only: all fertilizers basal during final land preparation." },
  { key:"SOYBEAN", name:"Soybean", bangla:"সয়াবিন", type:"Oilseed/legume", n:9, p:12, k:20, condition:"All fertilizers basal during final land preparation." },
  { key:"SAFFLOWER", name:"Safflower", bangla:"কুসুম", type:"Oilseed", n:25, p:10, k:20, condition:"RAINFED condition only: all fertilizers basal during final land preparation." },
  { key:"LINSEED", name:"Linseed", bangla:"তিসি", type:"Oilseed", n:15, p:5, k:8, condition:"RAINFED condition only: all fertilizers basal during final land preparation." },
  { key:"NIGER", name:"Niger", bangla:"রামতিল", type:"Oilseed", n:25, p:10, k:20, condition:"RAINFED condition only: all fertilizers basal during final land preparation." }
];

/* =========================================================
   STATE
========================================================= */
const state = {
  paused:false,
  emergency:false,
  selectedCrop:null,
  cropSent:false,
  samplingState:"NOT_STARTED",
  fertilizationState:"WAITING",
  battery:0,
  fieldAreaHa:Number(localStorage.getItem("agriroverFieldAreaHa") || 0),
  fieldName:localStorage.getItem("agriroverFieldName") || "BRAC Test Field"
};

let serialPort = null;
let serialReader = null;
let serialBuffer = "";
let baseStationConnected = false;
let latestTelemetry = null;
let lastRoverPacketAt = null;
let lastSensorUpdate = null;

let roverMap = null;
let largeRoverMap = null;
let roverMarker = null;
let largeRoverMarker = null;
let roverTrackLine = null;
let largeRoverTrackLine = null;
let roverGpsHistory = [];
let mapHasCenteredOnce = false;

let dashboardDeficiencyMap = null;
let largeDeficiencyMap = null;
let dashboardDeficiencyLayer = null;
let largeDeficiencyLayer = null;
let deficiencyNutrient = "n";
let heatmapFinalized = false;

const HISTORY_KEY = "agriroverTelemetryV12";
let sensorRows = loadHistory();
let missionSamples = [];
let samplePackets = new Set();
let systemAlerts = [];

/* =========================================================
   HELPERS
========================================================= */
function el(id){ return document.getElementById(id); }
function setText(id,value){ const x=el(id); if(x) x.textContent=value; }
function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
function validGps(lat,lon){ return Number.isFinite(lat)&&Number.isFinite(lon)&&lat!==0&&lon!==0&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180; }
function formatTimestamp(value=new Date()){
  const d=value instanceof Date?value:new Date(value);
  return d.toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true});
}
function toast(message){
  const box=el("toast"); if(!box) return;
  box.textContent=message; box.classList.add("show"); clearTimeout(box.timer);
  box.timer=setTimeout(()=>box.classList.remove("show"),2600);
}
function cropByKey(key){ return CROP_DATA.find(c=>c.key===key) || null; }

/* =========================================================
   CLOCK / NAVIGATION
========================================================= */
function updateClock(){ setText("clockText",new Date().toLocaleString()); }
setInterval(updateClock,1000); updateClock();

function navigate(pageId){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("active"));
  el(pageId)?.classList.add("active");
  document.querySelector(`.nav-item[data-page="${pageId}"]`)?.classList.add("active");
  el("sidebar")?.classList.remove("open");
  setTimeout(()=>{
    if(pageId==="dashboard"){ roverMap?.invalidateSize(); dashboardDeficiencyMap?.invalidateSize(); }
    if(pageId==="liveRover") largeRoverMap?.invalidateSize();
    if(pageId==="deficiency") largeDeficiencyMap?.invalidateSize();
  },120);
}
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>navigate(b.dataset.page));
el("menuBtn")?.addEventListener("click",()=>el("sidebar")?.classList.toggle("open"));

/* =========================================================
   SERIAL CONNECTION
========================================================= */
async function connectBaseStation(){
  if(baseStationConnected){ await disconnectBaseStation(); return; }
  if(!("serial" in navigator)){ alert("Web Serial is not supported. Use desktop Chrome or Edge."); return; }
  try{
    serialPort=await navigator.serial.requestPort();
    await new Promise(r=>setTimeout(r,300));
    await serialPort.open({baudRate:115200,dataBits:8,stopBits:1,parity:"none",flowControl:"none"});
    baseStationConnected=true; updateBaseStatus(true); toast("Base Station connected");
    addAlert("success","Base station connected","USB serial connection established");
    readSerialLoop();
  }catch(error){
    console.error(error); updateBaseStatus(false);
    toast(`Connection failed: ${error.message||error.name}`);
    addAlert("error","Base station connection failed",error.message||error.name);
  }
}

async function disconnectBaseStation(){
  try{ if(serialReader) await serialReader.cancel(); }catch(e){ console.log(e); }
  serialReader=null;
  try{ if(serialPort) await serialPort.close(); }catch(e){ console.log(e); }
  serialPort=null; baseStationConnected=false; updateBaseStatus(false); toast("Base Station disconnected");
}

function updateBaseStatus(connected){
  const dot=el("baseStatusDot"), btn=el("connectBaseStation");
  dot?.classList.toggle("connected-dot",connected); dot?.classList.toggle("disconnected-dot",!connected);
  setText("baseStatusText",connected?"Connected":"Disconnected");
  if(btn){ btn.textContent=connected?"✓ Connected":"🔌 Connect"; btn.classList.toggle("connected",connected); }
}
el("connectBaseStation")?.addEventListener("click",connectBaseStation);

if(navigator.serial){
  navigator.serial.addEventListener("disconnect",()=>{
    baseStationConnected=false; serialPort=null; updateBaseStatus(false); toast("Base Station disconnected");
  });
}

async function readSerialLoop(){
  const decoder=new TextDecoder();
  try{
    while(serialPort&&serialPort.readable){
      serialReader=serialPort.readable.getReader();
      try{
        while(true){
          const {value,done}=await serialReader.read();
          if(done) break; if(!value) continue;
          serialBuffer+=decoder.decode(value,{stream:true});
          const lines=serialBuffer.split(/\r?\n/); serialBuffer=lines.pop();
          for(const raw of lines){
            const line=raw.trim(); if(!line) continue;
            addTelemetryConsoleLine(line); processSerialLine(line);
          }
        }
      }finally{ serialReader?.releaseLock(); serialReader=null; }
    }
  }catch(error){
    console.error("Serial error:",error);
    addAlert("warning","Serial communication stopped",error.message||"Unknown error");
  }
}

async function sendBaseCommand(command){
  if(!baseStationConnected||!serialPort||!serialPort.writable){ toast("Connect Base Station first"); return false; }
  let writer=null;
  try{
    writer=serialPort.writable.getWriter();
    await writer.write(new TextEncoder().encode(command+"\n"));
    addAlert("info","Command sent",command);
    return true;
  }catch(error){ console.error(error); toast("Command transmission failed"); return false; }
  finally{ writer?.releaseLock(); }
}

/* =========================================================
   SERIAL PROTOCOL
========================================================= */
function processSerialLine(line){
  // Rover state strings
  if(line==="ROVER,SAMPLING_STARTED" || line==="SAMPLING_STARTED"){ handleSamplingStarted(); return; }
  if(line==="ROVER,SAMPLING_DONE" || line==="SAMPLING_DONE"){ handleSamplingDone(); return; }
  if(line==="ROVER,FERTILIZING" || line==="FERTILIZING"){ setFertilizationState("FERTILIZING"); return; }
  if(line==="ROVER,MISSION_DONE" || line==="MISSION_DONE"){ handleMissionDone(); return; }
  if(line.startsWith("ROVER,CROP_ACK,")){ handleCropAck(line.split(",")[2]); return; }

  // Base acknowledgements
  if(line.startsWith("BASE,GUI,ACK,")){ processBaseAck(line.split(",").slice(3)); return; }

  // Telemetry: Data: prefix or raw 18-field CSV
  if(line.startsWith("Data:")){
    const t=parseTelemetry(line); if(t) processTelemetry(t); return;
  }
  if(line.includes(",") && line.split(",").length===18){
    const t=parseTelemetry(line); if(t) processTelemetry(t); return;
  }

  if(line.startsWith("RSSI:")){
    const m=line.match(/-?\d+(\.\d+)?/); if(m) setText("telemetryRssi",`${m[0]} dBm`); return;
  }
  if(line.startsWith("SNR:")){
    const m=line.match(/-?\d+(\.\d+)?/); if(m) setText("telemetrySnr",`${m[0]} dB`); return;
  }
}

function parseTelemetry(line){
  let clean=line.trim();
  if(clean.startsWith("Data:")) clean=clean.substring(5).trim();
  const v=clean.split(",").map(x=>x.trim());
  if(v.length!==18){ console.warn(`Expected 18 telemetry fields, got ${v.length}`,clean); return null; }
  const data={
    packetNumber:Number(v[0]), latitude:Number(v[1]), longitude:Number(v[2]),
    temperature:Number(v[3]), humidity:Number(v[4]),
    nitrogen:Number(v[5]), phosphorus:Number(v[6]), potassium:Number(v[7]),
    requiredN:Number(v[8]), requiredP:Number(v[9]), requiredK:Number(v[10]),
    roll:Number(v[11]), pitch:Number(v[12]), yaw:Number(v[13]),
    accX:Number(v[14]), accY:Number(v[15]), accZ:Number(v[16]),
    battery:Number(v[17]), timestamp:new Date()
  };
  const nums=Object.entries(data).filter(([k])=>k!=="timestamp").map(([,x])=>x);
  if(nums.some(Number.isNaN)){ console.warn("Invalid numeric telemetry",data); return null; }
  return data;
}

/* =========================================================
   CROP SELECTION / ASSIGNMENT
========================================================= */
function renderCropButtons(){
  const box=el("cropButtonGrid"); if(!box) return;
  box.innerHTML=CROP_DATA.map(c=>`
    <button class="crop-select-btn" data-crop="${c.key}">
      <span class="crop-emoji">${c.type.includes("Cereal")?"🌾":"🌱"}</span>
      <strong>${c.name}</strong>
      <small>${c.bangla}</small>
    </button>`).join("");
  box.querySelectorAll(".crop-select-btn").forEach(btn=>btn.onclick=()=>selectCrop(btn.dataset.crop));
}

function selectCrop(key){
  const crop=cropByKey(key); if(!crop) return;
  state.selectedCrop=crop; state.cropSent=false;
  document.querySelectorAll(".crop-select-btn").forEach(b=>b.classList.toggle("selected",b.dataset.crop===key));
  setText("selectedCropName",crop.name); setText("selectedCropBangla",crop.bangla);
  setText("cropOptN",crop.n); setText("cropOptP",crop.p); setText("cropOptK",crop.k);
  setText("cropCondition",crop.condition);
  setText("cropSelectionStatus","Selected — not sent");
  setText("cropCommandPreview",`Command: ROVER,CROP,${crop.key}`);
  setText("dashboardCrop",crop.name); setText("sideCrop",crop.name);
  setText("dashboardTargetNpk",`N ${crop.n} • P ${crop.p} • K ${crop.k} kg/ha`);
  setText("prescriptionCrop",crop.name); setText("prescriptionCropBangla",crop.bangla);
  setText("prescriptionOptN",crop.n); setText("prescriptionOptP",crop.p); setText("prescriptionOptK",crop.k);
  resetMissionSamples();
  updateSequence("CROP");
}

async function sendCropAssignment(){
  if(!state.selectedCrop){ toast("Select a crop first"); return; }
  const cmd=`ROVER,CROP,${state.selectedCrop.key}`;
  const sent=await sendBaseCommand(cmd);
  if(sent){
    state.cropSent=true; setText("cropSelectionStatus","Assignment sent");
    setText("missionStatus","Crop assigned"); setText("overviewState","Crop assigned");
    addAlert("success","Crop assignment sent",`${state.selectedCrop.name} (${state.selectedCrop.bangla})`);
    toast(`${state.selectedCrop.name} sent to rover`);
  }
}
el("sendCropAssignment")?.addEventListener("click",sendCropAssignment);

function handleCropAck(key){
  const crop=cropByKey(key);
  if(crop){ state.selectedCrop=crop; state.cropSent=true; selectCrop(crop.key); state.cropSent=true; setText("cropSelectionStatus","Rover acknowledged"); }
}

/* =========================================================
   AUTONOMOUS MISSION STATE
========================================================= */
function handleSamplingStarted(){
  state.samplingState="SAMPLING"; heatmapFinalized=false;
  setText("missionStatus","Sampling"); setText("dashboardSampling","Sampling"); setText("sideSamplingStatus","Sampling");
  setText("telemetrySamplingState","SAMPLING"); setText("sprinklerSamplingState","Sampling in progress");
  setText("heatmapStatusText","Collecting GPS-referenced fertilizer requirement samples...");
  setText("fullHeatmapStatus","Sampling");
  updateSequence("SAMPLING");
  addAlert("info","Sampling started","Rover is collecting field samples autonomously");
}

async function handleSamplingDone(){
  state.samplingState="DONE"; heatmapFinalized=true;
  setText("missionStatus","Sampling complete"); setText("dashboardSampling","Complete"); setText("sideSamplingStatus","Complete");
  setText("telemetrySamplingState","DONE"); setText("sprinklerSamplingState","Complete");
  setText("sprinklerHeatmapState","Generated"); setText("heatmapStatusText",`Sampling complete — ${missionSamples.length} GPS points mapped.`);
  setText("fullHeatmapStatus",`${missionSamples.length} points • Complete`);
  updateSequence("HEATMAP");
  renderDeficiencyMaps();
  updatePrescription();
  addAlert("success","Sampling complete",`${missionSamples.length} samples collected; deficiency map generated`);
  toast("Sampling complete — heatmap generated");
  await startAutonomousFertilization();
}

async function startAutonomousFertilization(){
  if(!missionSamples.length){
    setFertilizationState("WAITING_FOR_SAMPLES");
    addAlert("warning","Autonomous fertilization not started","No valid sampling points are stored");
    return;
  }
  const p=calculatePrescription();
  if(!p) return;
  setFertilizationState("STARTING");

  // Send prescription summary first so base firmware can use it if implemented.
  const prescriptionCmd=`FERT,PRESCRIPTION,${p.avgN.toFixed(2)},${p.avgP.toFixed(2)},${p.avgK.toFixed(2)}`;
  const summarySent=await sendBaseCommand(prescriptionCmd);
  if(!summarySent){
    setFertilizationState("READY — BASE NOT CONNECTED");
    return;
  }
  const started=await sendBaseCommand("FERT,AUTO_START");
  if(started){
    setFertilizationState("AUTO START SENT");
    updateSequence("FERTILIZING");
    addAlert("success","Autonomous fertilization command sent","Base station received FERT,AUTO_START");
  }
}

function setFertilizationState(value){
  state.fertilizationState=value;
  setText("dashboardFertStatus",value); setText("sprinklerFertState",value); setText("sprinklerAutoState",value);
  if(value.includes("FERTILIZ")) updateSequence("FERTILIZING");
}

function handleMissionDone(){
  state.samplingState="DONE"; setFertilizationState("COMPLETE");
  setText("missionStatus","Mission complete"); setText("overviewState","Complete");
  updateSequence("DONE");
  addAlert("success","Mission complete","Rover reported MISSION_DONE"); toast("Mission complete");
}

function updateSequence(stage){
  const ids=["stepCrop","stepSample","stepHeatmap","stepFert","stepDone"];
  const order={CROP:0,SAMPLING:1,HEATMAP:2,FERTILIZING:3,DONE:4};
  const active=order[stage]??0;
  ids.forEach((id,i)=>{
    const x=el(id); if(!x) return;
    x.classList.toggle("active",i===active); x.classList.toggle("complete",i<active);
  });
  const labels={CROP:"Crop selected",SAMPLING:"Autonomous sampling",HEATMAP:"Heatmap generated",FERTILIZING:"Autonomous fertilization",DONE:"Mission complete"};
  setText("sequenceStatus",labels[stage]||stage);
}

/* =========================================================
   TELEMETRY PROCESSING
========================================================= */
function processTelemetry(data){
  latestTelemetry=data; lastRoverPacketAt=new Date(); lastSensorUpdate=lastRoverPacketAt;
  state.battery=clamp(data.battery,0,100);
  setRoverOnline(true);
  updateDashboard(data); updateLiveTelemetry(data); updateNpk(data); updateRoverLocation(data);
  saveTelemetrySample(data); updateTimestampDisplay();
  collectMissionSample(data);
}

function updateDashboard(data){
  setText("batteryValue",`${Math.round(data.battery)}%`); setText("sideBattery",`${Math.round(data.battery)}%`);
  if(el("batteryBar")) el("batteryBar").style.width=`${clamp(data.battery,0,100)}%`;
  if(el("sideBatteryBar")) el("sideBatteryBar").style.width=`${clamp(data.battery,0,100)}%`;
  setText("dashboardPacket",data.packetNumber);
  setText("reqN",data.requiredN.toFixed(1)); setText("reqP",data.requiredP.toFixed(1)); setText("reqK",data.requiredK.toFixed(1));
  setText("overviewState","Live");
  setText("dashboardSamples",`${missionSamples.length} samples`);
}

function updateLiveTelemetry(data){
  setText("telemetryLastPacket",formatTimestamp(data.timestamp)); setText("telemetryPacketNumber",data.packetNumber);
  setText("telemetryN",Math.round(data.nitrogen)); setText("telemetryP",Math.round(data.phosphorus)); setText("telemetryK",Math.round(data.potassium));
  setText("telemetryTemperature",data.temperature.toFixed(1)); setText("telemetryHumidity",data.humidity.toFixed(1));
  setText("telemetryGps",`${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`); setText("telemetryBattery",`${Math.round(data.battery)}%`);
  setText("telemetryReqN",data.requiredN.toFixed(2)); setText("telemetryReqP",data.requiredP.toFixed(2)); setText("telemetryReqK",data.requiredK.toFixed(2));
  setText("telemetryRoll",`${data.roll.toFixed(2)}°`); setText("telemetryPitch",`${data.pitch.toFixed(2)}°`); setText("telemetryYaw",`${data.yaw.toFixed(2)}°`);
  setText("telemetryAccX",data.accX.toFixed(3)); setText("telemetryAccY",data.accY.toFixed(3)); setText("telemetryAccZ",data.accZ.toFixed(3));
  setText("telemetryStatusText","Receiving telemetry");
  const dot=el("telemetryStatusDot"); dot?.classList.remove("disconnected-dot"); dot?.classList.add("connected-dot");
}

function updateNpk(data){
  updateGauge("nGauge",data.nitrogen,100); updateGauge("pGauge",data.phosphorus,100); updateGauge("kGauge",data.potassium,200);
  setText("sensorStatusText","Receiving rover data");
  const dot=el("sensorStatusDot"); dot?.classList.remove("disconnected-dot"); dot?.classList.add("connected-dot");
}
function updateGauge(id,value,max){
  const e=el(id); if(!e) return; e.textContent=Math.round(value);
  const g=e.closest(".gauge"); if(g) g.style.setProperty("--value",clamp((value/max)*100,0,100));
}

/* =========================================================
   LIVE ROVER MAP + HEADING
========================================================= */
function initializeMaps(){
  const initial=[23.7806,90.4071];
  if(el("roverLiveMap")&&!roverMap){
    roverMap=L.map("roverLiveMap").setView(initial,16);
    addBaseTiles(roverMap); roverTrackLine=L.polyline([],{weight:4,color:"#2f80ed"}).addTo(roverMap);
  }
  if(el("largeRoverMap")&&!largeRoverMap){
    largeRoverMap=L.map("largeRoverMap").setView(initial,17);
    addBaseTiles(largeRoverMap); largeRoverTrackLine=L.polyline([],{weight:4,color:"#2f80ed"}).addTo(largeRoverMap);
  }
  if(el("dashboardDeficiencyMap")&&!dashboardDeficiencyMap){
    dashboardDeficiencyMap=L.map("dashboardDeficiencyMap",{zoomControl:true}).setView(initial,16);
    addBaseTiles(dashboardDeficiencyMap); dashboardDeficiencyLayer=L.layerGroup().addTo(dashboardDeficiencyMap);
  }
  if(el("largeDeficiencyMap")&&!largeDeficiencyMap){
    largeDeficiencyMap=L.map("largeDeficiencyMap").setView(initial,17);
    addBaseTiles(largeDeficiencyMap); largeDeficiencyLayer=L.layerGroup().addTo(largeDeficiencyMap);
  }
}
function addBaseTiles(map){
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:20,attribution:"&copy; OpenStreetMap contributors"}).addTo(map);
}
function createRoverIcon(yaw=0){
  return L.divIcon({className:"",html:`<div class="rover-direction-marker" style="transform:rotate(${yaw}deg)">▲</div>`,iconSize:[42,42],iconAnchor:[21,21],popupAnchor:[0,-23]});
}
function updateRoverLocation(data){
  const lat=Number(data.latitude),lon=Number(data.longitude);
  if(!validGps(lat,lon)){
    ["mapGpsStatus","largeMapGpsStatus","liveRoverGpsStatus","dashboardGpsStatus","telemetryGpsStatus"].forEach(id=>setText(id,"No GPS Fix"));
    return;
  }
  const pos=[lat,lon],prev=roverGpsHistory.at(-1);
  if(!prev||prev[0]!==lat||prev[1]!==lon) roverGpsHistory.push(pos);
  if(roverGpsHistory.length>1000) roverGpsHistory.shift();

  if(roverMap){
    if(!roverMarker) roverMarker=L.marker(pos,{icon:createRoverIcon(data.yaw)}).addTo(roverMap);
    else{ roverMarker.setLatLng(pos); roverMarker.setIcon(createRoverIcon(data.yaw)); }
    roverMarker.bindPopup(buildRoverPopup(data)); roverTrackLine?.setLatLngs(roverGpsHistory);
  }
  if(largeRoverMap){
    if(!largeRoverMarker) largeRoverMarker=L.marker(pos,{icon:createRoverIcon(data.yaw)}).addTo(largeRoverMap);
    else{ largeRoverMarker.setLatLng(pos); largeRoverMarker.setIcon(createRoverIcon(data.yaw)); }
    largeRoverMarker.bindPopup(buildRoverPopup(data)); largeRoverTrackLine?.setLatLngs(roverGpsHistory);
  }
  if(!mapHasCenteredOnce){ roverMap?.setView(pos,18); largeRoverMap?.setView(pos,19); mapHasCenteredOnce=true; }

  setText("mapLatitude",lat.toFixed(6)); setText("mapLongitude",lon.toFixed(6)); setText("mapHeading",`${data.yaw.toFixed(1)}°`); setText("mapLastUpdate",new Date().toLocaleTimeString());
  setText("liveRoverLatitude",lat.toFixed(6)); setText("liveRoverLongitude",lon.toFixed(6)); setText("liveRoverHeading",`${data.yaw.toFixed(1)}°`);
  setText("liveRoverBattery",`${Math.round(data.battery)}%`); setText("liveRoverPacket",data.packetNumber); setText("liveRoverStatus","ONLINE"); setText("liveRoverLastPacket",formatTimestamp());
  setText("liveRoverGpsStatus","GPS Fix"); setText("mapGpsStatus","GPS Fix"); setText("largeMapGpsStatus","GPS Fix"); setText("dashboardGpsStatus","GPS Fix"); setText("telemetryGpsStatus","GPS Fix");
  setText("trackPointCount",`${roverGpsHistory.length} points`);
  ["mapGpsDot","largeMapGpsDot"].forEach(id=>{ const d=el(id); d?.classList.remove("disconnected-dot"); d?.classList.add("connected-dot"); });
}
function buildRoverPopup(data){
  return `<strong>AgriRover</strong><br>Packet: ${data.packetNumber}<br>Heading: ${data.yaw.toFixed(1)}°<br>Battery: ${Math.round(data.battery)}%<br>Req N/P/K: ${data.requiredN.toFixed(1)} / ${data.requiredP.toFixed(1)} / ${data.requiredK.toFixed(1)} kg/ha`;
}
function centerOnRover(map,zoom){
  if(!latestTelemetry||!validGps(latestTelemetry.latitude,latestTelemetry.longitude)){ toast("No valid GPS fix yet"); return; }
  map?.setView([latestTelemetry.latitude,latestTelemetry.longitude],zoom);
}
el("centerRoverMap")?.addEventListener("click",()=>centerOnRover(roverMap,18));
el("centerLargeRoverMap")?.addEventListener("click",()=>centerOnRover(largeRoverMap,19));
function clearRoverTrack(){ roverGpsHistory=[]; roverTrackLine?.setLatLngs([]); largeRoverTrackLine?.setLatLngs([]); setText("trackPointCount","0 points"); toast("Rover track cleared"); }
el("clearRoverTrack")?.addEventListener("click",clearRoverTrack); el("clearLargeRoverTrack")?.addEventListener("click",clearRoverTrack);

/* =========================================================
   MISSION SAMPLE COLLECTION + DEFICIENCY
========================================================= */
function resetMissionSamples(){
  missionSamples=[]; samplePackets=new Set(); heatmapFinalized=false;
  dashboardDeficiencyLayer?.clearLayers(); largeDeficiencyLayer?.clearLayers();
  setText("dashboardSamples","0 samples"); setText("heatmapStatusText","Waiting for rover sampling data."); setText("fullHeatmapStatus","Waiting for samples");
  setText("avgDefN","--%"); setText("avgDefP","--%"); setText("avgDefK","--%");
  updatePrescription();
}

function collectMissionSample(data){
  if(!state.selectedCrop) return;
  if(!validGps(data.latitude,data.longitude)) return;
  if(samplePackets.has(data.packetNumber)) return;
  samplePackets.add(data.packetNumber);
  const s={
    packetNumber:data.packetNumber, latitude:data.latitude, longitude:data.longitude,
    measuredN:data.nitrogen, measuredP:data.phosphorus, measuredK:data.potassium,
    requiredN:Math.max(0,data.requiredN), requiredP:Math.max(0,data.requiredP), requiredK:Math.max(0,data.requiredK),
    temperature:data.temperature, humidity:data.humidity, battery:data.battery, timestamp:data.timestamp
  };
  s.defN=deficiencyPercent(s.requiredN,state.selectedCrop.n);
  s.defP=deficiencyPercent(s.requiredP,state.selectedCrop.p);
  s.defK=deficiencyPercent(s.requiredK,state.selectedCrop.k);
  missionSamples.push(s);
  setText("dashboardSamples",`${missionSamples.length} samples`);
  if(state.samplingState==="NOT_STARTED"){
    // Do not invent a state, but show that samples have started arriving.
    setText("dashboardSampling","Receiving samples");
  }
  renderDeficiencyMaps();
  updateDeficiencySummary();
  updatePrescription();
}
function deficiencyPercent(required,optimum){
  if(!Number.isFinite(required)||!Number.isFinite(optimum)||optimum<=0) return 0;
  return Math.max(0,(required/optimum)*100);
}
function deficiencyColor(percent){
  if(percent<20) return "#2f80ed";
  if(percent<40) return "#27a8d8";
  if(percent<60) return "#45c96b";
  if(percent<80) return "#f2b632";
  return "#ef4d5b";
}
function nutrientValues(sample,nutrient){
  if(nutrient==="p") return {required:sample.requiredP,def:sample.defP,label:"P"};
  if(nutrient==="k") return {required:sample.requiredK,def:sample.defK,label:"K"};
  return {required:sample.requiredN,def:sample.defN,label:"N"};
}
function renderDeficiencyMaps(){
  if(!dashboardDeficiencyLayer||!largeDeficiencyLayer) return;
  dashboardDeficiencyLayer.clearLayers(); largeDeficiencyLayer.clearLayers();
  const bounds=[];
  missionSamples.forEach((s,index)=>{
    const v=nutrientValues(s,deficiencyNutrient); const color=deficiencyColor(v.def);
    const popup=`<strong>Sample ${index+1}</strong><br>Packet: ${s.packetNumber}<br>${v.label} required: ${v.required.toFixed(2)} kg/ha<br>Deficiency severity: ${v.def.toFixed(1)}%`;
    [dashboardDeficiencyLayer,largeDeficiencyLayer].forEach(layer=>{
      L.circleMarker([s.latitude,s.longitude],{radius:heatmapFinalized?13:9,fillColor:color,color:"#ffffff",weight:1,fillOpacity:0.78}).bindPopup(popup).addTo(layer);
    });
    bounds.push([s.latitude,s.longitude]);
  });
  if(bounds.length){
    const b=L.latLngBounds(bounds);
    if(heatmapFinalized||missionSamples.length===1){ dashboardDeficiencyMap?.fitBounds(b.pad(0.3),{maxZoom:19}); largeDeficiencyMap?.fitBounds(b.pad(0.3),{maxZoom:19}); }
  }
}
function setDeficiencyNutrient(value){
  deficiencyNutrient=value;
  if(el("dashboardDeficiencyType")) el("dashboardDeficiencyType").value=value;
  if(el("largeDeficiencyType")) el("largeDeficiencyType").value=value;
  renderDeficiencyMaps();
}
el("dashboardDeficiencyType")?.addEventListener("change",e=>setDeficiencyNutrient(e.target.value));
el("largeDeficiencyType")?.addEventListener("change",e=>setDeficiencyNutrient(e.target.value));

function updateDeficiencySummary(){
  if(!missionSamples.length) return;
  const avg=key=>missionSamples.reduce((sum,s)=>sum+s[key],0)/missionSamples.length;
  setText("avgDefN",`${avg("defN").toFixed(1)}%`); setText("avgDefP",`${avg("defP").toFixed(1)}%`); setText("avgDefK",`${avg("defK").toFixed(1)}%`);
}

/* =========================================================
   FERTILIZER PRESCRIPTION
========================================================= */
function calculatePrescription(){
  if(!missionSamples.length) return null;
  const avg=key=>missionSamples.reduce((sum,s)=>sum+s[key],0)/missionSamples.length;
  const max=key=>Math.max(...missionSamples.map(s=>s[key]));
  return {avgN:avg("requiredN"),avgP:avg("requiredP"),avgK:avg("requiredK"),maxN:max("requiredN"),maxP:max("requiredP"),maxK:max("requiredK")};
}
function updatePrescription(){
  const crop=state.selectedCrop;
  if(crop){
    setText("prescriptionCrop",crop.name); setText("prescriptionCropBangla",crop.bangla);
    setText("prescriptionOptN",crop.n); setText("prescriptionOptP",crop.p); setText("prescriptionOptK",crop.k);
  }
  const p=calculatePrescription();
  if(!p){
    ["avgReqN","avgReqP","avgReqK","maxReqN","maxReqP","maxReqK","totalReqN","totalReqP","totalReqK"].forEach(id=>setText(id,"--"));
    setText("prescriptionStatus","Waiting for samples"); return;
  }
  setText("avgReqN",`${p.avgN.toFixed(2)} kg/ha`); setText("avgReqP",`${p.avgP.toFixed(2)} kg/ha`); setText("avgReqK",`${p.avgK.toFixed(2)} kg/ha`);
  setText("maxReqN",`${p.maxN.toFixed(2)} kg/ha`); setText("maxReqP",`${p.maxP.toFixed(2)} kg/ha`); setText("maxReqK",`${p.maxK.toFixed(2)} kg/ha`);
  if(state.fieldAreaHa>0){
    setText("totalReqN",(p.avgN*state.fieldAreaHa).toFixed(2)); setText("totalReqP",(p.avgP*state.fieldAreaHa).toFixed(2)); setText("totalReqK",(p.avgK*state.fieldAreaHa).toFixed(2));
    setText("prescriptionAreaLabel",`${state.fieldAreaHa} ha`);
  }else{
    setText("totalReqN","--"); setText("totalReqP","--"); setText("totalReqK","--"); setText("prescriptionAreaLabel","Area not set");
  }
  setText("prescriptionStatus",heatmapFinalized?"Sampling complete":"Updating live");
}

/* =========================================================
   HISTORY
========================================================= */
function loadHistory(){
  try{ const s=localStorage.getItem(HISTORY_KEY); return s?JSON.parse(s):[]; }catch(e){ return []; }
}
function saveTelemetrySample(data){
  const row={timestamp:new Date().toISOString(),packetNumber:data.packetNumber,latitude:data.latitude,longitude:data.longitude,temperature:data.temperature,humidity:data.humidity,nitrogen:data.nitrogen,phosphorus:data.phosphorus,potassium:data.potassium,requiredN:data.requiredN,requiredP:data.requiredP,requiredK:data.requiredK,roll:data.roll,pitch:data.pitch,yaw:data.yaw,accX:data.accX,accY:data.accY,accZ:data.accZ,battery:data.battery,crop:state.selectedCrop?.name||""};
  sensorRows.unshift(row); if(sensorRows.length>5000) sensorRows=sensorRows.slice(0,5000);
  try{ localStorage.setItem(HISTORY_KEY,JSON.stringify(sensorRows)); }catch(e){ console.error(e); }
  renderHistory();
}
function renderHistory(rows=sensorRows){
  const body=el("sensorHistory"); if(!body) return;
  if(!rows.length){ body.innerHTML='<tr><td colspan="11">No sensor data available.</td></tr>'; setText("historySummary","No stored samples"); return; }
  body.innerHTML=rows.map(s=>`<tr><td>${formatTimestamp(s.timestamp)}</td><td>${s.packetNumber}</td><td>${Number(s.latitude).toFixed(6)}</td><td>${Number(s.longitude).toFixed(6)}</td><td>${s.nitrogen}</td><td>${s.phosphorus}</td><td>${s.potassium}</td><td>${s.requiredN}</td><td>${s.requiredP}</td><td>${s.requiredK}</td><td>${s.battery}%</td></tr>`).join("");
  setText("historySummary",`${rows.length} stored measurements`);
}
el("filterHistory")?.addEventListener("click",()=>{
  const from=el("historyFrom")?.value,to=el("historyTo")?.value;
  renderHistory(sensorRows.filter(s=>{ const d=new Date(s.timestamp); return (!from||d>=new Date(`${from}T00:00:00`))&&(!to||d<=new Date(`${to}T23:59:59`)); }));
});
el("resetHistoryFilter")?.addEventListener("click",()=>{ if(el("historyFrom"))el("historyFrom").value=""; if(el("historyTo"))el("historyTo").value=""; renderHistory(); });
el("exportHistoryCsv")?.addEventListener("click",()=>{
  const header=["Timestamp","Crop","Packet","Latitude","Longitude","Temperature","Humidity","Measured N","Measured P","Measured K","Required N","Required P","Required K","Roll","Pitch","Yaw","AccX","AccY","AccZ","Battery"];
  const rows=sensorRows.map(s=>[s.timestamp,s.crop,s.packetNumber,s.latitude,s.longitude,s.temperature,s.humidity,s.nitrogen,s.phosphorus,s.potassium,s.requiredN,s.requiredP,s.requiredK,s.roll,s.pitch,s.yaw,s.accX,s.accY,s.accZ,s.battery]);
  const csv=[header,...rows].map(r=>r.join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv"}),a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="agrirover-telemetry-v12.csv"; a.click(); URL.revokeObjectURL(a.href);
});

/* =========================================================
   MISSION CONTROLS
========================================================= */
el("startMission")?.addEventListener("click",async()=>{
  if(!state.selectedCrop){ toast("Select a crop first"); navigate("crop"); return; }
  if(!state.cropSent){ const sent=await sendBaseCommand(`ROVER,CROP,${state.selectedCrop.key}`); if(!sent)return; state.cropSent=true; }
  const sent=await sendBaseCommand("ROVER,START"); if(sent){ setText("missionStatus","Starting autonomous mission"); updateSequence("SAMPLING"); }
});
async function pauseRover(){ if(await sendBaseCommand("ROVER,PAUSE")){ state.paused=true; setText("missionStatus","Paused"); } }
async function resumeRover(){ if(await sendBaseCommand("ROVER,RESUME")){ state.paused=false; setText("missionStatus","Autonomous"); } }
el("pauseMission")?.addEventListener("click",async()=>{ if(state.paused){ await resumeRover(); setText("pauseMission","Pause Rover"); } else { await pauseRover(); setText("pauseMission","Resume Rover"); } });
el("manualPause")?.addEventListener("click",pauseRover); el("manualResume")?.addEventListener("click",resumeRover);

async function emergencyStop(){
  await sendBaseCommand("ROVER,ESTOP"); await sendBaseCommand("FERT,ALL_OFF");
  state.emergency=true; setText("missionStatus","EMERGENCY STOP"); setFertilizationState("EMERGENCY OFF");
  addAlert("error","Emergency stop","Rover stop + all fertilizer off sent"); toast("Emergency stop sent");
}
el("emergencyBtn")?.addEventListener("click",emergencyStop); el("manualEstop")?.addEventListener("click",emergencyStop);
el("manualStop")?.addEventListener("click",()=>sendBaseCommand("ROVER,STOP"));

const movementCommands={Forward:"FWD",Backward:"BACK",Left:"LEFT",Right:"RIGHT",Stop:"STOP"};
document.querySelectorAll(".dpad button").forEach(btn=>btn.onclick=async()=>{
  const type=movementCommands[btn.dataset.command],speed=el("manualSpeed")?.value||"0.4";
  const cmd=type==="STOP"?"ROVER,STOP":`ROVER,${type},${speed}`;
  const sent=await sendBaseCommand(cmd); if(sent) setText("manualCommand",`Emergency recovery command: ${cmd}`);
});
el("manualSpeed")?.addEventListener("input",e=>setText("manualSpeedValue",`${e.target.value} m/s`));

/* =========================================================
   MANUAL FERTILIZER OVERRIDE
========================================================= */
document.querySelectorAll("[data-pump]").forEach(btn=>btn.onclick=()=>sendBaseCommand(`FERT,PUMP,${btn.dataset.pump}`));
document.querySelectorAll("[data-valve][data-action]").forEach(btn=>btn.onclick=()=>sendBaseCommand(`FERT,${btn.dataset.valve},${btn.dataset.action}`));
el("allFertilizerOff")?.addEventListener("click",async()=>{ await sendBaseCommand("FERT,ALL_OFF"); setFertilizationState("MANUAL OFF"); });

function processBaseAck(parts){
  if(parts[0]==="FERT") addAlert("success","Fertilizer controller ACK",parts.slice(1).join(","));
}

/* =========================================================
   FIELD SETUP
========================================================= */
function loadFieldUi(){ if(el("fieldName"))el("fieldName").value=state.fieldName; if(el("fieldAreaHa"))el("fieldAreaHa").value=state.fieldAreaHa||""; }
el("saveFieldSetup")?.addEventListener("click",()=>{
  state.fieldName=el("fieldName")?.value.trim()||"Field"; state.fieldAreaHa=Math.max(0,Number(el("fieldAreaHa")?.value||0));
  localStorage.setItem("agriroverFieldName",state.fieldName); localStorage.setItem("agriroverFieldAreaHa",String(state.fieldAreaHa));
  updatePrescription(); toast("Field setup saved");
});

/* =========================================================
   CONNECTION / DATA AGE
========================================================= */
function setRoverOnline(online){
  const dot=el("roverStatusDot"); dot?.classList.toggle("connected-dot",online); dot?.classList.toggle("disconnected-dot",!online);
  setText("roverStatusText",online?"Connected":"No Signal"); setText("sideRoverStatus",online?"Connected":"No Signal");
  if(el("sideRoverStatus")) el("sideRoverStatus").className=online?"ok":"";
}
setInterval(()=>{
  if(!lastRoverPacketAt) return;
  const age=(Date.now()-lastRoverPacketAt.getTime())/1000;
  setText("telemetryDataAge",`${age.toFixed(1)} sec`);
  setText("sensorDataAge",age<60?`${Math.floor(age)} sec ago`:`${Math.floor(age/60)} min ago`);
  if(age>8){ setRoverOnline(false); setText("telemetryStatusText","Telemetry Lost"); }
},500);
function updateTimestampDisplay(){ setText("sensorTimestamp",lastSensorUpdate?formatTimestamp(lastSensorUpdate):"No data received"); }

/* =========================================================
   RAW TELEMETRY CONSOLE
========================================================= */
function addTelemetryConsoleLine(packet){
  const box=el("telemetryConsole"); if(!box)return;
  box.querySelector(".console-empty")?.remove();
  const line=document.createElement("div"); line.className="telemetry-console-line";
  const time=document.createElement("span"); time.className="telemetry-console-time"; time.textContent=new Date().toLocaleTimeString();
  line.appendChild(time); line.appendChild(document.createTextNode(packet)); box.appendChild(line);
  while(box.children.length>200) box.removeChild(box.firstChild); box.scrollTop=box.scrollHeight;
}
el("clearTelemetryConsole")?.addEventListener("click",()=>{ el("telemetryConsole").innerHTML='<div class="console-empty">Waiting for rover packets...</div>'; });

/* =========================================================
   ALERTS
========================================================= */
function addAlert(type,title,detail){
  systemAlerts.unshift({type,title,detail,time:new Date().toLocaleTimeString()});
  if(systemAlerts.length>100) systemAlerts=systemAlerts.slice(0,100); renderAlerts();
}
function renderAlerts(){
  const c=el("allAlerts"); if(!c)return;
  if(!systemAlerts.length){ c.innerHTML='<article class="alert"><span>ℹ</span><div><strong>No events</strong><small>Waiting for system activity.</small></div><time>--</time></article>'; return; }
  const icons={success:"✓",warning:"⚠",error:"✕",info:"ℹ"};
  c.innerHTML=systemAlerts.map(a=>`<article class="alert ${a.type}"><span>${icons[a.type]||"ℹ"}</span><div><strong>${a.title}</strong><small>${a.detail}</small></div><time>${a.time}</time></article>`).join("");
}
el("clearAlerts")?.addEventListener("click",()=>{ systemAlerts=[]; renderAlerts(); });

/* =========================================================
   INITIALIZATION
========================================================= */
renderCropButtons(); renderHistory(); renderAlerts(); loadFieldUi(); updateBaseStatus(false); setRoverOnline(false); initializeMaps(); updateSequence("CROP"); updatePrescription();
setText("dashboardSampling","Not started"); setText("telemetrySamplingState","NOT_STARTED"); setText("sprinklerSamplingState","Waiting");

console.log("AgriRover GUI V12 loaded");
console.log("Expected 18-field telemetry:");
console.log("Data: PACKET,LAT,LON,TEMP,HUMIDITY,N,P,K,REQ_N,REQ_P,REQ_K,ROLL,PITCH,YAW,ACC_X,ACC_Y,ACC_Z,BATTERY");
