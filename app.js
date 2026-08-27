/* =========================================================
   AGRIROVER GUI V14

   MAIN FIX:
   Accepts both:
   Data: 1,2,3,...
   Data : 1,2,3,...

   TELEMETRY — 18 FIELDS

   0  PACKET_NUMBER
   1  LATITUDE
   2  LONGITUDE
   3  TEMPERATURE
   4  HUMIDITY
   5  NITROGEN
   6  PHOSPHORUS
   7  POTASSIUM
   8  REQUIRED_N
   9  REQUIRED_P
   10 REQUIRED_K
   11 ROLL
   12 PITCH
   13 YAW
   14 ACC_X
   15 ACC_Y
   16 ACC_Z
   17 BATTERY_PERCENT
========================================================= */


/* =========================================================
   BARC CROP OPTIMUM DATA
========================================================= */

const CROP_DATA = [

  {
    key: "LENTIL",
    name: "Lentil",
    bangla: "মসুর",
    type: "Pulse",
    n: 7,
    p: 6,
    k: 7,
    condition:
      "All fertilizers basal during final land preparation."
  },

  {
    key: "CHICKPEA",
    name: "Chickpea",
    bangla: "ছোলা",
    type: "Pulse",
    n: 9,
    p: 6,
    k: 8,
    condition:
      "All fertilizers basal during final land preparation."
  },

  {
    key: "MUNGBEAN",
    name: "Mungbean",
    bangla: "মুগ",
    type: "Pulse",
    n: 6,
    p: 6,
    k: 8,
    condition:
      "All fertilizers basal during final land preparation."
  },

  {
    key: "BLACKGRAM",
    name: "Blackgram",
    bangla: "মাষকলাই",
    type: "Pulse",
    n: 6,
    p: 5,
    k: 6,
    condition:
      "All fertilizers basal during final land preparation."
  },

  {
    key: "GRASSPEA",
    name: "Grasspea",
    bangla: "খেসারি",
    type: "Pulse",
    n: 5,
    p: 5,
    k: 6,
    condition:
      "With tillage: fertilizers applied basally during final land preparation."
  },

  {
    key: "COWPEA",
    name: "Cowpea",
    bangla: "কাউপিয়া / ফেলন",
    type: "Pulse",
    n: 5,
    p: 5,
    k: 6,
    condition:
      "All fertilizers basal during final land preparation."
  },

  {
    key: "FOXTAIL_MILLET",
    name: "Foxtail Millet",
    bangla: "কাউন",
    type: "Cereal",
    n: 20,
    p: 8,
    k: 14,
    condition:
      "Rainfed cultivation: fertilizers applied during final land preparation."
  },

  {
    key: "MUSTARD",
    name: "Mustard",
    bangla: "সরিষা",
    type: "Oilseed",
    n: 40,
    p: 12,
    k: 30,
    condition:
      "Rainfed condition."
  },

  {
    key: "SESAME",
    name: "Sesame",
    bangla: "তিল",
    type: "Oilseed",
    n: 25,
    p: 10,
    k: 20,
    condition:
      "Rainfed condition: fertilizers basal during final land preparation."
  },

  {
    key: "GROUNDNUT",
    name: "Groundnut",
    bangla: "চিনাবাদাম",
    type: "Oilseed / Legume",
    n: 12,
    p: 12,
    k: 15,
    condition:
      "Rainfed condition: fertilizers basal during final land preparation."
  },

  {
    key: "SOYBEAN",
    name: "Soybean",
    bangla: "সয়াবিন",
    type: "Oilseed / Legume",
    n: 9,
    p: 12,
    k: 20,
    condition:
      "All fertilizers basal during final land preparation."
  },

  {
    key: "SAFFLOWER",
    name: "Safflower",
    bangla: "কুসুম",
    type: "Oilseed",
    n: 25,
    p: 10,
    k: 20,
    condition:
      "Rainfed condition: fertilizers basal during final land preparation."
  },

  {
    key: "LINSEED",
    name: "Linseed",
    bangla: "তিসি",
    type: "Oilseed",
    n: 15,
    p: 5,
    k: 8,
    condition:
      "Rainfed condition: fertilizers basal during final land preparation."
  },

  {
    key: "NIGER",
    name: "Niger",
    bangla: "রামতিল",
    type: "Oilseed",
    n: 25,
    p: 10,
    k: 20,
    condition:
      "Rainfed condition: fertilizers basal during final land preparation."
  }

];


/* =========================================================
   STATE
========================================================= */

const state = {

  paused: false,

  emergency: false,

  selectedCrop: null,

  cropSent: false,

  samplingState:
    "NOT_STARTED",

  fertilizationState:
    "WAITING",

  battery: 0,

  fieldAreaHa:
    Number(
      localStorage.getItem(
        "agriroverFieldAreaHa"
      ) || 0
    ),

  fieldName:
    localStorage.getItem(
      "agriroverFieldName"
    ) ||
    "BRAC Test Field"

};


/* =========================================================
   SERIAL
========================================================= */

let serialPort =
  null;

let serialReader =
  null;

let serialBuffer =
  "";

let baseStationConnected =
  false;


/* =========================================================
   TELEMETRY
========================================================= */

let latestTelemetry =
  null;

let lastRoverPacketAt =
  null;

let lastSensorUpdate =
  null;


/* =========================================================
   MAP
========================================================= */

let roverMap =
  null;

let largeRoverMap =
  null;

let roverMarker =
  null;

let largeRoverMarker =
  null;

let roverTrackLine =
  null;

let largeRoverTrackLine =
  null;

let roverGpsHistory =
  [];

let mapHasCenteredOnce =
  false;


/* =========================================================
   HEATMAP
========================================================= */

let deficiencyNutrient =
  "n";

let heatmapFinalized =
  false;

let missionSamples =
  [];

let samplePackets =
  new Set();


/* =========================================================
   HISTORY / ALERTS
========================================================= */

const HISTORY_KEY =
  "agriroverTelemetryV14";


let sensorRows =
  loadHistory();


let systemAlerts =
  [];


/* =========================================================
   HELPERS
========================================================= */

function el(id) {

  return document.getElementById(
    id
  );

}


function setText(
  id,
  value
) {

  const element =
    el(id);


  if (
    element
  ) {

    element.textContent =
      value;

  }

}


function clamp(
  value,
  min,
  max
) {

  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );

}


function validGps(
  latitude,
  longitude
) {

  return (
    Number.isFinite(
      latitude
    ) &&
    Number.isFinite(
      longitude
    ) &&
    latitude !== 0 &&
    longitude !== 0 &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
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

      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",

      second:
        "2-digit",

      hour12:
        true

    }
  );

}


function toast(
  message
) {

  const box =
    el(
      "toast"
    );


  if (
    !box
  )
    return;


  box.textContent =
    message;


  box.classList.add(
    "show"
  );


  clearTimeout(
    box.timer
  );


  box.timer =
    setTimeout(
      () => {

        box.classList.remove(
          "show"
        );

      },
      2600
    );

}


function cropByKey(
  key
) {

  return CROP_DATA.find(
    crop =>
      crop.key === key
  ) || null;

}


/* =========================================================
   CLOCK
========================================================= */

function updateClock() {

  setText(
    "clockText",
    new Date()
      .toLocaleString()
  );

}


setInterval(
  updateClock,
  1000
);


updateClock();


/* =========================================================
   NAVIGATION
========================================================= */

