# 🚁 Drone Route Planner

**Automated Flight Route Planning System for UAV Aerial Photography**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi)](https://fastapi.tiangolo.com/)

An open-source web application for planning aerial photography missions with automatic route calculation, terrain awareness, and support for popular drone models.

![Drone Route Planner Interface](https://via.placeholder.com/800x400?text=Drone+Route+Planner+Interface)

---

## ✨ Key Features

### 🗺️ Route Planning
- **Lawnmower Algorithm (Boustrophedon)** — automatic route generation with configurable overlap
- **Custom Territory Drawing** — draw any polygon shape on an interactive map
- **Terrain Following** — integration with Open-Elevation API for terrain-aware flight planning
- **Multiple Drone Support** — 6 popular drone models with accurate camera specifications

### 📊 Mission Metrics
- Coverage area, flight distance, and estimated flight time
- Number of photos and required storage
- Battery usage estimation with safety margins
- Ground Sample Distance (GSD) calculation

### 📤 Export & Visualization
- Export routes to **GeoJSON**, **KML**, and **KMZ** formats
- Interactive flight simulation with playback controls
- Terrain elevation profile visualization
- Weather conditions display via OpenWeatherMap API

### 👤 User Management
- User registration and authentication (JWT-based)
- Mission saving and management
- Personal mission library with editing capabilities

---

## 🏗️ Architecture

The system uses a **microservice architecture** with four main components:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Nginx)                          │
│                    HTML5 + CSS3 + JavaScript                    │
│              Leaflet.js • Plotly.js • Bootstrap 5               │
│                          Port: 80                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────────┐
│     Route Service         │   │      Auth Service             │
│    Node.js + Express      │   │     Python + FastAPI          │
│        Turf.js            │   │   SQLAlchemy + GeoAlchemy2    │
│       Port: 3000          │   │        Port: 8000             │
└───────────────────────────┘   └───────────────────────────────┘
                                                │
                                                ▼
                                ┌───────────────────────────────┐
                                │   PostgreSQL 16 + PostGIS     │
                                │    Geospatial Database        │
                                │        Port: 5432             │
                                └───────────────────────────────┘
```

### Components

| Component | Technology | Description |
|-----------|------------|-------------|
| **Client** | HTML5, CSS3, JavaScript, Bootstrap 5, Leaflet.js | Interactive web interface with map and mission controls |
| **Route Service** | Node.js, Express.js, Turf.js, Joi, Winston | Route calculation using geospatial algorithms |
| **Auth Service** | Python 3.11+, FastAPI, SQLAlchemy, GeoAlchemy2 | User authentication and mission management |
| **Database** | PostgreSQL 16, PostGIS | Geospatial data storage with spatial indexing |

---

## 🛠️ Supported Drones

| Model | Megapixels | Sensor Size | Max Flight Time | Purpose |
|-------|------------|-------------|-----------------|---------|
| DJI Matrice 30T | 48 MP | 7.6×5.7 mm | 41 min | Professional/Industrial |
| DJI Mavic 3 | 20 MP | 17.3×13.0 mm (4/3") | 46 min | Professional |
| DJI Phantom 4 Pro | 20 MP | 13.2×8.8 mm (1") | 30 min | Photogrammetry |
| DJI Air 2S | 20 MP | 13.2×8.8 mm (1") | 31 min | Compact Professional |
| DJI Mini 3 Pro | 48 MP | 9.7×7.3 mm | 34 min | Consumer/Lightweight |
| Autel EVO Lite+ | 50 MP | 13.2×8.8 mm (1") | 40 min | Professional 6K |

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/drone-route-building.git
   cd drone-route-building
   ```

2. **Configure environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your custom settings (especially JWT_SECRET_KEY for production)
   ```

3. **Start all services**

   ```bash
   docker-compose up -d
   ```

4. **Access the application**

   Open your browser and navigate to: [http://localhost](http://localhost)

### Default Ports

| Service | Port | URL |
|---------|------|-----|
| Web Interface | 80 | http://localhost |
| Route API | 3000 | http://localhost:3000 |
| Auth API | 8000 | http://localhost:8000/docs |
| PostgreSQL | 5433 | localhost:5433 |

---

## 📖 Usage Guide

### Planning a Mission

1. **Draw Territory** — Use the polygon tool to draw your survey area on the map
2. **Configure Parameters**:
   - Flight altitude (5-400 m)
   - Side overlap (10-95%)
   - Forward overlap (50-95%)
   - Select drone model
   - Enable/disable terrain following
3. **Generate Route** — The route is automatically calculated when you finish drawing
4. **Review Metrics** — Check the mission summary panel for flight statistics
5. **Export Route** — Download in GeoJSON, KML, or KMZ format

### Mission Parameters

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| Flight Altitude | 50 m | 5-400 m | Height above ground level |
| Side Overlap | 30% | 10-95% | Overlap between adjacent flight lines |
| Forward Overlap | 70% | 50-95% | Overlap between consecutive photos |

### Terrain Following

When enabled, the system:
- Fetches elevation data from Open-Elevation API
- Calculates absolute flight altitude above the highest terrain point
- Displays terrain heatmap on the map
- Shows detailed elevation profile in modal window

---

## 🧮 Mathematical Model

The system uses precise mathematical formulas for route calculation:

### Camera Field of View
```
FOV_horizontal = 2 × arctan(sensor_width / (2 × focal_length))
FOV_vertical = 2 × arctan(sensor_height / (2 × focal_length))
```

### Ground Coverage
```
Ground_width = 2 × altitude × tan(FOV_horizontal / 2)
Ground_length = 2 × altitude × tan(FOV_vertical / 2)
```

### Ground Sample Distance (GSD)
```
GSD = (Ground_width × 100) / image_width  [cm/pixel]
```

### Effective Spacing
```
Lateral_spacing = Ground_width × (1 - side_overlap)
Forward_spacing = Ground_length × (1 - forward_overlap)
```

---

## 📁 Project Structure

```
drone-route-building/
├── docker-compose.yml          # Container orchestration
├── .env.example                # Environment template
├── drone-route-client/         # Frontend application
│   ├── index.html             # Main application page
│   ├── login.html             # Login page
│   ├── register.html          # Registration page
│   ├── profile.html           # User profile page
│   ├── css/                   # Stylesheets
│   ├── js/                    # JavaScript modules
│   │   ├── modules/           # Feature modules
│   │   ├── simulation/        # Flight simulation
│   │   └── visualization/     # Route & terrain viz
│   └── nginx.conf             # Nginx configuration
├── drone-route-server/         # Route calculation service
│   ├── index.js               # Main server file
│   ├── config/cameras.js      # Drone specifications
│   ├── routes/                # API routes
│   ├── services/              # Business logic
│   └── tests/                 # Unit tests
├── drone-route-auth/           # Authentication service
│   ├── app/
│   │   ├── main.py           # FastAPI app
│   │   ├── models/           # Database models
│   │   ├── routes/           # API endpoints
│   │   ├── schemas/          # Pydantic schemas
│   │   └── services/         # Business logic
│   └── requirements.txt       # Python dependencies
└── article.txt                 # Scientific paper
```

---

## 🔧 Development

### Running Without Docker

**Route Service (Node.js)**
```bash
cd drone-route-server
npm install
npm start
```

**Auth Service (Python)**
```bash
cd drone-route-auth
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Client (Static Files)**
Serve `drone-route-client/` with any static file server or Nginx.

### Running Tests

```bash
cd drone-route-server
npm test
```

---

## 🔌 API Endpoints

### Route Service (Port 3000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/calculate-route` | Calculate flight route |
| GET | `/api/weather` | Get weather data |

### Auth Service (Port 8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/missions` | List user missions |
| POST | `/api/missions` | Create mission |
| GET | `/api/missions/{id}` | Get mission by ID |
| PUT | `/api/missions/{id}` | Update mission |
| DELETE | `/api/missions/{id}` | Delete mission |

Full API documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | droneuser | Database username |
| `POSTGRES_PASSWORD` | dronepass2025 | Database password |
| `POSTGRES_DB` | drone_missions | Database name |
| `JWT_SECRET_KEY` | (change me) | Secret key for JWT tokens |
| `JWT_ALGORITHM` | HS256 | JWT signing algorithm |
| `JWT_EXPIRE_DAYS` | 7 | Token expiration period |

> ⚠️ **Security Note**: Always change `JWT_SECRET_KEY` in production environments!

---

## 🎯 Use Cases

- **Cartography** — Creating orthophotos and digital elevation models
- **Agriculture** — Crop monitoring and precision farming
- **Construction** — Site monitoring and volumetric measurements
- **Infrastructure** — Inspection of power lines, pipelines, roads
- **Environmental** — Forest monitoring, erosion control, disaster assessment

---

## 📊 Performance

| Metric | Value |
|--------|-------|
| Route generation time | < 500 ms (up to 10 km²) |
| Calculation accuracy | < 2% error |
| Max territory size | 10 km² |
| Max flight lines | 1000 |
| Supported browsers | Chrome, Firefox, Safari, Edge |

---