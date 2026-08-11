/* =========================================================
   AGRIROVER GUI
   REAL BASE-STATION VERSION
   ========================================================= */


/* =========================================================
   MAIN STATE
   ========================================================= */

const state = {

  running: false,

  paused: false,

  emergency: false,

  battery: 0,

  progress: 0,

  completed: 0,

  currentZone: 0,

  rows: 8,

  cols: 8,

  totalZones: 64,

  sprayProgress: 0

};



/* =========================================================
   SERIAL / BASE STATION STATE
   ========================================================= */

let serialPort = null;

let serialReader = null;

let serialBuffer = "";

let baseStationConnected = false;

let lastRoverPacketAt = null;



/* =========================================================
   REAL FIELD DATA
   ========================================================= */

const liveZoneData = new Map();

let selectedHeatmapNutrient = "n";



/* =========================================================
   FERTILIZER PRESCRIPTION
   ========================================================= */

const prescriptions = [

  {
    zone: "Z-01",
    n: 45,
    p: 20,
    k: 110,
    rn: 5,
    rp: 0,
    rk: 0,
    time: 8,
    status: "Pending"
  },

  {
    zone: "Z-02",
    n: 40,
    p: 16,
    k: 105,
    rn: 8,
    rp: 5,
    rk: 0,
    time: 13,
    status: "Pending"
  },

  {
    zone: "Z-03",
    n: 28,
    p: 14,
    k: 90,
    rn: 12,
    rp: 8,
    rk: 0,
    time: 18,
    status: "Pending"
  },

  {
    zone: "Z-04",
    n: 35,
    p: 18,
    k: 125,
    rn: 10,
    rp: 5,
    rk: 0,
    time: 15,
    status: "Pending"
  },

  {
    zone: "Z-05",
    n: 60,
    p: 25,
    k: 140,
    rn: 0,
    rp: 0,
    rk: 0,
    time: 0,
    status: "Not required"
  }

];



/* =========================================================
   SENSOR HISTORY
   ========================================================= */

/*
   A NEW localStorage key is used so old dummy values
   from your previous GUI do not appear as real data.
*/

function loadSensorRows() {

  try {

    const saved =
      localStorage.getItem(
        "agriroverRealSensorHistoryV1"
      );


    return saved
      ? JSON.parse(saved)
      : [];

  }

  catch (error) {

    console.error(
      "Could not load sensor history",
      error
    );


    return [];

  }

}


let sensorRows =
  loadSensorRows();


let lastSensorUpdate =
  sensorRows.length
    ? new Date(sensorRows[0].timestamp)
    : null;



/* =========================================================
   HELPERS
   ========================================================= */

function toast(message) {

  const element =
    document.getElementById("toast");


  element.textContent =
    message;


  element.classList.add(
    "show"
  );


  clearTimeout(
    element.timer
  );


  element.timer =
    setTimeout(
      () => {
        element.classList.remove(
          "show"
        );
      },
      2600
    );

}



function normalizeZone(zone) {

  if (!zone)
    return "Z-01";


  const cleaned =
    String(zone)
      .toUpperCase()
      .replace("Z-", "")
      .replace("Z", "");


  const number =
    Number(cleaned);


  if (Number.isNaN(number))
    return zone;


  return `Z-${String(number).padStart(2, "0")}`;

}



function formatTimestamp(dateValue) {

  const date =
    dateValue instanceof Date
      ? dateValue
      : new Date(dateValue);


  return date.toLocaleString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }
  );

}



function formatEta(seconds) {

  if (
    seconds === undefined ||
    seconds === null ||
    Number.isNaN(Number(seconds))
  ) {

    return "--:--:--";

  }


  const value =
    Math.max(
      0,
      Math.floor(
        Number(seconds)
      )
    );


  const hours =
    Math.floor(
      value / 3600
    );


  const minutes =
    Math.floor(
      (value % 3600) / 60
    );


  const secs =
    value % 60;


  return (
    String(hours).padStart(2, "0") +
    ":" +
    String(minutes).padStart(2, "0") +
    ":" +
    String(secs).padStart(2, "0")
  );

}



/* =========================================================
   CLOCK
   ========================================================= */

function updateClock() {

  document.getElementById(
    "clockText"
  ).textContent =
    new Date().toLocaleString();

}


setInterval(
  updateClock,
  1000
);


updateClock();



/* =========================================================
   NAVIGATION
   ========================================================= */

function navigate(id) {

  document
    .querySelectorAll(".page")
    .forEach(
      page =>
        page.classList.remove(
          "active"
        )
    );


  document
    .querySelectorAll(".nav-item")
    .forEach(
      item =>
        item.classList.remove(
          "active"
        )
    );


  const page =
    document.getElementById(id);


  if (page)
    page.classList.add(
      "active"
    );


  const navigation =
    document.querySelector(
      `.nav-item[data-page="${id}"]`
    );


  if (navigation)
    navigation.classList.add(
      "active"
    );


  document
    .getElementById("sidebar")
    .classList.remove(
      "open"
    );

}



document
  .querySelectorAll(".nav-item")
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () =>
          navigate(
            button.dataset.page
          )
      );

    }
  );



document
  .querySelectorAll(
    "[data-page-link]"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () =>
          navigate(
            button.dataset.pageLink
          )
      );

    }
  );



document.getElementById(
  "menuBtn"
).onclick =
  () => {

    document
      .getElementById(
        "sidebar"
      )
      .classList.toggle(
        "open"
      );

  };



/* =========================================================
   BASE STATION CONNECTION
   ========================================================= */

async function connectBaseStation() {

  /*
     If already connected,
     button acts as Disconnect.
  */

  if (baseStationConnected) {

    await disconnectBaseStation();

    return;

  }


  if (!("serial" in navigator)) {

    alert(
      "Web Serial is not supported in this browser.\n\n" +
      "Open this GitHub Pages GUI using desktop Google Chrome or Microsoft Edge."
    );

    return;

  }


  try {

    serialPort =
      await navigator.serial.requestPort();


    /*
       IMPORTANT:

       Arduino Nano must also use:

       Serial.begin(115200);
    */

    await serialPort.open(
      {
        baudRate: 115200
      }
    );


    baseStationConnected =
      true;


    updateBaseStationStatus(
      true
    );


    addSystemLog(
      "success",
      "Base station connected",
      "USB serial connection established"
    );


    toast(
      "Base station connected"
    );


    readBaseStation();

  }

  catch (error) {

    console.error(
      "Base station connection error:",
      error
    );


    toast(
      "Base station connection failed"
    );

  }

}



