/* =========================================================
   AGRIROVER FRONTEND
   VERSION 7
========================================================= */


/* =========================================================
   GLOBAL STATE
========================================================= */

const state = {
  running: false,
  paused: false,
  emergency: false,

  battery: 0,
  speed: 0,

  progress: 0,
  completed: 0,

  currentZone: 0,

  rows: 8,
  cols: 8,
  totalZones: 64,

  sprayProgress: 0
};


/* =========================================================
   BASE STATION SERIAL
========================================================= */

let serialPort = null;
let serialReader = null;

let serialBuffer = "";

let baseStationConnected = false;

let lastRoverPacketAt = null;


/* =========================================================
   CAMERA
========================================================= */

/*
   Later your backend will provide this URL.

   Example:

   http://192.168.1.5:8000/camera

   or

   http://localhost:8000/camera
*/

let cameraStreamUrl = "";


/* =========================================================
   TELEMETRY
========================================================= */

let latestTelemetry = null;

let telemetryPacketCounter = 0;


/* =========================================================
   HEATMAP DATA
========================================================= */

const liveZoneData =
  new Map();

let selectedHeatmapNutrient =
  "n";


/* =========================================================
   HISTORY
========================================================= */

const STORAGE_KEY =
  "agriroverSensorHistoryV7";


function loadHistory() {

  try {

    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );

    return saved
      ? JSON.parse(saved)
      : [];

  }

  catch (error) {

    console.error(
      "History load error:",
      error
    );

    return [];

  }

}


let sensorRows =
  loadHistory();


let lastSensorUpdate =
  sensorRows.length
    ? new Date(
        sensorRows[0].timestamp
      )
    : null;


/* =========================================================
   PRESCRIPTIONS
========================================================= */

let prescriptions =
  [];


/* =========================================================
   ALERTS
========================================================= */

let systemAlerts =
  [];


/* =========================================================
   UTILITIES
========================================================= */

