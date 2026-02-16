# Mobile Responsive Layout

## Overview

The application now provides a fully functional mobile experience for viewports ≤768px wide. The desktop left/right panel interface transforms into a mobile-friendly bottom drawer system with tab-based navigation.

## Design Principles

1. **Mobile-First Bottom Drawers**: Panels slide up from the bottom instead of overlaying from sides
2. **Single-Panel Focus**: Only one panel visible at a time on mobile to maximize map visibility
3. **Touch-Friendly Controls**: All interactive elements meet 44px minimum tap target size
4. **Progressive Enhancement**: Desktop/tablet experience (>768px) remains unchanged

## Breakpoints

- **Desktop/Tablet**: >768px - Original side panel layout
- **Tablet**: 769-1024px - Fixed overlay panels with backdrop
- **Mobile**: ≤768px - Bottom drawer panels with tab bar navigation

## Mobile UI Components

### Mobile Tab Bar

Location: Fixed at bottom of viewport (64px height)

Three tabs provide navigation:

- **Inputs (⚙️)**: Opens scenario input panel
- **Map (🗺️)**: Shows full map view (default)
- **Results (🖼️)**: Opens generated results panel

**Features:**

- Touch-optimized 44px+ tap targets
- Active tab indicator (top border + highlighted color)
- Fixed z-index above all panels
- Always visible for quick navigation

**Implementation:**

- Component: `apps/web/src/components/Layout/MobileTabBar.tsx`
- Styles: `apps/web/src/components/Layout/MobileTabBar.module.css`
- Only renders on ≤768px viewports

### Bottom Drawer Panels

Both Sidebar (Inputs) and ResultsPanel transform into bottom drawers on mobile:

**Sidebar (Inputs Panel)**

- Max height: 60vh
- Positioned: 64px from bottom (above tab bar)
- When closed: Completely hidden (translateY(100%))
- Header: Tappable to collapse/expand

**ResultsPanel**

- Max height: 70vh (slightly taller for viewing images)
- Positioned: 64px from bottom (above tab bar)
- When closed: Completely hidden (translateY(100%))
- Header: Tappable to collapse/expand
- Higher z-index than inputs panel

**Shared Mobile Features:**

- Rounded top corners (border-radius: var(--radius-lg))
- Smooth slide animations (transform transitions)
- Touch-optimized headers with user-select: none
- Close button (✕) with 44px touch target
- No backdrop overlay (tab bar handles navigation)
- Bottom padding to prevent content cutoff

## Interaction Patterns

### Opening Panels

1. Tap tab in mobile tab bar
2. Previous panel closes automatically
3. Selected panel slides up from bottom
4. Map remains partially visible above panel

### Closing Panels

1. Tap Map tab to view full map
2. Tap close button (✕) in panel header
3. Tap panel header (anywhere outside close button)

### Panel Priority

When both panels programmatically open:

- Results panel takes precedence (higher z-index)
- Used when generation completes to show results immediately

## Technical Implementation

### CSS Architecture

**Sidebar.module.css**

```css
/* Desktop/Tablet: 769px+ */
.sidebar {
  width: 320px;
  position: relative;
}

/* Tablet Overlay: 769-1024px */
@media (max-width: 1024px) {
  .sidebar {
    position: fixed;
    top: 64px;
    left: 0;
  }
}

/* Mobile Bottom Drawer: ≤768px */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    bottom: 64px;
    left: 0;
    right: 0;
    width: 100%;
    max-height: 60vh;
    transform: translateY(0);
  }
  .sidebar.closed {
    transform: translateY(100%);
  }
}
```

**Key CSS Properties:**

- `transform: translateY()` for smooth slide animations
- `max-height: 60vh/70vh` prevents panels from covering entire screen
- `bottom: 64px` reserves space for tab bar
- `border-radius: var(--radius-lg) var(--radius-lg) 0 0` for rounded tops
- `-webkit-tap-highlight-color: transparent` prevents flash on tap

### State Management

**appStore.ts** provides panel state:

```typescript
isSidebarOpen: boolean
isResultsPanelOpen: boolean
setSidebarOpen: (open: boolean) => void
setResultsPanelOpen: (open: boolean) => void
```

**MobileTabBar.tsx** coordinates mutual exclusivity:

```typescript
handleInputsClick: () => {
  setSidebarOpen(true);
  setResultsPanelOpen(false);
};
```

### Component Integration

**Layout.tsx** includes MobileTabBar:

```tsx
<div className={styles.layout}>
  <Header />
  <div className={styles.body}>
    <Sidebar>{sidebar}</Sidebar>
    <MainArea>{main}</MainArea>
    <ResultsPanel>{results}</ResultsPanel>
  </div>
  <MobileTabBar />
</div>
```

## Touch Optimization

