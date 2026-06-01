# Product Detail Page Checklist

Self-review checklist for quality assurance. Run through this before finalizing any product detail page.

---

## P0 - Must Pass (Critical)

These items are **non-negotiable**. If any fail, the page is not ready.

### Content Quality

- [ ] **No placeholder text** - All text is meaningful and specific to the product
  - ❌ "Lorem ipsum dolor sit amet"
  - ✅ "高品质碳钢材质，承重能力达150KG"

- [ ] **No placeholder images** - All images are real product photos or proper placeholders
  - ❌ Broken image links
  - ✅ Real product images or styled placeholders

- [ ] **Complete product information** - All required fields are filled
  - Product name ✓
  - Brand/Category ✓
  - At least 5 specifications ✓
  - At least 3 features ✓

- [ ] **Accurate specifications** - All numbers and measurements are correct
  - Double-check units (cm/mm/inches)
  - Verify weight/voltage/dimensions
  - Confirm compatibility information

### Design System Compliance

- [ ] **Color tokens only** - No hardcoded hex values outside design system
  - ❌ `color: #ff6b6b;`
  - ✅ `color: var(--accent-color);`

- [ ] **Accent budget respected** - Accent color used ≤ 20% of visual space
  - Count prominent accent uses (max 2)
  - Check accent doesn't dominate

- [ ] **Typography scale followed** - Font sizes match design system
  - Header: 52px / 900
  - Section titles: 32px / 700
  - Body: 17px / 400

- [ ] **Spacing system used** - Consistent spacing rhythm
  - Uses --space-* variables
  - No arbitrary pixel values

### Technical Quality

- [ ] **Single HTML file** - All CSS inline, no external dependencies
  - ❌ `<link rel="stylesheet" href="style.css">`
  - ✅ `<style>/* All CSS here */</style>`

- [ ] **Semantic HTML** - Proper use of HTML5 elements
  - `<header>` for header
  - `<main>` for main content
  - `<section>` for sections
  - `<footer>` for footer

- [ ] **All images have alt text** - Accessibility requirement
  - ❌ `<img src="product.jpg">`
  - ✅ `<img src="product.jpg" alt="智能马桶产品图">`

- [ ] **data-od-id attributes** - All editable elements tagged
  - Section containers
  - Titles
  - Key content areas

### Responsive Design

- [ ] **Desktop layout works** - Tested at 1440px width
  - Two-column grids display correctly
  - Images are properly sized
  - Text is readable

- [ ] **Tablet layout works** - Tested at 768px - 1024px width
  - Grids collapse to single column
  - Content reflows properly
  - No horizontal scroll

- [ ] **Mobile layout works** - Tested at 375px width
  - Single column layout
  - Touch targets ≥ 44px
  - Text is readable
  - No overflow issues

---

## P1 - Should Pass (Important)

These items significantly impact quality. Most should pass.

### Visual Design

- [ ] **Consistent visual hierarchy** - Clear distinction between heading levels
  - H1 > H2 > H3 in size and weight
  - Proper spacing between elements

- [ ] **Balanced whitespace** - Not too cramped, not too sparse
  - Adequate padding in sections
  - Breathing room around content

- [ ] **SVG decorations present** - Visual enhancement without clutter
  - Section title icons
  - Feature card icons
  - Checkmarks for lists

- [ ] **Hover states work** - Interactive feedback on clickable elements
  - Cards lift on hover
  - Color transitions are smooth
  - Cursor changes appropriately

### Accessibility

- [ ] **Color contrast sufficient** - WCAG AA compliance
  - Text on background: ≥ 4.5:1
  - Large text: ≥ 3:1
  - Use contrast checker tool

- [ ] **Touch targets adequate** - Mobile-friendly interaction areas
  - Minimum 44px × 44px on mobile
  - Adequate spacing between targets

- [ ] **Font sizes readable** - No text smaller than 14px
  - Body text: 16-18px
  - Captions: 14-15px minimum

- [ ] **Focus states visible** - Keyboard navigation support
  - Focus outlines on interactive elements
  - Logical tab order

### Performance

- [ ] **Images optimized** - Fast loading
  - File sizes < 500KB
  - Proper format (JPG/PNG/WebP)
  - 2x resolution for retina

- [ ] **No external dependencies** - Self-contained
  - No external CSS frameworks
  - No external JS libraries (except optional html2canvas)

- [ ] **CSS is efficient** - No redundant styles
  - Removed unused classes
  - Consolidated similar styles

### Content Quality

- [ ] **Concise descriptions** - Not verbose, easy to scan
  - Feature descriptions: 1-2 sentences
  - No redundant information

