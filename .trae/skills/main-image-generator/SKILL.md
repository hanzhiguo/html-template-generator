---
name: "main-image-generator"
description: "Generates e-commerce main images (1:1 ratio) with templates, LOGO, and text overlays. Invoke when user needs to create product main images, promotional images, or marketing visuals with templates."
---

# Main Image Generator

This skill generates professional e-commerce main images (1:1 ratio, 1024x1024px) using HTML Canvas technology. It supports multiple templates, LOGO overlay, text positioning, and various styling options.

## When to Use This Skill

- User wants to create product main images for e-commerce
- User asks to generate promotional images with text overlay
- User needs marketing visuals with LOGO and product photos
- User says "生成主图", "create main image", "make product image"
- Any request to combine images, text, and LOGO into a single output

## API Endpoint

**POST** `/api/main-image/generate`

### Request Body

```json
{
  "template": {
    "count": 2,
    "style": "circle"
  },
  "images": [
    "base64_encoded_image_or_url_1",
    "base64_encoded_image_or_url_2"
  ],
  "logo": {
    "image": "base64_encoded_logo_or_url",
    "color": "#ffffff",
    "size": 150,
    "margin": 40
  },
  "text": {
    "mainTitle": "品质生活首选",
    "subTitle": "精工制造 品质保证",
    "position": "bottomRight",
    "mainColor": "#ffffff",
    "subColor": "#ffffff",
    "size": 48,
    "shadow": true,
    "stroke": false,
    "bold": true
  },
  "background": "#f5f5f5",
  "circleStyle": {
    "position": "right",
    "size": 300,
    "borderColor": "#ffffff",
    "borderWidth": 8
  },
  "outputFormat": "png"
}
```

### Parameters Reference

#### Template Configuration
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `count` | number | 1 | Number of images (1-9) |
| `style` | string | "split" | For 2 images: "split" or "circle" |

#### Images
- Array of base64 encoded images or URLs
- Number of images should match `template.count`
- Supported formats: PNG, JPG, WebP

#### LOGO Configuration
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `image` | string | null | Base64 or URL of LOGO |
| `color` | string | "#ffffff" | LOGO color (SVG only) |
| `size` | number | 150 | LOGO size (100-400px) |
| `margin` | number | 40 | Distance from corner |

#### Text Configuration
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `mainTitle` | string | "" | Main title (8-10 chars recommended) |
| `subTitle` | string | "" | Subtitle (20 chars recommended) |
| `position` | string | "center" | Text position (9-grid) |
| `mainColor` | string | "#ffffff" | Main title color |
| `subColor` | string | "#ffffff" | Subtitle color |
| `size` | number | 48 | Title font size (24-72px) |
| `shadow` | boolean | true | Enable text shadow |
| `stroke` | boolean | false | Enable text stroke |
| `bold` | boolean | true | Enable bold text |

#### Text Positions (9-Grid)
```
topLeft     top         topRight
left        center      right
bottomLeft  bottom      bottomRight
```

#### Circle Style (for 2-image circle template)
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `position` | string | "right" | "right" or "left" corner |
| `size` | number | 300 | Circle diameter (200-400px) |
| `borderColor` | string | "#ffffff" | Circle border color |
| `borderWidth` | number | 8 | Border width (2-20px) |

#### Output
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `outputFormat` | string | "png" | "png" or "jpg" |

### Response

```json
{
  "success": true,
  "image": "base64_encoded_result_image",
  "format": "png",
  "size": {
    "width": 1024,
    "height": 1024
  }
}
```

## Usage Examples

### Example 1: Simple Single Image with Text

```json
{
  "template": { "count": 1 },
  "images": ["https://example.com/product.jpg"],
  "text": {
    "mainTitle": "品质生活首选",
    "subTitle": "精工制造 品质保证",
    "position": "bottom"
  },
  "background": "#1a1a2e"
}
```

### Example 2: Two Images with Circle Overlay

```json
{
  "template": { "count": 2, "style": "circle" },
  "images": [
    "https://example.com/main-product.jpg",
    "https://example.com/detail.jpg"
  ],
  "logo": {
    "image": "https://example.com/logo.svg",
    "color": "#ffffff",
    "size": 150
  },
  "text": {
    "mainTitle": "专业级性能",
    "subTitle": "高效稳定 耐用可靠",
    "position": "topLeft"
  },
  "circleStyle": {
    "position": "right",
    "size": 300,
    "borderColor": "#ffffff",
    "borderWidth": 8
  }
}
```

### Example 3: Multiple Images Grid

```json
{
  "template": { "count": 4 },
  "images": [
    "image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg"
  ],
  "text": {
    "mainTitle": "四图展示",
    "position": "center"
  },
  "background": "#f5f5f5"
}
```

## Text Presets

Quick text presets for common use cases:

| Preset | Main Title | Subtitle |
|--------|------------|----------|
| 品质生活 | 品质生活首选 | 精工制造 品质保证 |
| 专业性能 | 专业级性能 | 高效稳定 耐用可靠 |
| 智能便捷 | 智能便捷体验 | 操作简单 轻松上手 |
| 创新设计 | 创新设计理念 | 时尚外观 实用功能 |
| 高性价比 | 超高性价比 | 优质平价 物超所值 |
| 热销爆款 | 热销爆款推荐 | 万人好评 值得信赖 |

## Implementation Notes

### For AI Assistants

When using this skill:

1. **Collect Requirements**: Ask user for product images, desired text, and any specific styling preferences

2. **Validate Images**: Ensure images are accessible (URL or base64)

3. **Choose Template**: Select appropriate template based on number of images
   - 1 image: Full screen
   - 2 images: Split or circle overlay
   - 3-9 images: Grid layout

4. **Set Text Position**: Use 9-grid positioning based on image content
   - Avoid placing text over important image areas
   - Consider LOGO position (top-left) when placing text

5. **Call API**: Make POST request to `/api/main-image/generate`

6. **Return Result**: Provide the generated image to user

### Error Handling

| Error Code | Description | Solution |
|------------|-------------|----------|
| 400 | Invalid parameters | Check request body format |
| 413 | Image too large | Compress images before upload |
| 415 | Unsupported format | Use PNG, JPG, or WebP |
| 500 | Server error | Retry or contact support |

## File Locations

- **Frontend UI**: `product-page-generator/public/main-image-template.html`
- **API Route**: `product-page-generator/server/routes/main-image.js`
- **Skill Definition**: `.trae/skills/main-image-generator/SKILL.md`