async function disconnectBaseStation() {

  try {

    if (serialReader) {

      await serialReader.cancel();

    }


    if (serialPort) {

      await serialPort.close();

    }

  }

  catch (error) {

    console.log(
      "Disconnect:",
      error
    );

  }


  serialReader = null;

  serialPort = null;

  baseStationConnected = false;


  updateBaseStationStatus(
    false
  );


  toast(
    "Base station disconnected"
  );

}



function updateBaseStationStatus(
  connected
) {

  const text =
    document.getElementById(
      "baseStatusText"
    );


  const dot =
    document.getElementById(
      "baseStatusDot"
    );


  const button =
    document.getElementById(
      "connectBaseStation"
    );


  if (connected) {

    text.textContent =
      "Connected";


    dot.classList.remove(
      "disconnected-dot"
    );


    dot.classList.add(
      "connected-dot"
    );


    button.textContent =
      "✓ Connected";


    button.classList.add(
      "connected"
    );

  }

  else {

    text.textContent =
      "Disconnected";


    dot.classList.remove(
      "connected-dot"
    );


    dot.classList.add(
      "disconnected-dot"
    );


    button.textContent =
      "🔌 Connect";


    button.classList.remove(
      "connected"
    );

  }

}



document
  .getElementById(
    "connectBaseStation"
  )
  .addEventListener(
    "click",
    connectBaseStation
  );



/* =========================================================
   READ USB SERIAL
   BASE NANO -> GUI
   ========================================================= */

async function readBaseStation() {

  const decoder =
    new TextDecoder();


  try {

    while (
      serialPort &&
      serialPort.readable
    ) {

      serialReader =
        serialPort.readable.getReader();


      try {

        while (true) {

          const {
            value,
            done
          } =
            await serialReader.read();


          if (done)
            break;


          if (!value)
            continue;


          serialBuffer +=
            decoder.decode(
              value,
              {
                stream: true
              }
            );


          const lines =
            serialBuffer.split(
              /\r?\n/
            );


          serialBuffer =
            lines.pop();


          for (
            const line
            of lines
          ) {

            const packet =
              line.trim();


            if (
              packet.length > 0
            ) {

              console.log(
                "BASE -> GUI:",
                packet
              );


              processBaseStationPacket(
                packet
              );

            }

          }

        }

      }

      finally {

        serialReader.releaseLock();

        serialReader = null;

      }

    }

  }

  catch (error) {

    if (baseStationConnected) {

      console.error(
        "Serial read error:",
        error
      );


      addSystemLog(
        "warning",
        "Base station communication lost",
        "USB serial reading stopped"
      );

    }

  }

  finally {

    baseStationConnected =
      false;


    updateBaseStationStatus(
      false
    );

  }

}



/* =========================================================
   GUI -> BASE NANO
   ========================================================= */

async function sendBaseCommand(
  command
) {

  if (
    !baseStationConnected ||
    !serialPort ||
    !serialPort.writable
  ) {

    toast(
      "Connect Base Station first"
    );


    return false;

  }


  let writer = null;


  try {

    writer =
      serialPort.writable.getWriter();


    const encoder =
      new TextEncoder();


    await writer.write(
      encoder.encode(
        command + "\n"
      )
    );


    console.log(
      "GUI -> BASE:",
      command
    );


    addSystemLog(
      "info",
      "Command sent",
      command
    );


    return true;

  }

  catch (error) {

    console.error(
      "Command error:",
      error
    );


    toast(
      "Command transmission failed"
    );


    return false;

  }

  finally {

    if (writer)
      writer.releaseLock();

  }

}



/* =========================================================
   EXPECTED ROVER TELEMETRY PACKET
   ========================================================= */

/*

ROVER,BASE,TEL,Z04,35,18,125,82,0.8,23.685123,90.356789,29,2535,SAMPLING

0   ROVER
1   BASE
2   TEL
3   Zone
4   Nitrogen
5   Phosphorus
6   Potassium
7   Battery %
8   Speed m/s
9   Latitude
10  Longitude
11  Completed zones
12  ETA in seconds
13  Rover status

*/


function processBaseStationPacket(
  packet
) {

  const parts =
    packet.split(
      ","
    );


  const source =
    parts[0]
      ?.trim()
      .toUpperCase();


  const destination =
    parts[1]
      ?.trim()
      .toUpperCase();


  const type =
    parts[2]
      ?.trim()
      .toUpperCase();


  /* ------------------------------
     ROVER TELEMETRY
  ------------------------------ */

  if (
    source === "ROVER" &&
    destination === "BASE" &&
    type === "TEL"
  ) {

    if (
      parts.length < 14
    ) {

      console.warn(
        "Incomplete telemetry packet:",
        packet
      );


      return;

    }


    const data = {

      zone:
        normalizeZone(
          parts[3]
        ),

      nitrogen:
        Number(
          parts[4]
        ),

      phosphorus:
        Number(
          parts[5]
        ),

      potassium:
        Number(
          parts[6]
        ),

      battery:
        Number(
          parts[7]
        ),

      speed:
        Number(
          parts[8]
        ),

      latitude:
        Number(
          parts[9]
        ),

      longitude:
        Number(
          parts[10]
        ),

      completed:
        Number(
          parts[11]
        ),

      etaSeconds:
        Number(
          parts[12]
        ),

      roverStatus:
        parts[13]
          ?.trim()
          .toUpperCase()

    };


    processRoverTelemetry(
      data
    );


    return;

  }


  /* ------------------------------
     ROVER ACK
  ------------------------------ */

  if (
    source === "ROVER" &&
    type === "ACK"
  ) {

    const command =
      parts
        .slice(3)
        .join(",");


    processRoverAck(
      command
    );


    return;

  }


  /* ------------------------------
     BASE ACK
  ------------------------------ */

  if (
    source === "BASE" &&
    destination === "GUI" &&
    type === "ACK"
  ) {

    processBaseAck(
      parts.slice(3)
    );


    return;

  }


  /* ------------------------------
     BASE FERTILIZER STATUS
  ------------------------------ */

  if (
    source === "BASE" &&
    destination === "GUI" &&
    type === "STATUS"
  ) {

    processBaseStatus(
      parts.slice(3)
    );


    return;

  }


  console.log(
    "Unrecognized serial line:",
    packet
  );

}



/* =========================================================
   PROCESS REAL ROVER TELEMETRY
   ========================================================= */

