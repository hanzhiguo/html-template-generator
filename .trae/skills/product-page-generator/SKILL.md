---
name: "product-page-generator"
description: "Generates professional product detail HTML pages from templates. Invoke when user wants to create/convert product pages, modify existing product HTML templates, or generate product landing pages for any product."
---

# Product Page Generator

This skill automatically generates professional product detail pages by customizing the HTML template. It transforms the bike repair stand template into a fully customized product page for any product.

## When to Use This Skill

- User wants to create a new product detail page
- User asks to convert/modify the current product page template
- User provides product information and wants it formatted as an HTML page
- User says "create product page", "generate product details", "make landing page"
- Any request to turn product data into a visual HTML page

## How It Works

### Step 1: Gather Product Information

Automatically collect or ask for the following product details:

**Required Information:**
1. **Product Name** (e.g., "Wireless Bluetooth Speaker")
2. **Product Subtitle/Slogan** (e.g., "Powerful Sound. Portable Design.")
3. **Product Description** (short paragraph about the product)

**Optional but Recommended:**
4. **Main Features** (2-4 key selling points with icons)
5. **Feature Cards** (up to 4 detailed features with descriptions)
6. **Specifications** (technical specs table)
7. **Dimensions** (if applicable - size measurements)
8. **Output Filename** (default: product-name.html)

### Step 2: Read Template

Read the base template from: `d:\Product Description\bike-repair-stand.html`

This template includes:
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Export to JPG/PNG functionality
- ✅ Professional layout with hero section, features, dimensions, and specifications
- ✅ Modern CSS styling

### Step 3: Generate Customized Page

Replace all content in the template while preserving:
- All CSS styles and responsive design
- Export functionality (html2canvas)
- Page structure and layout
- SVG icons and visual elements

**Content to Replace:**

#### 3.1 Hero Section
```
- <title>: Product name
- .hero-title: Product name (large heading)
- .hero-subtitle: Tagline/slogan
- .hero-description: Short description
- .feature-text items: 4 main features (icon + text)
- .hero-image: Replace with real product image (see Image Guide below)
```

#### 3.2 Features Section (.features-cards)
Replace 4 feature cards:
```html
<div class="feature-card">
    <div class="feature-card-image">[emoji/icon/img]</div>
    <div class="feature-card-content">
        <h4 class="feature-card-title">FEATURE TITLE</h4>
        <p class="feature-card-description">Feature description text.</p>
    </div>
</div>
```

#### 3.3 Dimensions Section (if applicable)
**IMPORTANT**: This section now uses REAL IMAGES instead of SVG diagrams!
- Replace the placeholder image with an AI-generated dimension diagram
- Or use a product photo showing size reference
- Recommended size: 400x400px

#### 3.4 Specifications Table
Replace spec rows with actual product specs:
```html
<div class="spec-row">
    <span class="spec-label">Spec Name</span>
    <span class="spec-value">Value</span>
</div>
```

### Step 4: Create Output File

Save the generated HTML to: `d:\Product Description\[filename].html`

## Template Structure Reference

The template has these main sections:

1. **Hero Section** (`.hero-section`)
   - Left: Title, subtitle, description, 4 feature highlights
   - Right: Product image/illustration

2. **Features Section** (`.features-section`)
   - 4 feature cards in grid layout
   - Each card: icon + title + description

3. **Bottom Section** (`.bottom-section`)
   - Left: Dimensions diagram (optional)
   - Right: Specifications table

4. **Export Buttons**
   - Fixed position buttons for JPG/PNG export
   - Already implemented with html2canvas

## Image Guide (图片使用指南) 📸

The template now uses **REAL IMAGES** instead of SVG illustrations. Here's how to handle images:

### 1. Main Product Image (Hero Section)
**Location:** `.hero-image` div
**Recommended Size:** 500x600px (or maintain aspect ratio)
**Format:** PNG / JPG / WebP

**How to Replace:**
```html
<!-- Option 1: Local image -->
<img src="images/your-product.jpg" alt="Product Name">

<!-- Option 2: URL -->
<img src="https://example.com/product-image.png" alt="Product Name">

<!-- Option 3: Base64 (for single file) -->
<img src="data:image/png;base64,iVBORw0KGgo..." alt="Product Name">
```

**Tips:**
- Use high-quality product photos (2x resolution for retina displays)
- PNG for transparent backgrounds, JPG for photos
- Keep file size under 500KB for fast loading
- Add subtle shadow and border-radius already styled in CSS

