import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateOGImage() {
    const logoPath = path.join(process.cwd(), 'public/logo.png');
    const outputPath = path.join(process.cwd(), 'public/og.png');

    const width = 1200;
    const height = 630;

    // Create SVG string for background
    const svgString = `
    <svg width="${width}" height="${height}" version="1.1" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#020617;stop-opacity:1" />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="60" result="blur"/>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad1)" />
      
      <!-- Subtle grid lines -->
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" stroke-width="1"/>
      </pattern>
      <rect width="100%" height="100%" fill="url(#grid)" opacity="0.1" />
      
      <!-- Center subtle green glow behind logo -->
      <circle cx="600" cy="315" r="280" fill="#16a34a" filter="url(#glow)" opacity="0.15" />
    </svg>
  `;

    try {
        const svgBuffer = Buffer.from(svgString);

        // Resize logo
        const logoBuffer = await sharp(logoPath)
            .resize(500, null, { fit: 'contain' })
            .toBuffer();

        // Composite: Start with a blank image of correct size created from the SVG
        // Actually simpler: create sharp instance from SVG buffer, then composite logo
        await sharp(svgBuffer)
            .composite([{ input: logoBuffer, gravity: 'center' }])
            .toFile(outputPath);

        console.log(`Successfully generated OG image at: ${outputPath}`);
    } catch (err) {
        console.error('Error generating OG image:', err);
        process.exit(1);
    }
}

generateOGImage();
