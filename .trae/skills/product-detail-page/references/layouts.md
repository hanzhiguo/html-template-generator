# Layout Library

Pre-built section templates for product detail pages. Copy and adapt as needed.

## Section Types

### 1. Header Section

**Purpose:** Product name, brand, category

```html
<div class="header-section" data-od-id="header">
    <h1 class="header-title" data-od-id="header-title">[PRODUCT_NAME]</h1>
    <p class="header-subtitle" data-od-id="header-subtitle">[BRAND] | [CATEGORY]</p>
</div>
```

**Variations:**
- With background gradient (default)
- With decorative SVG pattern
- Simple white background

---

### 2. Hero Section (Core Selling Points)

**Purpose:** Key message + main image + top 3 selling points

```html
<div class="section" data-od-id="section-hero">
    <div class="section-title-wrapper">
        <svg class="section-title-icon" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        <h2 class="section-title" data-od-id="section-title-hero">核心卖点</h2>
    </div>

    <div class="hero-content-wrapper">
        <div class="hero-text">
            <h2>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                [HEADLINE]
            </h2>
            <ul class="selling-points">
                <li class="selling-point"><strong>[KEY_POINT_1]</strong> - [DESCRIPTION_1]</li>
                <li class="selling-point"><strong>[KEY_POINT_2]</strong> - [DESCRIPTION_2]</li>
                <li class="selling-point"><strong>[KEY_POINT_3]</strong> - [DESCRIPTION_3]</li>
            </ul>
        </div>
        <div class="hero-image-container">
            <div class="image-frame-decoration"></div>
            <img src="[PRODUCT_IMAGE]" alt="[PRODUCT_NAME]" class="hero-image" data-od-id="hero-image">
        </div>
    </div>
</div>
```

**Layout options:**
- Left text, right image (default)
- Right text, left image (reverse)
- Centered with image below

---

### 3. Specifications Section

**Purpose:** Product parameters in grid layout

```html
<div class="section" data-od-id="section-specs">
    <div class="section-title-wrapper">
        <svg class="section-title-icon" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            <path d="M9 14l2 2 4-4"/>
        </svg>
        <h2 class="section-title" data-od-id="section-title-specs">产品规格</h2>
    </div>

    <div class="specs-grid">
        <div class="spec-item highlight">
            <span class="spec-label">[LABEL_1]：</span>
            <span class="spec-value">[VALUE_1]</span>
        </div>
        <div class="spec-item">
            <span class="spec-label">[LABEL_2]：</span>
            <span class="spec-value">[VALUE_2]</span>
        </div>
        <!-- Add more spec-items as needed -->
    </div>

    <!-- Optional: Product image -->
    <div class="specs-image-container">
        <img src="[IMAGE]" alt="产品规格展示" class="specs-image">
    </div>
</div>
```

**Highlight key specs:**
- Add `highlight` class to important items
- Use sparingly (2-4 items max)

---

### 4. Features Section

**Purpose:** Feature cards with icons

```html
<div class="section" data-od-id="section-features">
    <div class="section-title-wrapper">
        <svg class="section-title-icon" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
        </svg>
        <h2 class="section-title" data-od-id="section-title-features">功能亮点</h2>
    </div>

    <div class="features-grid">
        <div class="feature-card">
            <div class="feature-icon-wrapper">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 6h16M4 12h16M4 18h7"/>
                </svg>
            </div>
            <h3 class="feature-title">[FEATURE_TITLE_1]</h3>
            <p class="feature-desc">[FEATURE_DESC_1]</p>
        </div>

        <div class="feature-card">
            <div class="feature-icon-wrapper">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
                </svg>
            </div>
            <h3 class="feature-title">[FEATURE_TITLE_2]</h3>
            <p class="feature-desc">[FEATURE_DESC_2]</p>
        </div>

        <!-- Add 3-6 feature cards total -->
    </div>

    <!-- Optional: Feature image -->
    <div class="features-image-container">
        <img src="[IMAGE]" alt="功能亮点展示" class="features-image">
    </div>
</div>
```

**Feature card count:**
- Desktop: 2 columns (even number)
- Mobile: 1 column
- Recommended: 4-6 features

---

### 5. Dimensions Section

**Purpose:** Size measurements and compatibility

