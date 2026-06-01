const http = require('http');
const fs = require('fs');
const path = require('path');

const config = {
  template: { count: 2, style: 'circle' },
  text: {
    mainTitle: '专业碳纤维车架',
    subTitle: '轻量化设计 极致性能',
    position: 'bottomLeft',
    mainColor: '#ffffff',
    subColor: '#ffffff',
    size: 52,
    shadow: true,
    bold: true
  },
  background: '#0a0a12',
  circleStyle: {
    position: 'right',
    size: 320,
    borderColor: '#ffffff',
    borderWidth: 6
  },
  outputFormat: 'png'
};

function imageToBase64(filePath) {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

async function generateMainImage(img1Path, img2Path, outputPath) {
  config.images = [
    imageToBase64(img1Path),
    imageToBase64(img2Path)
  ];

  const postData = JSON.stringify(config);

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/main-image/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success && result.image) {
            const base64Data = result.image.replace(/^data:image\/\w+;base64,/, '');
            fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));
            console.log(`✅ Main image saved to: ${outputPath}`);
            console.log(`   Size: ${result.size.width}x${result.size.height}`);
            resolve(result);
          } else {
            reject(new Error(result.error || 'Generation failed'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

const args = process.argv.slice(2);
if (args.length < 3) {
  console.log('Usage: node generate.js <image1> <image2> <output>');
  console.log('Example: node generate.js bike1.jpg bike2.jpg output.png');
  process.exit(1);
}

generateMainImage(args[0], args[1], args[2])
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
