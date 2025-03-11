# Drone Flight Route Planner

## Getting Started

Follow these steps to launch the Drone Flight Route Planner locally using **Docker**:

### Prerequisites
- Make sure you have [Docker](https://www.docker.com/) installed on your machine.

### Running the Project
1. Navigate to the project's root directory.
2. Run the following command to build and start the containers:
    ```bash 
    docker compose up
    ```
3. After the containers are up and running, open your web browser and go to:
    ```
    http://localhost:80
    ```

## Project Overview

**Drone Flight Route Planner** is a web application designed to automatically generate an optimized drone flight path based on user-defined parameters. The project is focused on aerial photography and ensures coverage of the selected area (e.g., Kolomna region) with the required image overlap. The application uses a "lawnmower" (or boustrophedon) algorithm to calculate the optimal path across the specified area.


## Features

- **Interactive Map Interface:**  
  - Displays the Kolomna map using OpenStreetMap and the Leaflet library.  
  - Drawing tools (via Leaflet.draw) to define the shooting area.  

- **Parameter Input and Validation:**  
  - Users specify key parameters: flight altitude and desired image overlap.  
  - Built-in input validation prevents the use of invalid values (e.g., negative numbers, overly large values, or 100% overlap, which would result in a zero-step size between flight strips).  

- **Automatic Route Generation:**  
  - Uses a geospatial "lawnmower" algorithm to create a route that fully covers the selected area.  
  - The algorithm calculates an efficient strip spacing considering camera specifications and flight altitude.  

- **Technical Information Display:**  
  - After generating the route, the panel displays shooting parameters such as horizontal field of view, ground frame width, effective strip spacing, and more.  
  - Visually marks the start (green) and end (red) points of the route on the map.  

- **Convenient Controls:**  
  - The "Clear All" button allows users to remove all drawn objects and the route from the map to start a new plan.  

## Technologies Used

### Frontend

- **HTML, CSS, and JavaScript:**  
  Core technologies for building the structure, styling, and functionality of the web page.  

- **[Bootstrap](https://getbootstrap.com/):**  
  For creating a modern, responsive, and user-friendly interface.  

- **[Leaflet](https://leafletjs.com/):**  
  To display interactive maps and work with OpenStreetMap tiles.  

- **[Leaflet.draw](https://leaflet.github.io/Leaflet.draw/):**  
  To add drawing tools to the map.  

### Backend

- **[Node.js](https://nodejs.org/)** and **[Express](https://expressjs.com/):**  
  Lightweight server for handling requests and route calculations.  

- **[body-parser](https://www.npmjs.com/package/body-parser):**  
  For parsing incoming JSON requests.  

- **[CORS](https://www.npmjs.com/package/cors):**  
  To support cross-domain requests between client and server.  

- **[Turf.js](https://turfjs.org/):**  
  A library for geospatial computations, including intersection calculations, bounding box creation, and line generation.  

## Mathematical Foundation

Route generation is based on the following mathematical concepts:

### 1. Camera Field of View Calculation

**Input Data:**
- Focal length \( f \) (in mm)  
- Sensor width \( w \) (in mm)  

**Horizontal field of view (in radians):**

$$
\text{FOV} = 2 \cdot \arctan\left(\frac{w}{2f}\right)
$$

### 2. Ground Frame Width Calculation

Given the flight altitude \( h \) (in meters), the ground width covered by the camera is calculated as:

$$
\text{Ground Width} = 2 \cdot h \cdot \tan\left(\frac{\text{FOV}}{2}\right)
$$

### 3. Effective Strip Spacing

- **Desired Overlap:**  
  User-defined overlap percentage (e.g., 30% → \( 0.3 \)).  

- **Effective Spacing (in meters):**

$$
\text{Spacing (m)} = \text{Ground Width} \times (1 - \text{Overlap})
$$

- **Conversion to Degrees:**  
  Approximately 1° of latitude equals 111,320 m, so the spacing in degrees is:

$$
\text{Spacing (°)} = \frac{\text{Spacing (m)}}{111320}
$$

### 4. Route Generation Algorithm ("Lawnmower")

- **Step 1:** Calculate the bounding box for the user-defined polygon.  
- **Step 2:** Generate vertical lines across the bounding box with intervals equal to the calculated effective spacing (in degrees).  
- **Step 3:** Determine intersection points of each vertical line with the specified area polygons (using Turf.js). The resulting segments are valid flight paths.  
- **Step 4:** Sort segments by the X-axis and merge them into a zigzag pattern, ensuring route continuity.  
- **Step 5:** Mark the first and last points of the route as the start and end points, respectively.  