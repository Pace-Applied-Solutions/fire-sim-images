# Trainer Guide: Fire Simulation Inject Tool

This guide walks you through creating realistic bushfire visuals for training exercises using the Fire Simulation Inject Tool.

## Table of Contents

- [Getting Started](#getting-started)
- [Creating Your First Scenario](#creating-your-first-scenario)
- [Understanding the Results](#understanding-the-results)
- [Tips for Better Results](#tips-for-better-results)
- [Frequently Asked Questions](#frequently-asked-questions)

## Getting Started

### Signing In

1. Navigate to the Fire Simulation Inject Tool URL provided by your administrator
2. Click **Sign In** in the top-right corner
3. Enter your fire service credentials when prompted
4. Once authenticated, you'll see the main map interface

### Interface Overview

The tool consists of four main areas:

- **Map View (center)**: Interactive 3D map where you draw fire perimeters
- **Scenario Controls (left sidebar)**: Set fire conditions and weather parameters
- **Results Panel (right)**: View and download generated images and videos
- **Top Bar**: Navigation, location search, and account options

## Creating Your First Scenario

### Step 1: Find Your Training Location

**Option A: Search for an address or location**

1. Click the search box in the top-left corner
2. Type an address, place name, or postcode (e.g., "Blue Mountains National Park")
3. Select the location from the dropdown list
4. The map will fly to that location

**Option B: Use your current location**

1. Click the location button (📍) next to the search box
2. Allow browser location access when prompted
3. The map will center on your current position

**Option C: Navigate manually**

- Click and drag to pan the map
- Scroll to zoom in/out
- Use viewpoint controls to change perspective

### Step 2: Draw the Fire Perimeter

1. Click the **Draw Polygon** button (✏️) in the map toolbar
2. Click on the map to place the first point of your fire perimeter
3. Continue clicking to add more points around the fire area
4. Double-click or click the first point again to complete the polygon
5. The perimeter will turn red, and the area will be calculated in hectares

**Tips for drawing:**

- Start with a simple shape (3-5 points) for your first scenario
- Draw around realistic fire shapes (teardrop or elliptical for wind-driven fires)
- Keep perimeters between 10-500 hectares for best results
- Use the **Clear** button (🗑️) to start over if needed

### Step 3: Set Fire Danger Rating

1. In the left sidebar, find the **Fire Danger Rating** section
2. Select a rating level from the dropdown:
   - **Moderate** (Blue) — Fires can be controlled with standard resources
   - **High** (Yellow) — Fires are difficult to control
   - **Extreme** (Orange) — Fires are extremely dangerous and unpredictable
   - **Catastrophic** (Dark Red) — Fires are uncontrollable and life-threatening

3. The system will automatically load typical weather conditions for that rating level

### Step 4: Fine-Tune Weather Conditions

Adjust the pre-loaded weather parameters if needed:

**Wind**

- **Speed**: Drag the slider or type a value (0-120 km/h)
- **Direction**: Select cardinal direction (N, NE, E, SE, S, SW, W, NW)

**Temperature**

- Drag the slider or type a value (5-50°C)
- The slider shows a heat gradient for reference

**Humidity**

- Drag the slider or type a value (5-100%)
- Lower humidity = more extreme fire behavior

**Fire Stage**

- Select the current fire development stage:
  - Spot fire — Initial ignition
  - Developing — Fire is growing
  - Established — Active fire front advancing
  - Major — Large-scale fire with multiple fronts

**Time of Day**

- Select when the fire is occurring:
  - Dawn, Morning, Midday, Afternoon, Dusk, or Night
- This affects lighting and visibility in generated images

### Step 5: Generate the Scenario

1. Review the **Scenario Summary** card at the bottom of the sidebar
2. Click the **Generate Scenario** button
3. Wait while the system:
   - Analyzes the terrain and vegetation at your location
   - Generates realistic fire images from multiple perspectives
   - Creates a short video clip (4-10 seconds)

**Generation typically takes 2-5 minutes.**

### Step 6: Review and Download Results

1. Once complete, the Results Panel will automatically expand on the right
2. You'll see multiple views of the fire:
   - **Aerial View**: Bird's eye perspective
   - **Helicopter Views**: Elevated perspective from all cardinal directions
   - **Ground Views**: Realistic view from a fire truck or vehicle on the ground
   - **Above View**: Directly overhead

3. Click any image to view it larger
4. Use the comparison tools to view images side-by-side
5. Download individual images or the complete set as a ZIP file

### Step 7: Generate Video (Optional)

1. Select one or more images you want to animate
2. Click **Generate Video**
3. The system will create a short looping video clip
4. Download the video for use in your training presentation

### Step 8: Save and Access Later

- All generated scenarios are automatically saved to your **Gallery**
- Click **Gallery** in the top navigation to view past scenarios
- You can revisit, download, or delete scenarios from the Gallery
- Share scenario links with other trainers if collaboration is enabled

## Understanding the Results

### Image Perspectives

The tool generates multiple viewpoints to give trainees a complete picture:

- **Aerial**: Wide-area overview, similar to a surveillance aircraft
- **Helicopter (N/S/E/W)**: Elevated view with 60° pitch, good for situational awareness
- **Ground (N/S/E/W)**: Eye-level view from a vehicle approaching the fire (<2km away)
- **Above**: Directly overhead, useful for planning and sector allocation

### Visual Consistency

All images in a scenario share the same seed and reference the anchor image (typically aerial view) to ensure visual consistency. This means:

- Smoke characteristics match across perspectives
- Fire intensity is consistent
- Lighting and weather conditions are uniform
- Landscape features align across views

### What the AI Captures

Generated images will include:

- Realistic smoke plumes with appropriate color (white, grey, or black)
- Fire behavior characteristics (flame height, spotting, crown fires)
- Terrain-appropriate vegetation and fuels
- Weather-influenced fire shape (head fire, flanks)
- Time-of-day lighting (shadows, sunset glow, night illumination)

## Tips for Better Results

### Location Selection

✅ **Do:**

- Choose locations with clear terrain features (ridges, valleys, forests)
- Use areas with identifiable landmarks
- Select locations within your region's typical fire environments

❌ **Avoid:**

- Urban areas or dense residential zones (tool is optimized for bushland)
- Very small areas (<5 hectares) or very large (>1000 hectares)
- Water bodies or non-vegetated terrain

### Fire Perimeter Shape

✅ **Do:**

- Draw realistic fire shapes (elliptical for wind-driven, circular for calm conditions)
- Consider topography (fires run uphill, fire shape follows valleys)
- Keep the shape simple (4-8 points is usually sufficient)

❌ **Avoid:**

- Perfect circles or highly irregular shapes
- Perimeters that cross incompatible terrain types
- Overlapping or self-intersecting polygons

### Weather Parameters

✅ **Do:**

- Use realistic parameter combinations for your region
- Start with preset scenarios and adjust from there
- Keep wind speed proportional to fire danger rating
- Match humidity to temperature (hot + dry = extreme fire behavior)

❌ **Avoid:**

- Unrealistic combinations (e.g., 50°C + 90% humidity)
- Extreme wind speeds (>100 km/h) unless justified
- Conflicting parameters (e.g., low fire danger + extreme weather)

**The system will warn you if parameters seem implausible.**

### Generating for Training Value

✅ **Do:**

- Generate multiple scenarios with varying conditions to show progression
- Create scenarios that challenge specific decision-making skills
- Use different times of day to practice visibility limitations
- Document why you chose specific parameters for training records

❌ **Avoid:**

- Generating unrealistic "worst case" scenarios that have no training value
- Creating scenarios that might confuse or mislead trainees
- Overusing extreme catastrophic conditions (dilutes training impact)

## Frequently Asked Questions

### How long does generation take?

Typically 2-5 minutes. Factors affecting speed:

- Number of perspectives requested
- System load
- Video generation (adds 1-2 minutes)

If it's taking longer than 10 minutes, check your network connection and try again.

### Why does my image look wrong?

Possible reasons:

1. **Terrain mismatch**: The system uses real terrain data. If your perimeter doesn't match actual vegetation, results may look odd.
2. **Unrealistic parameters**: Extreme or conflicting weather parameters can produce strange results.
3. **AI limitations**: Image generation AI is not perfect. Try regenerating with adjusted parameters.

### Can I edit the perimeter after generating?

Not directly. You need to:

1. Draw a new perimeter
2. Copy your previous weather settings (or use the same preset)
3. Generate a new scenario

All previous scenarios remain in your Gallery.

### Can I use these images in presentations?

Yes! Downloaded images and videos are yours to use in training exercises, presentations, and educational materials. Consider adding labels or overlays in your presentation software.

### How much does each scenario cost?

Your administrator manages usage quotas and costs. If you're approaching your quota, you'll see a warning. Contact your administrator to request an increase if needed.

### What if the vegetation type is wrong?

The system uses the best available data for your region (NSW or similar datasets). If the vegetation type is incorrect:

- Try a different location within the same fire area
- Contact your administrator to report data issues
- Adjust your training context to match the generated visuals

### Can I share scenarios with other trainers?

If collaboration features are enabled by your administrator, you can share scenario links. Otherwise, download the images and share them via your normal file-sharing methods.

### What about night operations?

Select **Night** from the time of day dropdown. Night images will show:

- Reduced visibility
- Fire glow and ember illumination
- Headlights and vehicle lighting (in ground perspectives)
- Limited terrain detail (realistic for night operations)

### Can I simulate fire progression over time?

In the current version, each scenario is a snapshot in time. Future versions will support:

- Progressive injects (T+30min, T+1hr, T+2hr)
- Fire spread simulation
- Animated sequences

For now, create multiple scenarios with increasing perimeter sizes to simulate progression.

### My browser says location access is blocked. What do I do?

To enable geolocation:

1. Click the lock/info icon in your browser's address bar
2. Find "Location" permissions
3. Change to "Allow"
4. Refresh the page and try again

Alternatively, use the address search or navigate manually.

### Can I use this tool on a tablet or phone?

The tool is optimized for laptop and desktop displays (1024px+). Mobile support is limited in the current version. For best results, use a laptop or larger screen in your training room.

---

## Getting Help

If you encounter issues or have questions:

1. Check this guide's FAQ section
2. Contact your administrator or IT support
3. Report bugs or request features through your organization's process

For administrators, see the [Admin Guide](admin-guide.md) for system management and troubleshooting.
