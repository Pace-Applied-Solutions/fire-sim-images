# Map UI Controls - Testing Guide

## Purpose

This guide provides step-by-step instructions for testing the map UI controls layout across different viewport sizes and scenarios.

## Prerequisites

1. Development server running (`npm run dev` from root)
2. Browser DevTools open (F12)
3. Map loaded with Mapbox token configured

## Test Scenarios

### Scenario 1: Desktop Wide View (1920x1080)

**Setup:**
1. Set viewport to 1920x1080 in DevTools
2. Navigate to the scenario page
3. Draw a fire perimeter to activate viewpoint controls

**Expected Results:**
- [ ] Address search visible at top-left (max 400px width)
- [ ] Viewpoint controls centered at top, not overlapping search or draw controls
- [ ] Draw controls visible at top-right
- [ ] Instructions panel visible to the left of draw controls
- [ ] Metadata panel visible at bottom-left
- [ ] No controls overlap each other
- [ ] All controls have proper spacing (16px margins)

**Screenshot Required:** Yes - full desktop view with all controls visible

---

### Scenario 2: Desktop Standard (1440x900)

**Setup:**
1. Set viewport to 1440x900 in DevTools
2. Load scenario page with fire perimeter drawn

**Expected Results:**
- [ ] All controls visible and properly positioned
- [ ] Search box adjusts width appropriately
- [ ] Viewpoint controls remain centered
- [ ] No overlap between any controls

**Screenshot Required:** Yes

---

### Scenario 3: Small Desktop (1200x768)

**Setup:**
1. Set viewport to 1200x768
2. Draw fire perimeter

**Expected Results:**
- [ ] Search box width adjusts to `calc(100% - 240px)`
- [ ] Viewpoint controls max-width adjusts to `calc(100% - 280px)`
- [ ] All controls remain visible without overlap

**Screenshot Required:** Yes - showing adjusted widths

---

### Scenario 4: Tablet Landscape (1024x768)

**Setup:**
1. Set viewport to 1024x768
2. Enable touch device emulation
3. Draw fire perimeter

**Expected Results:**
- [ ] Viewpoint controls shift to left/right edges at 900px
- [ ] Search box adjusts to `calc(100% - 92px)`
- [ ] Buttons may wrap to multiple lines
- [ ] All controls accessible with touch

**Screenshot Required:** Yes - showing button wrapping

---

### Scenario 5: Tablet Portrait (768x1024)

**Setup:**
1. Set viewport to 768x1024 (portrait)
2. Draw fire perimeter

**Expected Results:**
- [ ] Viewpoint controls move to bottom of screen
- [ ] Instructions panel repositions to bottom above viewpoints
- [ ] Draw controls remain at top-right
- [ ] Metadata panel full width at bottom
- [ ] Search box full width minus margins
- [ ] Vertical stacking prevents overlap

**Screenshot Required:** Yes - showing vertical layout

---

### Scenario 6: Large Mobile (414x896) - iPhone XR/11

**Setup:**
1. Set viewport to 414x896
2. Enable mobile device emulation
3. Draw fire perimeter

**Expected Results:**
- [ ] All controls use full width with 16px margins
- [ ] Viewpoint controls at bottom
- [ ] Draw controls at top-right
- [ ] Search at top-left
- [ ] Instructions visible above viewpoint controls
- [ ] Touch targets large enough (min 44x44px)

**Screenshot Required:** Yes - portrait mobile view

---

### Scenario 7: Medium Mobile (375x667) - iPhone SE/8

**Setup:**
1. Set viewport to 375x667
2. Mobile emulation enabled
3. Draw fire perimeter

**Expected Results:**
- [ ] All controls fit within viewport
- [ ] No horizontal scrolling
- [ ] Viewpoint buttons wrap appropriately
- [ ] Instructions may be hidden to save space
- [ ] All controls remain accessible

**Screenshot Required:** Yes

---

### Scenario 8: Small Mobile (360x640) - Android Common

**Setup:**
1. Set viewport to 360x640
2. Mobile emulation enabled
3. Draw fire perimeter

**Expected Results:**
- [ ] Margins reduced to 8px
- [ ] Instructions hidden
- [ ] Viewpoint controls full width
- [ ] All essential controls visible
- [ ] No overlap