function navigate(
  pageId
) {

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
      button => {

        button.classList.remove(
          "active"
        );

      }
    );


  el(pageId)
    ?.classList
    .add(
      "active"
    );


  document
    .querySelector(
      `.nav-item[data-page="${pageId}"]`
    )
    ?.classList
    .add(
      "active"
    );


  el(
    "sidebar"
  )
    ?.classList
    .remove(
      "open"
    );


  setTimeout(
    () => {

      if (
        pageId ===
        "dashboard"
      ) {

        roverMap
          ?.invalidateSize();


        renderDeficiencyHeatmaps();

      }


      if (
        pageId ===
        "liveRover"
      ) {

        largeRoverMap
          ?.invalidateSize();

      }


      if (
        pageId ===
        "deficiency"
      ) {

        renderDeficiencyHeatmaps();

      }

    },
    120
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


el(
  "menuBtn"
)
  ?.addEventListener(
    "click",
    () => {

      el(
        "sidebar"
      )
        ?.classList
        .toggle(
          "open"
        );

    }
  );


/* =========================================================
   BASE STATION CONNECTION
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
      "Web Serial is not supported. Use desktop Chrome or Microsoft Edge."
    );


    return;

  }


  try {

    serialPort =
      await navigator
        .serial
        .requestPort();


    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          300
        )
    );


    await serialPort.open({

      baudRate:
        115200,

      dataBits:
        8,

      stopBits:
        1,

      parity:
        "none",

      flowControl:
        "none"

    });


    baseStationConnected =
      true;


    updateBaseStatus(
      true
    );


    addAlert(
      "success",
      "Base station connected",
      "USB serial communication established."
    );


    toast(
      "Base Station connected"
    );


    readSerialLoop();

  }

  catch (error) {

    console.error(
      error
    );


    baseStationConnected =
      false;


    updateBaseStatus(
      false
    );


    toast(
      `Connection failed: ${
        error.message ||
        error.name
      }`
    );

  }

}


async function disconnectBaseStation() {

  try {

    if (
      serialReader
    ) {

      await serialReader.cancel();

    }

  }

  catch (error) {

    console.log(
      error
    );

  }


  serialReader =
    null;


  try {

    if (
      serialPort
    ) {

      await serialPort.close();

    }

  }

  catch (error) {

    console.log(
      error
    );

  }


  serialPort =
    null;


  baseStationConnected =
    false;


  updateBaseStatus(
    false
  );

}


function updateBaseStatus(
  connected
) {

  const dot =
    el(
      "baseStatusDot"
    );


  const button =
    el(
      "connectBaseStation"
    );


  dot
    ?.classList
    .toggle(
      "connected-dot",
      connected
    );


  dot
    ?.classList
    .toggle(
      "disconnected-dot",
      !connected
    );


  setText(
    "baseStatusText",
    connected
      ? "Connected"
      : "Disconnected"
  );


  if (
    button
  ) {

    button.textContent =
      connected
        ? "✓ Connected"
        : "🔌 Connect";


    button.classList.toggle(
      "connected",
      connected
    );

  }

}


el(
  "connectBaseStation"
)
  ?.addEventListener(
    "click",
    connectBaseStation
  );


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
        serialPort
          .readable
          .getReader();


      try {

        while (true) {

          const {
            value,
            done
          } =
            await serialReader.read();


          if (
            done
          )
            break;


          if (
            !value
          )
            continue;


          serialBuffer +=
            decoder.decode(
              value,
              {
                stream:
                  true
              }
            );


          const lines =
            serialBuffer.split(
              /\r?\n/
            );


          serialBuffer =
            lines.pop();


          for (
            const rawLine
            of lines
          ) {

            const line =
              rawLine.trim();


            if (
              !line
            )
              continue;


            addTelemetryConsoleLine(
              line
            );


            processSerialLine(
              line
            );

          }

        }

      }

      finally {

        serialReader
          ?.releaseLock();


        serialReader =
          null;

      }

    }

  }

  catch (error) {

    console.error(
      "Serial error:",
      error
    );


    addAlert(
      "warning",
      "Serial communication stopped",
      error.message ||
      "Unknown serial error"
    );

  }

}


/* =========================================================
   SERIAL LINE PROCESSOR
========================================================= */

function processSerialLine(
  line
) {

  line =
    line.trim();


  /* =====================================================
     EVENT STRINGS
  ===================================================== */

  if (
    line ===
      "ROVER,SAMPLING_STARTED" ||
    line ===
      "SAMPLING_STARTED"
  ) {

    handleSamplingStarted();

    return;

  }


  if (
    line ===
      "ROVER,SAMPLING_DONE" ||
    line ===
      "SAMPLING_DONE"
  ) {

    handleSamplingDone();

    return;

  }


  if (
    line ===
      "ROVER,FERTILIZING" ||
    line ===
      "FERTILIZING"
  ) {

    setFertilizationState(
      "FERTILIZING"
    );


    return;

  }


  if (
    line ===
      "ROVER,MISSION_DONE" ||
    line ===
      "MISSION_DONE"
  ) {

    handleMissionDone();

    return;

  }


  if (
    line.startsWith(
      "ROVER,CROP_ACK,"
    )
  ) {

    const parts =
      line.split(",");


    handleCropAck(
      parts[2]
    );


    return;

  }


  /* =====================================================
     TELEMETRY

     Accept:
     Data:
     Data :
     DATA:
     DATA :
  ===================================================== */

  if (
    /^data\s*:/i.test(
      line
    )
  ) {

    const telemetry =
      parseTelemetry(
        line
      );


    if (
      telemetry
    ) {

      processTelemetry(
        telemetry
      );

    }


    return;

  }


  /* =====================================================
     RAW CSV
  ===================================================== */

  if (
    line.includes(",")
  ) {

    const fields =
      line
        .split(",")
        .map(
          item =>
            item.trim()
        );


    if (
      fields.length ===
      18
    ) {

      const telemetry =
        parseTelemetry(
          line
        );


      if (
        telemetry
      ) {

        processTelemetry(
          telemetry
        );

      }


      return;

    }

  }


  /* =====================================================
     RSSI
  ===================================================== */

  if (
    /^rssi\s*:/i.test(
      line
    )
  ) {

    const match =
      line.match(
        /-?\d+(\.\d+)?/
      );


    if (
      match
    ) {

      setText(
        "telemetryRssi",
        `${match[0]} dBm`
      );

    }


    return;

  }


  /* =====================================================
     SNR
  ===================================================== */

  if (
    /^snr\s*:/i.test(
      line
    )
  ) {

    const match =
      line.match(
        /-?\d+(\.\d+)?/
      );


    if (
      match
    ) {

      setText(
        "telemetrySnr",
        `${match[0]} dB`
      );

    }

  }

}


/* =========================================================
   TELEMETRY PARSER
========================================================= */

function parseTelemetry(
  line
) {

  let clean =
    line.trim();


  /*
     Removes:
     Data:
     Data :
     DATA:
     DATA :
  */

  clean =
    clean.replace(
      /^data\s*:\s*/i,
      ""
    );


  const values =
    clean
      .split(",")
      .map(
        value =>
          value.trim()
      );


  console.log(
    "Telemetry raw:",
    clean
  );


  console.log(
    "Telemetry field count:",
    values.length
  );


  if (
    values.length !==
    18
  ) {

    console.error(
      `Telemetry rejected: expected 18 fields, received ${values.length}`
    );


    console.log(
      values
    );


    return null;

  }


  const data = {

    packetNumber:
      Number(
        values[0]
      ),

    latitude:
      Number(
        values[1]
      ),

    longitude:
      Number(
        values[2]
      ),

    temperature:
      Number(
        values[3]
      ),

    humidity:
      Number(
        values[4]
      ),

    nitrogen:
      Number(
        values[5]
      ),

    phosphorus:
      Number(
        values[6]
      ),

    potassium:
      Number(
        values[7]
      ),

    requiredN:
      Number(
        values[8]
      ),

    requiredP:
      Number(
        values[9]
      ),

    requiredK:
      Number(
        values[10]
      ),

    roll:
      Number(
        values[11]
      ),

    pitch:
      Number(
        values[12]
      ),

    yaw:
      Number(
        values[13]
      ),

    accX:
      Number(
        values[14]
      ),

    accY:
      Number(
        values[15]
      ),

    accZ:
      Number(
        values[16]
      ),

    battery:
      Number(
        values[17]
      ),

    timestamp:
      new Date()

  };


  const numericValues = [

    data.packetNumber,

    data.latitude,

    data.longitude,

    data.temperature,

    data.humidity,

    data.nitrogen,

    data.phosphorus,

    data.potassium,

    data.requiredN,

    data.requiredP,

    data.requiredK,

    data.roll,

    data.pitch,

    data.yaw,

    data.accX,

    data.accY,

    data.accZ,

    data.battery

  ];


  if (
    numericValues.some(
      value =>
        Number.isNaN(
          value
        )
    )
  ) {

    console.error(
      "Telemetry rejected: invalid numeric value"
    );


    console.log(
      data
    );


    return null;

  }


  console.log(
    "Telemetry parsed:",
    data
  );


  return data;

}


/* =========================================================
   PROCESS VALID TELEMETRY
========================================================= */

function processTelemetry(
  data
) {

  latestTelemetry =
    data;


  lastRoverPacketAt =
    new Date();


  lastSensorUpdate =
    lastRoverPacketAt;


  state.battery =
    clamp(
      data.battery,
      0,
      100
    );


  setRoverOnline(
    true
  );


  updateDashboard(
    data
  );


  updateLiveTelemetry(
    data
  );


  updateNpk(
    data
  );


  updateRoverLocation(
    data
  );


  saveTelemetrySample(
    data
  );


  updateTimestampDisplay();


  collectMissionSample(
    data
  );

}


/* =========================================================
   DASHBOARD
========================================================= */

function updateDashboard(
  data
) {

  setText(
    "batteryValue",
    `${Math.round(
      data.battery
    )}%`
  );


  setText(
    "sideBattery",
    `${Math.round(
      data.battery
    )}%`
  );


  if (
    el(
      "batteryBar"
    )
  ) {

    el(
      "batteryBar"
    ).style.width =
      `${clamp(
        data.battery,
        0,
        100
      )}%`;

  }


  if (
    el(
      "sideBatteryBar"
    )
  ) {

    el(
      "sideBatteryBar"
    ).style.width =
      `${clamp(
        data.battery,
        0,
        100
      )}%`;

  }


  setText(
    "dashboardPacket",
    data.packetNumber
  );


  setText(
    "reqN",
    data.requiredN
      .toFixed(1)
  );


  setText(
    "reqP",
    data.requiredP
      .toFixed(1)
  );


  setText(
    "reqK",
    data.requiredK
      .toFixed(1)
  );


  setText(
    "overviewState",
    "Live"
  );

}


/* =========================================================
   LIVE TELEMETRY UI
========================================================= */

function updateLiveTelemetry(
  data
) {

  setText(
    "telemetryLastPacket",
    formatTimestamp(
      data.timestamp
    )
  );


  setText(
    "telemetryPacketNumber",
    data.packetNumber
  );


  setText(
    "telemetryN",
    Math.round(
      data.nitrogen
    )
  );


  setText(
    "telemetryP",
    Math.round(
      data.phosphorus
    )
  );


  setText(
    "telemetryK",
    Math.round(
      data.potassium
    )
  );


  setText(
    "telemetryTemperature",
    data.temperature
      .toFixed(1)
  );


  setText(
    "telemetryHumidity",
    data.humidity
      .toFixed(1)
  );


  setText(
    "telemetryGps",
    `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`
  );


  setText(
    "telemetryBattery",
    `${Math.round(
      data.battery
    )}%`
  );


  setText(
    "telemetryReqN",
    data.requiredN
      .toFixed(2)
  );


  setText(
    "telemetryReqP",
    data.requiredP
      .toFixed(2)
  );


  setText(
    "telemetryReqK",
    data.requiredK
      .toFixed(2)
  );


  setText(
    "telemetryRoll",
    `${data.roll.toFixed(2)}°`
  );


  setText(
    "telemetryPitch",
    `${data.pitch.toFixed(2)}°`
  );


  setText(
    "telemetryYaw",
    `${data.yaw.toFixed(2)}°`
  );


  setText(
    "telemetryAccX",
    data.accX
      .toFixed(3)
  );


  setText(
    "telemetryAccY",
    data.accY
      .toFixed(3)
  );


  setText(
    "telemetryAccZ",
    data.accZ
      .toFixed(3)
  );


  setText(
    "telemetryStatusText",
    "Receiving telemetry"
  );


  const dot =
    el(
      "telemetryStatusDot"
    );


  dot
    ?.classList
    .remove(
      "disconnected-dot"
    );


  dot
    ?.classList
    .add(
      "connected-dot"
    );

}


/* =========================================================
   NPK
========================================================= */

function updateNpk(
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


  setText(
    "sensorStatusText",
    "Receiving rover data"
  );


  const dot =
    el(
      "sensorStatusDot"
    );


  dot
    ?.classList
    .remove(
      "disconnected-dot"
    );


  dot
    ?.classList
    .add(
      "connected-dot"
    );

}


function updateGauge(
  id,
  value,
  max
) {

  const element =
    el(id);


  if (
    !element
  )
    return;


  element.textContent =
    Math.round(
      value
    );


  const gauge =
    element.closest(
      ".gauge"
    );


  if (
    !gauge
  )
    return;


  gauge.style
    .setProperty(
      "--value",
      clamp(
        (
          value /
          max
        ) *
        100,
        0,
        100
      )
    );

}


/* =========================================================
   MAP INITIALIZATION
========================================================= */

function initializeMaps() {

  const initial = [
    23.7806,
    90.4071
  ];


  if (
    el(
      "roverLiveMap"
    ) &&
    !roverMap
  ) {

    roverMap =
      L.map(
        "roverLiveMap"
      )
      .setView(
        initial,
        16
      );


    addBaseTiles(
      roverMap
    );


    roverTrackLine =
      L.polyline(
        [],
        {
          weight:
            4,

          color:
            "#42a5ff"
        }
      )
      .addTo(
        roverMap
      );

  }


  if (
    el(
      "largeRoverMap"
    ) &&
    !largeRoverMap
  ) {

    largeRoverMap =
      L.map(
        "largeRoverMap"
      )
      .setView(
        initial,
        17
      );


    addBaseTiles(
      largeRoverMap
    );


    largeRoverTrackLine =
      L.polyline(
        [],
        {
          weight:
            4,

          color:
            "#42a5ff"
        }
      )
      .addTo(
        largeRoverMap
      );

  }

}


function addBaseTiles(
  map
) {

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom:
        20,

      attribution:
        "&copy; OpenStreetMap contributors"
    }
  )
  .addTo(
    map
  );

}