### Minimum Touch Targets

All interactive elements meet or exceed 44x44px:

- Mobile tab bar buttons: 44px+ height
- Panel close buttons: 44x44px minimum
- Panel headers: 56px minimum height

### Touch Feedback

- Active states on button press
- Smooth animations (250ms cubic-bezier easing)
- No visual flash: `-webkit-tap-highlight-color: transparent`
- Prevents text selection: `user-select: none` on headers

## Accessibility

### Keyboard Navigation

- Tab bar buttons: keyboard focusable
- Focus indicators: 2px outline offset
- ARIA labels: "Show scenario inputs", "Show map", "Show generated results"
- ARIA pressed states: aria-pressed={activeTab === 'inputs'}

### Screen Readers

- Semantic button elements throughout
- Descriptive aria-labels on icon-only buttons
- Panel headers announce collapse/expand state

## Map Interaction on Mobile

Map controls adjusted for mobile drawers:

- Viewpoint controls: Positioned to avoid panel overlap
- Draw controls: Remain accessible when panels open
- Address search: Full-width on mobile
- Map toolbar: Wraps to multiple rows on narrow screens

See `docs/current_state/map_ui_controls_layout.md` for details.

## Testing Mobile Layout

### Portrait Orientation Testing

**Test Viewports:**

- 375x667px (iPhone SE)
- 390x844px (iPhone 13/14)
- 360x800px (Android standard)

**Test Cases:**

1. Default state shows map with tab bar
2. Tap Inputs tab → drawer slides up, map visible above
3. Tap Map tab → drawer closes, full map visible
4. Tap Results tab → results drawer opens
5. Tap panel header → panel collapses
6. Close button (✕) closes panel
7. All controls within thumb reach (bottom 50% of screen)

### Landscape Orientation Testing

**Test Viewports:**

- 667x375px (iPhone SE landscape)
- 844x390px (iPhone 13/14 landscape)

**Test Cases:**

1. Panels use same 60vh/70vh max height (more absolute pixels)
2. Tab bar remains at bottom
3. Map controls don't overlap with drawer
4. Generate button accessible when input panel open

### Critical Control Verification

**Scenario Input Panel:**

- [ ] Fire danger rating dropdown accessible
- [ ] Weather sliders usable
- [ ] Preset buttons tappable
- [ ] Generate button accessible at bottom
- [ ] Panel scrolls smoothly when content exceeds max-height

**Map View:**

- [ ] Address search functional
- [ ] Draw polygon on map
- [ ] Viewpoint controls (N/S/E/W/Above) accessible
- [ ] Zoom controls usable
- [ ] No horizontal scroll or overflow

**Results Panel:**

- [ ] Images display correctly
- [ ] Scroll through multiple images
- [ ] Thinking text readable
- [ ] Download/share buttons accessible

## Known Limitations

1. **Not Fully Mobile-First**: App still optimized for desktop/tablet as primary use case
2. **Portrait Recommended**: Landscape works but panels consume more vertical space
3. **Smaller Screens (<375px)**: May have cramped controls, not officially supported
4. **Backdrop Removed**: No dimming effect; users must use tab bar to switch views

## Browser Support

Tested on:

- Safari iOS 15+
- Chrome Android 100+
- Chrome iOS 100+
- Firefox Android 100+

Required features:

- CSS transforms
- CSS viewport units (vh)
- Touch events
- Media queries

## Future Enhancements

Potential improvements (not in current scope):

1. Swipe gestures to close panels
2. Drag handle on panel headers for visual affordance
3. Adjustable drawer height (snap points at 40%, 60%, 90vh)
4. Persistent tab selection in session storage
5. Orientation change handling (lock/warn landscape)
6. PWA installation prompt for mobile home screen

## Related Documentation

- [Map UI Controls Layout](./map_ui_controls_layout.md)
- [Map UI Testing Guide](./map_ui_testing_guide.md)
- [View Perspectives](./view_perspectives.md)

## Files Changed

### New Files

- `apps/web/src/components/Layout/MobileTabBar.tsx`
- `apps/web/src/components/Layout/MobileTabBar.module.css`
- `docs/current_state/mobile_responsive_layout.md` (this file)

### Modified Files

- `apps/web/src/components/Layout/Sidebar.tsx` - Added mobile header tap handler
- `apps/web/src/components/Layout/Sidebar.module.css` - Added mobile drawer styles
- `apps/web/src/components/Layout/ResultsPanel.tsx` - Added mobile header tap handler
- `apps/web/src/components/Layout/ResultsPanel.module.css` - Added mobile drawer styles
- `apps/web/src/components/Layout/Layout.tsx` - Integrated MobileTabBar
- `apps/web/src/components/Layout/index.ts` - Exported MobileTabBar