function processRoverTelemetry(
  data
) {

  lastRoverPacketAt =
    new Date();


  /* Rover connection */

  setRoverOnline(
    true
  );


  /* NPK */

  updateGauge(
    "nGauge",
    data.nitrogen,
    100
  );


  updateGauge(
    "pGauge",
    data.phosphorus,
    100
  );


  updateGauge(
    "kGauge",
    data.potassium,
    200
  );


  document.getElementById(
    "zoneN"
  ).textContent =
    `${Math.round(data.nitrogen)} mg/kg`;


  document.getElementById(
    "zoneP"
  ).textContent =
    `${Math.round(data.phosphorus)} mg/kg`;


  document.getElementById(
    "zoneK"
  ).textContent =
    `${Math.round(data.potassium)} mg/kg`;


  /* Battery */

  state.battery =
    Math.max(
      0,
      Math.min(
        100,
        data.battery
      )
    );


  /* Current zone */

  const zoneNumber =
    Number(
      data.zone.replace(
        "Z-",
        ""
      )
    );


  if (
    !Number.isNaN(
      zoneNumber
    )
  ) {

    state.currentZone =
      zoneNumber;

  }


  /* Progress */

  state.completed =
    Math.max(
      0,
      Math.min(
        state.totalZones,
        data.completed
      )
    );


  state.progress =
    state.totalZones
      ? (
          state.completed /
          state.totalZones
        ) * 100
      : 0;


  /* Dashboard */

  updateMissionUI();


  document.getElementById(
    "speedValue"
  ).textContent =
    `${data.speed.toFixed(1)} m/s`;


  document.getElementById(
    "currentZone"
  ).textContent =
    data.zone;


  document.getElementById(
    "zoneTitle"
  ).textContent =
    data.zone;


  document.getElementById(
    "controlZone"
  ).textContent =
    data.zone;


  document.getElementById(
    "zoneGps"
  ).textContent =
    `${data.latitude.toFixed(6)}° N, ` +
    `${data.longitude.toFixed(6)}° E`;


  document.getElementById(
    "remainingTime"
  ).textContent =
    formatEta(
      data.etaSeconds
    );


  document.getElementById(
    "missionStatus"
  ).textContent =
    data.roverStatus ||
    "ACTIVE";


  document.getElementById(
    "overviewState"
  ).textContent =
    "Live";


  document.getElementById(
    "zoneSampleStatus"
  ).textContent =
    "Sampled";


  document.getElementById(
    "zoneSampleStatus"
  ).className =
    "badge green";


  /* Sensor state */

  document.getElementById(
    "sensorStatusText"
  ).textContent =
    "Receiving rover data";


  const sensorDot =
    document.getElementById(
      "sensorStatusDot"
    );


  sensorDot.classList.remove(
    "disconnected-dot"
  );


  sensorDot.classList.add(
    "connected-dot"
  );


  /* Timestamp */

  const now =
    new Date();


  lastSensorUpdate =
    now;


  updateTimestampDisplay();

  updateDataAge();


  /* Store zone measurement */

  liveZoneData.set(
    data.zone,
    {
      n: data.nitrogen,
      p: data.phosphorus,
      k: data.potassium,
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp:
        now.toISOString()
    }
  );


  saveLiveRoverSample(
    data,
    now
  );


  /* Set latest values for crop page */

  document.getElementById(
    "recN"
  ).value =
    data.nitrogen;


  document.getElementById(
    "recP"
  ).value =
    data.phosphorus;


  document.getElementById(
    "recK"
  ).value =
    data.potassium;


  renderMaps();

  renderRealHeatmaps();

}



/* =========================================================
   ROVER ONLINE / OFFLINE
   ========================================================= */

function setRoverOnline(
  online
) {

  const text =
    document.getElementById(
      "roverStatusText"
    );


  const side =
    document.getElementById(
      "sideRoverStatus"
    );


  const dot =
    document.getElementById(
      "roverStatusDot"
    );


  if (online) {

    text.textContent =
      "Connected";


    side.textContent =
      "Connected";


    side.className =
      "ok";


    dot.classList.remove(
      "disconnected-dot"
    );


    dot.classList.add(
      "connected-dot"
    );

  }

  else {

    text.textContent =
      "No Signal";


    side.textContent =
      "No Signal";


    side.className =
      "";


    dot.classList.remove(
      "connected-dot"
    );


    dot.classList.add(
      "disconnected-dot"
    );

  }

}



/*
  If no telemetry arrives for 5 seconds,
  show rover as offline.
*/

setInterval(
  () => {

    if (!lastRoverPacketAt)
      return;


    const age =
      Date.now() -
      lastRoverPacketAt.getTime();


    if (
      age > 5000
    ) {

      setRoverOnline(
        false
      );

    }

  },
  1000
);



/* =========================================================
   GAUGES
   ========================================================= */

function updateGauge(
  id,
  value,
  maxValue
) {

  const text =
    document.getElementById(
      id
    );


  if (!text)
    return;


  text.textContent =
    Math.round(value);


  const gauge =
    text.closest(
      ".gauge"
    );


  if (!gauge)
    return;


  const percentage =
    Math.max(
      0,
      Math.min(
        100,
        (value / maxValue) * 100
      )
    );


  gauge.style.setProperty(
    "--value",
    percentage
  );

}



/* =========================================================
   MISSION UI
   ========================================================= */

function updateMissionUI() {

  document.getElementById(
    "batteryValue"
  ).textContent =
    `${Math.round(state.battery)}%`;


  document.getElementById(
    "sideBattery"
  ).textContent =
    `${Math.round(state.battery)}%`;


  document.getElementById(
    "batteryBar"
  ).style.width =
    `${state.battery}%`;


  document.getElementById(
    "sideBatteryBar"
  ).style.width =
    `${state.battery}%`;


  document.getElementById(
    "progressValue"
  ).textContent =
    `${Math.round(state.progress)}%`;


  document.getElementById(
    "missionBar"
  ).style.width =
    `${state.progress}%`;


  document.getElementById(
    "zonesValue"
  ).textContent =
    `${state.completed} / ${state.totalZones}`;


  document.getElementById(
    "sideZones"
  ).textContent =
    `${state.completed} / ${state.totalZones}`;


  document.getElementById(
    "zonesRemaining"
  ).textContent =
    `${
      Math.max(
        0,
        state.totalZones -
        state.completed
      )
    } remaining`;

}



/* =========================================================
   MAP
   ========================================================= */

function renderMaps() {

  createMap(
    "fieldMap"
  );


  createMap(
    "largeMap"
  );

}