**Screenshot Required:** Yes - showing compact layout

---

### Scenario 9: Tiny Mobile (320x568) - iPhone SE (1st gen)

**Setup:**
1. Set viewport to 320x568
2. Mobile emulation enabled
3. Draw fire perimeter

**Expected Results:**
- [ ] Button sizes reduced to 28x28px
- [ ] Gap spacing reduced to 2px
- [ ] All controls scaled down but usable
- [ ] Font sizes reduced appropriately
- [ ] Instructions hidden
- [ ] Essential functionality maintained

**Screenshot Required:** Yes - showing minimum viable layout

---

## Interaction Tests

### Test 1: Address Search Dropdown

**Steps:**
1. Click address search box
2. Type "Sydney"
3. Observe dropdown appearance

**Expected Results:**
- [ ] Dropdown appears with z-index 30 (above all other controls)
- [ ] Dropdown does not get cut off by map container
- [ ] Results are readable and clickable
- [ ] Dropdown closes on selection or click outside

**Test at viewports:** 1920x1080, 768x1024, 375x667

---

### Test 2: Viewpoint Controls Interaction

**Steps:**
1. Draw fire perimeter
2. Click each viewpoint button (N, S, E, W, Above)
3. Toggle between helicopter and ground views
4. Click capture button

**Expected Results:**
- [ ] All buttons clickable without accidental mis-clicks
- [ ] Active button shows proper highlight
- [ ] View mode toggle works smoothly
- [ ] Capture button accessible
- [ ] No buttons hidden or cut off

**Test at viewports:** 1920x1080, 1024x768, 414x896, 320x568

---

### Test 3: Draw Controls

**Steps:**
1. Click draw button
2. Draw polygon on map
3. Click clear button

**Expected Results:**
- [ ] Buttons always visible and accessible
- [ ] Hover states work correctly
- [ ] Clear button confirms before deleting
- [ ] Controls don't move during interaction

**Test at viewports:** All major breakpoints

---

### Test 4: Metadata Panel Readability

**Steps:**
1. Draw fire perimeter
2. Observe metadata panel

**Expected Results:**
- [ ] Panel visible at all viewport sizes (except instructions on small mobile)
- [ ] Text readable (not truncated)
- [ ] Values display correctly
- [ ] Panel doesn't overlap other controls

**Test at viewports:** 1920x1080, 768x1024, 414x896

---

## Keyboard Navigation Tests

### Test 5: Tab Order

**Steps:**
1. Load scenario page
2. Press Tab repeatedly
3. Note focus order

**Expected Focus Order:**
1. Address search input
2. Geolocation button
3. Draw button
4. Clear button
5. Viewpoint mode toggle
6. Viewpoint direction buttons (N, S, E, W, Above)
7. Capture button

**Expected Results:**
- [ ] Focus visible on all controls
- [ ] Tab order logical at all viewports
- [ ] No focus traps
- [ ] Skip to main content available

---

### Test 6: Address Search Keyboard

**Steps:**
1. Tab to address search
2. Type query
3. Use Arrow Down to navigate results
4. Press Enter to select
5. Press Escape to close

**Expected Results:**
- [ ] Keyboard navigation works completely
- [ ] Selected item highlighted
- [ ] Enter selects item
- [ ] Escape closes dropdown
- [ ] Focus returns to input

---

## Accessibility Tests

### Test 7: Screen Reader

**Tools:** NVDA (Windows) or VoiceOver (Mac)

**Steps:**
1. Enable screen reader
2. Navigate through all controls
3. Verify announcements

**Expected Results:**
- [ ] All buttons have proper labels
- [ ] Current state announced (e.g., "pressed" for active viewpoint)
- [ ] Instructions read correctly
- [ ] Metadata values announced clearly
- [ ] Error messages announced

---

### Test 8: Color Contrast

**Tools:** Browser DevTools Accessibility Panel

**Steps:**
1. Inspect all text elements
2. Check contrast ratios

**Expected Results:**
- [ ] All text meets WCAG AA (4.5:1 for normal text)
- [ ] Focus indicators visible (3:1 minimum)
- [ ] Disabled states distinguishable
- [ ] Active states clear

---

## Edge Cases

### Test 9: Very Long Address Search Query