```html
<div class="section" data-od-id="section-dimensions">
    <div class="section-title-wrapper">
        <svg class="section-title-icon" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
            <path d="M21 21H3V3"/>
            <path d="M21 9l-6 6-4-4-6 6"/>
        </svg>
        <h2 class="section-title" data-od-id="section-title-dimensions">适配尺寸</h2>
    </div>

    <div class="dimensions-layout">
        <div class="dimensions-info">
            <div class="dimension-group">
                <div class="dimension-label">外形尺寸（高 × 宽 × 深）</div>
                <div class="dimension-value">[DIMENSIONS]</div>
            </div>
            <div class="dimension-group">
                <div class="dimension-label">[MEASUREMENT_LABEL]</div>
                <div class="dimension-value">[MEASUREMENT_VALUE]</div>
            </div>

            <!-- Optional: Compatibility info -->
            <div class="compatibility-info">
                <div class="compatibility-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    兼容性说明
                </div>
                <ul class="compatibility-list">
                    <li class="compatibility-item">[COMPATIBILITY_1]</li>
                    <li class="compatibility-item">[COMPATIBILITY_2]</li>
                    <li class="compatibility-item">[COMPATIBILITY_3]</li>
                </ul>
            </div>
        </div>
        <div class="dimensions-image-container">
            <img src="[IMAGE]" alt="尺寸示意图" class="dimensions-image">
        </div>
    </div>
</div>
```

---

### 6. Package Contents Section

**Purpose:** List of included items

```html
<div class="section" data-od-id="section-package">
    <div class="section-title-wrapper">
        <svg class="section-title-icon" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
        <h2 class="section-title" data-od-id="section-title-package">产品清单</h2>
    </div>

    <div class="package-layout">
        <div class="package-list">
            <div class="package-item">[ITEM_1]</div>
            <div class="package-item">[ITEM_2]</div>
            <div class="package-item">[ITEM_3]</div>
            <!-- Add 6-10 items -->
        </div>
        <div class="package-image-container">
            <!-- Optional: Corner badge -->
            <svg class="corner-badge" viewBox="0 0 60 60" fill="none">
                <circle cx="30" cy="30" r="28" fill="#3b82f6"/>
                <path d="M20 30 L27 37 L40 23" stroke="white" stroke-width="3"/>
            </svg>
            <img src="[IMAGE]" alt="产品包装清单" class="package-image">
        </div>
    </div>
</div>
```

---

## Layout Patterns by Product Type

### Electronics (电子产品)

```
1. Header
2. Hero (Core Selling Points)
3. Specifications
4. Features
5. Dimensions (optional)
6. Package Contents
```

### Furniture (家具)

```
1. Header
2. Hero
3. Specifications
4. Features
5. Dimensions
6. Compatibility (optional)
```

### Sports Equipment (运动器材)

```
1. Header
2. Hero
3. Features
4. Specifications
5. Dimensions
6. Package Contents
```

### General Product (通用产品)

```
1. Header
2. Hero
3. Specifications
4. Features
5. Dimensions (optional)
6. Package (optional)
```

---

## CSS Classes Reference

### Layout Classes

```css
.container           /* Main wrapper, max-width 1000px */
.section             /* Section wrapper with padding */
.header-section      /* Header with gradient background */
.hero-content-wrapper /* Two-column grid for hero */
.specs-grid          /* Two-column specs grid */
.features-grid       /* Two-column features grid */
.dimensions-layout   /* Two-column dimensions layout */
.package-layout      /* Two-column package layout */
```

### Component Classes

```css
.section-title-wrapper  /* Title with icon */
.section-title-icon     /* SVG icon, 42px */
.section-title          /* H2 title, 32px */

.hero-text              /* Left column in hero */
.hero-image-container   /* Right column in hero */
.selling-points         /* List of selling points */
.selling-point          /* Individual point with checkmark */

.spec-item              /* Single spec row */
.spec-label             /* Spec name */
.spec-value             /* Spec value */
.highlight              /* Accent color for value */

.feature-card           /* Feature card container */
.feature-icon-wrapper   /* Icon background */
.feature-title          /* Feature heading */
.feature-desc           /* Feature description */

.dimension-group        /* Measurement item */
.dimension-label        /* Measurement name */
.dimension-value        /* Measurement value */

.package-item           /* Package list item */
```

### Utility Classes

```css
.image-frame-decoration  /* Decorative border around image */
.corner-badge           /* SVG badge for images */
.compatibility-info     /* Compatibility box */
.compatibility-list     /* List of compatibility items */
```

---

## Responsive Behavior

### Desktop (> 1024px)
- Two-column grids
- Side-by-side layouts
- All decorations visible
- Full spacing

### Tablet (768px - 1024px)
- Grids collapse to single column
- Image stacks above text
- Reduced spacing (20% less)
- Simplified decorations

### Mobile (< 768px)
- Single column only
- Larger touch targets
- Further reduced spacing
- Minimal decorations
- Smaller font sizes

---

## Best Practices

1. **Start with the template** - Copy from `template.html`
2. **Choose sections wisely** - Not all products need all sections
3. **Maintain visual rhythm** - Alternate section backgrounds
4. **Use data-od-id** - Tag all editable elements
5. **Test responsiveness** - Check all breakpoints
6. **Optimize images** - Compress and use appropriate formats
7. **Keep accent budget** - Don't overuse accent color