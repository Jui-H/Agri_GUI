/* =========================================================
   AGRIROVER FRONTEND
   VERSION 8
   FINAL 16-FIELD TELEMETRY FORMAT
========================================================= */


/* =========================================================
   GLOBAL STATE
========================================================= */

const state = {
  running: false,
  paused: false,
  emergency: false,

  battery: 0,

  rows: 8,
  cols: 8,
  totalZones: 64,

  sprayProgress: 0
};


/* =========================================================
   SERIAL / BASE STATION
========================================================= */

let serialPort = null;
let serialReader = null;
let serialBuffer = "";

let baseStationConnected = false;

let lastRoverPacketAt = null;
let lastSensorUpdate = null;

let latestTelemetry = null;


/* =========================================================
   CAMERA
========================================================= */

let cameraStreamUrl = "";


/* =========================================================
   HEATMAP
========================================================= */

const liveZoneData = new Map();

let selectedHeatmapNutrient = "n";


/* =========================================================
   HISTORY
========================================================= */

const STORAGE_KEY =
  "agriroverSensorHistoryV8";


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


/* =========================================================
   PRESCRIPTION DATA
========================================================= */

let prescriptions = [];


/* =========================================================
   ALERT DATA
========================================================= */

let systemAlerts = [];


/* =========================================================
   SAFE DOM HELPER
========================================================= */

function el(id) {
  return document.getElementById(id);
}


function setText(id, value) {

  const element =
    el(id);

  if (element) {
    element.textContent = value;
  }

}


/* =========================================================
   TOAST
========================================================= */