function createMap(
  containerId
) {

  const map =
    document.getElementById(
      containerId
    );


  if (!map)
    return;


  map.innerHTML =
    "";


  map.style.gridTemplateColumns =
    `repeat(${state.cols}, 1fr)`;


  for (
    let i = 1;
    i <= state.totalZones;
    i++
  ) {

    const zoneId =
      `Z-${String(i).padStart(2, "0")}`;


    const zone =
      document.createElement(
        "button"
      );


    zone.className =
      "zone";


    if (
      liveZoneData.has(
        zoneId
      )
    ) {

      zone.classList.add(
        "sampled"
      );

    }


    const prescription =
      prescriptions.find(
        item =>
          item.zone === zoneId
      );


    if (
      prescription &&
      prescription.status ===
        "Completed"
    ) {

      zone.classList.remove(
        "sampled"
      );


      zone.classList.add(
        "done"
      );

    }


    if (
      state.currentZone === i
    ) {

      zone.classList.add(
        "current"
      );

    }


    zone.textContent =
      zoneId;


    zone.onclick =
      () =>
        selectZone(i);


    map.appendChild(
      zone
    );

  }

}



function selectZone(i) {

  state.currentZone =
    i;


  const name =
    `Z-${String(i).padStart(2, "0")}`;


  document.getElementById(
    "currentZone"
  ).textContent =
    name;


  document.getElementById(
    "zoneTitle"
  ).textContent =
    name;


  document.getElementById(
    "controlZone"
  ).textContent =
    name;


  const sample =
    liveZoneData.get(
      name
    );


  if (sample) {

    document.getElementById(
      "zoneN"
    ).textContent =
      `${sample.n} mg/kg`;


    document.getElementById(
      "zoneP"
    ).textContent =
      `${sample.p} mg/kg`;


    document.getElementById(
      "zoneK"
    ).textContent =
      `${sample.k} mg/kg`;


    document.getElementById(
      "zoneGps"
    ).textContent =
      `${sample.latitude.toFixed(6)}° N, ` +
      `${sample.longitude.toFixed(6)}° E`;


    document.getElementById(
      "zoneSampleStatus"
    ).textContent =
      "Sampled";


    document.getElementById(
      "zoneSampleStatus"
    ).className =
      "badge green";

  }

  else {

    document.getElementById(
      "zoneN"
    ).textContent =
      "-- mg/kg";


    document.getElementById(
      "zoneP"
    ).textContent =
      "-- mg/kg";


    document.getElementById(
      "zoneK"
    ).textContent =
      "-- mg/kg";


    document.getElementById(
      "zoneGps"
    ).textContent =
      "No measurement";


    document.getElementById(
      "zoneSampleStatus"
    ).textContent =
      "No Data";


    document.getElementById(
      "zoneSampleStatus"
    ).className =
      "badge blue";

  }


  const row =
    prescriptions.find(
      item =>
        item.zone === name
    );


  if (row) {

    document.getElementById(
      "zoneDose"
    ).textContent =
      `N ${row.rn} ml · ` +
      `P ${row.rp} ml · ` +
      `K ${row.rk} ml`;


    document.getElementById(
      "sprayTime"
    ).textContent =
      `${row.time} sec`;

  }

  else {

    document.getElementById(
      "zoneDose"
    ).textContent =
      "Not calculated";


    document.getElementById(
      "sprayTime"
    ).textContent =
      "--";

  }


  renderMaps();

}



/* =========================================================
   FIELD SETUP
   ========================================================= */

document.getElementById(
  "generateGrid"
).onclick =
  () => {

    const rows =
      Number(
        document.getElementById(
          "fieldRows"
        ).value
      );


    const cols =
      Number(
        document.getElementById(
          "fieldCols"
        ).value
      );


    state.rows =
      rows;


    state.cols =
      cols;


    state.totalZones =
      rows * cols;


    document.getElementById(
      "historyMissionZones"
    ).textContent =
      state.totalZones;


    updateMissionUI();

    renderMaps();

    renderRealHeatmaps();


    toast(
      `Generated ${rows} × ${cols} field grid`
    );

  };



document.getElementById(
  "toggleGrid"
).onclick =
  () => {

    document.getElementById(
      "fieldMap"
    ).classList.toggle(
      "hide-labels"
    );

  };



document.getElementById(
  "resetMap"
).onclick =
  () => {

    renderMaps();

  };



/* =========================================================
   REAL NUTRIENT HEATMAP
   ========================================================= */

/*
  TEMPORARY DEMONSTRATION THRESHOLDS.

  These are GUI thresholds only.

  Replace them later with the actual
  agronomic thresholds approved for
  your selected crop/soil.
*/

function getHeatmapColor(
  nutrient,
  value
) {

  if (
    value === undefined ||
    value === null ||
    Number.isNaN(value)
  ) {

    return "#263544";

  }


  if (
    nutrient === "n"
  ) {

    if (value < 20)
      return "#2366dc";

    if (value < 35)
      return "#27a8d8";

    if (value < 50)
      return "#45c96b";

    if (value < 70)
      return "#efd83a";

    return "#ef4d3f";

  }


  if (
    nutrient === "p"
  ) {

    if (value < 10)
      return "#2366dc";

    if (value < 18)
      return "#27a8d8";

    if (value < 30)
      return "#45c96b";

    if (value < 45)
      return "#efd83a";

    return "#ef4d3f";

  }


  if (
    nutrient === "k"
  ) {

    if (value < 70)
      return "#2366dc";

    if (value < 100)
      return "#27a8d8";

    if (value < 150)
      return "#45c96b";

    if (value < 200)
      return "#efd83a";

    return "#ef4d3f";

  }


  return "#263544";

}



function renderRealHeatmap(
  containerId
) {

  const container =
    document.getElementById(
      containerId
    );


  if (!container)
    return;


  container.innerHTML =
    "";


  container.style.gridTemplateColumns =
    `repeat(${state.cols}, 1fr)`;


  for (
    let i = 1;
    i <= state.totalZones;
    i++
  ) {

    const zone =
      `Z-${String(i).padStart(2, "0")}`;


    const cell =
      document.createElement(
        "div"
      );


    cell.className =
      "heat-cell";


    cell.dataset.zone =
      zone;


    const measurement =
      liveZoneData.get(
        zone
      );


    if (!measurement) {

      cell.classList.add(
        "no-data"
      );


      cell.title =
        `${zone}: No measurement received`;

    }

    else {

      const value =
        measurement[
          selectedHeatmapNutrient
        ];


      cell.style.background =
        getHeatmapColor(
          selectedHeatmapNutrient,
          value
        );


      const nutrientName =
        {
          n: "Nitrogen",
          p: "Phosphorus",
          k: "Potassium"
        }[
          selectedHeatmapNutrient
        ];


      cell.title =
        `${zone}\n` +
        `${nutrientName}: ${value} mg/kg\n` +
        `Measured: ${formatTimestamp(
          measurement.timestamp
        )}`;

    }


    container.appendChild(
      cell
    );

  }

}



