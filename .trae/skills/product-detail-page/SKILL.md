---
name: "product-detail-page"
description: "Generates professional product detail HTML pages with specs, features, and dimensions. Invoke when user wants to create product pages, parameter sheets, or product landing pages."
---

# Product Detail Page Skill

Generate professional, single-file HTML product detail pages with structured sections, SVG decorations, and design system integration.

## When to Use This Skill

Invoke this skill when:
- User asks to create a product detail page
- User wants to generate product parameter/specification pages
- User needs a product landing page with specs and features
- User says "create product page", "make product details", "generate specs page"
- User provides product data and wants it formatted as HTML

## Skill Structure

```
product-detail-page/
├── SKILL.md                    ← You're reading this
├── assets/
│   ├── template.html           ← Seed template with design tokens
│   └── design-system.md        ← Color/typography/spacing system
└── references/
    ├── layouts.md              ← Section layout library
    └── checklist.md            ← P0/P1/P2 self-review checklist
```

## Workflow

### Step 0 — Pre-flight (Read First)

**CRITICAL**: Read these files before writing any code:

1. **Read `assets/template.html`** - Contains the seed structure with:
   - CSS variables for colors, typography, spacing
   - Base styles for common elements
   - Responsive breakpoints (1024px, 768px, 480px)
   - SVG icon library

2. **Read `assets/design-system.md`** - Defines:
   - Color palette (primary, accent, neutral)
   - Typography scale (display, body, caption)
   - Spacing system (4px base unit)
   - Component patterns (cards, tables, buttons)

3. **Read `references/layouts.md`** - Provides:
   - Pre-built section templates
   - Layout combinations for different product types
   - Responsive grid patterns

### Step 1 — Gather Product Information

Collect or ask for the following:

**Required:**
- Product name
- Product category (electronics, furniture, sports, etc.)
- Key specifications (5-15 items)
- Main features (3-6 items)

**Optional:**
- Dimensions (if applicable)
- Package contents
- Compatibility information
- Product images (or use placeholders)

### Step 2 — Choose Layout Pattern

Select based on product type:

| Product Type | Recommended Sections |
|--------------|---------------------|
| **Electronics** | Hero → Specs → Features → Dimensions → Package |
| **Furniture** | Hero → Specs → Features → Dimensions → Compatibility |
| **Sports** | Hero → Features → Specs → Dimensions → Package |
| **General** | Hero → Specs → Features → Dimensions → CTA |

**Section Order:**
1. **Header** - Title + subtitle + brand
2. **Hero** - Main image + key selling points
3. **Specifications** - Parameter grid/table
4. **Features** - Feature cards with icons
5. **Dimensions** (optional) - Size diagram + measurements
6. **Package** (optional) - Contents list
7. **Compatibility** (optional) - Compatibility info

### Step 3 — Copy and Customize Template

1. Copy `assets/template.html` to project root as `index.html`
2. Replace `:root` CSS variables with design system tokens
3. Update page `<title>` and brand name
4. Add `data-od-id` attributes to all editable elements

### Step 4 — Apply Design System

**Color Rules:**
```css
/* Primary: 80% usage */
--primary-color: #1a1a1a;
--secondary-color: #333;
--text-gray: #666;

/* Accent: 20% usage (点缀色) */
--accent-color: #3b82f6;
--accent-light: #dbeafe;

/* Usage budget:
   - Hero: title accent OR button accent (choose one)
   - Section titles: accent underline
   - Feature icons: accent background
   - Hover states: accent color
   - MAX 2 prominent accent uses per screen
*/
```

**Typography Scale:**
```css
/* Display: Headlines */
--font-display: 42px / 900 / 4px letter-spacing

/* Body: Paragraphs */
--font-body: 17px / 400 / normal

/* Caption: Labels */
--font-caption: 15px / 500 / 1px letter-spacing
```

**Spacing System:**
```css
/* Base unit: 4px */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 40px;
--space-2xl: 60px;
```

### Step 5 — Add SVG Decorations

Include these SVG elements for visual enhancement:

**1. Section Title Icons:**
```html
<svg class="section-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <!-- Icon path -->
</svg>
```

**2. Feature Card Icons:**
```html
<div class="feature-icon-wrapper">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <!-- Icon path -->
  </svg>
</div>
```

**3. List Item Checkmarks:**
```html
<!-- Use CSS background-image with data URI -->
.selling-point::before {
  background-image: url("data:image/svg+xml,...");
}
```

**4. Decorative Elements:**
- Header background patterns (dots, circles)
- Image frame borders
- Accent underlines
- Corner badges

### Step 6 — Implement Responsive Design

