# AgriRover GUI
Dashboard updated.

Launch-ready static dashboard for the **Optimized Fertilization System of a Farmland Using an Autonomous Rover – Design 2**.

## Included features

- Live rover dashboard
- Zone-based field grid
- NPK readings and nutrient heatmap
- Crop recommendation module
- Fertilizer prescription table
- Sprinkler and valve controls
- Manual rover controls
- Mission history and alerts
- Responsive mobile layout
- CSV export
- Simulated buttons and live state changes

## Run locally

Open `index.html` directly, or run a local server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deploy on GitHub Pages

1. Create a new GitHub repository.
2. Upload all files from this folder to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **Save**.
6. GitHub will provide the public URL after deployment.

## Connect real hardware later

Replace the simulated values in `app.js` with data from your backend, MQTT broker, WebSocket server, Firebase, or REST API.

Recommended data format:

```json
{
  "rover": {
    "battery": 82,
    "speed": 0.8,
    "zone": "Z-04",
    "gps": {"lat": 23.685123, "lng": 90.356789}
  },
  "soil": {
    "nitrogen": 35,
    "phosphorus": 18,
    "potassium": 125,
    "ph": 6.4,
    "moisture": 72
  },
  "fertilizer": {
    "pump": "ON",
    "n_valve": "OPEN",
    "p_valve": "CLOSED",
    "k_valve": "CLOSED"
  }
}
```

## Important

The crop recommendation currently uses a transparent demonstration scoring model. For the final FYDP implementation, replace it with your trained model or validated agronomic rules.
