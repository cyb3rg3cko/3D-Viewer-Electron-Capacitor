// Adds "Open with 3D Viewer" intent filters to the Capacitor Android project and
// optionally stamps the version. Safe to run repeatedly.
//
//   VERSION_NAME=1.2.3 VERSION_CODE=42 node scripts/patch-android.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'android/app/src/main/AndroidManifest.xml');
const gradlePath = path.join(root, 'android/app/build.gradle');

if (!fs.existsSync(manifestPath)) {
  console.error('android/ project not found. Run "npx cap add android" first.');
  process.exit(1);
}

// ---- Intent filters -------------------------------------------------------
// File managers rarely know 3D MIME types, so application/octet-stream is included;
// the viewer sniffs the actual format from the file header.
const MIME_TYPES = [
  'model/gltf-binary',
  'model/gltf+json',
  'model/stl',
  'model/x.stl-binary',
  'model/x.stl-ascii',
  'model/vrm',
  'application/sla',
  'application/vnd.ms-pki.stl',
  'application/x-fbx',
  'model/obj',
  'application/x-tgif', // what Android/Linux MIME tables often call .obj
  'application/octet-stream',
];

const MARKER = '<!-- viewer3d:file-associations -->';
const filter = `
            ${MARKER}
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <action android:name="android.intent.action.EDIT" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="content" />
                <data android:scheme="file" />
${MIME_TYPES.map((m) => `                <data android:mimeType="${m}" />`).join('\n')}
            </intent-filter>
`;

let manifest = fs.readFileSync(manifestPath, 'utf8');
if (manifest.includes(MARKER)) {
  console.log('Manifest already has file associations.');
} else {
  const activityRe = /(<activity\b[^>]*android:name="\.?MainActivity"[\s\S]*?)(\n\s*<\/activity>)/;
  if (!activityRe.test(manifest)) {
    console.error('Could not find MainActivity in AndroidManifest.xml');
    process.exit(1);
  }
  manifest = manifest.replace(activityRe, `$1${filter}$2`);
  fs.writeFileSync(manifestPath, manifest);
  console.log('Added file-association intent filters to MainActivity.');
}

// ---- Version ----------------------------------------------------------------
const { VERSION_NAME, VERSION_CODE } = process.env;
if (VERSION_NAME || VERSION_CODE) {
  let gradle = fs.readFileSync(gradlePath, 'utf8');
  if (VERSION_CODE) gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${parseInt(VERSION_CODE, 10)}`);
  if (VERSION_NAME) gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${VERSION_NAME}"`);
  fs.writeFileSync(gradlePath, gradle);
  console.log(`Set versionName=${VERSION_NAME ?? '(unchanged)'} versionCode=${VERSION_CODE ?? '(unchanged)'}`);
}