function createRoverIcon(
  yaw = 0
) {

  return L.divIcon({

    className:
      "",

    html:
      `
      <div
        class="rover-direction-marker"
        style="transform:rotate(${yaw}deg)"
      >
        ▲
      </div>
      `,

    iconSize:
      [42, 42],

    iconAnchor:
      [21, 21],

    popupAnchor:
      [0, -23]

  });

}


/* =========================================================
   LIVE ROVER LOCATION
========================================================= */

function updateRoverLocation(
  data
) {

  const latitude =
    Number(
      data.latitude
    );


  const longitude =
    Number(
      data.longitude
    );


  if (
    !validGps(
      latitude,
      longitude
    )
  ) {

    [
      "mapGpsStatus",
      "largeMapGpsStatus",
      "liveRoverGpsStatus",
      "dashboardGpsStatus",
      "telemetryGpsStatus"
    ]
    .forEach(
      id => {

        setText(
          id,
          "No GPS Fix"
        );

      }
    );


    return;

  }


  const position = [
    latitude,
    longitude
  ];


  const previous =
    roverGpsHistory[
      roverGpsHistory.length -
      1
    ];


  if (
    !previous ||
    previous[0] !==
      latitude ||
    previous[1] !==
      longitude
  ) {

    roverGpsHistory.push(
      position
    );

  }


  if (
    roverGpsHistory.length >
    1000
  ) {

    roverGpsHistory.shift();

  }


  if (
    roverMap
  ) {

    if (
      !roverMarker
    ) {

      roverMarker =
        L.marker(
          position,
          {
            icon:
              createRoverIcon(
                data.yaw
              )
          }
        )
        .addTo(
          roverMap
        );

    }

    else {

      roverMarker
        .setLatLng(
          position
        );


      roverMarker
        .setIcon(
          createRoverIcon(
            data.yaw
          )
        );

    }


    roverTrackLine
      ?.setLatLngs(
        roverGpsHistory
      );

  }


  if (
    largeRoverMap
  ) {

    if (
      !largeRoverMarker
    ) {

      largeRoverMarker =
        L.marker(
          position,
          {
            icon:
              createRoverIcon(
                data.yaw
              )
          }
        )
        .addTo(
          largeRoverMap
        );

    }

    else {

      largeRoverMarker
        .setLatLng(
          position
        );


      largeRoverMarker
        .setIcon(
          createRoverIcon(
            data.yaw
          )
        );

    }


    largeRoverTrackLine
      ?.setLatLngs(
        roverGpsHistory
      );

  }


  if (
    !mapHasCenteredOnce
  ) {

    roverMap
      ?.setView(
        position,
        18
      );


    largeRoverMap
      ?.setView(
        position,
        19
      );


    mapHasCenteredOnce =
      true;

  }


  setText(
    "mapLatitude",
    latitude
      .toFixed(6)
  );


  setText(
    "mapLongitude",
    longitude
      .toFixed(6)
  );


  setText(
    "mapHeading",
    `${data.yaw.toFixed(1)}°`
  );


  setText(
    "mapLastUpdate",
    new Date()
      .toLocaleTimeString()
  );


  setText(
    "liveRoverLatitude",
    latitude
      .toFixed(6)
  );


  setText(
    "liveRoverLongitude",
    longitude
      .toFixed(6)
  );


  setText(
    "liveRoverHeading",
    `${data.yaw.toFixed(1)}°`
  );


  setText(
    "liveRoverBattery",
    `${Math.round(
      data.battery
    )}%`
  );


  setText(
    "liveRoverPacket",
    data.packetNumber
  );


  setText(
    "liveRoverStatus",
    "ONLINE"
  );


  setText(
    "liveRoverLastPacket",
    formatTimestamp()
  );


  [
    "liveRoverGpsStatus",
    "mapGpsStatus",
    "largeMapGpsStatus",
    "dashboardGpsStatus",
    "telemetryGpsStatus"
  ]
  .forEach(
    id => {

      setText(
        id,
        "GPS Fix"
      );

    }
  );


  setText(
    "trackPointCount",
    `${roverGpsHistory.length} points`
  );


  [
    "mapGpsDot",
    "largeMapGpsDot"
  ]
  .forEach(
    id => {

      const dot =
        el(id);


      dot
        ?.classList
        .remove(
          "disconnected-dot"
        );


      dot
        ?.classList
        .add(
          "connected-dot"
        );

    }
  );

}