function toast(message) {

  const box =
    el("toast");

  if (!box) return;

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


/* =========================================================
   TIME FORMAT
========================================================= */

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


/* =========================================================
   CLOCK
========================================================= */

function updateClock() {

  setText(
    "clockText",
    new Date().toLocaleString()
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

function navigate(pageId) {

  document
    .querySelectorAll(".page")
    .forEach(page => {

      page.classList.remove(
        "active"
      );

    });


  document
    .querySelectorAll(".nav-item")
    .forEach(item => {

      item.classList.remove(
        "active"
      );

    });


  const page =
    el(pageId);

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


  const sidebar =
    el("sidebar");

  if (sidebar) {

    sidebar.classList.remove(
      "open"
    );

  }
}


document
  .querySelectorAll(".nav-item")
  .forEach(button => {

    button.onclick =
      () =>
        navigate(
          button.dataset.page
        );

  });


if (el("menuBtn")) {

  el("menuBtn").onclick =
    () => {

      el("sidebar")
        ?.classList
        .toggle("open");

    };
}


/* =========================================================
   CONNECT BASE STATION
========================================================= */

async function connectBaseStation() {

  if (baseStationConnected) {

    await disconnectBaseStation();

    return;
  }


  if (!("serial" in navigator)) {

    alert(
      "Web Serial is not supported.\n\n" +
      "Please use desktop Google Chrome or Microsoft Edge."
    );

    return;
  }


  try {

    console.log(
      "Requesting serial port..."
    );


    serialPort =
      await navigator.serial.requestPort();


    /*
      Small Windows delay before opening.
    */

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          300
        )
    );


    console.log(
      "Opening serial port..."
    );


    await serialPort.open({
      baudRate: 115200,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
      flowControl: "none",
      bufferSize: 255
    });


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


    console.log(
      "Serial port opened successfully."
    );


    readSerialLoop();

  }

  catch (error) {

    console.error(
      "Base station connection error:",
      error
    );


    baseStationConnected =
      false;


    updateBaseStationStatus(
      false
    );


    if (
      error.name ===
      "NotFoundError"
    ) {

      toast(
        "No serial port selected"
      );

    }

    else if (
      error.name ===
      "InvalidStateError"
    ) {

      toast(
        "Serial port is already open"
      );

    }

    else {

      toast(
        `Connection failed: ${
          error.message ||
          error.name
        }`
      );

    }


    addAlert(
      "error",
      "Base station connection failed",
      error.message ||
      error.name
    );
  }
}


/* =========================================================
   DISCONNECT BASE STATION
========================================================= */

async function disconnectBaseStation() {

  try {

    if (serialReader) {

      await serialReader.cancel();

    }

  }

  catch (error) {

    console.log(
      "Reader cancel:",
      error
    );

  }


  try {

    if (
      serialPort &&
      serialPort.readable === null
    ) {

      await serialPort.close();

    }

  }

  catch (error) {

    console.log(
      "Port close:",
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


/* =========================================================
   BASE STATUS UI
========================================================= */

function updateBaseStationStatus(
  connected
) {

  const dot =
    el("baseStatusDot");

  const text =
    el("baseStatusText");

  const button =
    el("connectBaseStation");


  if (connected) {

    dot?.classList.remove(
      "disconnected-dot"
    );

    dot?.classList.add(
      "connected-dot"
    );


    if (text) {

      text.textContent =
        "Connected";

    }


    if (button) {

      button.textContent =
        "✓ Connected";

      button.classList.add(
        "connected"
      );

    }

  }

  else {

    dot?.classList.remove(
      "connected-dot"
    );

    dot?.classList.add(
      "disconnected-dot"
    );


    if (text) {

      text.textContent =
        "Disconnected";

    }


    if (button) {

      button.textContent =
        "🔌 Connect";

      button.classList.remove(
        "connected"
      );

    }
  }
}


if (el("connectBaseStation")) {

  el("connectBaseStation").onclick =
    connectBaseStation;
}


/* =========================================================
   USB DISCONNECT EVENT
========================================================= */

if (
  navigator.serial
) {

  navigator.serial.addEventListener(
    "disconnect",
    () => {

      baseStationConnected =
        false;

      serialPort = null;

      updateBaseStationStatus(
        false
      );

      toast(
        "Base Station disconnected"
      );

    }
  );
}


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


          if (done) {
            break;
          }


          if (!value) {
            continue;
          }


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
            const rawLine
            of lines
          ) {

            const line =
              rawLine.trim();


            if (!line) {
              continue;
            }


            /*
              EVERYTHING is shown in raw monitor.
            */

            addTelemetryConsoleLine(
              line
            );


            /*
              Then relevant lines are parsed.
            */

            processSerialLine(
              line
            );
          }
        }

      }

      finally {

        if (serialReader) {

          serialReader.releaseLock();

        }

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
      error.message ||
      "Unknown serial error"
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
   PROCESS SERIAL LINE

   Your ESP32 currently prints:

   ========== PACKET RECEIVED ==========
   Data: 426,...
   RSSI: -108 dBm
   SNR: 7.25
   =====================================

   Only Data: is actual rover telemetry.
========================================================= */

function processSerialLine(line) {

  /*
     MAIN TELEMETRY
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


    if (telemetry) {

      processRoverTelemetry(
        telemetry
      );

    }

    return;
  }


  /*
     Optional clean packet without Data:
     Also accepted if exactly 16 CSV fields.
  */

  if (
    line.includes(",")
  ) {

    const values =
      line.split(",");


    if (
      values.length === 16
    ) {

      const telemetry =
        parseTelemetry(
          line
        );


      if (telemetry) {

        processRoverTelemetry(
          telemetry
        );

      }

      return;
    }
  }


  /*
     RSSI
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


    if (match) {

      const rssi =
        Number(
          match[0]
        );


      setText(
        "telemetryRssi",
        `${rssi} dBm`
      );

    }

    return;
  }


  /*
     SNR
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


    if (match) {

      const snr =
        Number(
          match[0]
        );


      setText(
        "telemetrySnr",
        `${snr} dB`
      );

    }
  }
}


/* =========================================================
   FINAL TELEMETRY PARSER

   EXACT SEQUENCE:

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

function parseTelemetry(line) {

  let dataLine =
    line.trim();


  /*
     Remove Data:
  */

  if (
    dataLine.startsWith(
      "Data:"
    )
  ) {

    dataLine =
      dataLine
        .substring(5)
        .trim();
  }


  const values =
    dataLine
      .split(",")
      .map(
        value =>
          value.trim()
      );


  console.log(
    "Telemetry fields received:",
    values.length
  );


  /*
     MUST HAVE EXACTLY 16 VALUES
  */

  if (
    values.length !== 16
  ) {

    console.warn(
      "Invalid telemetry packet."
    );

    console.warn(
      "Expected 16 fields but received:",
      values.length
    );

    console.warn(
      dataLine
    );


    addAlert(
      "warning",
      "Invalid telemetry packet",
      `Expected 16 fields, received ${values.length}`
    );


    return null;
  }


  const telemetry = {

    packetNumber:
      Number(values[0]),

    latitude:
      Number(values[1]),

    longitude:
      Number(values[2]),

    soil:
      Number(values[3]),

    moisture:
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


  /*
     Reject malformed numeric packets.
  */

  const numericFields = [

    telemetry.packetNumber,
    telemetry.latitude,
    telemetry.longitude,
    telemetry.soil,
    telemetry.temperature,
    telemetry.humidity,
    telemetry.nitrogen,
    telemetry.phosphorus,
    telemetry.potassium,
    telemetry.roll,
    telemetry.pitch,
    telemetry.yaw,
    telemetry.accX,
    telemetry.accY,
    telemetry.accZ,
    telemetry.battery

  ];


  if (
    numericFields.some(
      value =>
        Number.isNaN(value)
    )
  ) {

    console.warn(
      "Telemetry contains invalid numeric values:",
      telemetry
    );

    return null;
  }


  console.log(
    "Parsed telemetry:",
    telemetry
  );


  return telemetry;
}


/* =========================================================
   PROCESS VALID ROVER PACKET
========================================================= */

function processRoverTelemetry(
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


  /*
     Rover is alive.
  */

  setRoverOnline(
    true
  );


  /*
     Update main telemetry page.
  */

  updateLiveTelemetry(
    data
  );


  /*
     Update dashboard NPK.
  */

  updateNpkGauges(
    data
  );


  /*
     Update dashboard battery.
  */

  updateBatteryUi(
    data.battery
  );


  /*
     Update position.
  */

  setText(
    "zoneGps",
    `${data.latitude.toFixed(6)}° N, ${data.longitude.toFixed(6)}° E`
  );


  /*
     Environmental data.
  */

  setText(
    "zoneMoisture",
    `${data.soil.toFixed(1)}%`
  );


  setText(
    "zoneTemperature",
    `${data.temperature.toFixed(1)} °C`
  );


  setText(
    "zoneHumidity",
    `${data.humidity.toFixed(1)}%`
  );


  /*
     No pH is currently transmitted.
  */

  setText(
    "zonePh",
    "N/A"
  );


  /*
     Live Rover page.
  */

  updateLiveRoverPage(
    data
  );


  /*
     History.
  */

  saveTelemetrySample(
    data
  );


  /*
     Recommendation fields.
  */

  updateRecommendationInputs(
    data
  );


  /*
     Time.
  */

  updateTimestampDisplay();
}


/* =========================================================
   LIVE TELEMETRY PAGE
========================================================= */

function updateLiveTelemetry(
  data
) {

  /*
     HEADER
  */

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


  /*
     NPK
  */

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


  /*
     ENVIRONMENT
  */

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


  /*
     GPS
  */

  setText(
    "telemetryGps",
    `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`
  );


  setText(
    "telemetryGpsStatus",
    (
      data.latitude !== 0 ||
      data.longitude !== 0
    )
      ? "GPS Fix"
      : "No GPS Fix"
  );


  /*
     BATTERY
  */

  setText(
    "telemetryBattery",
    `${Math.round(data.battery)}%`
  );


  /*
     IMU
  */

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


  /*
     TELEMETRY STATUS
  */

  setText(
    "telemetryStatusText",
    "Receiving telemetry"
  );


  const dot =
    el("telemetryStatusDot");


  dot?.classList.remove(
    "disconnected-dot"
  );


  dot?.classList.add(
    "connected-dot"
  );
}


/* =========================================================
   DATA AGE
========================================================= */

function updateDataAge() {

  if (
    !lastRoverPacketAt
  ) {

    setText(
      "telemetryDataAge",
      "--"
    );

    return;
  }


  const ageSeconds =
    (
      Date.now() -
      lastRoverPacketAt.getTime()
    ) / 1000;


  setText(
    "telemetryDataAge",
    `${ageSeconds.toFixed(1)} sec`
  );


  if (
    ageSeconds < 60
  ) {

    setText(
      "sensorDataAge",
      `${Math.floor(ageSeconds)} sec ago`
    );

  }

  else {

    setText(
      "sensorDataAge",
      `${Math.floor(
        ageSeconds / 60
      )} min ago`
    );

  }
}


setInterval(
  updateDataAge,
  500
);


/* =========================================================
   ROVER ONLINE
========================================================= */

function setRoverOnline(
  online
) {

  const dot =
    el("roverStatusDot");


  if (online) {

    dot?.classList.remove(
      "disconnected-dot"
    );


    dot?.classList.add(
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


    if (
      el("sideRoverStatus")
    ) {

      el("sideRoverStatus")
        .className =
          "ok";

    }

  }

  else {

    dot?.classList.remove(
      "connected-dot"
    );


    dot?.classList.add(
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


    if (
      el("sideRoverStatus")
    ) {

      el("sideRoverStatus")
        .className =
          "";

    }
  }
}


/*
   Mark rover offline if no packet
   arrives for more than 8 seconds.

   Rover currently transmits every
   ~5 seconds.
*/

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
      age > 8000
    ) {

      setRoverOnline(
        false
      );


      setText(
        "telemetryStatusText",
        "Telemetry Lost"
      );


      const dot =
        el("telemetryStatusDot");


      dot?.classList.remove(
        "connected-dot"
      );


      dot?.classList.add(
        "disconnected-dot"
      );

    }

  },
  1000
);


/* =========================================================
   BATTERY
========================================================= */

function updateBatteryUi(
  battery
) {

  const value =
    Math.max(
      0,
      Math.min(
        100,
        battery
      )
    );


  setText(
    "batteryValue",
    `${Math.round(value)}%`
  );


  setText(
    "sideBattery",
    `${Math.round(value)}%`
  );


  setText(
    "liveRoverBattery",
    `${Math.round(value)}%`
  );


  if (
    el("batteryBar")
  ) {

    el("batteryBar")
      .style.width =
        `${value}%`;

  }


  if (
    el("sideBatteryBar")
  ) {

    el("sideBatteryBar")
      .style.width =
        `${value}%`;

  }
}


/* =========================================================
   NPK DASHBOARD
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


  setText(
    "sensorStatusText",
    "Receiving rover data"
  );


  const dot =
    el("sensorStatusDot");


  dot?.classList.remove(
    "disconnected-dot"
  );


  dot?.classList.add(
    "connected-dot"
  );
}


function updateGauge(
  id,
  value,
  maxValue
) {

  const element =
    el(id);


  if (!element)
    return;


  element.textContent =
    Math.round(value);


  const gauge =
    element.closest(
      ".gauge"
    );


  if (!gauge)
    return;


  const percentage =
    Math.max(
      0,
      Math.min(
        100,
        (
          value /
          maxValue
        ) * 100
      )
    );


  gauge.style.setProperty(
    "--value",
    percentage
  );
}


/* =========================================================
   LIVE ROVER PAGE
========================================================= */

function updateLiveRoverPage(
  data
) {

  setText(
    "liveRoverGps",
    `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`
  );


  setText(
    "liveRoverBattery",
    `${Math.round(data.battery)}%`
  );


  setText(
    "liveRoverStatus",
    "ONLINE"
  );


  setText(
    "liveRoverLastPacket",
    formatTimestamp(
      data.timestamp
    )
  );


  /*
     Not currently in rover packet.
  */

  setText(
    "liveRoverZone",
    "N/A"
  );


  setText(
    "liveRoverSpeed",
    "N/A"
  );
}


/* =========================================================
   SENSOR TIMESTAMP
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
   RAW TELEMETRY CONSOLE
========================================================= */

function addTelemetryConsoleLine(
  packet
) {

  const box =
    el("telemetryConsole");


  if (!box)
    return;


  const empty =
    box.querySelector(
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


  /*
     Keep latest 200 lines.
  */

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


if (
  el("clearTelemetryConsole")
) {

  el("clearTelemetryConsole").onclick =
    () => {

      el("telemetryConsole")
        .innerHTML =
          `
          <div class="console-empty">
            Waiting for rover packets...
          </div>
          `;

    };
}


/* =========================================================
   SAVE TELEMETRY HISTORY
========================================================= */

function saveTelemetrySample(
  data
) {

  const sample = {

    timestamp:
      new Date().toISOString(),

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


  /*
     Avoid gigantic localStorage.
  */

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
      STORAGE_KEY,
      JSON.stringify(
        sensorRows
      )
    );

  }

  catch (error) {

    console.error(
      "History save error:",
      error
    );

  }


  renderSensorHistory();


  setText(
    "historySampleCount",
    sensorRows.length
  );
}


/* =========================================================
   SENSOR HISTORY TABLE
========================================================= */

function renderSensorHistory(
  rows = sensorRows
) {

  const tbody =
    el("sensorHistory");


  if (!tbody)
    return;


  if (
    rows.length === 0
  ) {

    tbody.innerHTML =
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


  tbody.innerHTML =
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
              ${sample.packetNumber ?? "--"}
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
    `Showing ${rows.length} of ${sensorRows.length} samples`
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
   VIEW HISTORICAL SAMPLE
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


  if (!sample)
    return;


  navigate(
    "telemetry"
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
    "telemetryPacketNumber",
    sample.packetNumber
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
    "HISTORICAL DATA"
  );
}


/* =========================================================
   HISTORY FILTER

   Since current packets have NO ZONE,
   filtering is date-based only.
========================================================= */

function filterHistory() {

  const from =
    el("historyFrom")
      ?.value;


  const to =
    el("historyTo")
      ?.value;


  const filtered =
    sensorRows.filter(
      sample => {

        const time =
          new Date(
            sample.timestamp
          );


        const after =
          !from ||
          time >=
            new Date(
              `${from}T00:00:00`
            );


        const before =
          !to ||
          time <=
            new Date(
              `${to}T23:59:59`
            );


        return (
          after &&
          before
        );
      }
    );


  renderSensorHistory(
    filtered
  );
}


if (
  el("filterHistory")
) {

  el("filterHistory").onclick =
    filterHistory;

}


if (
  el("resetHistoryFilter")
) {

  el("resetHistoryFilter").onclick =
    () => {

      if (
        el("historyFrom")
      ) {

        el("historyFrom").value =
          "";

      }


      if (
        el("historyTo")
      ) {

        el("historyTo").value =
          "";

      }


      renderSensorHistory();

    };
}


/* =========================================================
   EXPORT HISTORY CSV
========================================================= */

function exportHistoryCsv() {

  const header = [

    "Timestamp",

    "Packet Number",

    "Latitude",
    "Longitude",

    "Soil Moisture",

    "Temperature",
    "Humidity",

    "Nitrogen",
    "Phosphorus",
    "Potassium",

    "Roll",
    "Pitch",
    "Yaw",

    "Acc X",
    "Acc Y",
    "Acc Z",

    "Battery"

  ];


  const rows =
    sensorRows.map(
      sample =>
        [

          sample.timestamp,

          sample.packetNumber,

          sample.latitude,
          sample.longitude,

          sample.moisture,

          sample.temperature,
          sample.humidity,

          sample.nitrogen,
          sample.phosphorus,
          sample.potassium,

          sample.roll,
          sample.pitch,
          sample.yaw,

          sample.accX,
          sample.accY,
          sample.accZ,

          sample.battery

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
    "agrirover-telemetry.csv";


  link.click();


  URL.revokeObjectURL(
    link.href
  );
}


if (
  el("exportHistoryCsv")
) {

  el("exportHistoryCsv").onclick =
    exportHistoryCsv;

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


  let writer = null;


  try {

    writer =
      serialPort.writable
        .getWriter();


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
      "Command transmission error:",
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
   MISSION COMMANDS
========================================================= */

if (
  el("startMission")
) {

  el("startMission").onclick =
    async () => {

      const sent =
        await sendBaseCommand(
          "ROVER,START"
        );


      if (sent) {

        setText(
          "missionStatus",
          "Starting..."
        );

      }
    };
}


if (
  el("pauseMission")
) {

  el("pauseMission").onclick =
    async () => {

      if (
        !state.paused
      ) {

        const sent =
          await sendBaseCommand(
            "ROVER,PAUSE"
          );


        if (sent) {

          state.paused =
            true;


          setText(
            "pauseMission",
            "Resume"
          );

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


          setText(
            "pauseMission",
            "Pause"
          );

        }
      }
    };
}


/* =========================================================
   TAKE SAMPLE
========================================================= */

async function takeSample() {

  await sendBaseCommand(
    "ROVER,SAMPLE"
  );
}


if (
  el("takeSample")
) {

  el("takeSample").onclick =
    takeSample;

}


if (
  el("takeSample2")
) {

  el("takeSample2").onclick =
    takeSample;

}


/* =========================================================
   EMERGENCY STOP
========================================================= */

if (
  el("emergencyBtn")
) {

  el("emergencyBtn").onclick =
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


      setText(
        "pumpStatus",
        "OFF"
      );


      toast(
        "Emergency stop sent"
      );
    };
}


/* =========================================================
   MANUAL ROVER CONTROL
========================================================= */

const roverCommandMap = {

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
            roverCommandMap[
              button.dataset.command
            ];


          const speed =
            el("manualSpeed")
              ?.value ??
              "0.5";


          const command =
            action === "STOP"
              ? "ROVER,STOP"
              : `ROVER,${action},${speed}`;


          const sent =
            await sendBaseCommand(
              command
            );


          if (sent) {

            setText(
              "manualCommand",
              `Sent: ${command}`
            );

          }
        };
    }
  );


if (
  el("manualSpeed")
) {

  el("manualSpeed").oninput =
    event => {

      setText(
        "manualSpeedValue",
        `${event.target.value} m/s`
      );

    };
}


if (
  el("manualStop")
) {

  el("manualStop").onclick =
    () =>
      sendBaseCommand(
        "ROVER,STOP"
      );

}


/* =========================================================
   FERTILIZER VALVES
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


          await sendBaseCommand(
            `FERT,${valve},${action}`
          );

        };
    }
  );


/* =========================================================
   PUMP
========================================================= */

if (
  el("startSpray")
) {

  el("startSpray").onclick =
    async () => {

      const sent =
        await sendBaseCommand(
          "FERT,PUMP,ON"
        );


      if (sent) {

        setText(
          "pumpStatus",
          "Starting..."
        );

      }
    };
}


if (
  el("pauseSpray")
) {

  el("pauseSpray").onclick =
    async () => {

      await sendBaseCommand(
        "FERT,PUMP,OFF"
      );

    };
}


if (
  el("stopSpray")
) {

  el("stopSpray").onclick =
    async () => {

      await sendBaseCommand(
        "FERT,ALL_OFF"
      );

    };
}


/* =========================================================
   BASE ACK

   Example:
   BASE,GUI,ACK,FERT,N,OPEN
========================================================= */

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

    const text =
      action === "ON"
        ? "Running"
        : "OFF";


    setText(
      "pumpStatus",
      text
    );


    setText(
      "sprinklerPumpState",
      text
    );


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


    setText(
      "pumpStatus",
      "OFF"
    );


    setText(
      "sprinklerPumpState",
      "OFF"
    );


    return;
  }


  updateValveUi(
    device,
    action === "OPEN"
  );
}


/* =========================================================
   VALVE UI
========================================================= */

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


/* =========================================================
   CAMERA
========================================================= */

function setCameraStream(
  url
) {

  cameraStreamUrl =
    url;


  const smallCamera =
    el("roverCamera");


  const largeCamera =
    el("largeRoverCamera");


  if (!url) {

    setCameraOffline();

    return;
  }


  if (smallCamera) {

    smallCamera.src =
      url;

    smallCamera.style.display =
      "block";

  }


  if (largeCamera) {

    largeCamera.src =
      url;

    largeCamera.style.display =
      "block";

  }


  if (
    el("cameraPlaceholder")
  ) {

    el("cameraPlaceholder")
      .style.display =
        "none";

  }


  if (
    el("largeCameraPlaceholder")
  ) {

    el("largeCameraPlaceholder")
      .style.display =
        "none";

  }


  setText(
    "cameraStatusText",
    "Live"
  );


  setText(
    "cameraConnection",
    "Connected"
  );


  setText(
    "cameraStreamStatus",
    "Streaming"
  );


  setText(
    "cameraLiveLabel",
    "● LIVE"
  );


  setText(
    "largeCameraStatus",
    "Live"
  );


  const dot =
    el("cameraStatusDot");


  dot?.classList.remove(
    "disconnected-dot"
  );


  dot?.classList.add(
    "connected-dot"
  );
}


function setCameraOffline() {

  if (
    el("roverCamera")
  ) {

    el("roverCamera")
      .style.display =
        "none";

  }


  if (
    el("largeRoverCamera")
  ) {

    el("largeRoverCamera")
      .style.display =
        "none";

  }


  if (
    el("cameraPlaceholder")
  ) {

    el("cameraPlaceholder")
      .style.display =
        "flex";

  }


  if (
    el("largeCameraPlaceholder")
  ) {

    el("largeCameraPlaceholder")
      .style.display =
        "flex";

  }


  setText(
    "cameraStatusText",
    "Offline"
  );


  setText(
    "cameraConnection",
    "Disconnected"
  );


  setText(
    "cameraStreamStatus",
    "Waiting"
  );


  setText(
    "cameraLiveLabel",
    "● OFFLINE"
  );


  setText(
    "largeCameraStatus",
    "Offline"
  );


  const dot =
    el("cameraStatusDot");


  dot?.classList.remove(
    "connected-dot"
  );


  dot?.classList.add(
    "disconnected-dot"
  );
}


/* =========================================================
   CROP RECOMMENDATION INPUTS
========================================================= */

function updateRecommendationInputs(
  data
) {

  if (
    el("recN")
  ) {

    el("recN").value =
      data.nitrogen;

  }


  if (
    el("recP")
  ) {

    el("recP").value =
      data.phosphorus;

  }


  if (
    el("recK")
  ) {

    el("recK").value =
      data.potassium;

  }


  if (
    el("recMoisture")
  ) {

    el("recMoisture").value =
      data.soil;

  }


  if (
    el("recTemp")
  ) {

    el("recTemp").value =
      data.temperature;

  }


  if (
    el("recHumidity")
  ) {

    el("recHumidity").value =
      data.humidity;

  }
}


/* =========================================================
   CROP RECOMMENDATION
========================================================= */

const cropProfiles = [

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


function runCropRecommendation() {

  const n =
    Number(
      el("recN")?.value ||
      0
    );


  const p =
    Number(
      el("recP")?.value ||
      0
    );


  const moisture =
    Number(
      el("recMoisture")
        ?.value ||
      0
    );


  const temperature =
    Number(
      el("recTemp")
        ?.value ||
      0
    );


  const results =
    cropProfiles
      .map(
        crop => {

          let score =
            crop.base;


          if (
            crop.name ===
            "Rice"
          ) {

            score +=
              moisture >= 60
                ? 8
                : -10;


            score +=
              temperature >= 25
                ? 4
                : -4;

          }


          if (
            crop.name ===
            "Maize"
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
            crop.name ===
            "Wheat"
          ) {

            score +=
              temperature < 25
                ? 8
                : -7;

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
                Math.round(
                  score
                )
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


  if (
    el("cropResults")
  ) {

    el("cropResults")
      .innerHTML =
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

                  <span
                    class="badge ${
                      index === 0
                        ? "green"
                        : "blue"
                    }"
                  >
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

  }


  setText(
    "bestCrop",
    results[0].name
  );


  setText(
    "cropScore",
    `${results[0].score}%`
  );


  setText(
    "cropReason",
    "Recommendation generated from the current NPK, soil moisture, temperature and humidity measurements."
  );
}


if (
  el("runCropModel")
) {

  el("runCropModel").onclick =
    runCropRecommendation;

}


if (
  el("generateRecommendation")
) {

  el("generateRecommendation").onclick =
    () => {

      navigate(
        "crop"
      );


      runCropRecommendation();

    };
}


/* =========================================================
   HEATMAP

   Your current telemetry does not contain
   zone information yet.

   So heatmap waits until zone support is
   added to rover telemetry.
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


  const thresholds = {

    n:
      [20, 35, 50, 70],

    p:
      [10, 18, 30, 45],

    k:
      [70, 100, 150, 200]

  };


  const range =
    thresholds[
      nutrient
    ];


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
    el(containerId);


  if (!container)
    return;


  container.innerHTML =
    "";


  container.style
    .gridTemplateColumns =
      `repeat(${state.cols},1fr)`;


  for (
    let i = 1;
    i <= state.totalZones;
    i++
  ) {

    const zone =
      `Z-${String(i)
        .padStart(2, "0")}`;


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


if (
  el("heatmapType")
) {

  el("heatmapType").onchange =
    event => {

      selectedHeatmapNutrient =
        event.target.value;


      if (
        el("largeHeatmapType")
      ) {

        el("largeHeatmapType")
          .value =
            event.target.value;

      }


      renderRealHeatmaps();

    };
}


if (
  el("largeHeatmapType")
) {

  el("largeHeatmapType").onchange =
    event => {

      selectedHeatmapNutrient =
        event.target.value;


      if (
        el("heatmapType")
      ) {

        el("heatmapType").value =
          event.target.value;

      }


      renderRealHeatmaps();

    };
}


/* =========================================================
   PRESCRIPTION
========================================================= */

function renderPrescription() {

  const dashboard =
    el("prescriptionBody");


  const full =
    el("prescriptionBody2");


  if (
    prescriptions.length === 0
  ) {

    if (dashboard) {

      dashboard.innerHTML =
        `
        <tr>
          <td colspan="8">
            Waiting for zone-wise soil measurements.
          </td>
        </tr>
        `;

    }


    if (full) {

      full.innerHTML =
        `
        <tr>
          <td colspan="9">
            Waiting for zone-wise soil measurements.
          </td>
        </tr>
        `;

    }
  }
}


/* =========================================================
   ALERTS
========================================================= */

function addAlert(
  type,
  title,
  detail
) {

  const icons = {

    success:
      "✓",

    warning:
      "⚠",

    info:
      "ℹ",

    error:
      "✕"

  };


  systemAlerts.unshift({

    type,

    icon:
      icons[type] ||
      "ℹ",

    title,

    detail,

    time:
      new Date()
        .toLocaleTimeString()

  });


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
    el("allAlerts");


  if (!container)
    return;


  if (
    systemAlerts.length === 0
  ) {

    container.innerHTML =
      `
      <article class="alert info">

        <span>ℹ</span>

        <div>

          <strong>
            No events
          </strong>

          <small>
            Waiting for system activity.
          </small>

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
          <article
            class="alert ${alert.type}"
          >

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


if (
  el("clearAlerts")
) {

  el("clearAlerts").onclick =
    () => {

      systemAlerts =
        [];


      renderAlerts();

    };
}


/* =========================================================
   FIELD SETUP
========================================================= */

if (
  el("generateGrid")
) {

  el("generateGrid").onclick =
    () => {

      state.rows =
        Number(
          el("fieldRows")
            ?.value ||
          8
        );


      state.cols =
        Number(
          el("fieldCols")
            ?.value ||
          8
        );


      state.totalZones =
        state.rows *
        state.cols;


      renderRealHeatmaps();


      toast(
        `Field updated to ${state.rows} × ${state.cols}`
      );

    };
}


/* =========================================================
   MISSION HISTORY NAVIGATION
========================================================= */

if (
  el("openCurrentHistory")
) {

  el("openCurrentHistory").onclick =
    () =>
      navigate(
        "sensor"
      );

}


/* =========================================================
   INITIALIZATION
========================================================= */

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


setText(
  "historySampleCount",
  sensorRows.length
);


/*
  Debug information.
*/

console.log(
  "AgriRover GUI V8 loaded."
);

console.log(
  "Expected telemetry:"
);

console.log(
  "Data: PACKET,LAT,LON,SOIL,TEMP,HUMIDITY,N,P,K,ROLL,PITCH,YAW,ACC_X,ACC_Y,ACC_Z,BATTERY"
);