function toast(message) {

  const element =
    document.getElementById(
      "toast"
    );

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


function formatTimestamp(
  value = new Date()
) {

  const date =
    value instanceof Date
      ? value
      : new Date(value);

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

  if (
    Number.isNaN(number)
  ) {

    return zone;

  }

  return (
    "Z-" +
    String(number)
      .padStart(2, "0")
  );

}


function formatEta(seconds) {

  const number =
    Number(seconds);

  if (
    Number.isNaN(number)
  ) {

    return "--:--:--";

  }

  const value =
    Math.max(
      0,
      Math.floor(number)
    );

  const h =
    Math.floor(
      value / 3600
    );

  const m =
    Math.floor(
      (value % 3600) / 60
    );

  const s =
    value % 60;

  return (
    String(h).padStart(2, "0") +
    ":" +
    String(m).padStart(2, "0") +
    ":" +
    String(s).padStart(2, "0")
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

function navigate(pageId) {

  document
    .querySelectorAll(
      ".page"
    )
    .forEach(
      page => {

        page.classList.remove(
          "active"
        );

      }
    );


  document
    .querySelectorAll(
      ".nav-item"
    )
    .forEach(
      item => {

        item.classList.remove(
          "active"
        );

      }
    );


  const page =
    document.getElementById(
      pageId
    );


  if (page) {

    page.classList.add(
      "active"
    );

  }


  const nav =
    document.querySelector(
      `.nav-item[data-page="${pageId}"]`
    );


  if (nav) {

    nav.classList.add(
      "active"
    );

  }


  document
    .getElementById(
      "sidebar"
    )
    .classList.remove(
      "open"
    );

}


document
  .querySelectorAll(
    ".nav-item"
  )
  .forEach(
    button => {

      button.onclick =
        () =>
          navigate(
            button.dataset.page
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
   BASE STATION SERIAL CONNECTION
========================================================= */

async function connectBaseStation() {

  if (
    baseStationConnected
  ) {

    await disconnectBaseStation();

    return;

  }


  if (
    !("serial" in navigator)
  ) {

    alert(
      "Web Serial is not supported.\n\n" +
      "Please use desktop Chrome or Microsoft Edge."
    );

    return;

  }


  try {

    serialPort =
      await navigator.serial.requestPort();


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


    addAlert(
      "success",
      "Base station connected",
      "USB serial connection established"
    );


    toast(
      "Base Station connected"
    );


    readSerialLoop();

  }

  catch (error) {

    console.error(
      "Base station connection error:",
      error
    );


    toast(
      `Connection failed: ${error.message || error.name}`
    );


    addAlert(
      "error",
      "Base station connection failed",
      error.message || error.name
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
      error
    );

  }


  serialReader = null;
  serialPort = null;

  baseStationConnected =
    false;


  updateBaseStationStatus(
    false
  );


  toast(
    "Base Station disconnected"
  );

}


function updateBaseStationStatus(
  connected
) {

  const dot =
    document.getElementById(
      "baseStatusDot"
    );


  const text =
    document.getElementById(
      "baseStatusText"
    );


  const button =
    document.getElementById(
      "connectBaseStation"
    );


  if (connected) {

    dot.classList.remove(
      "disconnected-dot"
    );

    dot.classList.add(
      "connected-dot"
    );


    text.textContent =
      "Connected";


    button.textContent =
      "✓ Connected";


    button.classList.add(
      "connected"
    );

  }

  else {

    dot.classList.remove(
      "connected-dot"
    );

    dot.classList.add(
      "disconnected-dot"
    );


    text.textContent =
      "Disconnected";


    button.textContent =
      "🔌 Connect";


    button.classList.remove(
      "connected"
    );

  }

}


document.getElementById(
  "connectBaseStation"
).onclick =
  connectBaseStation;


/* =========================================================
   SERIAL READER
========================================================= */

async function readSerialLoop() {

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
              !packet
            ) {

              continue;

            }


            addTelemetryConsoleLine(
              packet
            );


            processBaseStationPacket(
              packet
            );

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

    console.error(
      "Serial reading error:",
      error
    );


    addAlert(
      "warning",
      "Serial communication stopped",
      error.message || "Unknown serial error"
    );

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
   SEND COMMAND TO BASE STATION
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


  let writer =
    null;


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


    addAlert(
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

    if (writer) {

      writer.releaseLock();

    }

  }

}


/* =========================================================
   EXPECTED TELEMETRY PACKET

ROVER,BASE,TEL,
packet,
zone,
N,
P,
K,
moisture,
temperature,
humidity,
pH,
battery,
speed,
latitude,
longitude,
completed,
ETA,
status

Example:

ROVER,BASE,TEL,1001,Z04,35,18,125,62,28.4,76,6.5,82,0.8,23.685123,90.356789,29,2535,SAMPLING

========================================================= */

function processBaseStationPacket(
  packet
) {

  const parts =
    packet
      .split(",")
      .map(
        value =>
          value.trim()
      );


  const source =
    parts[0]
      ?.toUpperCase();


  const destination =
    parts[1]
      ?.toUpperCase();


  const type =
    parts[2]
      ?.toUpperCase();


  /* REAL TELEMETRY */

  if (
    source === "ROVER" &&
    destination === "BASE" &&
    type === "TEL"
  ) {

    if (
      parts.length < 19
    ) {

      console.warn(
        "Incomplete telemetry packet:",
        packet
      );

      return;

    }


    const data = {

      packetNumber:
        Number(parts[3]),

      zone:
        normalizeZone(
          parts[4]
        ),

      nitrogen:
        Number(parts[5]),

      phosphorus:
        Number(parts[6]),

      potassium:
        Number(parts[7]),

      moisture:
        Number(parts[8]),

      temperature:
        Number(parts[9]),

      humidity:
        Number(parts[10]),

      ph:
        Number(parts[11]),

      battery:
        Number(parts[12]),

      speed:
        Number(parts[13]),

      latitude:
        Number(parts[14]),

      longitude:
        Number(parts[15]),

      completed:
        Number(parts[16]),

      etaSeconds:
        Number(parts[17]),

      roverStatus:
        parts[18]
          ?.toUpperCase()

    };


    processRoverTelemetry(
      data
    );


    return;

  }


  /* ROVER ACK */

  if (
    source === "ROVER" &&
    type === "ACK"
  ) {

    const message =
      parts
        .slice(3)
        .join(",");


    toast(
      `Rover confirmed: ${message}`
    );


    addAlert(
      "success",
      "Rover acknowledgement",
      message
    );


    return;

  }


  /* BASE ACK */

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


  /* FERTILIZER STATUS */

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

}


/* =========================================================
   PROCESS ROVER TELEMETRY
========================================================= */

function processRoverTelemetry(
  data
) {

  latestTelemetry =
    data;


  telemetryPacketCounter =
    data.packetNumber;


  lastRoverPacketAt =
    new Date();


  lastSensorUpdate =
    lastRoverPacketAt;


  state.battery =
    Math.max(
      0,
      Math.min(
        100,
        data.battery
      )
    );


  state.speed =
    data.speed;


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


  setRoverOnline(
    true
  );


  updateMissionDashboard(
    data
  );


  updateLiveTelemetry(
    data
  );


  updateLiveRoverPage(
    data
  );


  updateCurrentZoneInfo(
    data
  );


  updateNpkGauges(
    data
  );


  saveTelemetrySample(
    data
  );


  liveZoneData.set(
    data.zone,
    {
      n:
        data.nitrogen,

      p:
        data.phosphorus,

      k:
        data.potassium,

      moisture:
        data.moisture,

      temperature:
        data.temperature,

      humidity:
        data.humidity,

      ph:
        data.ph,

      latitude:
        data.latitude,

      longitude:
        data.longitude,

      timestamp:
        new Date().toISOString()
    }
  );


  updateRecommendationInputs(
    data
  );


  renderRealHeatmaps();


  updateTimestampDisplay();

}


/* =========================================================
   DASHBOARD
========================================================= */

function updateMissionDashboard(
  data
) {

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
    "speedValue"
  ).textContent =
    `${data.speed.toFixed(1)} m/s`;


  document.getElementById(
    "currentZone"
  ).textContent =
    data.zone;


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
    `${Math.max(
      0,
      state.totalZones -
      state.completed
    )} remaining`;


  document.getElementById(
    "remainingTime"
  ).textContent =
    formatEta(
      data.etaSeconds
    );


  document.getElementById(
    "missionStatus"
  ).textContent =
    data.roverStatus;


  document.getElementById(
    "overviewState"
  ).textContent =
    "Live";

}


/* =========================================================
   CURRENT POSITION PANEL
========================================================= */

function updateCurrentZoneInfo(
  data
) {

  document.getElementById(
    "zoneTitle"
  ).textContent =
    data.zone;


  document.getElementById(
    "zoneGps"
  ).textContent =
    `${data.latitude.toFixed(6)}° N, ${data.longitude.toFixed(6)}° E`;


  document.getElementById(
    "zonePh"
  ).textContent =
    data.ph.toFixed(2);


  document.getElementById(
    "zoneMoisture"
  ).textContent =
    `${data.moisture.toFixed(1)}%`;


  document.getElementById(
    "zoneTemperature"
  ).textContent =
    `${data.temperature.toFixed(1)} °C`;


  document.getElementById(
    "zoneHumidity"
  ).textContent =
    `${data.humidity.toFixed(1)}%`;


  document.getElementById(
    "zoneSampleStatus"
  ).textContent =
    "Live";


  document.getElementById(
    "zoneSampleStatus"
  ).className =
    "badge green";


  document.getElementById(
    "controlZone"
  ).textContent =
    data.zone;


  document.getElementById(
    "sprinklerZone"
  ).textContent =
    data.zone;

}


/* =========================================================
   NPK
========================================================= */

function updateNpkGauges(
  data
) {

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


  const statusDot =
    document.getElementById(
      "sensorStatusDot"
    );


  statusDot.classList.remove(
    "disconnected-dot"
  );


  statusDot.classList.add(
    "connected-dot"
  );


  document.getElementById(
    "sensorStatusText"
  ).textContent =
    "Receiving rover data";

}


function updateGauge(
  id,
  value,
  max
) {

  const element =
    document.getElementById(
      id
    );


  element.textContent =
    Math.round(value);


  const gauge =
    element.closest(
      ".gauge"
    );


  const percentage =
    Math.max(
      0,
      Math.min(
        100,
        (
          value /
          max
        ) * 100
      )
    );


  gauge.style.setProperty(
    "--value",
    percentage
  );

}


/* =========================================================
   LIVE TELEMETRY
========================================================= */

function updateLiveTelemetry(
  data
) {

  document.getElementById(
    "telemetryN"
  ).textContent =
    Math.round(
      data.nitrogen
    );


  document.getElementById(
    "telemetryP"
  ).textContent =
    Math.round(
      data.phosphorus
    );


  document.getElementById(
    "telemetryK"
  ).textContent =
    Math.round(
      data.potassium
    );


  document.getElementById(
    "telemetryMoisture"
  ).textContent =
    data.moisture.toFixed(1);


  document.getElementById(
    "telemetryTemperature"
  ).textContent =
    data.temperature.toFixed(1);


  document.getElementById(
    "telemetryHumidity"
  ).textContent =
    data.humidity.toFixed(1);


  document.getElementById(
    "telemetryPh"
  ).textContent =
    data.ph.toFixed(2);


  document.getElementById(
    "telemetryGps"
  ).textContent =
    `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`;


  document.getElementById(
    "telemetryGpsStatus"
  ).textContent =
    "GPS Fix";


  document.getElementById(
    "telemetryBattery"
  ).textContent =
    `${Math.round(data.battery)}%`;


  document.getElementById(
    "telemetrySpeed"
  ).textContent =
    `${data.speed.toFixed(1)} m/s`;


  document.getElementById(
    "telemetryZone"
  ).textContent =
    data.zone;


  document.getElementById(
    "telemetryProgress"
  ).textContent =
    `${Math.round(state.progress)}%`;


  document.getElementById(
    "telemetryPacketNumber"
  ).textContent =
    data.packetNumber;


  document.getElementById(
    "telemetryRoverStatus"
  ).textContent =
    data.roverStatus;


  document.getElementById(
    "telemetryLastPacket"
  ).textContent =
    formatTimestamp(
      new Date()
    );


  const dot =
    document.getElementById(
      "telemetryStatusDot"
    );


  dot.classList.remove(
    "disconnected-dot"
  );


  dot.classList.add(
    "connected-dot"
  );


  document.getElementById(
    "telemetryStatusText"
  ).textContent =
    "Receiving";

}


/* =========================================================
   LIVE ROVER PAGE
========================================================= */

function updateLiveRoverPage(
  data
) {

  document.getElementById(
    "liveRoverGps"
  ).textContent =
    `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`;


  document.getElementById(
    "liveRoverZone"
  ).textContent =
    data.zone;


  document.getElementById(
    "liveRoverBattery"
  ).textContent =
    `${Math.round(data.battery)}%`;


  document.getElementById(
    "liveRoverSpeed"
  ).textContent =
    `${data.speed.toFixed(1)} m/s`;


  document.getElementById(
    "liveRoverStatus"
  ).textContent =
    data.roverStatus;


  document.getElementById(
    "liveRoverLastPacket"
  ).textContent =
    formatTimestamp(
      new Date()
    );

}


/* =========================================================
   TELEMETRY RAW CONSOLE
========================================================= */

function addTelemetryConsoleLine(
  packet
) {

  const consoleBox =
    document.getElementById(
      "telemetryConsole"
    );


  const empty =
    consoleBox.querySelector(
      ".console-empty"
    );


  if (empty) {

    empty.remove();

  }


  const line =
    document.createElement(
      "div"
    );


  line.className =
    "telemetry-console-line";


  const time =
    new Date()
      .toLocaleTimeString();


  const timeElement =
    document.createElement(
      "span"
    );


  timeElement.className =
    "telemetry-console-time";


  timeElement.textContent =
    time;


  line.appendChild(
    timeElement
  );


  line.appendChild(
    document.createTextNode(
      packet
    )
  );


  consoleBox.appendChild(
    line
  );


  while (
    consoleBox.children.length >
    200
  ) {

    consoleBox.removeChild(
      consoleBox.firstChild
    );

  }


  consoleBox.scrollTop =
    consoleBox.scrollHeight;

}


document.getElementById(
  "clearTelemetryConsole"
).onclick =
  () => {

    document.getElementById(
      "telemetryConsole"
    ).innerHTML =
      `
        <div class="console-empty">
          Waiting for rover packets...
        </div>
      `;

  };


/* =========================================================
   DATA AGE
========================================================= */

function updateTimestampDisplay() {

  document.getElementById(
    "sensorTimestamp"
  ).textContent =
    lastSensorUpdate
      ? formatTimestamp(
          lastSensorUpdate
        )
      : "No data received";

}


function updateDataAges() {

  if (
    !lastRoverPacketAt
  ) {

    return;

  }


  const age =
    (
      Date.now() -
      lastRoverPacketAt.getTime()
    ) / 1000;


  document.getElementById(
    "telemetryDataAge"
  ).textContent =
    `${age.toFixed(1)} sec`;


  document.getElementById(
    "sensorDataAge"
  ).textContent =
    age < 60
      ? `${Math.floor(age)} sec ago`
      : `${Math.floor(age / 60)} min ago`;

}


setInterval(
  updateDataAges,
  500
);


/* =========================================================
   ROVER ONLINE STATUS
========================================================= */

function setRoverOnline(
  online
) {

  const dot =
    document.getElementById(
      "roverStatusDot"
    );


  const text =
    document.getElementById(
      "roverStatusText"
    );


  const side =
    document.getElementById(
      "sideRoverStatus"
    );


  if (online) {

    dot.classList.remove(
      "disconnected-dot"
    );


    dot.classList.add(
      "connected-dot"
    );


    text.textContent =
      "Connected";


    side.textContent =
      "Connected";


    side.className =
      "ok";

  }

  else {

    dot.classList.remove(
      "connected-dot"
    );


    dot.classList.add(
      "disconnected-dot"
    );


    text.textContent =
      "No Signal";


    side.textContent =
      "No Signal";


    side.className =
      "";

  }

}


setInterval(
  () => {

    if (
      !lastRoverPacketAt
    ) {

      return;

    }


    const age =
      Date.now() -
      lastRoverPacketAt.getTime();


    if (
      age > 5000
    ) {

      setRoverOnline(
        false
      );


      document.getElementById(
        "telemetryStatusText"
      ).textContent =
        "Telemetry Lost";


      const dot =
        document.getElementById(
          "telemetryStatusDot"
        );


      dot.classList.remove(
        "connected-dot"
      );


      dot.classList.add(
        "disconnected-dot"
      );

    }

  },
  1000
);


/* =========================================================
   CAMERA
========================================================= */

function setCameraStream(
  url
) {

  cameraStreamUrl =
    url;


  const smallCamera =
    document.getElementById(
      "roverCamera"
    );


  const largeCamera =
    document.getElementById(
      "largeRoverCamera"
    );


  if (!url) {

    setCameraOffline();

    return;

  }


  smallCamera.src =
    url;


  largeCamera.src =
    url;


  smallCamera.style.display =
    "block";


  largeCamera.style.display =
    "block";


  document.getElementById(
    "cameraPlaceholder"
  ).style.display =
    "none";


  document.getElementById(
    "largeCameraPlaceholder"
  ).style.display =
    "none";


  document.getElementById(
    "cameraStatusText"
  ).textContent =
    "Live";


  document.getElementById(
    "cameraConnection"
  ).textContent =
    "Connected";


  document.getElementById(
    "cameraStreamStatus"
  ).textContent =
    "Streaming";


  document.getElementById(
    "cameraLiveLabel"
  ).textContent =
    "● LIVE";


  document.getElementById(
    "largeCameraStatus"
  ).textContent =
    "Live";


  const dot =
    document.getElementById(
      "cameraStatusDot"
    );


  dot.classList.remove(
    "disconnected-dot"
  );


  dot.classList.add(
    "connected-dot"
  );

}


function setCameraOffline() {

  document.getElementById(
    "roverCamera"
  ).style.display =
    "none";


  document.getElementById(
    "largeRoverCamera"
  ).style.display =
    "none";


  document.getElementById(
    "cameraPlaceholder"
  ).style.display =
    "flex";


  document.getElementById(
    "largeCameraPlaceholder"
  ).style.display =
    "flex";


  document.getElementById(
    "cameraStatusText"
  ).textContent =
    "Offline";


  document.getElementById(
    "cameraConnection"
  ).textContent =
    "Disconnected";


  document.getElementById(
    "cameraStreamStatus"
  ).textContent =
    "Waiting";


  document.getElementById(
    "cameraLiveLabel"
  ).textContent =
    "● OFFLINE";


  document.getElementById(
    "largeCameraStatus"
  ).textContent =
    "Offline";


  const dot =
    document.getElementById(
      "cameraStatusDot"
    );


  dot.classList.remove(
    "connected-dot"
  );


  dot.classList.add(
    "disconnected-dot"
  );

}


/* =========================================================
   SENSOR HISTORY
========================================================= */

function saveTelemetrySample(
  data
) {

  const sample = {

    timestamp:
      new Date().toISOString(),

    zone:
      data.zone,

    nitrogen:
      data.nitrogen,

    phosphorus:
      data.phosphorus,

    potassium:
      data.potassium,

    moisture:
      data.moisture,

    temperature:
      data.temperature,

    humidity:
      data.humidity,

    ph:
      data.ph,

    latitude:
      data.latitude,

    longitude:
      data.longitude

  };


  sensorRows.unshift(
    sample
  );


  if (
    sensorRows.length >
    5000
  ) {

    sensorRows =
      sensorRows.slice(
        0,
        5000
      );

  }


  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      sensorRows
    )
  );


  populateZoneFilter();

  renderSensorHistory();


  document.getElementById(
    "historySampleCount"
  ).textContent =
    sensorRows.length;

}


function renderSensorHistory(
  rows = sensorRows
) {

  const tbody =
    document.getElementById(
      "sensorHistory"
    );


  if (
    !rows.length
  ) {

    tbody.innerHTML =
      `
      <tr>
        <td colspan="10">
          No sensor data available.
        </td>
      </tr>
      `;


    document.getElementById(
      "historySummary"
    ).textContent =
      "No stored samples";


    return;

  }


  tbody.innerHTML =
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
              ${sample.nitrogen}
            </td>

            <td>
              ${sample.phosphorus}
            </td>

            <td>
              ${sample.potassium}
            </td>

            <td>
              ${sample.moisture}%
            </td>

            <td>
              ${sample.temperature} °C
            </td>

            <td>
              ${sample.humidity}%
            </td>

            <td>
              ${sample.ph}
            </td>

            <td>
              <button
                class="btn small history-view"
                data-time="${sample.timestamp}"
              >
                View
              </button>
            </td>
          </tr>
          `
      )
      .join("");


  document.getElementById(
    "historySummary"
  ).textContent =
    `Showing ${rows.length} of ${sensorRows.length} samples`;


  document
    .querySelectorAll(
      ".history-view"
    )
    .forEach(
      button => {

        button.onclick =
          () =>
            viewHistorySample(
              button.dataset.time
            );

      }
    );

}


function viewHistorySample(
  timestamp
) {

  const sample =
    sensorRows.find(
      row =>
        row.timestamp ===
        timestamp
    );


  if (!sample)
    return;


  navigate(
    "telemetry"
  );


  document.getElementById(
    "telemetryN"
  ).textContent =
    sample.nitrogen;


  document.getElementById(
    "telemetryP"
  ).textContent =
    sample.phosphorus;


  document.getElementById(
    "telemetryK"
  ).textContent =
    sample.potassium;


  document.getElementById(
    "telemetryMoisture"
  ).textContent =
    sample.moisture;


  document.getElementById(
    "telemetryTemperature"
  ).textContent =
    sample.temperature;


  document.getElementById(
    "telemetryHumidity"
  ).textContent =
    sample.humidity;


  document.getElementById(
    "telemetryPh"
  ).textContent =
    sample.ph;


  document.getElementById(
    "telemetryGps"
  ).textContent =
    `${sample.latitude}, ${sample.longitude}`;


  document.getElementById(
    "telemetryLastPacket"
  ).textContent =
    formatTimestamp(
      sample.timestamp
    );


  document.getElementById(
    "telemetryDataAge"
  ).textContent =
    "Historical";


  toast(
    `Viewing ${sample.zone} historical sample`
  );

}


function populateZoneFilter() {

  const select =
    document.getElementById(
      "historyZone"
    );


  const zones =
    [
      ...new Set(
        sensorRows.map(
          row => row.zone
        )
      )
    ].sort();


  select.innerHTML =
    `
      <option value="all">
        All zones
      </option>
    ` +
    zones
      .map(
        zone =>
          `
            <option value="${zone}">
              ${zone}
            </option>
          `
      )
      .join("");

}


function filterHistory() {

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
      row => {

        const date =
          new Date(
            row.timestamp
          );


        const afterFrom =
          !from ||
          date >=
            new Date(
              `${from}T00:00:00`
            );


        const beforeTo =
          !to ||
          date <=
            new Date(
              `${to}T23:59:59`
            );


        const zoneMatch =
          zone === "all" ||
          row.zone === zone;


        return (
          afterFrom &&
          beforeTo &&
          zoneMatch
        );

      }
    );


  renderSensorHistory(
    filtered
  );

}


document.getElementById(
  "filterHistory"
).onclick =
  filterHistory;


document.getElementById(
  "resetHistoryFilter"
).onclick =
  () => {

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

  };


function exportHistoryCsv() {

  const header =
    [
      "Timestamp",
      "Zone",
      "Nitrogen",
      "Phosphorus",
      "Potassium",
      "Moisture",
      "Temperature",
      "Humidity",
      "pH",
      "Latitude",
      "Longitude"
    ];


  const rows =
    sensorRows.map(
      row =>
        [
          row.timestamp,
          row.zone,

          row.nitrogen,
          row.phosphorus,
          row.potassium,

          row.moisture,
          row.temperature,
          row.humidity,

          row.ph,

          row.latitude,
          row.longitude
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
        type:
          "text/csv"
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
    "agrirover-telemetry.csv";


  link.click();


  URL.revokeObjectURL(
    link.href
  );

}


document.getElementById(
  "exportHistoryCsv"
).onclick =
  exportHistoryCsv;


/* =========================================================
   HEATMAP
========================================================= */

function getHeatmapColor(
  nutrient,
  value
) {

  if (
    value === undefined ||
    value === null
  ) {

    return "#263544";

  }


  const limits = {

    n:
      [20, 35, 50, 70],

    p:
      [10, 18, 30, 45],

    k:
      [70, 100, 150, 200]

  };


  const range =
    limits[nutrient];


  if (
    value < range[0]
  ) {

    return "#2366dc";

  }


  if (
    value < range[1]
  ) {

    return "#27a8d8";

  }


  if (
    value < range[2]
  ) {

    return "#45c96b";

  }


  if (
    value < range[3]
  ) {

    return "#efd83a";

  }


  return "#ef4d3f";

}


function renderHeatmap(
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
    `repeat(${state.cols},1fr)`;


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
        `${zone}: No data`;

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


      cell.title =
        `${zone}: ${selectedHeatmapNutrient.toUpperCase()} = ${value}`;

    }


    container.appendChild(
      cell
    );

  }

}


function renderRealHeatmaps() {

  renderHeatmap(
    "heatmap"
  );


  renderHeatmap(
    "largeHeatmap"
  );

}


document.getElementById(
  "heatmapType"
).onchange =
  event => {

    selectedHeatmapNutrient =
      event.target.value;


    document.getElementById(
      "largeHeatmapType"
    ).value =
      event.target.value;


    renderRealHeatmaps();

  };


document.getElementById(
  "largeHeatmapType"
).onchange =
  event => {

    selectedHeatmapNutrient =
      event.target.value;


    document.getElementById(
      "heatmapType"
    ).value =
      event.target.value;


    renderRealHeatmaps();

  };


/* =========================================================
   CROP RECOMMENDATION
========================================================= */

const cropProfiles =
  [

    {
      name: "Rice",
      emoji: "🌾",
      base: 82
    },

    {
      name: "Maize",
      emoji: "🌽",
      base: 75
    },

    {
      name: "Wheat",
      emoji: "🌿",
      base: 65
    },

    {
      name: "Mustard",
      emoji: "🌼",
      base: 55
    }

  ];


function updateRecommendationInputs(
  data
) {

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


  document.getElementById(
    "recMoisture"
  ).value =
    data.moisture;


  document.getElementById(
    "recTemp"
  ).value =
    data.temperature;


  document.getElementById(
    "recHumidity"
  ).value =
    data.humidity;


  document.getElementById(
    "recPh"
  ).value =
    data.ph;

}


function runCropRecommendation() {

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


  const temp =
    Number(
      document.getElementById(
        "recTemp"
      ).value
    );


  const ph =
    Number(
      document.getElementById(
        "recPh"
      ).value
    );


  const results =
    cropProfiles
      .map(
        crop => {

          let score =
            crop.base;


          if (
            crop.name === "Rice"
          ) {

            score +=
              moisture >= 60
                ? 8
                : -10;


            score +=
              temp >= 25
                ? 4
                : -4;

          }


          if (
            crop.name === "Maize"
          ) {

            score +=
              n >= 35
                ? 5
                : -5;


            score +=
              moisture >= 45 &&
              moisture <= 70
                ? 5
                : -4;

          }


          if (
            crop.name === "Wheat"
          ) {

            score +=
              temp < 25
                ? 8
                : -7;

          }


          if (
            ph < 5.5 ||
            ph > 7.5
          ) {

            score -= 8;

          }


          if (
            p < 15
          ) {

            score -= 4;

          }


          score =
            Math.max(
              10,
              Math.min(
                98,
                Math.round(score)
              )
            );


          return {
            ...crop,
            score
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
    results
      .map(
        (crop, index) =>
          `
          <article class="result-card">

            <header>

              <strong>
                ${crop.emoji}
                ${crop.name}
              </strong>

              <span class="badge ${index === 0 ? "green" : "blue"}">
                ${crop.score}%
              </span>

            </header>

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
    results[0].name;


  document.getElementById(
    "cropScore"
  ).textContent =
    `${results[0].score}%`;


  document.getElementById(
    "cropReason"
  ).textContent =
    "Recommendation generated from current soil and environmental measurements.";

}


document.getElementById(
  "runCropModel"
).onclick =
  runCropRecommendation;


document.getElementById(
  "generateRecommendation"
).onclick =
  () => {

    navigate(
      "crop"
    );


    runCropRecommendation();

  };


/* =========================================================
   PRESCRIPTION
========================================================= */

function buildPrescriptions() {

  prescriptions = [];


  for (
    let i = 1;
    i <= state.totalZones;
    i++
  ) {

    const zone =
      `Z-${String(i).padStart(2, "0")}`;


    const data =
      liveZoneData.get(
        zone
      );


    if (!data) {

      continue;

    }


    const targetN =
      45;


    const targetP =
      25;


    const targetK =
      120;


    prescriptions.push(
      {

        zone,

        n:
          data.n,

        p:
          data.p,

        k:
          data.k,

        rn:
          Math.max(
            0,
            Math.round(
              targetN -
              data.n
            )
          ),

        rp:
          Math.max(
            0,
            Math.round(
              targetP -
              data.p
            )
          ),

        rk:
          Math.max(
            0,
            Math.round(
              targetK -
              data.k
            )
          ),

        time:
          15,

        status:
          "Pending"

      }
    );

  }


  renderPrescription();

}


function renderPrescription() {

  const dashboard =
    document.getElementById(
      "prescriptionBody"
    );


  const full =
    document.getElementById(
      "prescriptionBody2"
    );


  if (
    prescriptions.length === 0
  ) {

    dashboard.innerHTML =
      `
      <tr>
        <td colspan="8">
          Waiting for soil measurements.
        </td>
      </tr>
      `;


    full.innerHTML =
      `
      <tr>
        <td colspan="9">
          Waiting for soil measurements.
        </td>
      </tr>
      `;


    return;

  }


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
              <span class="badge amber">
                ${row.status}
              </span>
            </td>
          </tr>
          `
      )
      .join("");


  full.innerHTML =
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
              <span class="badge amber">
                ${row.status}
              </span>
            </td>
          </tr>
          `
      )
      .join("");

}


document.getElementById(
  "approvePrescription"
).onclick =
  () => {

    buildPrescriptions();


    toast(
      "Prescription generated"
    );

  };


document.getElementById(
  "approvePrescription2"
).onclick =
  () => {

    buildPrescriptions();


    toast(
      "Prescription generated"
    );

  };


document.getElementById(
  "exportCsv"
).onclick =
  () => {

    buildPrescriptions();


    const header =
      [
        "Zone",
        "N",
        "P",
        "K",
        "Required N",
        "Required P",
        "Required K"
      ];


    const csv =
      [
        header,

        ...prescriptions.map(
          row =>
            [
              row.zone,
              row.n,
              row.p,
              row.k,
              row.rn,
              row.rp,
              row.rk
            ]
        )

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
          type:
            "text/csv"
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

  };


/* =========================================================
   MISSION COMMANDS
========================================================= */

document.getElementById(
  "startMission"
).onclick =
  async () => {

    const sent =
      await sendBaseCommand(
        "ROVER,START"
      );


    if (sent) {

      document.getElementById(
        "missionStatus"
      ).textContent =
        "Starting...";

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

      }

    }

  };


async function takeSample() {

  await sendBaseCommand(
    "ROVER,SAMPLE"
  );

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
   EMERGENCY STOP
========================================================= */

document.getElementById(
  "emergencyBtn"
).onclick =
  async () => {

    await sendBaseCommand(
      "ROVER,ESTOP"
    );


    await sendBaseCommand(
      "FERT,ALL_OFF"
    );


    state.emergency =
      true;


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


    toast(
      "Emergency stop sent"
    );

  };


/* =========================================================
   MANUAL ROVER
========================================================= */

const roverCommandMap =
  {
    Forward: "FWD",
    Backward: "BACK",
    Left: "LEFT",
    Right: "RIGHT",
    Stop: "STOP"
  };


document
  .querySelectorAll(
    ".dpad button"
  )
  .forEach(
    button => {

      button.onclick =
        async () => {

          const speed =
            document.getElementById(
              "manualSpeed"
            ).value;


          const command =
            roverCommandMap[
              button.dataset.command
            ];


          const packet =
            command === "STOP"
              ? "ROVER,STOP"
              : `ROVER,${command},${speed}`;


          const sent =
            await sendBaseCommand(
              packet
            );


          if (sent) {

            document.getElementById(
              "manualCommand"
            ).textContent =
              `Sent: ${packet}`;

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
  () =>
    sendBaseCommand(
      "ROVER,STOP"
    );


/* =========================================================
   FERTILIZER
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


          const open =
            button.classList.contains(
              "on"
            );


          const action =
            open
              ? "CLOSE"
              : "OPEN";


          await sendBaseCommand(
            `FERT,${valve},${action}`
          );

        };

    }
  );


document.getElementById(
  "startSpray"
).onclick =
  async () => {

    await sendBaseCommand(
      "FERT,PUMP,ON"
    );


    document.getElementById(
      "pumpStatus"
    ).textContent =
      "Starting...";

  };


document.getElementById(
  "pauseSpray"
).onclick =
  async () => {

    await sendBaseCommand(
      "FERT,PUMP,OFF"
    );

  };


document.getElementById(
  "stopSpray"
).onclick =
  async () => {

    await sendBaseCommand(
      "FERT,ALL_OFF"
    );

  };


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


  if (
    device === "PUMP"
  ) {

    const stateText =
      action === "ON"
        ? "Running"
        : "OFF";


    document.getElementById(
      "pumpStatus"
    ).textContent =
      stateText;


    document.getElementById(
      "sprinklerPumpState"
    ).textContent =
      stateText;


    return;

  }


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


          if (label) {

            label.textContent =
              "CLOSED";

          }

        }
      );


    document.getElementById(
      "pumpStatus"
    ).textContent =
      "OFF";


    document.getElementById(
      "sprinklerPumpState"
    ).textContent =
      "OFF";


    return;

  }


  updateValveUi(
    device,
    action === "OPEN"
  );

}


function updateValveUi(
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


          if (label) {

            label.textContent =
              "OPEN";

          }

        }

        else {

          button.classList.remove(
            "on"
          );


          if (label) {

            label.textContent =
              "CLOSED";

          }

        }

      }
    );

}


function processBaseStatus(
  parts
) {

  if (
    parts[0] === "FERT" &&
    parts[1] === "PROGRESS"
  ) {

    const progress =
      Number(
        parts[2]
      );


    state.sprayProgress =
      progress;


    document.getElementById(
      "sprayProgress"
    ).textContent =
      `${progress}%`;


    document.getElementById(
      "sprinklerProgress"
    ).textContent =
      `${progress}%`;


    document.getElementById(
      "sprayBar"
    ).style.width =
      `${progress}%`;

  }

}


/* =========================================================
   FIELD SETUP
========================================================= */

document.getElementById(
  "generateGrid"
).onclick =
  () => {

    state.rows =
      Number(
        document.getElementById(
          "fieldRows"
        ).value
      );


    state.cols =
      Number(
        document.getElementById(
          "fieldCols"
        ).value
      );


    state.totalZones =
      state.rows *
      state.cols;


    renderRealHeatmaps();


    toast(
      `Field updated to ${state.rows} × ${state.cols}`
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
   ALERTS
========================================================= */

function addAlert(
  type,
  title,
  detail
) {

  const icons =
    {
      success: "✓",
      warning: "⚠",
      info: "ℹ",
      error: "✕"
    };


  systemAlerts.unshift(
    {
      type,
      icon:
        icons[type] || "ℹ",

      title,
      detail,

      time:
        new Date()
          .toLocaleTimeString()
    }
  );


  if (
    systemAlerts.length >
    100
  ) {

    systemAlerts =
      systemAlerts.slice(
        0,
        100
      );

  }


  renderAlerts();

}


function renderAlerts() {

  const container =
    document.getElementById(
      "allAlerts"
    );


  if (
    systemAlerts.length === 0
  ) {

    container.innerHTML =
      `
      <article class="alert info">
        <span>ℹ</span>

        <div>
          <strong>No events</strong>
          <small>Waiting for system activity.</small>
        </div>

        <time>--</time>
      </article>
      `;

    return;

  }


  container.innerHTML =
    systemAlerts
      .map(
        alert =>
          `
          <article class="alert ${alert.type}">

            <span>
              ${alert.icon}
            </span>

            <div>
              <strong>
                ${alert.title}
              </strong>

              <small>
                ${alert.detail}
              </small>
            </div>

            <time>
              ${alert.time}
            </time>

          </article>
          `
      )
      .join("");

}


document.getElementById(
  "clearAlerts"
).onclick =
  () => {

    systemAlerts =
      [];


    renderAlerts();

  };


/* =========================================================
   INITIALIZATION
========================================================= */

populateZoneFilter();

renderSensorHistory();

renderRealHeatmaps();

renderPrescription();

renderAlerts();

updateTimestampDisplay();

updateBaseStationStatus(
  false
);

setRoverOnline(
  false
);

setCameraOffline();

document.getElementById(
  "historySampleCount"
).textContent =
  sensorRows.length;
