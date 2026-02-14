# Map UI Controls Layout - Visual Guide

## Z-Index Stack Visualization

```
┌─────────────────────────────────────────┐  z-index: 100
│         Map Error Overlay               │  (Critical alerts)
└─────────────────────────────────────────┘
         ▲
         │
┌─────────────────────────────────────────┐  z-index: 30
│    Address Search Dropdown              │  (Autocomplete results)
└─────────────────────────────────────────┘
         ▲
         │
┌─────────────────────────────────────────┐  z-index: 20
│      Address Search Box                 │  (Input field)
└─────────────────────────────────────────┘
         ▲
         │
┌─────────────────────────────────────────┐  z-index: 10
│       Draw Controls                     │  (Draw/Clear buttons)
└─────────────────────────────────────────┘
         ▲
         │
┌─────────────────────────────────────────┐  z-index: 5
│  Viewpoint Controls                     │
│  Metadata Panel                         │  (Info displays)
│  Instructions                           │
└─────────────────────────────────────────┘
         ▲
         │
┌─────────────────────────────────────────┐  z-index: implicit
│  Mapbox Navigation Control              │  (Mapbox defaults)
│  Mapbox Scale Control                   │
└─────────────────────────────────────────┘
         ▲
         │
┌─────────────────────────────────────────┐  z-index: 0 (base)
│         Map Canvas                      │
└─────────────────────────────────────────┘
```

## Desktop Layout (> 900px)

```
╔══════════════════════════════════════════════════════════════╗
║ Map Container (100% × 100%, position: relative)              ║
║                                                              ║
║  ┌──────┐                                       ┌─────────┐ ║
║  │ Nav  │        ┌──────────────────────┐      │ Draw/   │ ║
║  │ Ctrl │        │ Viewpoint Controls   │      │ Clear   │ ║
║  └──────┘        └──────────────────────┘      └─────────┘ ║
║  ┌──────────────────────┐                     ┌──────────┐ ║
║  │ Address Search       │                     │Instructns│ ║
║  └──────────────────────┘                     └──────────┘ ║
║                                                              ║
║                                                              ║
║                     MAP CANVAS                               ║
║                    (Full Screen)                             ║
║                                                              ║
║                                                              ║
║  ┌────────────────┐                           ┌───────────┐ ║
║  │ Metadata Panel │                           │   Scale   │ ║
║  └────────────────┘                           └───────────┘ ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

## Tablet Layout (768px - 900px)

```
╔══════════════════════════════════════════════════╗
║ Map Container                                    ║
║                                                  ║
║  ┌────┐      ┌───────────────────┐    ┌──────┐ ║
║  │Nav │      │ Viewpoint         │    │Draw/ │ ║
║  └────┘      │ Controls          │    │Clear │ ║
║  ┌────────────────────┐           │    └──────┘ ║
║  │ Address Search     │           │              ║
║  └────────────────────┘           │              ║
║                       └───────────┘              ║
║                                                  ║
║              MAP CANVAS                          ║
║                                                  ║
║  ┌──────────────────────────────────────┐       ║
║  │ Metadata Panel                       │       ║
║  └──────────────────────────────────────┘       ║
║                                                  ║
║                                       ┌────────┐║
║  ┌──────────────────────────────┐    │ Scale  │║
║  │ Viewpoint Controls          │    └────────┘║
║  └──────────────────────────────┘              ║
╚══════════════════════════════════════════════════╝
```

## Mobile Layout (< 768px)

```
╔════════════════════════════════════╗
║ Map Container                      ║
║                                    ║
║  ┌──┐  ┌────────────────┐  ┌────┐ ║
║  │Nav│ │Address Search  │  │Draw│ ║
║  └──┘  └────────────────┘  └────┘ ║
║                                    ║
║                                    ║
║          MAP CANVAS                ║
║                                    ║
║                                    ║
║  ┌────────────────────────────┐   ║
║  │ Metadata Panel             │   ║
║  └────────────────────────────┘   ║
║  ┌────────────────────────────┐   ║
║  │ Instructions (conditonal)  │   ║
║  └────────────────────────────┘   ║
║  ┌────────────────────────────┐   ║
║  │ Viewpoint Controls         │   ║
║  └────────────────────────────┘   ║
║                                    ║
╚════════════════════════════════════╝
```

## Very Small Mobile (< 480px)

```
╔══════════════════════════╗
║ Map Container            ║
║                          ║
║ ┌──┐ ┌─────────┐   ┌──┐ ║
║ │N │ │  Search │   │D │ ║
║ └──┘ └─────────┘   └──┘ ║
║                          ║
║    MAP CANVAS            ║
║                          ║
║ ┌──────────────────────┐ ║
║ │ Metadata Panel       │ ║
║ └──────────────────────┘ ║
║ ┌──────────────────────┐ ║
║ │ Viewpoint Controls   │ ║
║ │ (smaller buttons)    │ ║
║ └──────────────────────┘ ║
║                          ║
╚══════════════════════════╝
```

## Control Overlap Prevention

### Width Calculation Strategy

The key to preventing overlap is calculating widths based on available space:

**Desktop (> 1200px)**
```
Total Width: 100%
├─ Left Margin: 16px
├─ Address Search: min(400px, calc(100% - 440px))
│  └─ Accounts for: Nav (56px) + Viewpoint (352px) + Draw (56px) + Margins
├─ Viewpoint Controls: calc(100% - 480px)
│  └─ Centered, accounts for both sides
├─ Draw Controls: 56px
└─ Right Margin: 16px
```

**Mobile (< 768px)**
```
Total Width: 100%
├─ All controls: calc(100% - 32px)
│  └─ Full width with 16px margins each side
├─ Vertical stacking prevents overlap
└─ Controls positioned at different heights
```

## Responsive Transitions

### Breakpoint Transitions

```
1920px ──────────► 1200px ──────────► 900px ──────────► 768px ──────────► 640px ──────────► 480px
   │                  │                 │                 │                 │                 │
   │                  │                 │                 │                 │                 │
   ▼                  ▼                 ▼                 ▼                 ▼                 ▼
