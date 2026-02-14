# View Perspectives Documentation

This directory contains visual documentation and reference materials for the dual-perspective view system implemented in the Fire Simulation Inject Tool.

## Files in This Directory

### 1. `viewpoint_controls_layout.md`
**Purpose:** UI reference guide  
**Contents:**
- ASCII diagrams of the viewpoint control panel layout
- Button descriptions and tooltips for all 10 views
- Complete usage flow documentation
- Comparison table of helicopter vs ground perspectives

**Use this for:** Understanding how the UI controls are organized and how to use them.

---

### 2. `perspective_comparison.md`
**Purpose:** Visual comparison of perspective types  
**Contents:**
- Side-view diagrams showing camera angles (60° vs 85°)
- Top-down views showing altitude differences
- Plan views showing distance from fire (0.8x vs 0.35x bbox)
- Training scenario examples (grass fire, forest fire)
- Key takeaways comparison table

**Use this for:** Understanding the technical and visual differences between helicopter and ground-level views.

---

## Quick Reference

### Helicopter Views (Wide-Area)
- **Purpose:** Strategic situational awareness
- **Camera:** 60° pitch, 0.8x distance, wide angle
- **Use for:** IMT briefings, fire behavior assessment, strategic planning

### Ground-Level Views (Truck Perspective)
- **Purpose:** Tactical realism for crew training
- **Camera:** 85° pitch, 0.35x distance, zoomed in (<2km)
- **Use for:** Crew safety training, vehicle operations, tactical decision-making

---

## Related Documentation

For complete technical details and implementation guidance, see:
- **`../view_perspectives.md`** - Main reference document with use cases and AI prompt considerations
- **`../../master_plan.md`** - Project-wide documentation and progress tracking

---

## Future Screenshots

When the system is deployed with a valid Mapbox token, actual screenshots of both perspective types will be added to this directory to complement the ASCII diagrams.

Planned additions:
- `helicopter_north_example.png` - Example of helicopter view from north
- `ground_north_example.png` - Example of ground-level view from north
- `ui_controls_screenshot.png` - Actual screenshot of viewpoint control panel

---

*Last Updated: 2026-02-14*  
*Related Issue: Add ground-level NSEW and Above views for realistic 'truck' perspective*