/* =========================================================
   CENTER MAP
========================================================= */

function centerOnRover(
  map,
  zoom
) {

  if (
    !latestTelemetry ||
    !validGps(
      latestTelemetry.latitude,
      latestTelemetry.longitude
    )
  ) {

    toast(
      "No valid GPS fix yet"
    );


    return;

  }


  map
    ?.setView(
      [
        latestTelemetry.latitude,
        latestTelemetry.longitude
      ],
      zoom
    );

}


el(
  "centerRoverMap"
)
  ?.addEventListener(
    "click",
    () => {

      centerOnRover(
        roverMap,
        18
      );

    }
  );


el(
  "centerLargeRoverMap"
)
  ?.addEventListener(
    "click",
    () => {

      centerOnRover(
        largeRoverMap,
        19
      );

    }
  );


function clearRoverTrack() {

  roverGpsHistory =
    [];


  roverTrackLine
    ?.setLatLngs(
      []
    );


  largeRoverTrackLine
    ?.setLatLngs(
      []
    );


  setText(
    "trackPointCount",
    "0 points"
  );

}


el(
  "clearRoverTrack"
)
  ?.addEventListener(
    "click",
    clearRoverTrack
  );


el(
  "clearLargeRoverTrack"
)
  ?.addEventListener(
    "click",
    clearRoverTrack
  );


/* =========================================================
   CROP BUTTONS
========================================================= */

function cropIcon(
  crop
) {

  if (
    crop.type.includes(
      "Cereal"
    )
  ) {

    return "🌾";

  }


  if (
    crop.type.includes(
      "Oilseed"
    )
  ) {

    return "🌼";

  }


  return "🌱";

}


function renderCropButtons() {

  const container =
    el(
      "cropButtonGrid"
    );


  if (
    !container
  )
    return;


  container.innerHTML =
    CROP_DATA
      .map(
        crop =>
          `
          <button
            class="crop-select-btn"
            data-crop="${crop.key}"
          >

            <span class="crop-check">
              ✓
            </span>

            <span class="crop-card-icon">
              ${cropIcon(crop)}
            </span>

            <div>

              <strong>
                ${crop.name}
              </strong>

              <small>
                ${crop.bangla}
              </small>

              <span class="crop-type">
                ${crop.type}
              </span>

            </div>

          </button>
          `
      )
      .join("");


  container
    .querySelectorAll(
      ".crop-select-btn"
    )
    .forEach(
      button => {

        button.onclick =
          () => {

            selectCrop(
              button.dataset.crop
            );

          };

      }
    );

}


/* =========================================================
   SELECT CROP
========================================================= */

function selectCrop(
  key
) {

  const crop =
    cropByKey(
      key
    );


  if (
    !crop
  )
    return;


  state.selectedCrop =
    crop;


  state.cropSent =
    false;


  document
    .querySelectorAll(
      ".crop-select-btn"
    )
    .forEach(
      button => {

        button.classList.toggle(
          "selected",
          button.dataset.crop === key
        );

      }
    );


  setText(
    "selectedCropName",
    crop.name
  );


  setText(
    "selectedCropBangla",
    crop.bangla
  );


  setText(
    "selectedCropIcon",
    cropIcon(
      crop
    )
  );


  setText(
    "cropOptN",
    crop.n
  );


  setText(
    "cropOptP",
    crop.p
  );


  setText(
    "cropOptK",
    crop.k
  );


  setText(
    "cropCondition",
    crop.condition
  );


  setText(
    "cropSelectionStatus",
    "Selected — not sent"
  );


  setText(
    "cropCommandPreview",
    `ROVER,CROP,${crop.key}`
  );


  setText(
    "dashboardCrop",
    crop.name
  );


  setText(
    "sideCrop",
    crop.name
  );


  setText(
    "dashboardTargetNpk",
    `N ${crop.n} • P ${crop.p} • K ${crop.k} kg/ha`
  );


  setText(
    "prescriptionCrop",
    crop.name
  );


  setText(
    "prescriptionCropBangla",
    crop.bangla
  );


  setText(
    "prescriptionOptN",
    crop.n
  );


  setText(
    "prescriptionOptP",
    crop.p
  );


  setText(
    "prescriptionOptK",
    crop.k
  );


  resetMissionSamples();


  updateSequence(
    "CROP"
  );


  renderDeficiencyHeatmaps();

}


/* =========================================================
   SEND CROP ASSIGNMENT
========================================================= */

async function sendCropAssignment() {

  if (
    !state.selectedCrop
  ) {

    toast(
      "Select a crop first"
    );


    return;

  }


  const command =
    `ROVER,CROP,${state.selectedCrop.key}`;


  const sent =
    await sendBaseCommand(
      command
    );


  if (
    sent
  ) {

    state.cropSent =
      true;


    setText(
      "cropSelectionStatus",
      "Assignment sent"
    );


    setText(
      "missionStatus",
      "Crop assigned"
    );


    toast(
      `${state.selectedCrop.name} sent to rover`
    );

  }

}


el(
  "sendCropAssignment"
)
  ?.addEventListener(
    "click",
    sendCropAssignment
  );