Full Desktop     Tight Desktop    Controls Wrap    Bottom Stack     Compact Mobile    Minimal
                                                                                         Mobile
```

### Control Behavior at Each Breakpoint

| Control | > 1200px | 900-1200px | 768-900px | 640-768px | 480-640px | < 480px |
|---------|----------|------------|-----------|-----------|-----------|---------|
| Address Search | Top-left, 400px max | Top-left, 400px max | Top-left, adjusted | Top-left, full width | Full width, 8px margins | Full width, tight |
| Viewpoint Controls | Top-center, max 480px spacing | Top-center, max 280px spacing | Left-right edges | Bottom, full width | Bottom, full width | Bottom, smaller buttons |
| Draw Controls | Top-right | Top-right | Top-right | Top-right | Top-right | Top-right, smaller |
| Instructions | Top-right, beside draw | Top-right, beside draw | Bottom, above viewpoints | Bottom, above viewpoints | Hidden | Hidden |
| Metadata | Bottom-left | Bottom-left | Bottom-left | Bottom, above viewpoints | Bottom, above viewpoints | Bottom, above viewpoints |

## Testing Checklist

### Visual Verification

- [ ] No control overlap at any viewport size
- [ ] All controls visible and accessible
- [ ] Proper spacing maintained
- [ ] Controls stay within map bounds
- [ ] Smooth transitions between breakpoints

### Functional Verification

- [ ] Address search autocomplete opens without obstruction
- [ ] Draw controls clickable at all sizes
- [ ] Viewpoint buttons all accessible
- [ ] Metadata panel readable
- [ ] Instructions visible when needed

### Accessibility Verification

- [ ] Tab order logical at all viewport sizes
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Screen reader compatible
- [ ] Keyboard navigation works throughout

### Cross-Browser Verification

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Android)

## Key Improvements Made

1. **Established Clear Z-Index Hierarchy**
   - Search controls: 20/30 (highest interactive elements)
   - Draw tools: 10 (important but below search)
   - Info panels: 5 (background context)
   - Alerts: 100 (critical overlays)

2. **Improved Responsive Breakpoints**
   - Added 1200px breakpoint for better desktop transitions
   - Enhanced 900px breakpoint for tablet edge cases
   - Added 640px and 480px for better mobile support

3. **Fixed Width Calculations**
   - Search box accounts for all surrounding controls
   - Viewpoint controls properly centered with spacing
   - Mobile uses full width with consistent margins

4. **Better Mobile Layout**
   - Vertical stacking prevents overlap
   - Instructions hidden on small screens
   - Buttons scale down for tiny viewports
   - Tighter spacing optimizes limited space

5. **Removed Conflicts**
   - Eliminated duplicate media queries
   - Fixed instructions panel positioning
   - Prevented draw controls from overlapping viewpoints
   - Ensured metadata panel doesn't conflict with other elements
