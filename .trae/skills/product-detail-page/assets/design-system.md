# Design System

This document defines the visual design system for product detail pages.

## Color System

### Primary Palette (80% usage)

```css
--primary-color: #1a1a1a;      /* Main text, headings */
--secondary-color: #333;        /* Secondary text */
--text-gray: #666;              /* Body text, captions */
--border-color: #e8e8e8;        /* Dividers, borders */
--bg-light: #fafafa;            /* Light backgrounds */
--bg-section-alt: #f8f9fa;      /* Alternating sections */
```

### Accent Palette (20% usage - 点缀色)

```css
--accent-color: #3b82f6;        /* Primary accent (blue) */
--accent-light: #dbeafe;        /* Light accent background */
--accent-gradient: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
```

### Accent Usage Budget

**Rule: Accent color should occupy ≤ 20% of visual space**

**Allowed uses:**
1. **Section title underlines** - 3px solid accent
2. **Feature card icon backgrounds** - accent-light with accent icon
3. **Highlight spec values** - accent color text
4. **Hover states** - accent borders/backgrounds
5. **CTA buttons** - accent gradient background

**Maximum prominent uses per screen: 2**

**Example distribution:**
```
Header: accent underline (1)
Features: icon backgrounds (subtle, not counted)
Specs: 2-3 highlighted values (1)
Total prominent: 2 ✓
```

## Typography

### Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
```

### Type Scale

| Element | Size | Weight | Letter-spacing | Usage |
|---------|------|--------|----------------|-------|
| **Header Title** | 52px | 900 | 4px | Product name |
| **Section Title** | 32px | 700 | 3px | Section headings |
| **Hero Headline** | 28px | 700 | 0 | Key message |
| **Body Text** | 17px | 400 | 0 | Paragraphs |
| **Spec Labels** | 17px | 400 | 0 | Parameter names |
| **Spec Values** | 17px | 600 | 0 | Parameter values |
| **Feature Title** | 19px | 700 | 0.5px | Feature headings |
| **Feature Desc** | 16px | 400 | 0 | Feature descriptions |
| **Caption** | 15px | 500 | 1px | Labels, tags |

### Line Height

- Headings: 1.1 - 1.2
- Body text: 1.6 - 1.7
- Lists: 1.7

## Spacing System

**Base unit: 4px**

```css
--space-xs: 4px;    /* Micro spacing */
--space-sm: 8px;    /* Tight spacing */
--space-md: 16px;   /* Default spacing */
--space-lg: 24px;   /* Medium spacing */
--space-xl: 40px;   /* Large spacing */
--space-2xl: 60px;  /* Section spacing */
```

### Section Padding

```css
/* Desktop */
padding: 60px 70px;

/* Tablet */
padding: 45px 35px;

/* Mobile */
padding: 35px 20px;
```

### Grid Gaps

```css
/* Specs grid */
gap: 24px 60px;  /* row-gap column-gap */

/* Features grid */
gap: 35px;

/* Hero content */
gap: 60px;
```

## Layout

### Container

```css
max-width: 1000px;
margin: 0 auto;
background-color: #fff;
```

### Grid Patterns

**Two-column layout:**
```css
display: grid;
grid-template-columns: 1fr 1fr;
gap: 60px;
```

**Specs grid:**
```css
display: grid;
grid-template-columns: repeat(2, 1fr);
gap: 24px 60px;
```

**Features grid:**
```css
display: grid;
grid-template-columns: repeat(2, 1fr);
gap: 35px;
```

### Responsive Breakpoints

| Breakpoint | Width | Changes |
|------------|-------|---------|
| **Desktop** | > 1024px | Full layout, all features |
| **Tablet** | 768px - 1024px | 2-col → 1-col, reduce spacing 20% |
| **Mobile** | < 768px | Single column, larger touch targets |

## Components

### Section Title

```html
<div class="section-title-wrapper">
    <svg class="section-title-icon">...</svg>
    <h2 class="section-title">标题文本</h2>
</div>
```

**Styles:**
- Icon: 42px × 42px
- Title: 32px / 700 / 3px letter-spacing
- Border-bottom: 3px solid accent

### Feature Card

```html
<div class="feature-card">
    <div class="feature-icon-wrapper">
        <svg>...</svg>
    </div>
    <h3 class="feature-title">标题</h3>
    <p class="feature-desc">描述</p>
</div>
```

**Styles:**
- Background: #fff
- Padding: 32px 28px
- Border-radius: 10px
- Hover: translateY(-6px) + accent shadow

### Spec Item

```html
<div class="spec-item">
    <span class="spec-label">参数名：</span>
    <span class="spec-value">参数值</span>
</div>
```

**Styles:**
- Display: flex, space-between
- Border-bottom: 1px solid #f0f0f0
- Hover: show left accent bar

### Selling Point

```html
<li class="selling-point">
    <strong>关键词</strong> - 描述文本
</li>
```

**Styles:**
- Padding-left: 45px
- SVG checkmark icon (28px)
- Strong text: accent color

## SVG Icons

### Section Icons

Use these icons for section titles:

- **Core Features**: Lightning bolt ⚡
- **Specifications**: Clipboard ✓
- **Features**: Lightbulb 💡
- **Package**: Box 📦
- **Dimensions**: Chart 📈

### Feature Icons

Choose contextually:
- **Foldable**: Menu lines ☰
- **Installation**: Wrench 🔧
- **Power**: Lightning ⚡
- **Settings**: Gear ⚙️
- **Adjustment**: Sliders 🎚️

### Checkmark Style

```svg
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2.5'>
    <path d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'/>
</svg>
```

## Depth & Elevation

### Shadows

**Minimal approach:**
- Cards: No default shadow
- Hover: `0 12px 32px rgba(59, 130, 246, 0.15)`
- Images: Optional light shadow `0 2px 12px rgba(0,0,0,0.08)`

### Borders

- Default: 1px solid #e8e8e8
- Accent: 3px solid accent-color
- Hover: 1px solid accent-color

## Animation

### Transitions

```css
transition: all 0.3s ease;
```

**Use for:**
- Hover effects
- Color changes
- Transform animations

### Hover Effects

```css
/* Card lift */
transform: translateY(-6px);

/* Slide */
transform: translateX(4px);

/* Scale */
transform: scale(1.02);
```

## Accessibility

### Color Contrast

- Text on white: Minimum 4.5:1 ratio
- Accent on white: Minimum 3:1 ratio
- Avoid low-contrast combinations

### Touch Targets

- Mobile: Minimum 44px × 44px
- Desktop: Minimum 32px × 32px

### Semantic HTML

```html
<header> - Page header
<main> - Main content
<section> - Content sections
<footer> - Page footer
<h1> - Product name
<h2> - Section titles
<h3> - Feature titles
```

## Print Considerations

- Avoid dark backgrounds
- Ensure text is readable
- Remove hover effects
- Simplify decorations

## Image Guidelines

### Product Images

- **Format**: PNG (transparent) or JPG (white background)
- **Size**: 2x resolution for retina
- **Optimization**: Compress to < 500KB
- **Alt text**: Descriptive and specific

### Placeholder Style

```css
.ph-img {
    background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
    display: flex;
    align-items: center;
    justify-content: center;
}
```

## Best Practices

1. **Start with tokens** - Never hardcode hex values
2. **Follow the accent budget** - Less is more
3. **Test all breakpoints** - Mobile-first mindset
4. **Use semantic HTML** - Accessibility matters
5. **Keep it performant** - No external dependencies
6. **Validate contrast** - Use accessibility checker
7. **Optimize images** - Fast loading matters