**Steps:**
1. Type very long address into search box
2. Observe text handling

**Expected Results:**
- [ ] Text doesn't overflow container
- [ ] Input remains usable
- [ ] Dropdown adjusts appropriately

---

### Test 10: Rapid Viewport Resizing

**Steps:**
1. Rapidly resize browser window
2. Observe control behavior

**Expected Results:**
- [ ] Controls reposition smoothly
- [ ] No visual glitches
- [ ] No JavaScript errors in console
- [ ] Layout remains functional

---

### Test 11: Multiple Map Interactions Simultaneously

**Steps:**
1. Open address search dropdown
2. Hover over viewpoint button
3. Begin drawing on map

**Expected Results:**
- [ ] Search dropdown remains above other controls
- [ ] Hover states work correctly
- [ ] Drawing doesn't interfere with controls
- [ ] All interactions work as expected

---

## Browser Compatibility Tests

Test all scenarios across:

- [ ] Chrome (latest) - Desktop & Mobile
- [ ] Firefox (latest) - Desktop & Mobile
- [ ] Safari (latest) - Desktop & Mobile
- [ ] Edge (latest) - Desktop

---

## Performance Tests

### Test 12: Rendering Performance

**Steps:**
1. Open DevTools Performance tab
2. Draw fire perimeter
3. Interact with all controls
4. Check frame rate

**Expected Results:**
- [ ] No dropped frames during control interactions
- [ ] Smooth animations
- [ ] Responsive button clicks
- [ ] No layout thrashing

---

## Screenshot Checklist

Required screenshots for PR:

- [ ] Desktop 1920x1080 - all controls visible
- [ ] Desktop 1440x900 - standard view
- [ ] Desktop 1200x768 - adjusted widths
- [ ] Tablet 1024x768 - landscape
- [ ] Tablet 768x1024 - portrait with bottom controls
- [ ] Mobile 414x896 - iPhone 11 size
- [ ] Mobile 375x667 - iPhone 8 size
- [ ] Mobile 360x640 - Android common
- [ ] Mobile 320x568 - minimum size
- [ ] Address search dropdown open (desktop)
- [ ] Address search dropdown open (mobile)
- [ ] Viewpoint controls with active button highlighted

---

## Test Results Template

Copy this template for documenting test results:

```markdown
## Test Results: [Date]

**Tester:** [Name]
**Browser:** [Browser + Version]
**OS:** [Operating System]

### Desktop Tests
- [ ] 1920x1080 - PASS/FAIL - Notes:
- [ ] 1440x900 - PASS/FAIL - Notes:
- [ ] 1200x768 - PASS/FAIL - Notes:

### Tablet Tests
- [ ] 1024x768 - PASS/FAIL - Notes:
- [ ] 768x1024 - PASS/FAIL - Notes:

### Mobile Tests
- [ ] 414x896 - PASS/FAIL - Notes:
- [ ] 375x667 - PASS/FAIL - Notes:
- [ ] 360x640 - PASS/FAIL - Notes:
- [ ] 320x568 - PASS/FAIL - Notes:

### Interaction Tests
- [ ] Address Search - PASS/FAIL - Notes:
- [ ] Viewpoint Controls - PASS/FAIL - Notes:
- [ ] Draw Controls - PASS/FAIL - Notes:
- [ ] Keyboard Navigation - PASS/FAIL - Notes:

### Accessibility
- [ ] Screen Reader - PASS/FAIL - Notes:
- [ ] Color Contrast - PASS/FAIL - Notes:
- [ ] Focus Indicators - PASS/FAIL - Notes:

### Issues Found
1. [Description]
2. [Description]

### Screenshots Attached
- [ ] All required screenshots included
```

---

## Known Limitations

Document any known issues or limitations:

1. **Instructions Panel on Small Mobile**: Hidden below 640px to save space
2. **Button Sizes**: Reduced to 28px on very small viewports (480px), minimum touch target consideration
3. **Viewpoint Control Wrapping**: Buttons wrap at 900px breakpoint, may take more vertical space

---

## Additional Notes

- Test with and without fire perimeter drawn (some controls conditional)
- Test with different map zoom levels
- Test with map rotated/pitched
- Test with search results of varying lengths
- Test with slow network (simulated) for loading states