function renderRealHeatmaps() {

  renderRealHeatmap(
    "heatmap"
  );


  renderRealHeatmap(
    "largeHeatmap"
  );

}



document.getElementById(
  "heatmapType"
).addEventListener(
  "change",
  event => {

    selectedHeatmapNutrient =
      event.target.value;


    renderRealHeatmaps();

  }
);



/* =========================================================
   SENSOR HISTORY
   ========================================================= */

function saveSensorRows() {

  localStorage.setItem(
    "agriroverRealSensorHistoryV1",
    JSON.stringify(
      sensorRows
    )
  );

}



function saveLiveRoverSample(
  data,
  timestamp
) {

  const sample =
    {

      timestamp:
        timestamp.toISOString(),

      zone:
        data.zone,

      n:
        data.nitrogen,

      p:
        data.phosphorus,

      k:
        data.potassium,

      status:
        "Valid"

    };


  sensorRows.unshift(
    sample
  );


  /*
    Limit browser history
    to 5000 measurements.
  */

  if (
    sensorRows.length > 5000
  ) {

    sensorRows =
      sensorRows.slice(
        0,
        5000
      );

  }


  saveSensorRows();

  populateZoneFilter();

  renderSensorHistory();

}



function statusBadge(status) {

  return (
    status === "Valid"
      ? "green"
      : "amber"
  );

}



function renderSensorHistory(
  rows = sensorRows
) {

  const body =
    document.getElementById(
      "sensorHistory"
    );


  if (!body)
    return;


  if (!rows.length) {

    body.innerHTML =
      `
      <tr>
        <td
          colspan="7"
          class="empty-state"
        >
          No real rover samples stored yet.
        </td>
      </tr>
      `;

  }

  else {

    body.innerHTML =
      rows
        .map(
          sample =>
            `
            <tr>

              <td>
                ${formatTimestamp(sample.timestamp)}
              </td>

              <td>
                ${sample.zone}
              </td>

              <td>
                ${sample.n} mg/kg
              </td>

              <td>
                ${sample.p} mg/kg
              </td>

              <td>
                ${sample.k} mg/kg
              </td>

              <td>

                <span
                  class="badge ${statusBadge(sample.status)}"
                >
                  ${sample.status}
                </span>

              </td>

              <td>

                <button
                  class="btn small view-sample"
                  data-time="${sample.timestamp}"
                >
                  View
                </button>

              </td>

            </tr>
            `
        )
        .join("");

  }


  const summary =
    document.getElementById(
      "historySummary"
    );


  if (summary) {

    summary.textContent =
      `Showing ${rows.length} of ${sensorRows.length} stored samples`;

  }


  document
    .querySelectorAll(
      ".view-sample"
    )
    .forEach(
      button => {

        button.onclick =
          () =>
            viewHistoricalSample(
              button.dataset.time
            );

      }
    );

}



function populateZoneFilter() {

  const select =
    document.getElementById(
      "historyZone"
    );


  if (!select)
    return;


  const selected =
    select.value;


  const zones =
    [
      ...new Set(
        sensorRows.map(
          row => row.zone
        )
      )
    ].sort();


  select.innerHTML =
    '<option value="all">All zones</option>' +
    zones
      .map(
        zone =>
          `<option value="${zone}">${zone}</option>`
      )
      .join("");


  if (
    zones.includes(
      selected
    )
  ) {

    select.value =
      selected;

  }

}



function updateTimestampDisplay() {

  const stamp =
    document.getElementById(
      "sensorTimestamp"
    );


  if (!stamp)
    return;


  stamp.textContent =
    lastSensorUpdate
      ? formatTimestamp(
          lastSensorUpdate
        )
      : "No data received";

}



function updateDataAge() {

  const age =
    document.getElementById(
      "sensorDataAge"
    );


  if (!age)
    return;


  if (!lastSensorUpdate) {

    age.textContent =
      "No data";

    return;

  }


  const seconds =
    Math.max(
      0,
      Math.floor(
        (
          Date.now() -
          lastSensorUpdate.getTime()
        ) / 1000
      )
    );


  if (seconds < 60) {

    age.textContent =
      `${seconds} sec ago`;

  }

  else if (
    seconds < 3600
  ) {

    age.textContent =
      `${Math.floor(seconds / 60)} min ago`;

  }

  else if (
    seconds < 86400
  ) {

    age.textContent =
      `${Math.floor(seconds / 3600)} hr ago`;

  }

  else {

    age.textContent =
      `${Math.floor(seconds / 86400)} day(s) ago`;

  }

}



function viewHistoricalSample(
  timestamp
) {

  const sample =
    sensorRows.find(
      row =>
        row.timestamp ===
        timestamp
    );


  if (!sample) {

    toast(
      "Historical sample not found"
    );

    return;

  }


  updateGauge(
    "nGauge",
    sample.n,
    100
  );


  updateGauge(
    "pGauge",
    sample.p,
    100
  );


  updateGauge(
    "kGauge",
    sample.k,
    200
  );


  document.getElementById(
    "sensorTimestamp"
  ).textContent =
    formatTimestamp(
      sample.timestamp
    );


  document.getElementById(
    "sensorDataAge"
  ).textContent =
    "Historical record";


  toast(
    `Viewing ${sample.zone} historical measurement`
  );

}



function applyHistoryFilter() {

  const from =
    document.getElementById(
      "historyFrom"
    ).value;


  const to =
    document.getElementById(
      "historyTo"
    ).value;


  const zone =
    document.getElementById(
      "historyZone"
    ).value;


  const filtered =
    sensorRows.filter(
      sample => {

        const time =
          new Date(
            sample.timestamp
          ).getTime();


        const after =
          !from ||
          time >=
            new Date(
              `${from}T00:00:00`
            ).getTime();


        const before =
          !to ||
          time <=
            new Date(
              `${to}T23:59:59`
            ).getTime();


        const zoneMatch =
          zone === "all" ||
          sample.zone === zone;


        return (
          after &&
          before &&
          zoneMatch
        );

      }
    );


  renderSensorHistory(
    filtered
  );

}



function resetHistoryFilter() {

  document.getElementById(
    "historyFrom"
  ).value =
    "";


  document.getElementById(
    "historyTo"
  ).value =
    "";


  document.getElementById(
    "historyZone"
  ).value =
    "all";


  renderSensorHistory();

}



