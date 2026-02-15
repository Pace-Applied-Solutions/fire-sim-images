# Future Roadmap: Fire Simulation Inject Tool

This document outlines the planned enhancements beyond the MVP. Each phase builds on the previous one, adding progressively more sophisticated capabilities while maintaining system reliability and usability.

---

## Current State (MVP Complete)

The MVP provides:

- 3D map interface with fire perimeter drawing
- Scenario input controls (fire danger rating, weather, time of day)
- Geospatial data lookup (vegetation, elevation, terrain)
- Multi-perspective image generation (aerial, helicopter, ground views)
- Short video clip generation (4-10 seconds)
- Results gallery and scenario history
- Azure AD authentication and role-based access
- Monitoring and observability

**Ready for trainer validation and real-world use.**

---

## Phase 2: Enhanced Spatial Control

**Timeline:** 3-4 months post-MVP
**Goal:** Precise control over fire placement and terrain-aware generation

### Features

#### SDXL + ControlNet Integration

- **Mask-based fire placement**: Draw exactly where fire appears in the image
- **Multi-model strategy**:
  - Stable Image Core for speed and general scenarios
  - SDXL + ControlNet for precision and spatial control
- **Model selection UI**: Toggle between models based on use case
- **Cost optimization**: Use SDXL only when precision required

#### Depth Map Generation

- **DEM integration**: Convert elevation data to depth maps
- **Terrain-aware fire**: Fire follows terrain contours and slopes realistically
- **ControlNet depth conditioning**: Use depth maps to guide image generation
- **Perspective accuracy**: Ground views respect actual terrain geometry

#### Inpainting Mode

- **Paint fire directly**: Click and paint fire onto existing map screenshots
- **Selective editing**: Modify specific areas without regenerating entire image
- **Fire intensity brushes**: Different brush modes for spot fires, crown fires, ember zones
- **Reference image support**: Start with actual location photos, add fire

### Benefits

- More precise visuals for specific training objectives
- Better alignment between map perimeter and generated fire
- Reduced trial-and-error (get desired result in fewer attempts)
- Support for complex scenarios (multiple fire fronts, specific ignition points)

### Technical Considerations

- Self-hosted SDXL model or Azure AI Foundry Stable Image Core
- GPU compute costs vs. Stable Image Core API costs
- Longer generation time (30-60 seconds per image vs. 2-5 seconds)
- Storage for depth maps and control masks

---

## Phase 3: Fire Spread Simulation

**Timeline:** 6-8 months post-MVP
**Goal:** Progressive injects showing fire evolution over time

### Features

#### Simplified Fire Spread Model

- **Cellular automata**: Grid-based fire spread with wind and terrain influence
- **Rate of spread calculation**: Use AFDRS fire behavior data and fuel types
- **Time-stepped progression**: Generate fire perimeter at T+0, T+30min, T+1hr, T+2hr
- **Wind shift scenarios**: Model direction changes and their impact

#### Progressive Image Generation

- **Anchor timeline**: Generate initial fire image at T+0
- **Time-based variants**: Generate subsequent images showing fire growth
- **Consistent reference**: All images in sequence reference T+0 for visual consistency
- **Spot fire emergence**: Show new ignitions from spotting

#### Animated Sequences

- **Stitch images**: Combine T+0, T+30, T+1hr into video sequence
- **Transition effects**: Smooth dissolves or map overlays between timeframes
- **Timeline scrubber**: Interactive control to view fire at any point in sequence
- **Side-by-side comparison**: Show multiple time points simultaneously

#### Integration with Fire Behavior Tools

- **Spark API**: Integrate Australian fire spread prediction tool (if available)
- **Custom parameters**: Wind speed changes, fuel moisture transitions
- **Suppression scenarios**: Model the effect of containment lines and backburns

### Benefits

- Realistic incident progression for IMT training
- Decision-making at critical time points (evacuate now or in 30 minutes?)
- Resource allocation scenarios (where will fire be in 1 hour?)
- Understanding fire behavior dynamics (rate of spread, spotting distance)

### Technical Considerations

- Fire spread algorithm accuracy vs. complexity (cellular automata is approximate)
- Computation time for spread model (must be fast enough for interactive use)
- Storage for multi-timepoint scenarios (5x images per scenario)
- Prompt engineering for time-consistent visuals

---

## Phase 4: Longer and Higher-Quality Video

**Timeline:** 9-12 months post-MVP
**Goal:** 30-60 second clips with smooth motion and high resolution

### Features

#### Extended Video Generation

- **Longer models**: Use emerging video models (Sora, Runway Gen-3, Pika)
- **30-60 second clips**: Sufficient for detailed fire behavior observation
- **Multiple angles**: Generate video from multiple camera positions
- **Camera motion**: Panning, zooming, circling fire perimeter

#### Video Stitching

- **Chain multiple clips**: Combine 4-10 second SVD clips into longer sequence
- **Seamless transitions**: Frame interpolation for smooth cuts
- **Timeline editing**: Trainer can reorder, trim, and combine clips
- **Audio track support**: Add wind, fire crackling sound effects

#### Frame Interpolation

- **Smooth playback**: 60fps output from 10fps generated frames
- **FILM or RIFE models**: State-of-the-art frame interpolation
- **Motion coherence**: Reduce flickering and artifacts

#### Higher Resolution

- **1080p output**: Up from 1024x1024 or 1792x1024
- **4K support**: If models support it (future capability)
- **Aspect ratios**: 16:9 for presentations, vertical for mobile

### Benefits

- More immersive training materials
- Detailed observation of fire behavior (ember showers, smoke column development)
- Presentation-ready video clips (no need for external editing)
- Better understanding of dynamic fire behavior