### 2. Dimension Image (Dimensions Section)
**Location:** `.dimensions-image` div
**Recommended Size:** 400x400px
**Format:** PNG (preferred for diagrams)

**Options:**
1. **AI-Generated Diagram**: Use AI image generation tools (DALL-E, Midjourney, etc.) to create professional dimension diagrams with measurements
2. **Product Photo with Reference**: Photo of product next to common objects (ruler, phone, coin) for scale
3. **3D Render**: Professional 3D model with dimension annotations
4. **Simple Placeholder**: If dimensions not critical, can use generic product photo

**Example Prompt for AI Generation:**
```
"Professional product dimension diagram showing [PRODUCT NAME], 
clean white background, measurement lines with clear labels, 
technical illustration style, 400x400px"
```

### 3. Feature Card Icons
**Location:** `.feature-card-image` div
**Current:** Using emoji (🔧📏⚙️🛡️)

**Upgrade Options:**
```html
<!-- Option 1: Keep emoji (simplest) -->
<div class="feature-card-image">🔧</div>

<!-- Option 2: Custom icon image -->
<div class="feature-card-image">
    <img src="icons/feature-icon.svg" alt="Feature" style="width: 48px;">
</div>

<!-- Option 3: Font Awesome or similar -->
<div class="feature-card-image">
    <i class="fas fa-wrench" style="font-size: 48px; color: #999;"></i>
</div>
```

### Image Best Practices

✅ **DO:**
- Optimize images before use (compress, resize)
- Use descriptive alt text for accessibility
- Maintain consistent style across all images
- Test on mobile devices (responsive)
- Use WebP format for better compression (with fallback)

❅ **DON'T:**
- Use huge uncompressed images (>2MB)
- Hotlink from unreliable sources
- Ignore aspect ratios (causes layout shifts)
- Forget alt text (bad for SEO/accessibility)

### Quick Image Replacement Checklist

When generating a new product page:
- [ ] Replace main product image in `.hero-image`
- [ ] Update dimension diagram in `.dimensions-image` (or remove section if not needed)
- [ ] Change feature card icons if needed
- [ ] Verify all images load correctly
- [ ] Check mobile responsiveness
- [ ] Test export functionality (JPG/PNG buttons)

## Customization Guidelines

### Icons & Visuals
- Use emoji in `.feature-card-image` for quick customization (🔧📏⚙️🛡️💡🔋📱 etc.)
- Or replace with custom icon images (see Image Guide)
- For `.hero-image`, use real product photos (REQUIRED - see Image Guide)
- For `.dimensions-image`, use AI-generated diagrams or product photos (see Image Guide)

### Content Length
- Hero title: 1-3 words (keep short and impactful)
- Feature titles: 2-4 words
- Descriptions: 1-2 sentences each
- Specs: Keep concise with units

### Styling Rules
- DO NOT modify CSS unless absolutely necessary
- Maintain existing color scheme (black/gray/white)
- Preserve responsive breakpoints (1024px, 768px)
- Keep padding/margin consistent

## Example Usage

**User Input:**
"Create a product page for a wireless Bluetooth speaker"

**Skill Action:**
1. Ask for (or infer) key features like "30-hour battery", "Waterproof IPX7", "360° Sound", "Bluetooth 5.0"
2. Generate specifications (Battery: 4000mAh, Weight: 450g, etc.)
3. Replace template content
4. Save as `bluetooth-speaker.html`
5. Confirm completion and show file location

## Output Format

Always provide:
✅ File path of generated HTML
✅ Brief summary of what was created
✅ Instructions on how to view/use (open in browser, export buttons available)
⚠️ Note if any optional sections were omitted (e.g., no dimensions)

## Error Handling

If information is missing:
- Use reasonable defaults based on product type
- Add placeholder text that user can easily find and replace
- Mark clearly with comments like `<!-- TODO: Update this -->`

## Tips for Best Results

1. **Be Specific**: The more product details provided, the better the output
2. **Keep it Concise**: Product pages should be scannable, not lengthy
3. **Focus on Benefits**: Highlight what the product DOES, not just features
4. **Use Numbers**: Specifications with numbers are more credible
5. **Match Tone**: Professional products = formal tone, consumer products = friendly tone

## File Locations

- **Template**: `d:\Product Description\bike-repair-stand.html`
- **Output Directory**: `d:\Product Description\`
- **Skill Definition**: `.trae/skills/product-page-generator/SKILL.md`