function exportHistoryCsv() {

  const header =
    [
      "Timestamp",
      "Zone",
      "Nitrogen",
      "Phosphorus",
      "Potassium",
      "Status"
    ];


  const rows =
    sensorRows.map(
      sample =>
        [
          sample.timestamp,
          sample.zone,
          sample.n,
          sample.p,
          sample.k,
          sample.status
        ]
    );


  const csv =
    [
      header,
      ...rows
    ]
      .map(
        row =>
          row.join(",")
      )
      .join("\n");


  const blob =
    new Blob(
      [csv],
      {
        type: "text/csv"
      }
    );


  const link =
    document.createElement(
      "a"
    );


  link.href =
    URL.createObjectURL(
      blob
    );


  link.download =
    "agrirover-real-sensor-history.csv";


  link.click();


  URL.revokeObjectURL(
    link.href
  );


  toast(
    "Sensor history exported"
  );

}



setInterval(
  updateDataAge,
  1000
);



document.getElementById(
  "filterHistory"
).onclick =
  applyHistoryFilter;


document.getElementById(
  "resetHistoryFilter"
).onclick =
  resetHistoryFilter;


document.getElementById(
  "exportHistoryCsv"
).onclick =
  exportHistoryCsv;



/* =========================================================
   TAKE SAMPLE
   ========================================================= */

async function takeSample() {

  const sent =
    await sendBaseCommand(
      "ROVER,SAMPLE"
    );


  if (sent) {

    toast(
      "Sample command sent to rover"
    );

  }

}



document.getElementById(
  "takeSample"
).onclick =
  takeSample;


document.getElementById(
  "takeSample2"
).onclick =
  takeSample;



/* =========================================================
   ROVER MISSION COMMANDS
   ========================================================= */

document.getElementById(
  "startMission"
).onclick =
  async () => {

    if (
      state.emergency
    ) {

      toast(
        "Emergency state must be reset from hardware first"
      );

      return;

    }


    const sent =
      await sendBaseCommand(
        "ROVER,START"
      );


    if (sent) {

      document.getElementById(
        "missionStatus"
      ).textContent =
        "Starting...";


      toast(
        "Start command sent to rover"
      );

    }

  };



document.getElementById(
  "pauseMission"
).onclick =
  async () => {

    if (!state.paused) {

      const sent =
        await sendBaseCommand(
          "ROVER,PAUSE"
        );


      if (sent) {

        state.paused =
          true;


        document.getElementById(
          "pauseMission"
        ).textContent =
          "Resume";


        document.getElementById(
          "missionStatus"
        ).textContent =
          "Pausing...";

      }

    }

    else {

      const sent =
        await sendBaseCommand(
          "ROVER,RESUME"
        );


      if (sent) {

        state.paused =
          false;


        document.getElementById(
          "pauseMission"
        ).textContent =
          "Pause";


        document.getElementById(
          "missionStatus"
        ).textContent =
          "Resuming...";

      }

    }

  };



/* =========================================================
   EMERGENCY STOP
   ========================================================= */

document.getElementById(
  "emergencyBtn"
).onclick =
  async () => {

    /*
       Send stop to rover.
    */

    await sendBaseCommand(
      "ROVER,ESTOP"
    );


    /*
       Also shut down local
       fertilizer hardware.
    */

    await sendBaseCommand(
      "FERT,ALL_OFF"
    );


    state.emergency =
      true;


    state.running =
      false;


    state.paused =
      false;


    document.getElementById(
      "missionStatus"
    ).textContent =
      "Emergency Stop";


    document.getElementById(
      "modeLabel"
    ).textContent =
      "Emergency";


    document.getElementById(
      "pumpStatus"
    ).textContent =
      "OFF";


    setSprayProgress(
      0
    );


    toast(
      "Emergency stop commands sent"
    );

  };



/* =========================================================
   ROVER ACK
   ========================================================= */

function processRoverAck(
  command
) {

  const upper =
    command.toUpperCase();


  if (
    upper.includes(
      "START"
    )
  ) {

    state.running =
      true;


    state.paused =
      false;


    document.getElementById(
      "missionStatus"
    ).textContent =
      "Running";

  }


  else if (
    upper.includes(
      "PAUSE"
    )
  ) {

    state.paused =
      true;


    document.getElementById(
      "missionStatus"
    ).textContent =
      "Paused";

  }


  else if (
    upper.includes(
      "RESUME"
    )
  ) {

    state.paused =
      false;


    document.getElementById(
      "missionStatus"
    ).textContent =
      "Running";

  }


  else if (
    upper.includes(
      "ESTOP"
    )
  ) {

    document.getElementById(
      "missionStatus"
    ).textContent =
      "Emergency Stop";

  }


  toast(
    `Rover confirmed: ${command}`
  );


  addSystemLog(
    "success",
    "Rover acknowledgement",
    command
  );

}



/* =========================================================
   MANUAL ROVER CONTROL
   ========================================================= */

const manualCommandMap =
  {

    Forward:
      "FWD",

    Backward:
      "BACK",

    Left:
      "LEFT",

    Right:
      "RIGHT",

    Stop:
      "STOP"

  };



document
  .querySelectorAll(
    ".dpad button"
  )
  .forEach(
    button => {

      button.onclick =
        async () => {

          const action =
            manualCommandMap[
              button.dataset.command
            ];


          const speed =
            Number(
              document.getElementById(
                "manualSpeed"
              ).value
            );


          let command =
            `ROVER,${action}`;


          if (
            action !== "STOP"
          ) {

            command +=
              `,${speed.toFixed(1)}`;

          }


          const sent =
            await sendBaseCommand(
              command
            );


          if (sent) {

            document.getElementById(
              "manualCommand"
            ).textContent =
              `Command sent: ${command}`;

          }

        };

    }
  );



document.getElementById(
  "manualSpeed"
).oninput =
  event => {

    document.getElementById(
      "manualSpeedValue"
    ).textContent =
      `${event.target.value} m/s`;

  };



document.getElementById(
  "manualStop"
).onclick =
  async () => {

    await sendBaseCommand(
      "ROVER,STOP"
    );


    document.getElementById(
      "manualCommand"
    ).textContent =
      "Emergency motor STOP command sent.";

  };



/* =========================================================
   FERTILIZER VALVE CONTROL
   BASE STATION HARDWARE
   ========================================================= */