function handleCropAck(
  key
) {

  const crop =
    cropByKey(
      key
    );


  if (
    !crop
  )
    return;


  state.selectedCrop =
    crop;


  state.cropSent =
    true;


  setText(
    "cropSelectionStatus",
    "Rover acknowledged"
  );

}


/* =========================================================
   DEFICIENCY LOGIC
========================================================= */

function deficiencyPercent(
  required,
  optimum
) {

  if (
    !Number.isFinite(
      required
    ) ||
    !Number.isFinite(
      optimum
    ) ||
    optimum <= 0
  ) {

    return 0;

  }


  return clamp(
    (
      required /
      optimum
    ) *
      100,
    0,
    100
  );

}


/* =========================================================
   COLLECT SAMPLE
========================================================= */

function collectMissionSample(
  data
) {

  if (
    !state.selectedCrop
  )
    return;


  if (
    !validGps(
      data.latitude,
      data.longitude
    )
  )
    return;


  if (
    samplePackets.has(
      data.packetNumber
    )
  )
    return;


  samplePackets.add(
    data.packetNumber
  );


  const sample = {

    sampleNumber:
      missionSamples.length +
      1,

    packetNumber:
      data.packetNumber,

    latitude:
      data.latitude,

    longitude:
      data.longitude,

    measuredN:
      data.nitrogen,

    measuredP:
      data.phosphorus,

    measuredK:
      data.potassium,

    requiredN:
      Math.max(
        0,
        data.requiredN
      ),

    requiredP:
      Math.max(
        0,
        data.requiredP
      ),

    requiredK:
      Math.max(
        0,
        data.requiredK
      ),

    temperature:
      data.temperature,

    humidity:
      data.humidity,

    battery:
      data.battery,

    timestamp:
      data.timestamp

  };


  sample.defN =
    deficiencyPercent(
      sample.requiredN,
      state.selectedCrop.n
    );


  sample.defP =
    deficiencyPercent(
      sample.requiredP,
      state.selectedCrop.p
    );


  sample.defK =
    deficiencyPercent(
      sample.requiredK,
      state.selectedCrop.k
    );


  missionSamples.push(
    sample
  );


  setText(
    "dashboardSamples",
    `${missionSamples.length} samples`
  );


  setText(
    "dashboardHeatmapSamples",
    missionSamples.length
  );


  setText(
    "largeHeatmapSamples",
    missionSamples.length
  );


  renderDeficiencyHeatmaps();


  updateDeficiencySummary();


  updatePrescription();

}


/* =========================================================
   GPS → LOCAL X/Y
========================================================= */

function convertSamplesToLocalXY(
  samples
) {

  if (
    !samples.length
  )
    return [];


  const originLat =
    samples[0].latitude;


  const originLon =
    samples[0].longitude;


  const latitudeRad =
    originLat *
    Math.PI /
    180;


  const metersPerLatDegree =
    111320;


  const metersPerLonDegree =
    111320 *
    Math.cos(
      latitudeRad
    );


  return samples.map(
    sample => {

      return {

        ...sample,

        x:
          (
            sample.longitude -
            originLon
          ) *
          metersPerLonDegree,

        y:
          (
            sample.latitude -
            originLat
          ) *
          metersPerLatDegree

      };

    }
  );

}


/* =========================================================
   GET DEFICIENCY VALUE
========================================================= */

function getSampleDeficiency(
  sample,
  nutrient
) {

  if (
    nutrient ===
    "p"
  ) {

    return sample.defP;

  }


  if (
    nutrient ===
    "k"
  ) {

    return sample.defK;

  }


  return sample.defN;

}


/* =========================================================
   IDW
========================================================= */

function interpolateIDW(
  x,
  y,
  samples,
  nutrient,
  power = 2
) {

  let numerator =
    0;


  let denominator =
    0;


  for (
    const sample
    of samples
  ) {

    const dx =
      x -
      sample.x;


    const dy =
      y -
      sample.y;


    const distanceSquared =
      dx * dx +
      dy * dy;


    if (
      distanceSquared <
      0.000001
    ) {

      return getSampleDeficiency(
        sample,
        nutrient
      );

    }


    const distance =
      Math.sqrt(
        distanceSquared
      );


    const weight =
      1 /
      Math.pow(
        distance,
        power
      );


    numerator +=
      weight *
      getSampleDeficiency(
        sample,
        nutrient
      );


    denominator +=
      weight;

  }


  if (
    denominator === 0
  ) {

    return 0;

  }


  return (
    numerator /
    denominator
  );

}


/* =========================================================
   HEATMAP COLOR
========================================================= */

function interpolateRgb(
  start,
  end,
  t
) {

  t =
    clamp(
      t,
      0,
      1
    );


  return [

    Math.round(
      start[0] +
      (
        end[0] -
        start[0]
      ) *
      t
    ),

    Math.round(
      start[1] +
      (
        end[1] -
        start[1]
      ) *
      t
    ),

    Math.round(
      start[2] +
      (
        end[2] -
        start[2]
      ) *
      t
    )

  ];

}


function heatmapColor(
  percentage
) {

  const p =
    clamp(
      percentage,
      0,
      100
    );


  if (
    p <= 20
  ) {

    return interpolateRgb(
      [37, 86, 220],
      [30, 180, 220],
      p / 20
    );

  }


  if (
    p <= 40
  ) {

    return interpolateRgb(
      [30, 180, 220],
      [56, 200, 134],
      (
        p -
        20
      ) /
      20
    );

  }


  if (
    p <= 60
  ) {

    return interpolateRgb(
      [56, 200, 134],
      [224, 220, 55],
      (
        p -
        40
      ) /
      20
    );

  }


  if (
    p <= 80
  ) {

    return interpolateRgb(
      [224, 220, 55],
      [245, 145, 40],
      (
        p -
        60
      ) /
      20
    );

  }


  return interpolateRgb(
    [245, 145, 40],
    [235, 67, 61],
    (
      p -
      80
    ) /
    20
  );

}


/* =========================================================
   RENDER FIELD HEATMAP
========================================================= */