### Technical Considerations

- Video model costs (significantly higher than image generation)
- Generation time (could be 5-10 minutes for 30-second clip)
- Storage requirements (video files 10-50 MB each)
- Bandwidth for streaming/downloading large files

---

## Phase 5: Advanced Features

**Timeline:** 12+ months post-MVP
**Goal:** Cutting-edge capabilities and external integrations

### Custom Camera Positions

- **Trainer-defined viewpoints**: Click on map to set exact camera position and angle
- **Landmark views**: Generate from specific observation points (fire lookout towers, key intersections)
- **360° panoramas**: Full spherical images for immersive viewing
- **VR support**: Export to VR headsets for first-person fire ground experience

### AR Overlay Mode

- **Project onto physical maps**: Use tablet camera to overlay fire visuals on printed maps
- **Tabletop scenarios**: AR fire spread on physical terrain models
- **Field training**: Overlay fire behavior on actual landscape views

### Integration with Training Platforms

- **XVR On Scene**: Export scenarios to XVR format
- **Incident IQ**: Integration with incident management systems
- **SARMAP**: Export for search and rescue planning
- **GIS platforms**: QGIS, ArcGIS plugin for direct generation

### Multi-Fire Scenarios

- **Multiple active fronts**: Generate scenarios with 2-5 separate fires
- **Coordinated incidents**: Fires affecting different sectors simultaneously
- **Resource allocation training**: Prioritize which fire to attack first

### Live Weather Integration

- **Bureau of Meteorology API**: Pull current or forecast weather data
- **Automatic updates**: Regenerate scenarios when conditions change
- **Historical weather**: Use actual weather from past fire events

### Scenario Sharing and Collaboration

- **Team libraries**: Shared scenario collections for training organizations
- **Templates**: Pre-built scenarios for common training objectives
- **Commenting**: Trainers can annotate scenarios and share insights
- **Version control**: Track changes to scenarios over time

### Mobile-Responsive Interface

- **Tablet optimization**: Touch-friendly controls for iPad use
- **Field deployment**: Generate scenarios on-site during exercises
- **Offline mode**: Pre-cache map tiles and core functionality
- **Progressive Web App**: Install as mobile app

### AI-Powered Enhancements

- **Smart suggestions**: AI recommends scenarios based on training goals
- **Automatic validation**: AI checks if scenario parameters are realistic
- **Natural language input**: "Generate an extreme grassfire in the Blue Mountains at sunset"
- **Quality feedback**: AI rates generated images and suggests improvements

---

## Long-Term Vision (2+ years)

### Full Physics-Based Simulation

- Integration with advanced fire models (Phoenix, FarSite)
- Particle-based smoke simulation
- Detailed emissary behavior
- Terrain shadowing and radiant heat modeling

### Generative 3D Scenes

- Full 3D environments, not just 2D images
- Navigate through generated fire scenes
- VR/AR native experiences
- Real-time fire behavior

### Photorealistic Long-Form Video

- 5-10 minute continuous footage
- Multiple camera cuts and angles
- Presenter narration track
- Complete training video packages

### Agency Ecosystem

- Multi-agency collaboration platform
- Scenario marketplace (buy/sell training scenarios)
- Certification and quality standards
- Integration with national training frameworks

---

## Priority Ranking

Based on trainer feedback and technical feasibility:

| Phase                     | Priority   | Effort | Value                    | Recommended Start    |
| ------------------------- | ---------- | ------ | ------------------------ | -------------------- |
| Phase 2 (Spatial Control) | High       | Medium | High                     | After MVP validation |
| Phase 3 (Fire Spread)     | High       | High   | Very High                | Q2 2026              |
| Phase 4 (Better Video)    | Medium     | High   | Medium                   | Q3 2026              |
| Phase 5 (Advanced)        | Low-Medium | Varies | High (selected features) | Q4 2026 onwards      |

**Recommendation:**

- **Immediate (Q1 2026)**: Validate MVP with trainers, gather feedback
- **Q2 2026**: Start Phase 2 (SDXL integration) and early Phase 3 planning
- **Q3 2026**: Complete Phase 2, begin Phase 3 (fire spread)
- **Q4 2026**: Evaluate Phase 4 based on new video model availability

---

## Success Metrics

**Adoption:**

- 50+ active trainers using the tool monthly
- 500+ scenarios generated per month
- 80%+ user satisfaction rating

**Quality:**

- <5% scenario regeneration rate (got it right first time)
- > 90% images rated "realistic" or "very realistic"
- <2% error rate in generation pipeline

**Efficiency:**

- <3 minutes average scenario creation time (down from 30+ minutes manual)
- <5 minutes generation time (95th percentile)
- Cost <$1.50 per complete scenario

**Impact:**

- 10+ agencies using the tool
- Integration into official training curricula
- Measurable improvement in trainee decision-making (via evaluation)

---

## Getting Involved

**For trainers:**

- Provide feedback on MVP features
- Suggest scenarios that are hard to create today
- Participate in Phase 2 beta testing

**For developers:**

- Review roadmap and suggest technical approaches
- Contribute to open issues in Phase 2 planning
- Prototype experimental features

**For administrators:**

- Plan infrastructure scaling for additional features
- Budget for Phase 2-3 development costs
- Coordinate with other agencies for collaboration features

---

## References

- [Master Plan](master_plan.md) — Project context and architecture
- [Technical Considerations](tech_considerations.md) — Technology choices
- [ADRs](adr/) — Architecture decision records
- [Trainer Guide](trainer-guide.md) — Current MVP capabilities

For questions or suggestions, open a GitHub issue or contact the development team.
