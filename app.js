/* =========================================================
   AGRIROVER
   LIVE GPS MAP + 16 FIELD TELEMETRY
========================================================= */


/* =========================================================
   STATE
========================================================= */

const state = {

  paused: false,

  emergency: false,

  battery: 0

};


let serialPort = null;

let serialReader = null;

let serialBuffer = "";

let baseStationConnected =
  false;


let latestTelemetry =
  null;


let lastRoverPacketAt =
  null;


let lastSensorUpdate =
  null;


/* =========================================================
   MAP VARIABLES
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
   HISTORY
========================================================= */

const STORAGE_KEY =
  "agriroverTelemetryV10";


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
      error
    );


    return [];

  }

}


let sensorRows =
  loadHistory();


/* =========================================================
   ALERTS
========================================================= */

let systemAlerts =
  [];


/* =========================================================
   DOM HELPERS
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


/* =========================================================
   TOAST
========================================================= */

function toast(
  message
) {

  const box =
    el("toast");


  if (!box)
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
      2500
    );

}


/* =========================================================
   TIMESTAMP
========================================================= */

function formatTimestamp(
  value =
    new Date()
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
      item => {

        item.classList.remove(
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


  el("sidebar")
    ?.classList
    .remove(
      "open"
    );


  /*
     Leaflet maps are sometimes created
     while hidden.

     invalidateSize() fixes them after
     opening their page.
  */

  setTimeout(
    () => {

      if (
        pageId ===
        "dashboard"
      ) {

        roverMap
          ?.invalidateSize();

      }


      if (
        pageId ===
        "liveRover"
      ) {

        largeRoverMap
          ?.invalidateSize();

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


el("menuBtn")
  ?.addEventListener(
    "click",
    () => {

      el("sidebar")
        ?.classList
        .toggle(
          "open"
        );

    }
  );


/* =========================================================
   SERIAL CONNECT
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
      "Web Serial is not supported.\nUse desktop Chrome or Edge."
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


    toast(
      "Base Station connected"
    );


    addAlert(

      "success",

      "Base station connected",

      "USB serial connection established"

    );


    readSerialLoop();

  }

  catch (error) {

    console.error(
      error
    );


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


  if (
    connected
  ) {

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


    setText(
      "baseStatusText",
      "Connected"
    );


    if (
      button
    ) {

      button.textContent =
        "✓ Connected";


      button.classList.add(
        "connected"
      );

    }

  }

  else {

    dot
      ?.classList
      .remove(
        "connected-dot"
      );


    dot
      ?.classList
      .add(
        "disconnected-dot"
      );


    setText(
      "baseStatusText",
      "Disconnected"
    );


    if (
      button
    ) {

      button.textContent =
        "🔌 Connect";


      button.classList.remove(
        "connected"
      );

    }

  }

}


el("connectBaseStation")
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
      "Unknown error"

    );

  }

}


/* =========================================================
   SERIAL LINE PROCESSOR
========================================================= */

function processSerialLine(
  line
) {

  /*
     Rover data
  */

  if (
    line.startsWith(
      "Data:"
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


  /*
     Also accept direct raw CSV
  */

  if (
    line.includes(",")
  ) {

    const count =
      line.split(",")
        .length;


    if (
      count === 16
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


  /*
     LoRa RSSI
  */

  if (
    line.startsWith(
      "RSSI:"
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


  /*
     LoRa SNR
  */

  if (
    line.startsWith(
      "SNR:"
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
   FINAL TELEMETRY PARSER

   0  PACKET_NUMBER
   1  LATITUDE
   2  LONGITUDE
   3  SOIL_PERCENT
   4  TEMPERATURE
   5  HUMIDITY
   6  NITROGEN
   7  PHOSPHORUS
   8  POTASSIUM
   9  ROLL
   10 PITCH
   11 YAW
   12 ACC_X
   13 ACC_Y
   14 ACC_Z
   15 BATTERY_PERCENT
========================================================= */

function parseTelemetry(
  line
) {

  let clean =
    line.trim();


  if (
    clean.startsWith(
      "Data:"
    )
  ) {

    clean =
      clean
        .substring(5)
        .trim();

  }


  const values =
    clean
      .split(",")
      .map(
        value =>
          value.trim()
      );


  console.log(
    "Telemetry field count:",
    values.length
  );


  if (
    values.length !==
    16
  ) {

    console.warn(
      `Expected 16 telemetry fields, received ${values.length}`
    );


    return null;

  }


  const data = {

    packetNumber:
      Number(values[0]),

    latitude:
      Number(values[1]),

    longitude:
      Number(values[2]),

    soil:
      Number(values[3]),

    temperature:
      Number(values[4]),

    humidity:
      Number(values[5]),

    nitrogen:
      Number(values[6]),

    phosphorus:
      Number(values[7]),

    potassium:
      Number(values[8]),

    roll:
      Number(values[9]),

    pitch:
      Number(values[10]),

    yaw:
      Number(values[11]),

    accX:
      Number(values[12]),

    accY:
      Number(values[13]),

    accZ:
      Number(values[14]),

    battery:
      Number(values[15]),

    timestamp:
      new Date()

  };


  const numeric =
    Object
      .entries(data)
      .filter(
        ([key]) =>
          key !==
          "timestamp"
      )
      .map(
        ([, value]) =>
          value
      );


  if (
    numeric.some(
      value =>
        Number.isNaN(
          value
        )
    )
  ) {

    console.warn(
      "Invalid telemetry values:",
      data
    );


    return null;

  }


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
    Math.max(
      0,
      Math.min(
        100,
        data.battery
      )
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


  updateRoverLocation(
    data
  );


  updateNpk(
    data
  );


  saveTelemetrySample(
    data
  );


  updateRecommendationInputs(
    data
  );


  updateTimestampDisplay();

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


  el("batteryBar")
    .style.width =
      `${data.battery}%`;


  el("sideBatteryBar")
    .style.width =
      `${data.battery}%`;


  setText(
    "dashboardPacket",
    data.packetNumber
  );


  setText(
    "dashboardMoisture",
    `${data.soil.toFixed(1)}%`
  );


  setText(
    "dashboardTemperature",
    `${data.temperature.toFixed(1)} °C`
  );


  setText(
    "dashboardHumidity",
    `${data.humidity.toFixed(1)}%`
  );


  setText(
    "positionRoll",
    `${data.roll.toFixed(2)}°`
  );


  setText(
    "positionPitch",
    `${data.pitch.toFixed(2)}°`
  );


  setText(
    "positionYaw",
    `${data.yaw.toFixed(2)}°`
  );


  setText(
    "positionBattery",
    `${Math.round(
      data.battery
    )}%`
  );


  setText(
    "positionLastPacket",
    data.packetNumber
  );


  setText(
    "overviewState",
    "Live"
  );

}


/* =========================================================
   LIVE TELEMETRY
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
    "telemetryRoverStatus",
    "ONLINE"
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
    "telemetryMoisture",
    data.soil.toFixed(1)
  );


  setText(
    "telemetryTemperature",
    data.temperature.toFixed(1)
  );


  setText(
    "telemetryHumidity",
    data.humidity.toFixed(1)
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
    data.accX.toFixed(3)
  );


  setText(
    "telemetryAccY",
    data.accY.toFixed(3)
  );


  setText(
    "telemetryAccZ",
    data.accZ.toFixed(3)
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


  const percent =
    Math.max(
      0,
      Math.min(
        100,
        (
          value /
          max
        ) *
        100
      )
    );


  gauge.style
    .setProperty(
      "--value",
      percent
    );

}


/* =========================================================
   MAP INITIALIZATION
========================================================= */

function initializeRoverMaps() {

  /*
     Initial map location before GPS
     lock.

     Change if desired.
  */

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
      roverMap
    );


    roverTrackLine =
      L.polyline(
        [],
        {
          weight:
            4
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
      largeRoverMap
    );


    largeRoverTrackLine =
      L.polyline(
        [],
        {
          weight:
            4
        }
      )
      .addTo(
        largeRoverMap
      );

  }

}


/* =========================================================
   ROVER ICON
========================================================= */

function createRoverIcon() {

  return L.divIcon({

    className:
      "",

    html:
      `
      <div class="rover-marker">
        🚜
      </div>
      `,

    iconSize:
      [36, 36],

    iconAnchor:
      [18, 18],

    popupAnchor:
      [0, -20]

  });

}


/* =========================================================
   LIVE GPS UPDATE
========================================================= */

function updateRoverLocation(
  data
) {

  const lat =
    Number(
      data.latitude
    );


  const lon =
    Number(
      data.longitude
    );


  const validGps =

    Number.isFinite(
      lat
    ) &&

    Number.isFinite(
      lon
    ) &&

    lat !== 0 &&

    lon !== 0 &&

    lat >= -90 &&

    lat <= 90 &&

    lon >= -180 &&

    lon <= 180;


  if (
    !validGps
  ) {

    setText(
      "mapGpsStatus",
      "No GPS Fix"
    );


    setText(
      "largeMapGpsStatus",
      "No GPS Fix"
    );


    setText(
      "liveRoverGpsStatus",
      "No Fix"
    );


    setText(
      "dashboardGpsStatus",
      "No Fix"
    );


    setText(
      "positionStatus",
      "No GPS Fix"
    );


    return;

  }


  const position = [
    lat,
    lon
  ];


  /*
     Store rover path.
  */

  const previous =
    roverGpsHistory[
      roverGpsHistory.length -
      1
    ];


  /*
     Avoid storing the exact same
     coordinate repeatedly.
  */

  if (
    !previous ||
    previous[0] !== lat ||
    previous[1] !== lon
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


  /*
     Dashboard marker.
  */

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
              createRoverIcon()
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

    }


    roverMarker
      .bindPopup(
        buildRoverPopup(
          data
        )
      );


    roverTrackLine
      ?.setLatLngs(
        roverGpsHistory
      );

  }


  /*
     Large marker.
  */

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
              createRoverIcon()
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

    }


    largeRoverMarker
      .bindPopup(
        buildRoverPopup(
          data
        )
      );


    largeRoverTrackLine
      ?.setLatLngs(
        roverGpsHistory
      );

  }


  /*
     Center automatically only
     on first real GPS point.
  */

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


  /*
     Update labels.
  */

  setText(
    "mapLatitude",
    lat.toFixed(6)
  );


  setText(
    "mapLongitude",
    lon.toFixed(6)
  );


  setText(
    "mapPacketNumber",
    data.packetNumber
  );


  setText(
    "mapLastUpdate",
    new Date()
      .toLocaleTimeString()
  );


  setText(
    "zoneGps",
    `${lat.toFixed(6)}° N, ${lon.toFixed(6)}° E`
  );


  setText(
    "liveRoverLatitude",
    lat.toFixed(6)
  );


  setText(
    "liveRoverLongitude",
    lon.toFixed(6)
  );


  setText(
    "liveRoverPacket",
    data.packetNumber
  );


  setText(
    "liveRoverBattery",
    `${Math.round(
      data.battery
    )}%`
  );


  setText(
    "liveRoverStatus",
    "ONLINE"
  );


  setText(
    "liveRoverLastPacket",
    formatTimestamp()
  );


  setText(
    "liveRoverGpsStatus",
    "GPS Fix"
  );


  setText(
    "mapGpsStatus",
    "GPS Fix"
  );


  setText(
    "largeMapGpsStatus",
    "GPS Fix"
  );


  setText(
    "dashboardGpsStatus",
    "GPS Fix"
  );


  setText(
    "positionStatus",
    "GPS Fix"
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


  setText(
    "telemetryGpsStatus",
    "GPS Fix"
  );

}


/* =========================================================
   ROVER POPUP
========================================================= */

function buildRoverPopup(
  data
) {

  return `
    <strong>
      AgriRover
    </strong>

    <br>

    Packet:
    ${data.packetNumber}

    <br>

    Battery:
    ${Math.round(data.battery)}%

    <br>

    N:
    ${Math.round(data.nitrogen)} mg/kg

    <br>

    P:
    ${Math.round(data.phosphorus)} mg/kg

    <br>

    K:
    ${Math.round(data.potassium)} mg/kg

    <br>

    Moisture:
    ${data.soil.toFixed(1)}%

    <br>

    Updated:
    ${new Date().toLocaleTimeString()}
  `;

}


/* =========================================================
   CENTER MAP
========================================================= */

function centerOnRover(
  map,
  zoom
) {

  if (
    !latestTelemetry
  ) {

    toast(
      "No rover telemetry yet"
    );


    return;

  }


  const lat =
    Number(
      latestTelemetry.latitude
    );


  const lon =
    Number(
      latestTelemetry.longitude
    );


  if (
    lat === 0 ||
    lon === 0
  ) {

    toast(
      "No valid GPS fix yet"
    );


    return;

  }


  map
    ?.setView(
      [lat, lon],
      zoom
    );

}


el("centerRoverMap")
  ?.addEventListener(
    "click",
    () =>
      centerOnRover(
        roverMap,
        18
      )
  );


el("centerLargeRoverMap")
  ?.addEventListener(
    "click",
    () =>
      centerOnRover(
        largeRoverMap,
        19
      )
  );


/* =========================================================
   CLEAR TRACK
========================================================= */

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


  toast(
    "Rover track cleared"
  );

}


el("clearRoverTrack")
  ?.addEventListener(
    "click",
    clearRoverTrack
  );


el("clearLargeRoverTrack")
  ?.addEventListener(
    "click",
    clearRoverTrack
  );


/* =========================================================
   TELEMETRY AGE
========================================================= */

function updateDataAge() {

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


  if (
    age < 60
  ) {

    setText(
      "sensorDataAge",
      `${Math.floor(age)} sec ago`
    );

  }

  else {

    setText(
      "sensorDataAge",
      `${Math.floor(
        age /
        60
      )} min ago`
    );

  }

}


setInterval(
  updateDataAge,
  500
);


/* =========================================================
   ROVER CONNECTION STATUS
========================================================= */

function setRoverOnline(
  online
) {

  const dot =
    el(
      "roverStatusDot"
    );


  if (
    online
  ) {

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


    setText(
      "roverStatusText",
      "Connected"
    );


    setText(
      "sideRoverStatus",
      "Connected"
    );


    el(
      "sideRoverStatus"
    ).className =
      "ok";

  }

  else {

    dot
      ?.classList
      .remove(
        "connected-dot"
      );


    dot
      ?.classList
      .add(
        "disconnected-dot"
      );


    setText(
      "roverStatusText",
      "No Signal"
    );


    setText(
      "sideRoverStatus",
      "No Signal"
    );

  }

}


/*
   Rover telemetry interval has been
   around 5 seconds.

   Use 8 second timeout.
*/

setInterval(
  () => {

    if (
      !lastRoverPacketAt
    )
      return;


    const age =
      Date.now() -
      lastRoverPacketAt
        .getTime();


    if (
      age >
      8000
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
  1000
);


/* =========================================================
   RAW TELEMETRY CONSOLE
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


  const line =
    document.createElement(
      "div"
    );


  line.className =
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


  line.appendChild(
    time
  );


  line.appendChild(
    document.createTextNode(
      packet
    )
  );


  box.appendChild(
    line
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


el("clearTelemetryConsole")
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
   SENSOR HISTORY
========================================================= */

function saveTelemetrySample(
  data
) {

  const sample = {

    timestamp:
      new Date()
        .toISOString(),

    packetNumber:
      data.packetNumber,

    latitude:
      data.latitude,

    longitude:
      data.longitude,

    moisture:
      data.soil,

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
    sample
  );


  if (
    sensorRows.length >
    3000
  ) {

    sensorRows =
      sensorRows.slice(
        0,
        3000
      );

  }


  localStorage.setItem(

    STORAGE_KEY,

    JSON.stringify(
      sensorRows
    )

  );


  renderHistory();


  setText(
    "historySampleCount",
    sensorRows.length
  );

}


/* =========================================================
   HISTORY TABLE
========================================================= */

function renderHistory(
  rows =
    sensorRows
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
    rows.length === 0
  ) {

    body.innerHTML =
      `
      <tr>
        <td colspan="10">
          No sensor data available.
        </td>
      </tr>
      `;


    setText(
      "historySummary",
      "No stored samples"
    );


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
              ${sample.packetNumber}
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
              ${sample.battery}%
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


  setText(
    "historySummary",
    `${rows.length} stored measurements`
  );


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


/* =========================================================
   HISTORICAL SAMPLE
========================================================= */

function viewHistorySample(
  timestamp
) {

  const sample =
    sensorRows.find(
      row =>
        row.timestamp ===
        timestamp
    );


  if (
    !sample
  )
    return;


  navigate(
    "telemetry"
  );


  setText(
    "telemetryPacketNumber",
    sample.packetNumber
  );


  setText(
    "telemetryN",
    sample.nitrogen
  );


  setText(
    "telemetryP",
    sample.phosphorus
  );


  setText(
    "telemetryK",
    sample.potassium
  );


  setText(
    "telemetryMoisture",
    sample.moisture
  );


  setText(
    "telemetryTemperature",
    sample.temperature
  );


  setText(
    "telemetryHumidity",
    sample.humidity
  );


  setText(
    "telemetryBattery",
    `${sample.battery}%`
  );


  setText(
    "telemetryGps",
    `${sample.latitude}, ${sample.longitude}`
  );


  setText(
    "telemetryRoll",
    `${sample.roll}°`
  );


  setText(
    "telemetryPitch",
    `${sample.pitch}°`
  );


  setText(
    "telemetryYaw",
    `${sample.yaw}°`
  );


  setText(
    "telemetryAccX",
    sample.accX
  );


  setText(
    "telemetryAccY",
    sample.accY
  );


  setText(
    "telemetryAccZ",
    sample.accZ
  );


  setText(
    "telemetryLastPacket",
    formatTimestamp(
      sample.timestamp
    )
  );


  setText(
    "telemetryDataAge",
    "Historical"
  );


  setText(
    "telemetryRoverStatus",
    "HISTORICAL"
  );

}


/* =========================================================
   HISTORY FILTER
========================================================= */

el("filterHistory")
  ?.addEventListener(
    "click",
    () => {

      const from =
        el(
          "historyFrom"
        ).value;


      const to =
        el(
          "historyTo"
        ).value;


      const filtered =
        sensorRows.filter(
          sample => {

            const date =
              new Date(
                sample.timestamp
              );


            const validFrom =
              !from ||
              date >=
                new Date(
                  `${from}T00:00:00`
                );


            const validTo =
              !to ||
              date <=
                new Date(
                  `${to}T23:59:59`
                );


            return (
              validFrom &&
              validTo
            );

          }
        );


      renderHistory(
        filtered
      );

    }
  );


el("resetHistoryFilter")
  ?.addEventListener(
    "click",
    () => {

      el(
        "historyFrom"
      ).value =
        "";


      el(
        "historyTo"
      ).value =
        "";


      renderHistory();

    }
  );


/* =========================================================
   EXPORT HISTORY
========================================================= */

el("exportHistoryCsv")
  ?.addEventListener(
    "click",
    () => {

      const header = [

        "Timestamp",
        "Packet",
        "Latitude",
        "Longitude",
        "Soil",
        "Temperature",
        "Humidity",
        "Nitrogen",
        "Phosphorus",
        "Potassium",
        "Roll",
        "Pitch",
        "Yaw",
        "AccX",
        "AccY",
        "AccZ",
        "Battery"

      ];


      const rows =
        sensorRows.map(
          s =>
            [

              s.timestamp,

              s.packetNumber,

              s.latitude,

              s.longitude,

              s.moisture,

              s.temperature,

              s.humidity,

              s.nitrogen,

              s.phosphorus,

              s.potassium,

              s.roll,

              s.pitch,

              s.yaw,

              s.accX,

              s.accY,

              s.accZ,

              s.battery

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

    }
  );


/* =========================================================
   TIMESTAMP DISPLAY
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
   CROP INPUTS
========================================================= */

function updateRecommendationInputs(
  data
) {

  el(
    "recN"
  ).value =
    data.nitrogen;


  el(
    "recP"
  ).value =
    data.phosphorus;


  el(
    "recK"
  ).value =
    data.potassium;


  el(
    "recMoisture"
  ).value =
    data.soil;


  el(
    "recTemp"
  ).value =
    data.temperature;


  el(
    "recHumidity"
  ).value =
    data.humidity;

}


/* =========================================================
   SIMPLE CROP RECOMMENDATION
========================================================= */

const crops = [

  {
    name:
      "Rice",

    emoji:
      "🌾",

    base:
      82
  },

  {
    name:
      "Maize",

    emoji:
      "🌽",

    base:
      74
  },

  {
    name:
      "Wheat",

    emoji:
      "🌿",

    base:
      63
  }

];


function runCropRecommendation() {

  const moisture =
    Number(
      el(
        "recMoisture"
      ).value
    );


  const temp =
    Number(
      el(
        "recTemp"
      ).value
    );


  const results =
    crops
      .map(
        crop => {

          let score =
            crop.base;


          if (
            crop.name ===
            "Rice"
          ) {

            score +=
              moisture >
              60
                ? 8
                : -8;


            score +=
              temp >
              25
                ? 4
                : -3;

          }


          return {

            ...crop,

            score:
              Math.max(
                10,
                Math.min(
                  98,
                  score
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


  setText(
    "bestCrop",
    results[0]
      .name
  );


  setText(
    "cropScore",
    `${results[0].score}%`
  );


  setText(
    "cropReason",
    "Recommendation generated from current NPK, moisture, temperature and humidity."
  );


  el(
    "cropResults"
  ).innerHTML =
    results
      .map(
        crop =>
          `
          <div class="telemetry-card">

            <span class="telemetry-icon">
              ${crop.emoji}
            </span>

            <div>

              <small>
                ${crop.name}
              </small>

              <strong>
                ${crop.score}%
              </strong>

            </div>

          </div>
          `
      )
      .join("");

}


el("runCropModel")
  ?.addEventListener(
    "click",
    runCropRecommendation
  );


el("generateRecommendation")
  ?.addEventListener(
    "click",
    () => {

      navigate(
        "crop"
      );


      runCropRecommendation();

    }
  );


/* =========================================================
   GUI -> BASE STATION COMMAND
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


    const encoder =
      new TextEncoder();


    await writer.write(
      encoder.encode(
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
   ROVER COMMANDS
========================================================= */

el("startMission")
  ?.addEventListener(
    "click",
    async () => {

      await sendBaseCommand(
        "ROVER,START"
      );


      setText(
        "missionStatus",
        "Starting..."
      );

    }
  );


el("pauseMission")
  ?.addEventListener(
    "click",
    async () => {

      if (
        !state.paused
      ) {

        await sendBaseCommand(
          "ROVER,PAUSE"
        );


        state.paused =
          true;


        setText(
          "pauseMission",
          "Resume"
        );

      }

      else {

        await sendBaseCommand(
          "ROVER,RESUME"
        );


        state.paused =
          false;


        setText(
          "pauseMission",
          "Pause"
        );

      }

    }
  );


async function takeSample() {

  await sendBaseCommand(
    "ROVER,SAMPLE"
  );

}


el("takeSample")
  ?.addEventListener(
    "click",
    takeSample
  );


el("takeSample2")
  ?.addEventListener(
    "click",
    takeSample
  );


/* =========================================================
   MANUAL COMMANDS
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
            ).value;


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


el("manualSpeed")
  ?.addEventListener(
    "input",
    event => {

      setText(
        "manualSpeedValue",
        `${event.target.value} m/s`
      );

    }
  );


el("manualStop")
  ?.addEventListener(
    "click",
    () =>
      sendBaseCommand(
        "ROVER,STOP"
      )
  );


/* =========================================================
   FERTILIZER
========================================================= */

document
  .querySelectorAll(
    ".valve"
  )
  .forEach(
    button => {

      button.onclick =
        async () => {

          const valve =
            button.dataset.valve;


          const isOpen =
            button.classList.contains(
              "on"
            );


          const action =
            isOpen
              ? "CLOSE"
              : "OPEN";


          const sent =
            await sendBaseCommand(
              `FERT,${valve},${action}`
            );


          /*
             Temporary UI feedback.

             Later change this only
             after Base Station ACK.
          */

          if (
            sent
          ) {

            button.classList.toggle(
              "on"
            );


            button
              .querySelector(
                "b"
              )
              .textContent =
                action;

          }

        };

    }
  );


el("startSpray")
  ?.addEventListener(
    "click",
    async () => {

      await sendBaseCommand(
        "FERT,PUMP,ON"
      );


      setText(
        "pumpStatus",
        "ON"
      );

    }
  );


el("pauseSpray")
  ?.addEventListener(
    "click",
    async () => {

      await sendBaseCommand(
        "FERT,PUMP,OFF"
      );


      setText(
        "pumpStatus",
        "OFF"
      );

    }
  );


el("stopSpray")
  ?.addEventListener(
    "click",
    async () => {

      await sendBaseCommand(
        "FERT,ALL_OFF"
      );


      setText(
        "pumpStatus",
        "OFF"
      );

    }
  );


/* =========================================================
   EMERGENCY
========================================================= */

el("emergencyBtn")
  ?.addEventListener(
    "click",
    async () => {

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
        "Emergency Stop"
      );


      setText(
        "modeLabel",
        "Emergency"
      );


      toast(
        "Emergency stop sent"
      );

    }
  );


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
    systemAlerts.length ===
    0
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
          <article class="alert">

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


el("clearAlerts")
  ?.addEventListener(
    "click",
    () => {

      systemAlerts =
        [];


      renderAlerts();

    }
  );


/* =========================================================
   HISTORY NAVIGATION
========================================================= */

el("openCurrentHistory")
  ?.addEventListener(
    "click",
    () =>
      navigate(
        "sensor"
      )
  );


/* =========================================================
   INITIALIZATION
========================================================= */

renderHistory();

renderAlerts();

updateTimestampDisplay();

updateBaseStatus(
  false
);

setRoverOnline(
  false
);


initializeRoverMaps();


setText(
  "historySampleCount",
  sensorRows.length
);


console.log(
  "AgriRover V10 loaded"
);


console.log(
  "Expected packet:"
);


console.log(
  "Data: PACKET,LAT,LON,SOIL,TEMP,HUMIDITY,N,P,K,ROLL,PITCH,YAW,ACC_X,ACC_Y,ACC_Z,BATTERY"
);