function renderFieldHeatmap(
  canvasId,
  emptyId,
  nutrient
) {

  const canvas =
    el(
      canvasId
    );


  const empty =
    el(
      emptyId
    );


  if (
    !canvas
  )
    return;


  const container =
    canvas.parentElement;


  const width =
    Math.max(
      300,
      container.clientWidth
    );


  const height =
    Math.max(
      260,
      container.clientHeight
    );


  const ratio =
    Math.min(
      window.devicePixelRatio ||
      1,
      2
    );


  canvas.width =
    width *
    ratio;


  canvas.height =
    height *
    ratio;


  const ctx =
    canvas.getContext(
      "2d"
    );


  ctx.setTransform(
    ratio,
    0,
    0,
    ratio,
    0,
    0
  );


  ctx.clearRect(
    0,
    0,
    width,
    height
  );


  if (
    missionSamples.length ===
    0
  ) {

    if (
      empty
    ) {

      empty.style.display =
        "flex";

    }


    return;

  }


  if (
    empty
  ) {

    empty.style.display =
      "none";

  }


  const samples =
    convertSamplesToLocalXY(
      missionSamples
    );


  const xs =
    samples.map(
      sample =>
        sample.x
    );


  const ys =
    samples.map(
      sample =>
        sample.y
    );


  let minX =
    Math.min(
      ...xs
    );


  let maxX =
    Math.max(
      ...xs
    );


  let minY =
    Math.min(
      ...ys
    );


  let maxY =
    Math.max(
      ...ys
    );


  /*
     1 ft = 0.3048 m
  */

  const footprint =
    0.3048;


  minX -=
    footprint /
    2;


  maxX +=
    footprint /
    2;


  minY -=
    footprint /
    2;


  maxY +=
    footprint /
    2;


  if (
    maxX -
      minX <
    footprint
  ) {

    minX -=
      footprint /
      2;


    maxX +=
      footprint /
      2;

  }


  if (
    maxY -
      minY <
    footprint
  ) {

    minY -=
      footprint /
      2;


    maxY +=
      footprint /
      2;

  }


  const padding =
    34;


  const fieldWidth =
    width -
    padding *
      2;


  const fieldHeight =
    height -
    padding *
      2;


  const heatCanvas =
    document.createElement(
      "canvas"
    );


  const heatWidth =
    Math.max(
      100,
      Math.min(
        260,
        Math.floor(
          fieldWidth /
          2
        )
      )
    );


  const heatHeight =
    Math.max(
      100,
      Math.min(
        220,
        Math.floor(
          fieldHeight /
          2
        )
      )
    );


  heatCanvas.width =
    heatWidth;


  heatCanvas.height =
    heatHeight;


  const heatContext =
    heatCanvas.getContext(
      "2d"
    );


  const image =
    heatContext
      .createImageData(
        heatWidth,
        heatHeight
      );


  for (
    let py = 0;
    py < heatHeight;
    py++
  ) {

    for (
      let px = 0;
      px < heatWidth;
      px++
    ) {

      const x =
        minX +
        (
          px /
          Math.max(
            1,
            heatWidth -
              1
          )
        ) *
        (
          maxX -
          minX
        );


      const y =
        maxY -
        (
          py /
          Math.max(
            1,
            heatHeight -
              1
          )
        ) *
        (
          maxY -
          minY
        );


      const severity =
        interpolateIDW(
          x,
          y,
          samples,
          nutrient,
          2
        );


      const color =
        heatmapColor(
          severity
        );


      const index =
        (
          py *
          heatWidth +
          px
        ) *
        4;


      image.data[
        index
      ] =
        color[0];


      image.data[
        index +
        1
      ] =
        color[1];


      image.data[
        index +
        2
      ] =
        color[2];


      image.data[
        index +
        3
      ] =
        235;

    }

  }


  heatContext.putImageData(
    image,
    0,
    0
  );


  ctx.imageSmoothingEnabled =
    true;


  ctx.drawImage(
    heatCanvas,
    padding,
    padding,
    fieldWidth,
    fieldHeight
  );


  /*
     Field boundary
  */

  ctx.strokeStyle =
    "#d8ffbe";


  ctx.lineWidth =
    2;


  ctx.strokeRect(
    padding,
    padding,
    fieldWidth,
    fieldHeight
  );


  /*
     Sample points
  */

  samples.forEach(
    (
      sample,
      index
    ) => {

      const cx =
        padding +
        (
          (
            sample.x -
            minX
          ) /
          (
            maxX -
            minX
          )
        ) *
        fieldWidth;


      const cy =
        padding +
        (
          (
            maxY -
            sample.y
          ) /
          (
            maxY -
            minY
          )
        ) *
        fieldHeight;


      ctx.beginPath();


      ctx.arc(
        cx,
        cy,
        12,
        0,
        Math.PI *
          2
      );


      ctx.fillStyle =
        "#05080c";


      ctx.fill();


      ctx.strokeStyle =
        "#ffffff";


      ctx.lineWidth =
        1.2;


      ctx.stroke();


      ctx.fillStyle =
        "#ffffff";


      ctx.font =
        "700 10px Inter, Arial";


      ctx.textAlign =
        "center";


      ctx.textBaseline =
        "middle";


      ctx.fillText(
        String(
          index +
          1
        ),
        cx,
        cy
      );

    }
  );

}


/* =========================================================
   RENDER BOTH HEATMAPS
========================================================= */

function renderDeficiencyHeatmaps() {

  renderFieldHeatmap(
    "dashboardHeatmapCanvas",
    "dashboardHeatmapEmpty",
    deficiencyNutrient
  );


  renderFieldHeatmap(
    "largeHeatmapCanvas",
    "largeHeatmapEmpty",
    deficiencyNutrient
  );


  setText(
    "dashboardHeatmapSamples",
    missionSamples.length
  );


  setText(
    "largeHeatmapSamples",
    missionSamples.length
  );


  if (
    state.selectedCrop
  ) {

    const nutrientName = {

      n:
        "Nitrogen",

      p:
        "Phosphorus",

      k:
        "Potassium"

    }[
      deficiencyNutrient
    ];


    setText(
      "dashboardHeatmapCrop",
      `${state.selectedCrop.name} • ${nutrientName} deficiency`
    );


    setText(
      "largeHeatmapCrop",
      `${state.selectedCrop.name} • ${nutrientName} deficiency`
    );

  }

}


/* =========================================================
   HEATMAP NUTRIENT SELECTOR
========================================================= */

function setDeficiencyNutrient(
  nutrient
) {

  deficiencyNutrient =
    nutrient;


  if (
    el(
      "dashboardDeficiencyType"
    )
  ) {

    el(
      "dashboardDeficiencyType"
    ).value =
      nutrient;

  }


  if (
    el(
      "largeDeficiencyType"
    )
  ) {

    el(
      "largeDeficiencyType"
    ).value =
      nutrient;

  }


  renderDeficiencyHeatmaps();

}


el(
  "dashboardDeficiencyType"
)
  ?.addEventListener(
    "change",
    event => {

      setDeficiencyNutrient(
        event.target.value
      );

    }
  );


el(
  "largeDeficiencyType"
)
  ?.addEventListener(
    "change",
    event => {

      setDeficiencyNutrient(
        event.target.value
      );

    }
  );


/* =========================================================
   HEATMAP SUMMARY
========================================================= */

function updateDeficiencySummary() {

  if (
    !missionSamples.length
  ) {

    setText(
      "avgDefN",
      "--%"
    );


    setText(
      "avgDefP",
      "--%"
    );


    setText(
      "avgDefK",
      "--%"
    );


    return;

  }


  const average =
    key =>
      missionSamples.reduce(
        (
          total,
          sample
        ) =>
          total +
          sample[key],
        0
      ) /
      missionSamples.length;


  setText(
    "avgDefN",
    `${average(
      "defN"
    ).toFixed(1)}%`
  );


  setText(
    "avgDefP",
    `${average(
      "defP"
    ).toFixed(1)}%`
  );


  setText(
    "avgDefK",
    `${average(
      "defK"
    ).toFixed(1)}%`
  );

}


/* =========================================================
   SAMPLING EVENTS
========================================================= */

function handleSamplingStarted() {

  state.samplingState =
    "SAMPLING";


  heatmapFinalized =
    false;


  setText(
    "missionStatus",
    "Sampling"
  );


  setText(
    "dashboardSampling",
    "Sampling"
  );


  setText(
    "sideSamplingStatus",
    "Sampling"
  );


  setText(
    "telemetrySamplingState",
    "SAMPLING"
  );


  setText(
    "sprinklerSamplingState",
    "Sampling in progress"
  );


  setText(
    "heatmapGenerationState",
    "Live sampling"
  );


  setText(
    "heatmapStatusText",
    "Collecting GPS-referenced sampling points..."
  );


  updateSequence(
    "SAMPLING"
  );

}


async function handleSamplingDone() {

  state.samplingState =
    "DONE";


  heatmapFinalized =
    true;


  setText(
    "missionStatus",
    "Sampling complete"
  );


  setText(
    "dashboardSampling",
    "Complete"
  );


  setText(
    "sideSamplingStatus",
    "Complete"
  );


  setText(
    "telemetrySamplingState",
    "DONE"
  );


  setText(
    "sprinklerSamplingState",
    "Complete"
  );


  setText(
    "sprinklerHeatmapState",
    "Generated"
  );


  setText(
    "heatmapGenerationState",
    "Complete"
  );


  setText(
    "fullHeatmapStatus",
    `${missionSamples.length} samples • Complete`
  );


  setText(
    "heatmapStatusText",
    `Sampling complete — ${missionSamples.length} points interpolated.`
  );


  renderDeficiencyHeatmaps();


  updateDeficiencySummary();


  updatePrescription();


  updateSequence(
    "HEATMAP"
  );


  toast(
    "Sampling complete — heatmap generated"
  );


  await startAutonomousFertilization();

}


