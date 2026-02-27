/**
 * Fix for @types/mapbox__point-geometry stub package.
 * 
 * The @types/mapbox__point-geometry package is a deprecated stub that doesn't include
 * an index.d.ts file, causing TypeScript to fail during compilation. This script creates
 * a minimal stub file to satisfy TypeScript's type resolution.
 * 
 * This is run automatically after npm install via the postinstall script.
 */

const fs = require('fs');
const path = require('path');

const typesDir = path.join(__dirname, '..', 'node_modules', '@types', 'mapbox__point-geometry');
const indexPath = path.join(typesDir, 'index.d.ts');

// Only create the stub if the directory exists and the file doesn't
if (fs.existsSync(typesDir) && !fs.existsSync(indexPath)) {
  const stubContent = `// Stub for @mapbox/point-geometry types
// The actual package provides its own types
export {};
`;
  
  try {
    fs.writeFileSync(indexPath, stubContent, 'utf8');
    console.log('✓ Created stub index.d.ts for @types/mapbox__point-geometry');
  } catch (error) {
    console.warn('Warning: Could not create stub for @types/mapbox__point-geometry:', error.message);
  }
}