document
  .querySelectorAll(
    ".valve[data-valve]"
  )
  .forEach(
    button => {

      button.onclick =
        async () => {

          const valve =
            button.dataset.valve;


          const currentlyOpen =
            button.classList.contains(
              "on"
            );


          const action =
            currentlyOpen
              ? "CLOSE"
              : "OPEN";


          const sent =
            await sendBaseCommand(
              `FERT,${valve},${action}`
            );


          if (sent) {

            toast(
              `${valve} valve ${action} requested`
            );

          }


          /*
             IMPORTANT:

             Button does NOT visually change here.

             It waits for ACK from Nano.
          */

        };

    }
  );



/* =========================================================
   PUMP CONTROL
   ========================================================= */

document.getElementById(
  "startSpray"
).onclick =
  async () => {

    const sent =
      await sendBaseCommand(
        "FERT,PUMP,ON"
      );


    if (sent) {

      document.getElementById(
        "pumpStatus"
      ).textContent =
        "Starting...";

    }

  };



document.getElementById(
  "pauseSpray"
).onclick =
  async () => {

    const sent =
      await sendBaseCommand(
        "FERT,PUMP,OFF"
      );


    if (sent) {

      document.getElementById(
        "pumpStatus"
      ).textContent =
        "Pausing...";

    }

  };



document.getElementById(
  "stopSpray"
).onclick =
  async () => {

    const sent =
      await sendBaseCommand(
        "FERT,ALL_OFF"
      );


    if (sent) {

      document.getElementById(
        "pumpStatus"
      ).textContent =
        "Stopping...";

    }

  };



function setSprayProgress(
  value
) {

  state.sprayProgress =
    Math.max(
      0,
      Math.min(
        100,
        Number(value)
      )
    );


  document.getElementById(
    "sprayProgress"
  ).textContent =
    `${Math.round(state.sprayProgress)}%`;


  document.getElementById(
    "sprayBar"
  ).style.width =
    `${state.sprayProgress}%`;

}



/* =========================================================
   BASE STATION ACK
   ========================================================= */

/*

Nano examples:

BASE,GUI,ACK,FERT,N,OPEN

BASE,GUI,ACK,FERT,P,CLOSE

BASE,GUI,ACK,FERT,PUMP,ON

BASE,GUI,ACK,FERT,ALL_OFF

*/

function processBaseAck(
  parts
) {

  if (
    parts[0] !== "FERT"
  ) {

    return;

  }


  const device =
    parts[1];


  const action =
    parts[2];


  /* ALL OFF */

  if (
    device === "ALL_OFF"
  ) {

    document
      .querySelectorAll(
        ".valve"
      )
      .forEach(
        button => {

          button.classList.remove(
            "on"
          );


          const label =
            button.querySelector(
              "b"
            );


          if (label)
            label.textContent =
              "CLOSED";

        }
      );


    document.getElementById(
      "pumpStatus"
    ).textContent =
      "OFF";


    setSprayProgress(
      0
    );


    toast(
      "Base confirmed fertilizer shutdown"
    );


    return;

  }


  /* PUMP */

  if (
    device === "PUMP"
  ) {

    document.getElementById(
      "pumpStatus"
    ).textContent =
      action === "ON"
        ? "Running"
        : "OFF";


    toast(
      `Base confirmed pump ${action}`
    );


    return;

  }


  /* N / P / K / MAIN */

  updateValveUI(
    device,
    action === "OPEN"
  );


  toast(
    `Base confirmed ${device} valve ${action}`
  );

}



/* =========================================================
   BASE STATUS PACKETS
   ========================================================= */

/*

Optional future example:

BASE,GUI,STATUS,FERT,PROGRESS,45

*/

function processBaseStatus(
  parts
) {

  if (
    parts[0] === "FERT" &&
    parts[1] === "PROGRESS"
  ) {

    setSprayProgress(
      Number(
        parts[2]
      )
    );

  }

}



/* =========================================================
   UPDATE ALL COPIES OF A VALVE BUTTON
   ========================================================= */

function updateValveUI(
  valve,
  open
) {

  document
    .querySelectorAll(
      `.valve[data-valve="${valve}"]`
    )
    .forEach(
      button => {

        const label =
          button.querySelector(
            "b"
          );


        if (open) {

          button.classList.add(
            "on"
          );


          if (label)
            label.textContent =
              "OPEN";

        }

        else {

          button.classList.remove(
            "on"
          );


          if (label)
            label.textContent =
              "CLOSED";

        }

      }
    );

}



/* =========================================================
   PRESCRIPTION TABLE
   ========================================================= */

function renderPrescription() {

  const dashboard =
    document.getElementById(
      "prescriptionBody"
    );


  const page =
    document.getElementById(
      "prescriptionBody2"
    );


  dashboard.innerHTML =
    prescriptions
      .map(
        row =>
          `
          <tr>

            <td>${row.zone}</td>

            <td>${row.n}</td>

            <td>${row.p}</td>

            <td>${row.k}</td>

            <td>${row.rn} ml</td>

            <td>${row.rp} ml</td>

            <td>${row.rk} ml</td>

            <td>

              <span
                class="badge ${
                  row.status === "Completed"
                    ? "green"
                    : row.status === "Pending"
                    ? "amber"
                    : "blue"
                }"
              >
                ${row.status}
              </span>

            </td>

          </tr>
          `
      )
      .join("");


  page.innerHTML =
    prescriptions
      .map(
        row =>
          `
          <tr>

            <td>${row.zone}</td>

            <td>${row.n}</td>

            <td>${row.p}</td>

            <td>${row.k}</td>

            <td>${row.rn} ml</td>

            <td>${row.rp} ml</td>

            <td>${row.rk} ml</td>

            <td>${row.time} sec</td>

            <td>

              <span
                class="badge ${
                  row.status === "Completed"
                    ? "green"
                    : row.status === "Pending"
                    ? "amber"
                    : "blue"
                }"
              >
                ${row.status}
              </span>

            </td>

          </tr>
          `
      )
      .join("");

}



function approvePrescription() {

  prescriptions
    .forEach(
      row => {

        if (
          row.status === "Pending"
        ) {

          row.status =
            "Approved";

        }

      }
    );


  renderPrescription();


  toast(
    "Fertilizer prescription approved"
  );

}



document.getElementById(
  "approvePrescription"
).onclick =
  approvePrescription;


document.getElementById(
  "approvePrescription2"
).onclick =
  approvePrescription;