/* =========================================================
   RESET MISSION SAMPLES
========================================================= */

function resetMissionSamples() {

  missionSamples =
    [];


  samplePackets =
    new Set();


  heatmapFinalized =
    false;


  setText(
    "dashboardSamples",
    "0 samples"
  );


  setText(
    "dashboardHeatmapSamples",
    "0"
  );


  setText(
    "largeHeatmapSamples",
    "0"
  );


  setText(
    "heatmapStatusText",
    "Waiting for rover sampling data."
  );


  setText(
    "fullHeatmapStatus",
    "Waiting for samples"
  );


  setText(
    "heatmapGenerationState",
    "Waiting"
  );


  updateDeficiencySummary();


  renderDeficiencyHeatmaps();


  updatePrescription();

}


/* =========================================================
   PRESCRIPTION
========================================================= */

function calculatePrescription() {

  if (
    !missionSamples.length
  ) {

    return null;

  }


  const average =
    key =>
      missionSamples.reduce(
        (
          total,
          sample
        ) =>
          total +
          sample[key],
        0
      ) /
      missionSamples.length;


  const maximum =
    key =>
      Math.max(
        ...missionSamples.map(
          sample =>
            sample[key]
        )
      );


  return {

    avgN:
      average(
        "requiredN"
      ),

    avgP:
      average(
        "requiredP"
      ),

    avgK:
      average(
        "requiredK"
      ),

    maxN:
      maximum(
        "requiredN"
      ),

    maxP:
      maximum(
        "requiredP"
      ),

    maxK:
      maximum(
        "requiredK"
      )

  };

}


function updatePrescription() {

  const crop =
    state.selectedCrop;


  if (
    crop
  ) {

    setText(
      "prescriptionCrop",
      crop.name
    );


    setText(
      "prescriptionCropBangla",
      crop.bangla
    );


    setText(
      "prescriptionOptN",
      crop.n
    );


    setText(
      "prescriptionOptP",
      crop.p
    );


    setText(
      "prescriptionOptK",
      crop.k
    );

  }


  const prescription =
    calculatePrescription();


  if (
    !prescription
  ) {

    return;

  }


  setText(
    "avgReqN",
    `${prescription.avgN.toFixed(2)} kg/ha`
  );


  setText(
    "avgReqP",
    `${prescription.avgP.toFixed(2)} kg/ha`
  );


  setText(
    "avgReqK",
    `${prescription.avgK.toFixed(2)} kg/ha`
  );


  setText(
    "maxReqN",
    `${prescription.maxN.toFixed(2)} kg/ha`
  );


  setText(
    "maxReqP",
    `${prescription.maxP.toFixed(2)} kg/ha`
  );


  setText(
    "maxReqK",
    `${prescription.maxK.toFixed(2)} kg/ha`
  );


  if (
    state.fieldAreaHa >
    0
  ) {

    setText(
      "totalReqN",
      (
        prescription.avgN *
        state.fieldAreaHa
      ).toFixed(2)
    );


    setText(
      "totalReqP",
      (
        prescription.avgP *
        state.fieldAreaHa
      ).toFixed(2)
    );


    setText(
      "totalReqK",
      (
        prescription.avgK *
        state.fieldAreaHa
      ).toFixed(2)
    );

  }

}


/* =========================================================
   START AUTONOMOUS FERTILIZATION
========================================================= */

async function startAutonomousFertilization() {

  const prescription =
    calculatePrescription();


  if (
    !prescription
  ) {

    return;

  }


  const command =
    `FERT,PRESCRIPTION,` +
    `${prescription.avgN.toFixed(2)},` +
    `${prescription.avgP.toFixed(2)},` +
    `${prescription.avgK.toFixed(2)}`;


  const sent =
    await sendBaseCommand(
      command
    );


  if (
    !sent
  ) {

    return;

  }


  await sendBaseCommand(
    "FERT,AUTO_START"
  );


  setFertilizationState(
    "AUTO START SENT"
  );


  updateSequence(
    "FERTILIZING"
  );

}


/* =========================================================
   FERTILIZATION STATE
========================================================= */

function setFertilizationState(
  value
) {

  state.fertilizationState =
    value;


  setText(
    "dashboardFertStatus",
    value
  );


  setText(
    "sprinklerFertState",
    value
  );


  setText(
    "sprinklerAutoState",
    value
  );

}


/* =========================================================
   MISSION DONE
========================================================= */

function handleMissionDone() {

  setFertilizationState(
    "COMPLETE"
  );


  setText(
    "missionStatus",
    "Mission complete"
  );


  updateSequence(
    "DONE"
  );


  toast(
    "Mission complete"
  );

}


/* =========================================================
   SEQUENCE
========================================================= */

function updateSequence(
  stage
) {

  const ids = [

    "stepCrop",

    "stepSample",

    "stepHeatmap",

    "stepFert",

    "stepDone"

  ];


  const order = {

    CROP:
      0,

    SAMPLING:
      1,

    HEATMAP:
      2,

    FERTILIZING:
      3,

    DONE:
      4

  };


  const active =
    order[stage] ??
    0;


  ids.forEach(
    (
      id,
      index
    ) => {

      const element =
        el(id);


      if (
        !element
      )
        return;


      element.classList.toggle(
        "active",
        index === active
      );


      element.classList.toggle(
        "complete",
        index < active
      );

    }
  );

}


/* =========================================================
   SEND BASE COMMAND
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
      serialPort
        .writable
        .getWriter();


    await writer.write(
      new TextEncoder()
        .encode(
          command +
          "\n"
        )
    );


    return true;

  }

  catch (error) {

    console.error(
      error
    );


    return false;

  }

  finally {

    writer
      ?.releaseLock();

  }

}


/* =========================================================
   MISSION CONTROL
========================================================= */

el(
  "startMission"
)
  ?.addEventListener(
    "click",
    async () => {

      if (
        !state.selectedCrop
      ) {

        toast(
          "Select crop first"
        );


        navigate(
          "crop"
        );


        return;

      }


      if (
        !state.cropSent
      ) {

        const cropSent =
          await sendBaseCommand(
            `ROVER,CROP,${state.selectedCrop.key}`
          );


        if (
          !cropSent
        )
          return;


        state.cropSent =
          true;

      }


      await sendBaseCommand(
        "ROVER,START"
      );


      setText(
        "missionStatus",
        "Starting"
      );

    }
  );


async function pauseRover() {

  await sendBaseCommand(
    "ROVER,PAUSE"
  );


  state.paused =
    true;


  setText(
    "missionStatus",
    "Paused"
  );

}


async function resumeRover() {

  await sendBaseCommand(
    "ROVER,RESUME"
  );


  state.paused =
    false;


  setText(
    "missionStatus",
    "Autonomous"
  );

}


el(
  "pauseMission"
)
  ?.addEventListener(
    "click",
    async () => {

      if (
        state.paused
      ) {

        await resumeRover();


        setText(
          "pauseMission",
          "Pause Rover"
        );

      }

      else {

        await pauseRover();


        setText(
          "pauseMission",
          "Resume Rover"
        );

      }

    }
  );


/* =========================================================
   EMERGENCY
========================================================= */

async function emergencyStop() {

  await sendBaseCommand(
    "ROVER,ESTOP"
  );


  await sendBaseCommand(
    "FERT,ALL_OFF"
  );


  state.emergency =
    true;


  setText(
    "missionStatus",
    "EMERGENCY STOP"
  );


  setFertilizationState(
    "EMERGENCY OFF"
  );

}


el(
  "emergencyBtn"
)
  ?.addEventListener(
    "click",
    emergencyStop
  );


el(
  "manualEstop"
)
  ?.addEventListener(
    "click",
    emergencyStop
  );


el(
  "manualPause"
)
  ?.addEventListener(
    "click",
    pauseRover
  );


el(
  "manualResume"
)
  ?.addEventListener(
    "click",
    resumeRover
  );