**Breakpoints:**
```css
/* Desktop: > 1024px */
- Full grid layouts
- Side-by-side content
- All decorations visible

/* Tablet: 768px - 1024px */
- 2-column grids → 1-column
- Stack hero content
- Reduce spacing 20%

/* Mobile: < 768px */
- Single column
- Larger touch targets
- Simplified decorations
- Reduce font sizes 10-15%
```

### Step 7 — Self-Check

Run through `references/checklist.md`:

**P0 (Must Pass):**
- [ ] All text is meaningful (no lorem ipsum)
- [ ] Color references match design system
- [ ] Responsive breakpoints work correctly
- [ ] Accent color used ≤ 2 times prominently
- [ ] All images have alt text
- [ ] Semantic HTML structure
- [ ] No external dependencies (all CSS inline)

**P1 (Should Pass):**
- [ ] SVG icons are accessible
- [ ] Hover states provide feedback
- [ ] Mobile touch targets ≥ 44px
- [ ] Consistent spacing rhythm
- [ ] Print-friendly (no dark backgrounds)

**P2 (Bonus):**
- [ ] Smooth animations (transition: 0.3s ease)
- [ ] Subtle shadows for depth
- [ ] Loading optimization
- [ ] Accessibility enhancements

### Step 8 — Output

Generate single HTML file:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[Product Name] - 产品详情</title>
    <style>
        /* All CSS here */
    </style>
</head>
<body>
    <div class="container" id="capture-area">
        <!-- All content here -->
    </div>
    <script>
        /* Export function if needed */
    </script>
</body>
</html>
```

## Hard Rules

**DO:**
- ✅ Use design system tokens (never invent hex values)
- ✅ Keep accent color budget ≤ 20% of visual space
- ✅ Include SVG decorations for visual interest
- ✅ Make all sections responsive
- ✅ Use semantic HTML (`<header>`, `<main>`, `<section>`, `<footer>`)
- ✅ Add `data-od-id` attributes for editability
- ✅ Provide meaningful alt text for images
- ✅ Self-contain all CSS (no external stylesheets)

**DON'T:**
- ❌ Use lorem ipsum placeholder text
- ❌ Flood page with accent color
- ❌ Add external JS dependencies
- ❌ Break responsive layouts with fixed widths
- ❌ Skip the self-check process
- ❌ Ignore mobile experience
- ❌ Use low-contrast color combinations

## Example Output Structure

```html
<!-- Header Section -->
<div class="header-section">
    <h1 class="header-title">产品名称</h1>
    <p class="header-subtitle">品牌 | 产品类别</p>
</div>

<!-- Section 1: Core Selling Points -->
<div class="section">
    <div class="section-title-wrapper">
        <svg class="section-title-icon">...</svg>
        <h2 class="section-title">核心卖点</h2>
    </div>
    <div class="hero-content-wrapper">
        <div class="hero-text">
            <ul class="selling-points">
                <li class="selling-point">卖点1</li>
            </ul>
        </div>
        <div class="hero-image-container">
            <img src="..." alt="产品图">
        </div>
    </div>
</div>

<!-- Section 2: Specifications -->
<div class="section">
    <h2 class="section-title">产品规格</h2>
    <div class="specs-grid">
        <div class="spec-item">
            <span class="spec-label">参数名：</span>
            <span class="spec-value">参数值</span>
        </div>
    </div>
</div>

<!-- Section 3: Features -->
<div class="section">
    <h2 class="section-title">功能亮点</h2>
    <div class="features-grid">
        <div class="feature-card">
            <div class="feature-icon-wrapper">
                <svg>...</svg>
            </div>
            <h3 class="feature-title">功能标题</h3>
            <p class="feature-desc">功能描述</p>
        </div>
    </div>
</div>
```

## Tips for Best Results

1. **Start with the template** - Don't write from scratch
2. **Follow the accent budget** - Less is more
3. **Use SVG icons** - Scalable and lightweight
4. **Test responsiveness** - Check all breakpoints
5. **Run the checklist** - Don't skip P0 items
6. **Keep it semantic** - Help accessibility and SEO
7. **Single file output** - Easy to share and deploy

## Integration with Existing Projects

This skill can be used alongside:
- Existing HTML templates (copy sections as needed)
- Design system documentation (map tokens to variables)
- Image assets (replace placeholders with real product photos)
- Export functionality (html2canvas for JPG/PNG export)

---

## For Skill Authors

This skill follows the Open Design protocol:

- **Mode**: `prototype` (single-page HTML artifact)
- **Platform**: `desktop` (primary) with responsive mobile
- **Scenario**: `product` (product detail/spec pages)
- **Design System**: Required (color, typography, layout, components)
- **Capabilities**: `file_write`, `file_read`

See `references/checklist.md` for quality standards.
