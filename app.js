/* =========================================================
   AGRIROVER GUI V17

   ROVER -> GUI TELEMETRY

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
   17 BATTERY

   Accepts:
   Data:
   Data :
   DATA:
   DATA :
========================================================= */


/* =========================================================
   BATTERY CONFIGURATION
========================================================= */

/*
   "AUTO"
       78   -> interpreted as 78%
       7.82 -> interpreted as battery voltage

   "PERCENT"
       last field is always percentage

   "VOLTAGE"
       last field is always voltage
*/

const BATTERY_INPUT_MODE =
  "AUTO";


/*
   Voltage limits below are currently set
   for a 2S Li-ion / LiPo battery.

   Change these later if your rover battery
   is different.
*/

const BATTERY_FULL_VOLTAGE =
  8.4;

const BATTERY_EMPTY_VOLTAGE =
  6.4;


/* =========================================================
   SAMPLING / FERTILIZATION GEOMETRY
========================================================= */

const SAMPLING_AREA_SIZE_FT = 1.5;
const SAMPLES_PER_FERTILIZATION_AREA = 4;
const FERTILIZATION_AREA_SIZE_FT = 6;
const FERTILIZATION_AREA_M2 =
  FERTILIZATION_AREA_SIZE_FT *
  FERTILIZATION_AREA_SIZE_FT *
  0.09290304;


/* =========================================================
   FERTILIZER CALIBRATION

   Concentration = grams of nutrient per litre of solution.
   Flow = measured liquid flow in mL/min.
   Zero means calibration has not been entered yet.
========================================================= */

const fertilizerCalibration = {
  nConcentration: Number(localStorage.getItem("agriroverNConcentration") || 0),
  pConcentration: Number(localStorage.getItem("agriroverPConcentration") || 0),
  kConcentration: Number(localStorage.getItem("agriroverKConcentration") || 0),
  nFlow: Number(localStorage.getItem("agriroverNFlow") || 0),
  pFlow: Number(localStorage.getItem("agriroverPFlow") || 0),
  kFlow: Number(localStorage.getItem("agriroverKFlow") || 0)
};


/* =========================================================
   CROP DATA
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


const SURVEY_OPTION = {
  key: "RECOMMEND",
  name: "Not sure — Recommend a crop",
  bangla: "ফসল নির্ধারিত নয় — সুপারিশ নিন",
  type: "Decision Support",
  n: null,
  p: null,
  k: null,
  condition: "Field survey first. A closest nutrient-profile crop match will be suggested after sampling.",
  isSurvey: true
};


/* =========================================================
   STATE
========================================================= */