el(
  "manualStop"
)
  ?.addEventListener(
    "click",
    () => {

      sendBaseCommand(
        "ROVER,STOP"
      );

    }
  );


/* =========================================================
   MANUAL ROVER MOVEMENT
========================================================= */

const movementCommands = {

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

          const type =
            movementCommands[
              button.dataset.command
            ];


          const speed =
            el(
              "manualSpeed"
            )?.value ||
            "0.4";


          const command =
            type ===
            "STOP"
              ? "ROVER,STOP"
              : `ROVER,${type},${speed}`;


          await sendBaseCommand(
            command
          );


          setText(
            "manualCommand",
            `Sent: ${command}`
          );

        };

    }
  );


el(
  "manualSpeed"
)
  ?.addEventListener(
    "input",
    event => {

      setText(
        "manualSpeedValue",
        `${event.target.value} m/s`
      );

    }
  );


/* =========================================================
   FERTILIZER OVERRIDE
========================================================= */

document
  .querySelectorAll(
    "[data-pump]"
  )
  .forEach(
    button => {

      button.onclick =
        () => {

          sendBaseCommand(
            `FERT,PUMP,${button.dataset.pump}`
          );

        };

    }
  );


document
  .querySelectorAll(
    "[data-valve][data-action]"
  )
  .forEach(
    button => {

      button.onclick =
        () => {

          sendBaseCommand(
            `FERT,${button.dataset.valve},${button.dataset.action}`
          );

        };

    }
  );


el(
  "allFertilizerOff"
)
  ?.addEventListener(
    "click",
    () => {

      sendBaseCommand(
        "FERT,ALL_OFF"
      );

    }
  );


/* =========================================================
   ROVER ONLINE STATUS
========================================================= */

function setRoverOnline(
  online
) {

  const dot =
    el(
      "roverStatusDot"
    );


  dot
    ?.classList
    .toggle(
      "connected-dot",
      online
    );


  dot
    ?.classList
    .toggle(
      "disconnected-dot",
      !online
    );


  setText(
    "roverStatusText",
    online
      ? "Connected"
      : "No Signal"
  );


  setText(
    "sideRoverStatus",
    online
      ? "Connected"
      : "No Signal"
  );

}


/* =========================================================
   DATA AGE + LOST SIGNAL
========================================================= */

setInterval(
  () => {

    if (
      !lastRoverPacketAt
    ) {

      return;

    }


    const age =
      (
        Date.now() -
        lastRoverPacketAt
          .getTime()
      ) /
      1000;


    setText(
      "telemetryDataAge",
      `${age.toFixed(1)} sec`
    );


    setText(
      "sensorDataAge",
      age < 60
        ? `${Math.floor(age)} sec ago`
        : `${Math.floor(age / 60)} min ago`
    );


    if (
      age >
      8
    ) {

      setRoverOnline(
        false
      );


      setText(
        "telemetryStatusText",
        "Telemetry Lost"
      );

    }

  },
  500
);


/* =========================================================
   TIMESTAMP
========================================================= */

function updateTimestampDisplay() {

  setText(
    "sensorTimestamp",
    lastSensorUpdate
      ? formatTimestamp(
          lastSensorUpdate
        )
      : "No data received"
  );

}


/* =========================================================
   RAW CONSOLE
========================================================= */

function addTelemetryConsoleLine(
  packet
) {

  const box =
    el(
      "telemetryConsole"
    );


  if (
    !box
  )
    return;


  box
    .querySelector(
      ".console-empty"
    )
    ?.remove();


  const row =
    document.createElement(
      "div"
    );


  row.className =
    "telemetry-console-line";


  const time =
    document.createElement(
      "span"
    );


  time.className =
    "telemetry-console-time";


  time.textContent =
    new Date()
      .toLocaleTimeString();


  row.appendChild(
    time
  );


  row.appendChild(
    document.createTextNode(
      packet
    )
  );


  box.appendChild(
    row
  );


  while (
    box.children.length >
    200
  ) {

    box.removeChild(
      box.firstChild
    );

  }


  box.scrollTop =
    box.scrollHeight;

}


el(
  "clearTelemetryConsole"
)
  ?.addEventListener(
    "click",
    () => {

      el(
        "telemetryConsole"
      ).innerHTML =
        `
        <div class="console-empty">
          Waiting for rover packets...
        </div>
        `;

    }
  );


/* =========================================================
   HISTORY
========================================================= */

function loadHistory() {

  try {

    const saved =
      localStorage.getItem(
        HISTORY_KEY
      );


    return saved
      ? JSON.parse(
          saved
        )
      : [];

  }

  catch {

    return [];

  }

}


function saveTelemetrySample(
  data
) {

  const row = {

    timestamp:
      new Date()
        .toISOString(),

    crop:
      state.selectedCrop
        ?.name ||
      "",

    packetNumber:
      data.packetNumber,

    latitude:
      data.latitude,

    longitude:
      data.longitude,

    temperature:
      data.temperature,

    humidity:
      data.humidity,

    nitrogen:
      data.nitrogen,

    phosphorus:
      data.phosphorus,

    potassium:
      data.potassium,

    requiredN:
      data.requiredN,

    requiredP:
      data.requiredP,

    requiredK:
      data.requiredK,

    roll:
      data.roll,

    pitch:
      data.pitch,

    yaw:
      data.yaw,

    accX:
      data.accX,

    accY:
      data.accY,

    accZ:
      data.accZ,

    battery:
      data.battery

  };


  sensorRows.unshift(
    row
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


  try {

    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(
        sensorRows
      )
    );

  }

  catch (error) {

    console.error(
      error
    );

  }


  renderHistory();

}


function renderHistory(
  rows = sensorRows
) {

  const body =
    el(
      "sensorHistory"
    );


  if (
    !body
  )
    return;


  if (
    !rows.length
  ) {

    body.innerHTML =
      `
      <tr>
        <td colspan="12">
          No sensor data available.
        </td>
      </tr>
      `;


    return;

  }


  body.innerHTML =
    rows
      .map(
        sample =>
          `
          <tr>

            <td>
              ${formatTimestamp(
                sample.timestamp
              )}
            </td>

            <td>
              ${sample.crop || "—"}
            </td>

            <td>
              ${sample.packetNumber}
            </td>

            <td>
              ${sample.latitude}
            </td>

            <td>
              ${sample.longitude}
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
              ${sample.requiredN}
            </td>

            <td>
              ${sample.requiredP}
            </td>

            <td>
              ${sample.requiredK}
            </td>

            <td>
              ${sample.battery}%
            </td>

          </tr>
          `
      )
      .join("");

}


/* =========================================================
   ALERTS
========================================================= */

function addAlert(
  type,
  title,
  detail
) {

  systemAlerts.unshift({

    type,

    title,

    detail,

    time:
      new Date()
        .toLocaleTimeString()

  });


  renderAlerts();

}


function renderAlerts() {

  const container =
    el(
      "allAlerts"
    );


  if (
    !container
  )
    return;


  if (
    !systemAlerts.length
  ) {

    container.innerHTML =
      `
      <article class="alert">

        <span>
          ℹ
        </span>

        <div>

          <strong>
            No events
          </strong>

          <small>
            Waiting for system activity.
          </small>

        </div>

        <time>
          --
        </time>

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
              ℹ
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


/* =========================================================
   INITIALIZATION
========================================================= */

renderCropButtons();


renderHistory();


renderAlerts();


updateBaseStatus(
  false
);


setRoverOnline(
  false
);


initializeMaps();


updateSequence(
  "CROP"
);


renderDeficiencyHeatmaps();


console.log(
  "AgriRover GUI V14 loaded"
);


console.log(
  "Expected telemetry:"
);


console.log(
  "Data : PACKET,LAT,LON,TEMP,HUMIDITY,N,P,K,REQ_N,REQ_P,REQ_K,ROLL,PITCH,YAW,ACC_X,ACC_Y,ACC_Z,BATTERY"
);
