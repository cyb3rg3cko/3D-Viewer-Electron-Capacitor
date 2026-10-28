// Loaded before bundle.js. If the 3D renderer failed to start (no WebGL), say so
// instead of leaving an empty window. bundle.js adds its <canvas> to #viewport as it
// runs, so a missing canvas once the page has parsed means the renderer threw.
document.addEventListener('DOMContentLoaded', function () {
  if (document.querySelector('#viewport canvas')) return;
  var box = document.getElementById('dropzone');
  if (!box) return;
  box.classList.remove('hidden');
  box.style.textAlign = 'center';
  box.style.padding = '24px';
  box.style.lineHeight = '1.5';
  box.textContent = '3D rendering is unavailable: this system could not create a WebGL context. ' +
    'Try updating your graphics drivers' +
    (/Linux/.test(navigator.userAgent) ? ', or start the app with VIEWER3D_SOFTWARE_GL=1.' : '.');
});
