import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import Jimp from 'jimp';
import pngToIco from 'png-to-ico';

// Generate a multi-size favicon.ico from the existing 192x192 PNG
// Sizes chosen for broad compatibility (Win, old browsers)
const sizes = [16, 32, 48];

async function main() {
  const srcPng = resolve('public/icons/icons-192.png');
  const outIco = resolve('public/favicon.ico');

  const buffers = [];
  for (const size of sizes) {
    const img = await Jimp.read(srcPng);
    img.resize(size, size);
    const buf = await img.getBufferAsync(Jimp.MIME_PNG);
    buffers.push(buf);
  }

  const ico = await pngToIco(buffers);
  await writeFile(outIco, ico);
  console.log(`Generated ${outIco} with sizes: ${sizes.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