- [ ] **Consistent terminology** - Same terms used throughout
  - Product name consistent
  - Units consistent (cm/mm/inches)

- [ ] **Professional tone** - Appropriate for product type
  - Technical products: formal tone
  - Consumer products: friendly tone

---

## P2 - Bonus (Nice to Have)

These items enhance polish but are not critical.

### Animation & Interaction

- [ ] **Smooth transitions** - All animations use `transition: 0.3s ease`
  - Hover effects
  - Color changes
  - Transform animations

- [ ] **Subtle shadows** - Depth without distraction
  - Light shadows on hover
  - Consistent shadow direction

- [ ] **Loading optimization** - Fast perceived performance
  - Critical CSS inline
  - Images lazy-loaded (if applicable)

### Visual Polish

- [ ] **Decorative elements balanced** - Enhance without overwhelming
  - SVG patterns subtle
  - Decorative borders not distracting

- [ ] **Image frames styled** - Professional presentation
  - Rounded corners
  - Subtle borders
  - Drop shadows (optional)

- [ ] **Typography refined** - Attention to detail
  - Proper quotation marks
  - Correct dashes (en-dash vs em-dash)
  - No widows/orphans

### SEO & Metadata

- [ ] **Meta description added** - For search engines
  - 150-160 characters
  - Includes product name and key features

- [ ] **Semantic structure** - Helps search engines
  - Proper heading hierarchy
  - Schema.org markup (optional)

- [ ] **Descriptive URLs** - If deployed
  - Clean, readable URLs
  - Includes product name

### Export & Sharing

- [ ] **Export functionality** - JPG/PNG download
  - html2canvas integration
  - High-resolution output (2x)

- [ ] **Print-friendly** - Looks good when printed
  - No dark backgrounds
  - Readable text
  - Simplified decorations

---

## Checklist Usage Guide

### When to Use

Run this checklist:
1. **Before finalizing** - Last step before delivery
2. **After major changes** - Re-check affected sections
3. **Before export** - Ensure quality for distribution

### How to Use

1. **Start with P0** - All must pass
2. **Move to P1** - Aim for 80%+ pass rate
3. **Consider P2** - Add if time permits

### Failure Protocol

**If P0 fails:**
- Stop and fix immediately
- Do not proceed until resolved

**If P1 fails:**
- Assess impact on user experience
- Fix if feasible within timeline
- Document if deferred

**If P2 fails:**
- Nice to have, not required
- Add if time allows
- No blocking issues

---

## Common Issues & Fixes

### Issue: Accent color overused

**Symptom:** Page looks "blue-heavy" or overwhelming

**Fix:**
1. Count prominent accent uses
2. Remove accent from less important elements
3. Use accent-light instead of accent for subtle highlights
4. Keep max 2 prominent accent uses

### Issue: Mobile layout broken

**Symptom:** Horizontal scroll, overlapping elements

**Fix:**
1. Check media queries are applied
2. Verify grid-template-columns change at breakpoints
3. Remove fixed widths
4. Test on actual devices

### Issue: Images not loading

**Symptom:** Broken image icons

**Fix:**
1. Check image paths are correct
2. Use relative paths from HTML file
3. Verify image files exist
4. Check file extensions match

### Issue: Text too small on mobile

**Symptom:** Unreadable text at 375px width

**Fix:**
1. Increase font sizes in mobile media query
2. Ensure minimum 14px for captions
3. Increase body text to 16px minimum
4. Test with real content

### Issue: Inconsistent spacing

**Symptom:** Sections feel disjointed

**Fix:**
1. Use spacing variables (--space-*)
2. Maintain consistent section padding
3. Use grid gaps consistently
4. Review vertical rhythm

---

## Quality Metrics

### Target Scores

- **P0 Pass Rate:** 100% (all items)
- **P1 Pass Rate:** ≥ 80%
- **P2 Pass Rate:** ≥ 50%

### Acceptance Criteria

**Ready for delivery:**
- ✅ All P0 items pass
- ✅ ≥ 80% P1 items pass
- ✅ No critical accessibility issues

**Needs work:**
- ❌ Any P0 item fails
- ❌ < 80% P1 items pass
- ❌ Accessibility issues present

---

## Final Sign-off

Before marking complete, verify:

- [ ] All P0 items checked
- [ ] P1 pass rate ≥ 80%
- [ ] Tested on desktop, tablet, and mobile
- [ ] Real product images in place
- [ ] Export functionality works (if applicable)
- [ ] Client/stakeholder approved

**Date completed:** ____________

**Reviewed by:** ____________