# Map UI Controls Layout

## Overview

This document describes the layout, positioning, and responsive behavior of all UI controls in the map interface.

## Z-Index Hierarchy

Controls are layered using the following z-index values to ensure proper stacking and user interaction:

| Control                 | Z-Index  | Purpose                                        |
| ----------------------- | -------- | ---------------------------------------------- |
| Address Search Dropdown | 30       | Highest - appears above all other controls     |
| Address Search Box      | 20       | High priority - always visible and accessible  |
| Draw Controls           | 10       | Important tools - easily accessible            |
| Viewpoint Controls      | 5        | Contextual - shown when fire perimeter exists  |
| Metadata Panel          | 5        | Information display - same level as viewpoints |
| Instructions            | 5        | Guidance - same level as other info panels     |
| Map Error               | 100      | Critical alerts - overlay everything           |
| Navigation Control      | implicit | Mapbox default                                 |
| Scale Control           | implicit | Mapbox default                                 |

## Desktop Layout (> 900px)

### Control Positioning

```
┌─────────────────────────────────────────────────────────────┐
│  Top-Left                Top-Center           Top-Right      │
│  [Navigation Ctrl]       [Viewpoint Controls] [Draw/Bin]     │
│  [Address Search]                             [Instructions] │
│                                                               │
│                                                               │
│                  MAP CANVAS (100%)                           │
│                                                               │
│                                                               │
│  Bottom-Left                        Bottom-Right             │
│  [Metadata Panel]                   [Scale Control]          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Control Dimensions

- **Address Search**: max-width 400px, width calc(100% - 440px)
- **Viewpoint Controls**: max-width calc(100% - 480px), centered
- **Draw Controls**: 56px width (36px buttons + 20px padding)
- **Instructions**: 260px width, positioned right of draw controls

## Tablet Layout (768px - 900px)

At the 900px breakpoint:

- Viewpoint controls shift from centered to left/right edges
- Search box width adjusts to calc(100% - 92px)
- Controls begin to stack vertically on mobile

At the 768px breakpoint:

- Viewpoint controls move to bottom of screen
- Instructions panel repositions to bottom above viewpoints
- Draw controls move to bottom position
- Metadata panel adjusts to full width

## Mobile Layout (< 768px)

### Medium Mobile (640px - 768px)

- Address search: full width minus margins
- Draw controls: top-right (absolute)
- Viewpoint controls: bottom, full width
- Metadata panel: full width, positioned above viewpoints
- Instructions: repositioned to avoid overlap

### Small Mobile (480px - 640px)

- Reduced spacing (8px margins instead of 16px)
- Draw controls: top-right corner
- Viewpoint controls: bottom, full width
- Instructions: hidden to save space
- All controls use tighter spacing

### Very Small Mobile (< 480px)

- Button sizes reduced (28px instead of 32px)
- Tighter button spacing (2px gaps)
- Smaller font sizes
- Maximum space efficiency

## Responsive Breakpoints

| Breakpoint   | Viewport Width | Key Changes                          |
| ------------ | -------------- | ------------------------------------ |
| Desktop Wide | > 1200px       | Full layout, optimal spacing         |
| Desktop      | 900px - 1200px | Adjusted viewpoint control width     |
| Tablet       | 768px - 900px  | Viewpoint controls move to edges     |
| Mobile Large | 640px - 768px  | Controls stack vertically            |
| Mobile       | 480px - 640px  | Reduced margins, hidden instructions |
| Mobile Small | < 480px        | Smallest buttons, tightest spacing   |

## Width Calculations

### Search Container Width

- **Desktop (> 1200px)**: `calc(100% - 440px)` - accounts for all controls
- **Medium (900px - 1200px)**: `calc(100% - 240px)` - adjusted for smaller viewpoints
- **Tablet (< 900px)**: `calc(100% - 92px)` - accounts for draw controls only
- **Mobile (< 768px)**: `calc(100% - 32px)` - full width with margins

### Viewpoint Controls Width

- **Desktop**: `calc(100% - 480px)` - centered, accounts for side controls
- **Medium**: `calc(100% - 280px)` - tighter centering
- **Tablet/Mobile**: `calc(100% - 32px)` - full width with margins

## Accessibility

All controls maintain proper keyboard navigation and ARIA attributes:

- **Address Search**: Full keyboard navigation with arrow keys, Enter, Escape
- **Draw Controls**: Keyboard focusable with aria-label attributes
- **Viewpoint Controls**: aria-pressed states for toggle buttons
- **Instructions**: aria-hidden for decorative elements

## Key Features

1. **No Overlap**: Controls are positioned to never overlap at any viewport size
2. **Proper Stacking**: Z-index hierarchy ensures dropdowns appear above all other UI
3. **Responsive**: Smooth transitions between layouts at all breakpoints
4. **Accessible**: Full keyboard navigation support throughout
5. **Flexible**: Controls shrink/expand based on available space
6. **Bounded**: All controls remain within the map container boundaries

## Testing Recommendations

Test the following scenarios:

1. **Desktop (1920x1080, 1440x900)**: Verify all controls visible without overlap
2. **Tablet (1024x768, 768x1024)**: Check vertical stacking behavior
3. **Mobile (375x667, 414x896)**: Confirm controls fit and are usable
4. **Small Mobile (320x568)**: Ensure minimum usability maintained
5. **Keyboard Navigation**: Tab through all controls, verify focus states
6. **Screen Readers**: Test with NVDA/JAWS for proper announcements

## Implementation Notes

- All positioning uses CSS absolute positioning within relative map container
- Flexbox used for internal control layout
- Media queries cascade properly (mobile-first approach with max-width)
- No JavaScript required for layout adjustments
- CSS custom properties used for consistent spacing and colors
