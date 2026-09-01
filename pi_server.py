"""AgriRover Raspberry Pi camera server.

Install:
  pip install flask flask-cors opencv-python

Run:
  python pi_server.py

Then enter this in the GUI:
  http://<PI_IP>:5000

Replace detect_sprinkler() with your trained detector. The example currently
returns no detection, but keeps the streaming + metadata interface complete.
"""

from flask import Flask, Response, jsonify
from flask_cors import CORS
import cv2
import threading

app = Flask(__name__)
CORS(app)

camera = cv2.VideoCapture(0)
lock = threading.Lock()

latest_detection = {
    "detected": False,
    "confidence": 0.0,
    "class": "sprinkler",
    "width": 0,
    "height": 0,
}


def detect_sprinkler(frame):
    """Replace this function with your actual sprinkler detector.

    Return a dict with:
      detected: bool
      confidence: 0..1
      class: string
      x1, y1, x2, y2: bounding box pixels (when detected)
    """
    return {
        "detected": False,
        "confidence": 0.0,
        "class": "sprinkler",
        "x1": 0,
        "y1": 0,
        "x2": 0,
        "y2": 0,
    }


def generate_frames():
    global latest_detection

    while True:
        ok, frame = camera.read()
        if not ok:
            continue

        result = detect_sprinkler(frame)
        detected = bool(result.get("detected", False))
        confidence = float(result.get("confidence", 0.0) or 0.0)
        label = str(result.get("class", "sprinkler"))

        width = 0
        height = 0

        if detected:
            x1 = int(result.get("x1", 0))
            y1 = int(result.get("y1", 0))
            x2 = int(result.get("x2", 0))
            y2 = int(result.get("y2", 0))

            width = max(0, x2 - x1)
            height = max(0, y2 - y1)

            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(
                frame,
                f"{label} {confidence * 100:.1f}%",
                (x1, max(24, y1 - 10)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2,
            )

        with lock:
            latest_detection = {
                "detected": detected,
                "confidence": confidence,
                "class": label,
                "width": width,
                "height": height,
            }

        encoded, buffer = cv2.imencode(
            ".jpg",
            frame,
            [cv2.IMWRITE_JPEG_QUALITY, 80],
        )

        if not encoded:
            continue

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" +
            buffer.tobytes() +
            b"\r\n"
        )


@app.route("/video_feed")
def video_feed():
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame",
    )


@app.route("/detection")
def detection():
    with lock:
        payload = dict(latest_detection)
    return jsonify(payload)


@app.route("/health")
def health():
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, threaded=True)
