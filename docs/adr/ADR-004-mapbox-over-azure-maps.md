# ADR-004: Mapbox GL JS over Azure Maps or CesiumJS

**Status:** Accepted

**Date:** 2026-02-15

## Context

The Fire Simulation Inject Tool requires a 3D map interface where trainers can:

- Draw fire perimeter polygons
- Navigate to specific locations via search
- View terrain in 3D with elevation
- Change camera perspective (north, south, east, west, aerial)
- Capture map screenshots for reference images
- Display satellite imagery with terrain overlay

Several mapping libraries were evaluated:

1. **Mapbox GL JS** — Web-based vector and raster maps with 3D terrain
2. **Azure Maps** — Microsoft's mapping service, integrated with Azure
3. **CesiumJS** — Open-source 3D globe and maps, high-fidelity visualization
4. **Leaflet** — Lightweight 2D mapping, no 3D support
5. **Google Maps** — Popular mapping service, limited 3D terrain

## Decision

We will use **Mapbox GL JS v3** as the primary mapping library.

## Rationale

**Advantages:**
- **3D terrain support**: Built-in 3D terrain with configurable exaggeration
- **Performance**: WebGL-based rendering, smooth 60fps interactions
- **Drawing tools**: Mapbox GL Draw plugin for polygon drawing
- **Satellite imagery**: High-quality satellite basemap style
- **Camera control**: Precise control over pitch, bearing, zoom for perspective views
- **Screenshot capture**: Easy canvas export for reference images
- **Developer experience**: Excellent documentation, active community, TypeScript types
- **Free tier**: 50,000 map loads/month (sufficient for dev and early use)

**Trade-offs:**
- Not part of Azure ecosystem (separate vendor, separate token management)
- Free tier limits (need to monitor usage, upgrade if exceeded)
- Public internet dependency (Mapbox CDN must be accessible)
- Less control than self-hosted solution

## Consequences

**Positive:**
- **Rapid development**: Well-documented API, many examples and tutorials
- **Reliable service**: Mapbox infrastructure proven at scale (millions of users)
- **Rich feature set**: Geocoding, directions, styles all from one vendor
- **Modern UX**: Smooth animations, responsive controls, mobile-friendly
- **Screenshot quality**: High-resolution canvas capture for AI reference images

**Negative:**
- **Token management**: Must secure Mapbox token (stored in Key Vault + GitHub Secrets)
- **Cost scaling**: Beyond free tier, $5 per 1,000 map loads (manageable with quotas)
- **Vendor dependency**: Tied to Mapbox pricing and service availability
- **Network dependency**: Requires public internet for tile loading (no offline mode)

**Implementation details:**
- Mapbox token stored as `VITE_MAPBOX_TOKEN` environment variable
- Token included in web app build, rotated quarterly
- Free tier monitoring via Mapbox dashboard
- Fallback: If free tier exceeded, notify admin and request token upgrade
- Map style: `mapbox://styles/mapbox/satellite-streets-v12`
- 3D terrain: Enabled with 1.5x exaggeration for visibility

## Feature Comparison

| Feature | Mapbox GL JS | Azure Maps | CesiumJS | Leaflet |
|---------|--------------|------------|----------|---------|
| 3D Terrain | ✅ Built-in | ✅ Preview | ✅ Advanced | ❌ None |
| WebGL Performance | ✅ Excellent | ✅ Good | ✅ Excellent | ❌ Canvas only |
| Drawing Tools | ✅ Plugin | ✅ Built-in | ⚠️ Custom | ✅ Plugin |
| Satellite Imagery | ✅ High-quality | ✅ Good | ✅ Requires source | ✅ Via providers |
| TypeScript Support | ✅ Official | ✅ Official | ⚠️ Community | ✅ Community |
| Free Tier | ✅ 50k loads | ✅ Limited | ✅ Open source | ✅ Open source |
| Azure Integration | ❌ Separate | ✅ Native | ❌ Separate | ❌ Separate |
| Screenshot Export | ✅ Easy | ✅ Supported | ✅ Complex | ⚠️ 2D only |

## Alternatives Considered

### Azure Maps
**Why not chosen:**
- 3D terrain support still in preview (less mature)
- Smaller ecosystem and community
- Documentation less comprehensive than Mapbox
- Would add Azure dependency without significant benefit
- **When to reconsider**: If Azure Maps 3D terrain reaches GA and feature parity

### CesiumJS
**Why not chosen:**
- Overkill for use case (designed for aerospace/GIS professionals)
- Steeper learning curve (more complex API)
- Larger bundle size (~500KB vs ~200KB for Mapbox)
- Custom drawing implementation required
- **When to use**: If future requirements need advanced 3D (underground modeling, time-based sun position)

### Leaflet
**Why not chosen:**
- No 3D terrain support (2D only)
- Canvas rendering (slower than WebGL)
- Would require separate 3D library for perspectives
- **When to use**: If simplified 2D-only version needed for low-bandwidth scenarios

### Google Maps
**Why not chosen:**
- Limited 3D terrain (only available in certain areas)
- Restrictive terms of service
- Higher cost at scale
- Less flexible styling

## Future Considerations

- **Cost monitoring**: Set up alert for 80% of free tier usage
- **Token rotation**: Automate quarterly token rotation
- **Performance optimization**: Implement map tile caching for common areas
- **Offline support**: Evaluate Mapbox GL JS offline capabilities for field use
- **Custom styles**: Create fire service-specific map style (higher contrast, relevant features)
- **Azure Maps migration**: Revisit if Azure Maps 3D reaches feature parity and cost advantage

## Usage Guidelines

**Token security:**
- Never commit token to version control
- Use environment variables (`VITE_MAPBOX_TOKEN`)
- Rotate token quarterly
- Monitor usage via Mapbox dashboard
- Set up URL restrictions (fire-sim-images.azurestaticapps.net only)

**Performance best practices:**
- Use terrain source with appropriate detail level
- Debounce draw events to avoid excessive re-renders
- Cache geocoding results in memory
- Preload map tiles for common training areas
- Optimize camera transitions (smooth fly-to animations)

## References

- Mapbox GL JS: https://docs.mapbox.com/mapbox-gl-js/
- Mapbox GL Draw: https://github.com/mapbox/mapbox-gl-draw
- Mapbox pricing: https://www.mapbox.com/pricing
- Azure Maps: https://docs.microsoft.com/en-us/azure/azure-maps/
- CesiumJS: https://cesium.com/platform/cesiumjs/