function exportPrescriptionCsv() {

  const header =
    [
      "Zone",
      "N",
      "P",
      "K",
      "Required N",
      "Required P",
      "Required K",
      "Spray Time",
      "Status"
    ];


  const rows =
    prescriptions.map(
      row =>
        [
          row.zone,
          row.n,
          row.p,
          row.k,
          row.rn,
          row.rp,
          row.rk,
          row.time,
          row.status
        ]
    );


  const csv =
    [
      header,
      ...rows
    ]
      .map(
        row =>
          row.join(",")
      )
      .join("\n");


  const blob =
    new Blob(
      [csv],
      {
        type: "text/csv"
      }
    );


  const link =
    document.createElement(
      "a"
    );


  link.href =
    URL.createObjectURL(
      blob
    );


  link.download =
    "agrirover-prescription.csv";


  link.click();


  URL.revokeObjectURL(
    link.href
  );

}



document.getElementById(
  "exportCsv"
).onclick =
  exportPrescriptionCsv;



/* =========================================================
   CROP RECOMMENDATION
   ========================================================= */

/*
  This is still a DEMONSTRATION scoring model.

  Later replace with your actual trained
  crop recommendation model / validated
  agricultural rules.
*/

const cropProfiles =
  [

    {
      name: "Rice",
      emoji: "🌾",
      base: 88,
      reason:
        "Strong fit for warm, humid and high-moisture conditions."
    },

    {
      name: "Maize",
      emoji: "🌽",
      base: 80,
      reason:
        "Suitable nutrient balance with moderate moisture demand."
    },

    {
      name: "Wheat",
      emoji: "🌿",
      base: 65,
      reason:
        "Possible with lower moisture and cooler seasonal conditions."
    },

    {
      name: "Mustard",
      emoji: "🌼",
      base: 55,
      reason:
        "Requires drier conditions and improved phosphorus."
    }

  ];



function runRecommendation() {

  const n =
    Number(
      document.getElementById(
        "recN"
      ).value
    );


  const p =
    Number(
      document.getElementById(
        "recP"
      ).value
    );


  const moisture =
    Number(
      document.getElementById(
        "recMoisture"
      ).value
    );


  const temperature =
    Number(
      document.getElementById(
        "recTemp"
      ).value
    );


  const scores =
    cropProfiles
      .map(
        crop => {

          let score =
            crop.base;


          if (
            crop.name === "Rice"
          ) {

            score +=
              moisture > 65
                ? 5
                : -12;

          }


          if (
            crop.name === "Maize"
          ) {

            score +=
              n > 40
                ? 4
                : -3;

          }


          if (
            crop.name === "Wheat"
          ) {

            score +=
              temperature < 25
                ? 8
                : -7;

          }


          if (p < 18)
            score -= 4;


          return {
            ...crop,
            score:
              Math.max(
                20,
                Math.min(
                  98,
                  Math.round(score)
                )
              )
          };

        }
      )
      .sort(
        (a, b) =>
          b.score -
          a.score
      );


  document.getElementById(
    "cropResults"
  ).innerHTML =
    scores
      .map(
        (crop, index) =>
          `
          <article class="result-card">

            <header>

              <strong>
                ${crop.emoji}
                ${index + 1}.
                ${crop.name}
              </strong>

              <span
                class="badge ${
                  index === 0
                    ? "green"
                    : "blue"
                }"
              >
                ${crop.score}% suitable
              </span>

            </header>

            <p>
              ${crop.reason}
            </p>

            <div class="progress">

              <i
                style="width:${crop.score}%"
              ></i>

            </div>

          </article>
          `
      )
      .join("");


  document.getElementById(
    "bestCrop"
  ).textContent =
    scores[0].name;


  document.getElementById(
    "cropScore"
  ).textContent =
    `${scores[0].score}%`;


  document.getElementById(
    "cropReason"
  ).textContent =
    scores[0].reason;


  toast(
    "Crop recommendation generated"
  );

}



document.getElementById(
  "runCropModel"
).onclick =
  runRecommendation;



document.getElementById(
  "generateRecommendation"
).onclick =
  () => {

    navigate(
      "crop"
    );


    runRecommendation();

  };



/* =========================================================
   SYSTEM ALERT / EVENT LOG
   ========================================================= */

let allAlerts = [];



function addSystemLog(
  type,
  title,
  description
) {

  const time =
    new Date()
      .toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );


  const icons =
    {
      success: "✓",
      warning: "⚠",
      info: "ℹ",
      error: "✕"
    };


  allAlerts.unshift(
    [
      type,
      icons[type] || "ℹ",
      title,
      description,
      time
    ]
  );


  if (
    allAlerts.length > 100
  ) {

    allAlerts =
      allAlerts.slice(
        0,
        100
      );

  }


  renderAlerts();

}



function renderAlerts() {

  const full =
    document.getElementById(
      "allAlerts"
    );


  const dashboard =
    document.getElementById(
      "alertsList"
    );


  const html =
    allAlerts.length
      ? allAlerts
          .map(
            alert =>
              `
              <article
                class="alert ${alert[0]}"
              >

                <span>
                  ${alert[1]}
                </span>

                <div>

                  <strong>
                    ${alert[2]}
                  </strong>

                  <small>
                    ${alert[3]}
                  </small>

                </div>

                <time>
                  ${alert[4]}
                </time>

              </article>
              `
          )
          .join("")
      :
        `
        <article class="alert info">

          <span>ℹ</span>

          <div>

            <strong>
              No events yet
            </strong>

            <small>
              Connect the Base Station to begin.
            </small>

          </div>

          <time>--</time>

        </article>
        `;


  full.innerHTML =
    html;


  dashboard.innerHTML =
    allAlerts.length
      ? allAlerts
          .slice(0, 4)
          .map(
            alert =>
              `
              <article
                class="alert ${alert[0]}"
              >

                <span>
                  ${alert[1]}
                </span>

                <div>

                  <strong>
                    ${alert[2]}
                  </strong>

                  <small>
                    ${alert[3]}
                  </small>

                </div>

                <time>
                  ${alert[4]}
                </time>

              </article>
              `
          )
          .join("")
      : html;

}



document.getElementById(
  "clearAlerts"
).onclick =
  () => {

    allAlerts = [];

    renderAlerts();

    toast(
      "Alerts cleared"
    );

  };



/* =========================================================
   HISTORY NAVIGATION
   ========================================================= */

document.getElementById(
  "openCurrentHistory"
).onclick =
  () =>
    navigate(
      "sensor"
    );



/* =========================================================
   INITIALIZE GUI
   ========================================================= */

populateZoneFilter();

renderSensorHistory();

updateTimestampDisplay();

updateDataAge();

updateMissionUI();

renderPrescription();

renderMaps();

renderRealHeatmaps();

renderAlerts();

updateBaseStationStatus(
  false
);

setRoverOnline(
  false
);