const state = {

  paused: false,

  emergency: false,

  selectedCrop: null,

  cropSent: false,

  recommendedCrop: null,

  nutrientReferences: { n: 0, p: 0, k: 0 },

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
   ROVER MAP
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

let sampleSignatures =
  new Set();

let fertilizationAreas =
  [];


/* =========================================================
   HISTORY
========================================================= */

const HISTORY_KEY =
  "agriroverTelemetryV15";

let sensorRows =
  loadHistory();

let systemAlerts =
  [];


/* =========================================================
   BASIC HELPERS
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


function cropByKey(
  key
) {

  if (
    key === SURVEY_OPTION.key
  ) {
    return SURVEY_OPTION;
  }

  return CROP_DATA.find(
    crop =>
      crop.key === key
  ) || null;

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
      2500
    );

}


/* =========================================================
   BATTERY
========================================================= */

function batteryVoltageToPercent(
  voltage
) {

  const percent =
    (
      (
        voltage -
        BATTERY_EMPTY_VOLTAGE
      ) /
      (
        BATTERY_FULL_VOLTAGE -
        BATTERY_EMPTY_VOLTAGE
      )
    ) *
    100;


  return Math.round(
    clamp(
      percent,
      0,
      100
    )
  );

}


function processBatteryValue(
  rawValue
) {

  const value =
    Number(rawValue);


  if (
    !Number.isFinite(
      value
    )
  ) {

    return {

      raw:
        0,

      voltage:
        null,

      percent:
        0

    };

  }


  /*
     Always percentage
  */

  if (
    BATTERY_INPUT_MODE ===
    "PERCENT"
  ) {

    return {

      raw:
        value,

      voltage:
        null,

      percent:
        clamp(
          Math.round(
            value
          ),
          0,
          100
        )

    };

  }


  /*
     Always voltage
  */

  if (
    BATTERY_INPUT_MODE ===
    "VOLTAGE"
  ) {

    return {

      raw:
        value,

      voltage:
        value,

      percent:
        batteryVoltageToPercent(
          value
        )

    };

  }


  /*
     AUTO

     <= 20 looks like battery voltage.

     > 20 looks like percentage.
  */

  if (
    value <= 20
  ) {

    return {

      raw:
        value,

      voltage:
        value,

      percent:
        batteryVoltageToPercent(
          value
        )

    };

  }


  return {

    raw:
      value,

    voltage:
      null,

    percent:
      clamp(
        Math.round(
          value
        ),
        0,
        100
      )

  };

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

    toast(
      "Base Station is already connected"
    );

    return;

  }


  if (
    !(
      "serial" in
      navigator
    )
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
      "USB Serial connection established."
    );


    toast(
      "Base Station connected"
    );


    readSerialLoop();

  }

  catch (error) {

    console.error(
      "Serial connection:",
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

  addAlert(
    "info",
    "Base station disconnected",
    "USB Serial connection closed by user."
  );

  toast(
    "Base Station disconnected"
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

  const disconnectButton =
    el(
      "disconnectBaseStation"
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

    button.disabled =
      connected;

    button.classList.toggle(
      "connected",
      connected
    );

  }

  if (
    disconnectButton
  ) {
    disconnectButton.hidden =
      !connected;
  }

}


el(
  "connectBaseStation"
)
  ?.addEventListener(
    "click",
    connectBaseStation
  );


el(
  "disconnectBaseStation"
)
  ?.addEventListener(
    "click",
    disconnectBaseStation
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
      "Serial reader:",
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

  if (
    !line
  )
    return;


  line =
    String(
      line
    )
    .trim();


  /* =====================================================
     SYSTEM MESSAGES
  ===================================================== */

  if (
    line.includes(
      "SAMPLING_STARTED"
    )
  ) {

    handleSamplingStarted();

    return;

  }


  if (
    line.includes(
      "SAMPLING_DONE"
    )
  ) {

    handleSamplingDone();

    return;

  }


  if (
    line.includes(
      "MISSION_DONE"
    )
  ) {

    handleMissionDone();

    return;

  }


  if (
    line.includes(
      "FERTILIZING"
    )
  ) {

    setFertilizationState(
      "FERTILIZING"
    );


    return;

  }


  if (
    line === "ROVER,MODE_ACK,SURVEY"
  ) {

    state.cropSent = true;

    setText(
      "cropSelectionStatus",
      "Survey mode acknowledged"
    );

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

     This matches your ESP32 output:

     Data : 7,0.000000,...
  ===================================================== */

  if (
    /data\s*:/i.test(
      line
    )
  ) {

    console.log(
      "DATA LINE DETECTED:",
      line
    );


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

    else {

      console.error(
        "Telemetry parser returned NULL"
      );

    }


    return;

  }


  /* =====================================================
     RAW 18-FIELD CSV
  ===================================================== */

  if (
    line.includes(",")
  ) {

    const fields =
      line.split(",");


    if (
      fields.length ===
      18
    ) {

      const telemetry =
        parseRawCsvTelemetry(
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
    /rssi\s*:/i.test(
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
    /snr\s*:/i.test(
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


    return;

  }

}


/* =========================================================
   PARSE "DATA :" TELEMETRY
========================================================= */

function parseTelemetry(
  line
) {

  console.log(
    "parseTelemetry received:",
    line
  );


  /*
     Take everything AFTER the colon.

     This works for:
     Data:
     Data :
     DATA :
  */

  const colonIndex =
    line.indexOf(":");


  if (
    colonIndex === -1
  ) {

    console.error(
      "No colon found"
    );


    return null;

  }


  const csv =
    line
      .substring(
        colonIndex +
        1
      )
      .trim();


  return parseRawCsvTelemetry(
    csv
  );

}


/* =========================================================
   PARSE RAW CSV
========================================================= */

function parseRawCsvTelemetry(
  csv
) {

  const values =
    csv
      .split(",")
      .map(
        value =>
          value.trim()
      );


  console.log(
    "FIELD COUNT:",
    values.length
  );


  console.log(
    "FIELDS:",
    values
  );


  if (
    values.length !==
    18
  ) {

    console.error(
      `Expected 18 fields but received ${values.length}`
    );


    return null;

  }


  const batteryRaw =
    parseFloat(
      values[17]
    );


  const batteryInfo =
    processBatteryValue(
      batteryRaw
    );


  const data = {

    packetNumber:
      parseInt(
        values[0],
        10
      ),


    latitude:
      parseFloat(
        values[1]
      ),


    longitude:
      parseFloat(
        values[2]
      ),


    temperature:
      parseFloat(
        values[3]
      ),


    humidity:
      parseFloat(
        values[4]
      ),


    nitrogen:
      parseFloat(
        values[5]
      ),


    phosphorus:
      parseFloat(
        values[6]
      ),


    potassium:
      parseFloat(
        values[7]
      ),


    requiredN:
      parseFloat(
        values[8]
      ),


    requiredP:
      parseFloat(
        values[9]
      ),


    requiredK:
      parseFloat(
        values[10]
      ),


    roll:
      parseFloat(
        values[11]
      ),


    pitch:
      parseFloat(
        values[12]
      ),


    yaw:
      parseFloat(
        values[13]
      ),


    accX:
      parseFloat(
        values[14]
      ),


    accY:
      parseFloat(
        values[15]
      ),


    accZ:
      parseFloat(
        values[16]
      ),


    batteryRaw:
      batteryRaw,


    batteryVoltage:
      batteryInfo.voltage,


    battery:
      batteryInfo.percent,


    timestamp:
      new Date()

  };


  const requiredNumbers = [

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

    data.batteryRaw

  ];


  if (
    requiredNumbers.some(
      value =>
        Number.isNaN(
          value
        )
    )
  ) {

    console.error(
      "Telemetry contains invalid numeric data:",
      data
    );


    return null;

  }


  console.log(
    "PARSED TELEMETRY:",
    data
  );


  return data;

}


/* =========================================================
   PROCESS TELEMETRY
========================================================= */

function processTelemetry(
  data
) {

  console.log(
    "PROCESS TELEMETRY RUNNING:",
    data
  );


  latestTelemetry =
    data;


  lastRoverPacketAt =
    new Date();


  lastSensorUpdate =
    new Date();


  state.battery =
    data.battery;


  /*
     IMPORTANT:

     Even if:
     GPS = 0,0
     NPK = -1

     the rest of the telemetry
     is STILL displayed.
  */

  setRoverOnline(
    true
  );


  updateLiveTelemetry(
    data
  );


  updateDashboard(
    data
  );


  updateNpk(
    data
  );


  updateTimestampDisplay();


  saveTelemetrySample(
    data
  );


  /*
     GPS map is handled separately.

     Invalid GPS does NOT stop telemetry.
  */

  updateRoverLocation(
    data
  );


  /*
     Heatmap sample is only collected
     when GPS is valid and crop selected.
  */

  collectMissionSample(
    data
  );

}


/* =========================================================
   LIVE TELEMETRY DISPLAY
========================================================= */

function updateLiveTelemetry(
  data
) {

  setText(
    "telemetryLastPacket",
    new Date()
      .toLocaleTimeString()
  );


  setText(
    "telemetryDataAge",
    "0 sec"
  );


  setText(
    "telemetryPacketNumber",
    data.packetNumber
  );


  /*
     MEASURED NPK

     -1 is allowed and will display.
  */

  setText(
    "telemetryN",
    data.nitrogen
  );


  setText(
    "telemetryP",
    data.phosphorus
  );


  setText(
    "telemetryK",
    data.potassium
  );


  setText(
    "telemetryTemperature",
    data.temperature
      .toFixed(2)
  );


  setText(
    "telemetryHumidity",
    data.humidity
      .toFixed(2)
  );


  /* GUI-calculated required N/P/K are refreshed from completed 4-sample areas. */
  updateCurrentRequirementDisplay();


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


  /*
     BATTERY
  */

  setText(
    "telemetryBattery",
    `${data.battery}%`
  );


  /*
     If your HTML later has
     telemetryBatteryVoltage,
     this will display voltage too.
  */

  if (
    data.batteryVoltage !==
    null
  ) {

    setText(
      "telemetryBatteryVoltage",
      `${data.batteryVoltage.toFixed(2)} V`
    );

  }


  /*
     GPS
  */

  if (
    validGps(
      data.latitude,
      data.longitude
    )
  ) {

    setText(
      "telemetryGps",
      `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`
    );


    setText(
      "telemetryGpsStatus",
      "GPS Fix"
    );

  }

  else {

    setText(
      "telemetryGps",
      `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`
    );


    setText(
      "telemetryGpsStatus",
      "No GPS Fix"
    );

  }


  /*
     LIVE STATUS
  */

  setText(
    "telemetryStatusText",
    "Receiving telemetry"
  );


  const statusDot =
    el(
      "telemetryStatusDot"
    );


  if (
    statusDot
  ) {

    statusDot
      .classList
      .remove(
        "disconnected-dot"
      );


    statusDot
      .classList
      .add(
        "connected-dot"
      );

  }

}


/* =========================================================
   DASHBOARD
========================================================= */

function updateDashboard(
  data
) {

  setText(
    "batteryValue",
    `${data.battery}%`
  );


  setText(
    "sideBattery",
    `${data.battery}%`
  );


  if (
    el(
      "batteryBar"
    )
  ) {

    el(
      "batteryBar"
    ).style.width =
      `${data.battery}%`;

  }


  if (
    el(
      "sideBatteryBar"
    )
  ) {

    el(
      "sideBatteryBar"
    ).style.width =
      `${data.battery}%`;

  }


  setText(
    "dashboardPacket",
    data.packetNumber
  );



  setText(
    "overviewState",
    "Live"
  );

}


/* =========================================================
   NPK GAUGES
========================================================= */

function updateNpk(
  data
) {

  /*
     If sensor returns -1,
     display -1 instead of rejecting.
  */

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


  if (
    data.nitrogen < 0 ||
    data.phosphorus < 0 ||
    data.potassium < 0
  ) {

    setText(
      "sensorStatusText",
      "Waiting for NPK sample"
    );

  }

  else {

    setText(
      "sensorStatusText",
      "NPK sample received"
    );

  }


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
    value;


  const gauge =
    element.closest(
      ".gauge"
    );


  if (
    !gauge
  )
    return;


  const displayValue =
    Math.max(
      0,
      value
    );


  gauge.style
    .setProperty(
      "--value",
      clamp(
        (
          displayValue /
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

  if (
    typeof L ===
    "undefined"
  ) {

    console.error(
      "Leaflet not loaded."
    );


    return;

  }


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


/* =========================================================
   ROVER POINTER
========================================================= */

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
    data.latitude;


  const longitude =
    data.longitude;


  /*
     IMPORTANT:

     Invalid GPS only affects GPS/map.

     It does NOT affect telemetry display.
  */

  if (
    !validGps(
      latitude,
      longitude
    )
  ) {

    setText(
      "dashboardGpsStatus",
      "No Fix"
    );


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


  /* SMALL MAP */

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


  /* LARGE MAP */

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
    "dashboardGpsStatus",
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
    "liveRoverGpsStatus",
    "GPS Fix"
  );


  setText(
    "mapLatitude",
    latitude.toFixed(6)
  );


  setText(
    "mapLongitude",
    longitude.toFixed(6)
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
    latitude.toFixed(6)
  );


  setText(
    "liveRoverLongitude",
    longitude.toFixed(6)
  );


  setText(
    "liveRoverHeading",
    `${data.yaw.toFixed(1)}°`
  );


  setText(
    "liveRoverBattery",
    `${data.battery}%`
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
   CENTER / CLEAR MAP
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
    () =>
      centerOnRover(
        roverMap,
        18
      )
  );


el(
  "centerLargeRoverMap"
)
  ?.addEventListener(
    "click",
    () =>
      centerOnRover(
        largeRoverMap,
        19
      )
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
    crop?.isSurvey
  ) {
    return "🧭";
  }

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


  const cropOptions =
    [SURVEY_OPTION, ...CROP_DATA];


  container.innerHTML =
    cropOptions
      .map(
        crop =>
          `
          <button
            class="crop-select-btn ${crop.isSurvey ? "survey-option" : ""}"
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
          () =>
            selectCrop(
              button.dataset.crop
            );

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
          button.dataset.crop ===
            key
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
    crop.isSurvey ? "—" : crop.n
  );


  setText(
    "cropOptP",
    crop.isSurvey ? "—" : crop.p
  );


  setText(
    "cropOptK",
    crop.isSurvey ? "—" : crop.k
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
    crop.isSurvey
      ? "ROVER,MODE,SURVEY"
      : `ROVER,CROP,${crop.key}`
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
    crop.isSurvey
      ? "Survey mode — crop target pending"
      : `N ${crop.n} • P ${crop.p} • K ${crop.k} kg/ha`
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


  const recommendationPanel =
    el(
      "cropRecommendationPanel"
    );

  if (
    recommendationPanel
  ) {
    recommendationPanel.hidden =
      !crop.isSurvey;
  }

  state.recommendedCrop =
    null;

  setText(
    "recommendedCropName",
    "Waiting for field data"
  );

  setText(
    "recommendedCropBangla",
    "—"
  );

  setText(
    "recommendationScore",
    "--%"
  );

  setText(
    "surveyAverageNpk",
    "-- : -- : --"
  );

  const useButton =
    el(
      "useRecommendedCrop"
    );

  if (
    useButton
  ) {
    useButton.disabled =
      true;
  }

  resetMissionSamples();


  updateSequence(
    "CROP"
  );

}


/* =========================================================
   SEND CROP
========================================================= */

async function sendCropAssignment() {

  if (
    !state.selectedCrop
  ) {

    toast(
      "Select crop first"
    );


    return;

  }


  const command =
    state.selectedCrop.isSurvey
      ? "ROVER,MODE,SURVEY"
      : `ROVER,CROP,${state.selectedCrop.key}`;


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
   DEFICIENCY CALCULATION
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
   COLLECT FIELD SAMPLE

   Every four valid, unique NPK samples are grouped internally
   into one 6 ft × 6 ft fertilization area. The map remains
   visually clean: no area boxes or labels are drawn.
========================================================= */

function collectMissionSample(data) {

  if (!state.selectedCrop) return;

  if (!validGps(data.latitude, data.longitude)) return;

  if (
    data.nitrogen < 0 ||
    data.phosphorus < 0 ||
    data.potassium < 0
  ) return;

  const signature = [
    data.latitude.toFixed(6),
    data.longitude.toFixed(6),
    data.nitrogen.toFixed(2),
    data.phosphorus.toFixed(2),
    data.potassium.toFixed(2)
  ].join("|");

  if (sampleSignatures.has(signature)) return;

  sampleSignatures.add(signature);
  samplePackets.add(data.packetNumber);

  missionSamples.push({
    sampleNumber: missionSamples.length + 1,
    packetNumber: data.packetNumber,
    latitude: data.latitude,
    longitude: data.longitude,
    measuredN: data.nitrogen,
    measuredP: data.phosphorus,
    measuredK: data.potassium,
    timestamp: data.timestamp
  });

  rebuildFertilizationAreas();

  setText("dashboardSamples", `${missionSamples.length} samples`);
  setText("dashboardHeatmapSamples", missionSamples.length);
  setText("largeHeatmapSamples", missionSamples.length);

  renderDeficiencyHeatmaps();
  updateDeficiencySummary();
  updatePrescription();

  if (state.selectedCrop?.isSurvey) {
    updateSurveyAverages();
  }
}


/* =========================================================
   PERCENTILE REFERENCE

   95th percentile is used instead of the single maximum so
   one unusually high sensor reading does not define the field.
========================================================= */

function percentile(values, q) {
  const clean = values
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (!clean.length) return 0;
  if (clean.length === 1) return clean[0];

  const position = (clean.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;

  if (lower === upper) return clean[lower];

  return clean[lower] * (1 - weight) + clean[upper] * weight;
}


function deficiencyFromReference(measured, reference) {
  if (!Number.isFinite(measured) || !Number.isFinite(reference) || reference <= 0) {
    return 0;
  }

  return clamp((1 - measured / reference) * 100, 0, 100);
}


function rebuildFertilizationAreas() {

  const valid = missionSamples.filter(sample =>
    sample.measuredN >= 0 &&
    sample.measuredP >= 0 &&
    sample.measuredK >= 0
  );

  state.nutrientReferences = {
    n: percentile(valid.map(s => s.measuredN), 0.95),
    p: percentile(valid.map(s => s.measuredP), 0.95),
    k: percentile(valid.map(s => s.measuredK), 0.95)
  };

  fertilizationAreas = [];

  for (let i = 0; i + 3 < valid.length; i += SAMPLES_PER_FERTILIZATION_AREA) {

    const samples = valid.slice(i, i + SAMPLES_PER_FERTILIZATION_AREA);

    const average = key =>
      samples.reduce((sum, sample) => sum + sample[key], 0) / samples.length;

    const area = {
      areaIndex: fertilizationAreas.length + 1,
      samples,
      latitude: average("latitude"),
      longitude: average("longitude"),
      measuredN: average("measuredN"),
      measuredP: average("measuredP"),
      measuredK: average("measuredK"),
      defN: 0,
      defP: 0,
      defK: 0,
      requiredN: 0,
      requiredP: 0,
      requiredK: 0
    };

    area.defN = deficiencyFromReference(area.measuredN, state.nutrientReferences.n);
    area.defP = deficiencyFromReference(area.measuredP, state.nutrientReferences.p);
    area.defK = deficiencyFromReference(area.measuredK, state.nutrientReferences.k);

    if (!state.selectedCrop?.isSurvey) {
      area.requiredN = state.selectedCrop.n * area.defN / 100;
      area.requiredP = state.selectedCrop.p * area.defP / 100;
      area.requiredK = state.selectedCrop.k * area.defK / 100;
    }

    area.application = calculateAreaApplication(area);

    fertilizationAreas.push(area);
  }

  updateCurrentRequirementDisplay();
}


function latestFertilizationArea() {
  return fertilizationAreas.length
    ? fertilizationAreas[fertilizationAreas.length - 1]
    : null;
}


function updateCurrentRequirementDisplay() {
  const area = latestFertilizationArea();

  if (!area || state.selectedCrop?.isSurvey) {
    setText("reqN", "--");
    setText("reqP", "--");
    setText("reqK", "--");
    setText("telemetryReqN", "--");
    setText("telemetryReqP", "--");
    setText("telemetryReqK", "--");
    return;
  }

  setText("reqN", area.requiredN.toFixed(2));
  setText("reqP", area.requiredP.toFixed(2));
  setText("reqK", area.requiredK.toFixed(2));
  setText("telemetryReqN", area.requiredN.toFixed(2));
  setText("telemetryReqP", area.requiredP.toFixed(2));
  setText("telemetryReqK", area.requiredK.toFixed(2));
}


/* =========================================================
   FERTILIZER MASS / VOLUME / ON-TIME
========================================================= */

function nutrientMassForArea(requiredKgHa) {
  return requiredKgHa * FERTILIZATION_AREA_M2 / 10;
}


function solutionVolumeMl(requiredKgHa, concentrationGL) {
  if (!Number.isFinite(concentrationGL) || concentrationGL <= 0) return null;

  const nutrientGrams = nutrientMassForArea(requiredKgHa);
  return nutrientGrams / concentrationGL * 1000;
}


function onTimeSeconds(volumeMl, flowMlMin) {
  if (
    volumeMl === null ||
    !Number.isFinite(flowMlMin) ||
    flowMlMin <= 0
  ) return null;

  return volumeMl / flowMlMin * 60;
}


function calculateAreaApplication(area) {
  const nVolume = solutionVolumeMl(area.requiredN, fertilizerCalibration.nConcentration);
  const pVolume = solutionVolumeMl(area.requiredP, fertilizerCalibration.pConcentration);
  const kVolume = solutionVolumeMl(area.requiredK, fertilizerCalibration.kConcentration);

  return {
    nMassG: nutrientMassForArea(area.requiredN),
    pMassG: nutrientMassForArea(area.requiredP),
    kMassG: nutrientMassForArea(area.requiredK),
    nVolumeMl: nVolume,
    pVolumeMl: pVolume,
    kVolumeMl: kVolume,
    nTimeSec: onTimeSeconds(nVolume, fertilizerCalibration.nFlow),
    pTimeSec: onTimeSeconds(pVolume, fertilizerCalibration.pFlow),
    kTimeSec: onTimeSeconds(kVolume, fertilizerCalibration.kFlow)
  };
}


function calibrationReady() {
  return (
    fertilizerCalibration.nConcentration > 0 &&
    fertilizerCalibration.pConcentration > 0 &&
    fertilizerCalibration.kConcentration > 0 &&
    fertilizerCalibration.nFlow > 0 &&
    fertilizerCalibration.pFlow > 0 &&
    fertilizerCalibration.kFlow > 0
  );
}


function formatMaybe(value, digits = 2, suffix = "") {
  return value === null || !Number.isFinite(value)
    ? "Calibration required"
    : `${value.toFixed(digits)}${suffix}`;
}

/* =========================================================
   GPS -> LOCAL XY
========================================================= */

function convertSamplesToLocalXY(
  samples,
  originLat = null,
  originLon = null
) {

  if (
    !samples.length
  )
    return [];


  originLat =
    originLat ?? samples[0].latitude;


  originLon =
    originLon ?? samples[0].longitude;


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
    sample => ({

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

    })
  );

}


/* =========================================================
   GET N/P/K DEFICIENCY
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
   RAW SURVEY NUTRIENT HELPERS
========================================================= */

function getMeasuredNutrient(sample, nutrient) {
  if (nutrient === "p") return sample.measuredP;
  if (nutrient === "k") return sample.measuredK;
  return sample.measuredN;
}


function interpolateMeasuredIDW(x, y, samples, nutrient, power = 2) {
  let numerator = 0;
  let denominator = 0;

  for (const sample of samples) {
    const dx = x - sample.x;
    const dy = y - sample.y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared < 0.000001) {
      return getMeasuredNutrient(sample, nutrient);
    }

    const distance = Math.sqrt(distanceSquared);
    const weight = 1 / Math.pow(distance, power);

    numerator += weight * getMeasuredNutrient(sample, nutrient);
    denominator += weight;
  }

  return denominator > 0 ? numerator / denominator : 0;
}


function relativeSurveyPercent(value, samples, nutrient) {
  const values = samples
    .map(sample => getMeasuredNutrient(sample, nutrient))
    .filter(Number.isFinite);

  if (!values.length) return 0;

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (max <= min) return 50;

  return clamp((value - min) / (max - min) * 100, 0, 100);
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
    el(canvasId);


  const empty =
    el(emptyId);


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


  const sourcePoints =
    state.selectedCrop?.isSurvey
      ? missionSamples.map(sample => ({
          ...sample,
          defN: 0,
          defP: 0,
          defK: 0
        }))
      : fertilizationAreas;

  if (!sourcePoints.length) {
    if (empty) empty.style.display = "flex";
    return;
  }

  const commonOriginLat = missionSamples[0].latitude;
  const commonOriginLon = missionSamples[0].longitude;

  const samples =
    convertSamplesToLocalXY(
      sourcePoints,
      commonOriginLat,
      commonOriginLon
    );


  const xs =
    samples.map(
      s =>
        s.x
    );


  const ys =
    samples.map(
      s =>
        s.y
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
     1 ft sampling footprint
  */

  const footprint =
    SAMPLING_AREA_SIZE_FT * 0.3048;


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


      let severity;

      if (state.selectedCrop?.isSurvey) {
        const rawValue = interpolateMeasuredIDW(x, y, samples, nutrient, 2);
        severity = relativeSurveyPercent(rawValue, samples, nutrient);
      } else {
        severity = interpolateIDW(x, y, samples, nutrient, 2);
      }


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
     BLACK NUMBERED SAMPLE POINTS
  */

  const displaySamples =
    convertSamplesToLocalXY(
      missionSamples,
      commonOriginLat,
      commonOriginLon
    );

  displaySamples.forEach(
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
   RENDER HEATMAPS
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

    const nutrientName =
      {

        n:
          "Nitrogen",

        p:
          "Phosphorus",

        k:
          "Potassium"

      }[
        deficiencyNutrient
      ];


    const mapLabel = state.selectedCrop.isSurvey
      ? `Soil survey • ${nutrientName} relative distribution`
      : `${state.selectedCrop.name} • ${nutrientName} deficiency`;

    setText("dashboardHeatmapCrop", mapLabel);
    setText("largeHeatmapCrop", mapLabel);

  }

}


/* =========================================================
   N/P/K HEATMAP SELECTOR
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
    event =>
      setDeficiencyNutrient(
        event.target.value
      )
  );


el(
  "largeDeficiencyType"
)
  ?.addEventListener(
    "change",
    event =>
      setDeficiencyNutrient(
        event.target.value
      )
  );


/* =========================================================
   DEFICIENCY SUMMARY
========================================================= */

function updateDeficiencySummary() {

  if (
    !fertilizationAreas.length
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
      fertilizationAreas.reduce(
        (
          total,
          sample
        ) =>
          total +
          sample[key],
        0
      ) /
      fertilizationAreas.length;


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
   RESET HEATMAP
========================================================= */

function resetMissionSamples() {

  missionSamples =
    [];


  samplePackets =
    new Set();

  sampleSignatures =
    new Set();

  fertilizationAreas =
    [];

  state.nutrientReferences = { n: 0, p: 0, k: 0 };


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
    "fullHeatmapStatus",
    "Sampling"
  );


  updateSequence(
    "SAMPLING"
  );

}


function normalizeNpkProfile(n, p, k) {

  const values = [
    Math.max(0, Number(n) || 0),
    Math.max(0, Number(p) || 0),
    Math.max(0, Number(k) || 0)
  ];

  const total =
    values[0] + values[1] + values[2];

  if (total <= 0) {
    return null;
  }

  return values.map(
    value => value / total
  );
}


function recommendCropFromSurvey() {

  if (
    !missionSamples.length
  ) {
    return null;
  }

  const avg = key =>
    missionSamples.reduce(
      (sum, sample) => sum + sample[key],
      0
    ) / missionSamples.length;

  const avgN = avg("measuredN");
  const avgP = avg("measuredP");
  const avgK = avg("measuredK");

  const fieldProfile =
    normalizeNpkProfile(avgN, avgP, avgK);

  if (!fieldProfile) {
    return null;
  }

  let best = null;

  CROP_DATA.forEach(crop => {

    const cropProfile =
      normalizeNpkProfile(
        crop.n,
        crop.p,
        crop.k
      );

    if (!cropProfile) {
      return;
    }

    const distance = Math.sqrt(
      Math.pow(fieldProfile[0] - cropProfile[0], 2) +
      Math.pow(fieldProfile[1] - cropProfile[1], 2) +
      Math.pow(fieldProfile[2] - cropProfile[2], 2)
    );

    if (
      !best ||
      distance < best.distance
    ) {
      best = {
        crop,
        distance
      };
    }
  });

  if (!best) {
    return null;
  }

  /*
     Both profiles are normalized first, so the comparison
     is dimensionless. This ranks only N:P:K profile similarity;
     it is not a complete agronomic suitability model.
  */

  const similarity = clamp(
    (1 - best.distance / Math.sqrt(2)) * 100,
    0,
    100
  );

  return {
    crop: best.crop,
    similarity,
    avgN,
    avgP,
    avgK
  };
}


function showSurveyRecommendation() {

  const result =
    recommendCropFromSurvey();

  const panel =
    el("cropRecommendationPanel");

  if (panel) {
    panel.hidden = false;
  }

  if (!result) {
    setText(
      "cropRecommendationStatus",
      "Insufficient data"
    );

    setText(
      "recommendationReason",
      "No valid NPK samples were available for a crop-profile recommendation."
    );

    return null;
  }

  state.recommendedCrop =
    result.crop;

  setText(
    "cropRecommendationStatus",
    "Recommendation ready"
  );

  setText(
    "recommendedCropName",
    result.crop.name
  );

  setText(
    "recommendedCropBangla",
    result.crop.bangla
  );

  setText(
    "recommendationScore",
    `${result.similarity.toFixed(1)}%`
  );

  setText(
    "surveyAverageNpk",
    `${result.avgN.toFixed(1)} : ${result.avgP.toFixed(1)} : ${result.avgK.toFixed(1)}`
  );

  setText(
    "recommendationReason",
    `${result.crop.name} is the closest N:P:K profile match among the ${CROP_DATA.length} crops in this project scope. ` +
    "The comparison uses normalized nutrient proportions so it does not directly compare mg/kg with kg/ha. " +
    "Use it as a screening suggestion; season, pH, water availability, soil type and other agronomic factors are not included."
  );

  const useButton =
    function selectCropWithoutReset(key) {
  const crop = cropByKey(key);
  if (!crop || crop.isSurvey) return;

  state.selectedCrop = crop;
  state.cropSent = false;

  document.querySelectorAll(".crop-select-btn").forEach(button => {
    button.classList.toggle("selected", button.dataset.crop === key);
  });

  setText("selectedCropName", crop.name);
  setText("selectedCropBangla", crop.bangla);
  setText("selectedCropIcon", cropIcon(crop));
  setText("cropOptN", crop.n);
  setText("cropOptP", crop.p);
  setText("cropOptK", crop.k);
  setText("cropCondition", crop.condition);
  setText("dashboardCrop", crop.name);
  setText("sideCrop", crop.name);
  setText("dashboardTargetNpk", `N ${crop.n} • P ${crop.p} • K ${crop.k} kg/ha`);
  setText("cropCommandPreview", `ROVER,CROP,${crop.key}`);
  setText("cropSelectionStatus", "Recommended crop accepted");

  rebuildFertilizationAreas();
  renderDeficiencyHeatmaps();
  updateDeficiencySummary();
  updatePrescription();
}


el("useRecommendedCrop");

  if (useButton) {
    useButton.disabled = false;
  }

  return result;
}


el("useRecommendedCrop")
  ?.addEventListener(
    "click",
    () => {
      if (!state.recommendedCrop) {
        return;
      }

      const key =
        state.recommendedCrop.key;

      selectCropWithoutReset(key);

      toast(
        `${state.recommendedCrop?.name || "Recommended crop"} selected`
      );
    }
  );


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


  if (
    state.selectedCrop?.isSurvey
  ) {

    showSurveyRecommendation();

    setText(
      "missionStatus",
      "Survey complete — recommendation ready"
    );

    setText(
      "heatmapGenerationState",
      "Survey complete"
    );

    setText(
      "fullHeatmapStatus",
      `${missionSamples.length} samples • Recommendation mode`
    );

    updateSequence(
      "HEATMAP"
    );

    toast(
      "Survey complete — crop recommendation ready"
    );

    navigate(
      "crop"
    );

    return;
  }


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
   PRESCRIPTION
========================================================= */

function calculatePrescription() {

  if (state.selectedCrop?.isSurvey) return null;
  if (!fertilizationAreas.length) return null;

  const average = key =>
    fertilizationAreas.reduce((sum, area) => sum + area[key], 0) /
    fertilizationAreas.length;

  const maximum = key =>
    Math.max(...fertilizationAreas.map(area => area[key]));

  return {
    avgN: average("requiredN"),
    avgP: average("requiredP"),
    avgK: average("requiredK"),
    maxN: maximum("requiredN"),
    maxP: maximum("requiredP"),
    maxK: maximum("requiredK")
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


  const latestArea = latestFertilizationArea();

  if (latestArea) {
    setText("treatmentAreaSize", `${FERTILIZATION_AREA_SIZE_FT} × ${FERTILIZATION_AREA_SIZE_FT} ft`);
    setText("treatmentSampleCount", `${SAMPLES_PER_FERTILIZATION_AREA} samples`);

    setText("areaDefN", `${latestArea.defN.toFixed(1)}%`);
    setText("areaDefP", `${latestArea.defP.toFixed(1)}%`);
    setText("areaDefK", `${latestArea.defK.toFixed(1)}%`);

    setText("areaReqN", `${latestArea.requiredN.toFixed(2)} kg/ha`);
    setText("areaReqP", `${latestArea.requiredP.toFixed(2)} kg/ha`);
    setText("areaReqK", `${latestArea.requiredK.toFixed(2)} kg/ha`);

    setText("areaNVolume", formatMaybe(latestArea.application.nVolumeMl, 2, " mL"));
    setText("areaPVolume", formatMaybe(latestArea.application.pVolumeMl, 2, " mL"));
    setText("areaKVolume", formatMaybe(latestArea.application.kVolumeMl, 2, " mL"));

    setText("areaNTime", formatMaybe(latestArea.application.nTimeSec, 2, " s"));
    setText("areaPTime", formatMaybe(latestArea.application.pTimeSec, 2, " s"));
    setText("areaKTime", formatMaybe(latestArea.application.kTimeSec, 2, " s"));

    setText("calibrationState", calibrationReady() ? "Ready" : "Calibration required");
  }

}


/* =========================================================
   AUTONOMOUS FERTILIZATION
========================================================= */

async function startAutonomousFertilization() {

  if (state.selectedCrop?.isSurvey) {
    toast("Accept a crop before fertilization");
    return;
  }

  const area = latestFertilizationArea();

  if (!area) {
    toast("Four valid samples are required before fertilization");
    return;
  }

  if (!calibrationReady()) {
    setFertilizationState("CALIBRATION REQUIRED");
    toast("Enter fertilizer concentration and measured flow before automatic application");
    return;
  }

  const command =
    `FERT,AREA,${area.requiredN.toFixed(2)},${area.requiredP.toFixed(2)},${area.requiredK.toFixed(2)},` +
    `${area.application.nTimeSec.toFixed(2)},${area.application.pTimeSec.toFixed(2)},${area.application.kTimeSec.toFixed(2)}`;

  const sent = await sendBaseCommand(command);
  if (!sent) return;

  await sendBaseCommand("FERT,AUTO_START");

  setFertilizationState("AUTO START SENT");
  updateSequence("FERTILIZING");
}


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
   MISSION SEQUENCE
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
   SEND COMMAND
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


    addAlert(
      "info",
      "Command sent",
      command
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
   MISSION BUTTONS
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
          "Select a crop first"
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
            state.selectedCrop.isSurvey
              ? "ROVER,MODE,SURVEY"
              : `ROVER,CROP,${state.selectedCrop.key}`
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

  if (
    await sendBaseCommand(
      "ROVER,PAUSE"
    )
  ) {

    state.paused =
      true;


    setText(
      "missionStatus",
      "Paused"
    );

  }

}


async function resumeRover() {

  if (
    await sendBaseCommand(
      "ROVER,RESUME"
    )
  ) {

    state.paused =
      false;


    setText(
      "missionStatus",
      "Autonomous"
    );

  }

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
   EMERGENCY STOP
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


  toast(
    "Emergency stop sent"
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
    () =>
      sendBaseCommand(
        "ROVER,STOP"
      )
  );


/* =========================================================
   EMERGENCY MANUAL MOVEMENT
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
        () =>
          sendBaseCommand(
            `FERT,PUMP,${button.dataset.pump}`
          );

    }
  );


document
  .querySelectorAll(
    "[data-valve][data-action]"
  )
  .forEach(
    button => {

      button.onclick =
        () =>
          sendBaseCommand(
            `FERT,${button.dataset.valve},${button.dataset.action}`
          );

    }
  );


el(
  "allFertilizerOff"
)
  ?.addEventListener(
    "click",
    () =>
      sendBaseCommand(
        "FERT,ALL_OFF"
      )
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
   DATA AGE
========================================================= */

setInterval(
  () => {

    if (
      !lastRoverPacketAt
    )
      return;


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
   RAW TELEMETRY MONITOR
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

      const box =
        el(
          "telemetryConsole"
        );


      if (
        box
      ) {

        box.innerHTML =
          `
          <div class="console-empty">
            Waiting for rover packets...
          </div>
          `;

      }

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

    batteryRaw:
      data.batteryRaw,

    batteryVoltage:
      data.batteryVoltage,

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


  setText(
    "historySummary",
    `${rows.length} stored measurements`
  );

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
   FERTILIZER CALIBRATION UI
========================================================= */

function populateCalibrationInputs() {
  const values = {
    nSolutionConcentration: fertilizerCalibration.nConcentration,
    pSolutionConcentration: fertilizerCalibration.pConcentration,
    kSolutionConcentration: fertilizerCalibration.kConcentration,
    nFlowRate: fertilizerCalibration.nFlow,
    pFlowRate: fertilizerCalibration.pFlow,
    kFlowRate: fertilizerCalibration.kFlow
  };

  Object.entries(values).forEach(([id, value]) => {
    const input = el(id);
    if (input) input.value = value > 0 ? value : "";
  });

  setText("calibrationState", calibrationReady() ? "Ready" : "Calibration required");
}


function saveFertilizerCalibration() {
  const read = id => Number(el(id)?.value || 0);

  fertilizerCalibration.nConcentration = read("nSolutionConcentration");
  fertilizerCalibration.pConcentration = read("pSolutionConcentration");
  fertilizerCalibration.kConcentration = read("kSolutionConcentration");
  fertilizerCalibration.nFlow = read("nFlowRate");
  fertilizerCalibration.pFlow = read("pFlowRate");
  fertilizerCalibration.kFlow = read("kFlowRate");

  localStorage.setItem("agriroverNConcentration", fertilizerCalibration.nConcentration);
  localStorage.setItem("agriroverPConcentration", fertilizerCalibration.pConcentration);
  localStorage.setItem("agriroverKConcentration", fertilizerCalibration.kConcentration);
  localStorage.setItem("agriroverNFlow", fertilizerCalibration.nFlow);
  localStorage.setItem("agriroverPFlow", fertilizerCalibration.pFlow);
  localStorage.setItem("agriroverKFlow", fertilizerCalibration.kFlow);

  rebuildFertilizationAreas();
  updatePrescription();

  setText("calibrationState", calibrationReady() ? "Ready" : "Calibration required");
  toast(calibrationReady() ? "Fertilizer calibration saved" : "Calibration saved — complete all six values for ON-time calculation");
}


el("saveFertilizerCalibration")
  ?.addEventListener("click", saveFertilizerCalibration);


/* =========================================================
   RESIZE HEATMAP
========================================================= */

let heatmapResizeTimer =
  null;


window.addEventListener(
  "resize",
  () => {

    clearTimeout(
      heatmapResizeTimer
    );


    heatmapResizeTimer =
      setTimeout(
        renderDeficiencyHeatmaps,
        150
      );

  }
);


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


populateCalibrationInputs();


setText(
  "telemetrySamplingState",
  "NOT_STARTED"
);


setText(
  "dashboardSampling",
  "Not started"
);


console.log(
  "================================="
);


console.log(
  "AgriRover GUI V17 loaded"
);


console.log(
  "Expected telemetry:"
);


console.log(
  "Data : PACKET,LAT,LON,TEMP,HUMIDITY,N,P,K,REQ_N,REQ_P,REQ_K,ROLL,PITCH,YAW,ACC_X,ACC_Y,ACC_Z,BATTERY"
);


console.log(
  "================================="
);
