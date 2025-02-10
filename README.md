# Drone Flight Route Planner

## Overview

The **Drone Flight Route Planner** is a web application designed to automatically generate an optimized flight route for a drone based on user-defined parameters. The application is primarily aimed at planning aerial photography missions by ensuring that the drone covers a user-selected territory (in our case, the Kolomna area) with the appropriate image overlap. This is achieved through a "lawnmower" (or boustrophedon) algorithm that computes the optimal path over the area.

## Features

- **Interactive Map Interface:**  
  - Displays a map of Kolomna using OpenStreetMap and Leaflet.
  - Provides drawing tools (via Leaflet.draw) to allow users to define the area of interest.

- **User Input & Validation:**  
  - Users can specify key parameters such as flight altitude and desired image overlap.
  - Built-in input validation prevents invalid entries (e.g., negative or overly large values, or 100% overlap which causes algorithmic failure).

- **Automated Route Generation:**  
  - Utilizes a geospatial "lawnmower" algorithm to create a flight route that covers the selected area.
  - The algorithm calculates effective spacing between flight lines based on camera parameters and flight altitude.
  
- **Technical Data Display:**  
  - After route calculation, the application displays technical parameters such as the camera's horizontal field of view, ground width covered, and effective spacing.
  - It also visually marks the start and end points of the route on the map.

- **Clear Functionality:**  
  - A "Clear All" button allows users to remove all drawn areas and routes from the map easily.

## Technologies Used

### Front-End

- **HTML/CSS & JavaScript:**  
  Standard web technologies for structure, styling, and interactivity.

- **[Bootstrap](https://getbootstrap.com/):**  
  For a modern, responsive, and user-friendly design.

- **[Leaflet](https://leafletjs.com/):**  
  For map display and interactions with OpenStreetMap tiles.

- **[Leaflet.draw](https://leaflet.github.io/Leaflet.draw/):**  
  For drawing polygons (territories) and other shapes on the map.

### Back-End

- **[Node.js](https://nodejs.org/)** and **[Express](https://expressjs.com/):**  
  For building a lightweight, scalable server that handles route calculation requests.

- **[body-parser](https://www.npmjs.com/package/body-parser):**  
  To parse incoming JSON requests.

- **[CORS](https://www.npmjs.com/package/cors):**  
  To allow cross-origin resource sharing between the client and server.

- **[Turf.js](https://turfjs.org/):**  
  For geospatial calculations, including intersection, bounding box computation, and line generation.

## Mathematical Foundation

The route generation is based on several key mathematical concepts:

### 1. **Camera Field of View (FOV) Calculation**

- **Given:**
  - Focal length \( f \) (in mm)
  - Sensor width \( w \) (in mm)

- **Horizontal Field of View (in radians):**
  \[
  \text{FOV} = 2 \cdot \arctan\left(\frac{w}{2f}\right)
  \]
  
### 2. **Ground Width Calculation**

At a specified flight altitude \( h \) (in meters), the width of the ground captured in one image is calculated as:
\[
\text{Ground Width} = 2 \cdot h \cdot \tan\left(\frac{\text{FOV}}{2}\right)
\]

### 3. **Effective Spacing Between Flight Lines**

- **Desired Overlap:**  
  A user-defined percentage (e.g., 30% → \(0.3\)) that indicates the overlapping area between consecutive images.

- **Effective Spacing (in meters):**
\[
\text{Effective Spacing (m)} = \text{Ground Width} \times (1 - \text{Overlap})
\]

- **Conversion to Degrees:**  
  Since 1° of latitude is approximately 111,320 meters, the spacing in degrees is:
\[
\text{Effective Spacing (°)} = \frac{\text{Effective Spacing (m)}}{111320}
\]

### 4. **Route Generation ("Lawnmower" Algorithm)**

- **Step 1:**  
  Calculate the bounding box for the user-drawn territory.

- **Step 2:**  
  Generate vertical lines across the bounding box at intervals equal to the calculated effective spacing (in degrees).

- **Step 3:**  
  For each vertical line, determine the intersection points with the territory polygon using Turf.js. These intersections form segments that are valid flight paths.

- **Step 4:**  
  Sort the segments by their x-coordinate (longitude) and connect them in a zigzag (lawnmower) pattern to create a continuous route.

- **Step 5:**  
  Mark the first and last points of the route as the start and end points, respectively.

## Project Structure

