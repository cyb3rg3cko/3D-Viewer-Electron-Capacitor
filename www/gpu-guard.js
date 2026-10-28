// Loaded after bundle.js. Keeps large models from killing the 3D view.
//
// 1. Caps texture size: three.js downscales any texture larger than
//    renderer.capabilities.maxTextureSize when uploading it, so lowering that limit
//    shrinks oversized (e.g. 8K) textures that low-memory GPUs can't allocate.
// 2. Recovers from GPU memory exhaustion: if the WebGL context is lost, three.js
//    restores it; we then lower the cap and let textures re-upload smaller. If even
//    the smallest cap fails, the model is unloaded with an explanation.
(function () {
  var renderer = window.ji;   // three.js WebGLRenderer from bundle.js
  if (!renderer || !renderer.domElement) return;

  var CAPS = [4096, 2048, 1024];
  var level = 0;

  function applyCap() {
    var caps = renderer.capabilities;   // replaced by three.js after a context restore
    caps.maxTextureSize = Math.min(caps.maxTextureSize, CAPS[level]);
  }
  applyCap();

  var toast = null, toastTimer = null;
  function notify(message, ms) {
    if (!toast) {
      toast = document.createElement('div');
      toast.setAttribute('role', 'status');
      toast.style.cssText = 'position:absolute;left:50%;bottom:20px;transform:translateX(-50%);' +
        'max-width:min(560px,calc(100% - 32px));padding:10px 16px;border-radius:6px;' +
        'background:#2f2f2f;border:1px solid #444;color:#eee;font-size:13px;line-height:1.4;' +
        'box-shadow:0 4px 12px rgba(0,0,0,.4);z-index:50;text-align:center;';
      document.getElementById('viewport').appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.style.display = 'none'; }, ms || 6000);
  }

  var canvas = renderer.domElement;

  canvas.addEventListener('webglcontextlost', function () {
    notify('The graphics card ran out of memory. Recovering…', 15000);
  });

  // three.js registers its own restore handler first, so by now it has rebuilt the
  // renderer state (and a fresh capabilities object); textures re-upload next frame.
  canvas.addEventListener('webglcontextrestored', function () {
    if (level < CAPS.length - 1) {
      level++;
      applyCap();
      notify('Textures reduced to ' + CAPS[level] + ' px so the model fits in graphics memory.');
      return;
    }
    applyCap();
    if (window.Hr && typeof window.lS === 'function') {
      window.lS();   // remove and dispose the current model
      var drop = document.getElementById('dropzone');
      if (drop) drop.classList.remove('hidden');
    }
    notify('This model is too large for this graphics card, even with reduced textures. ' +
      'Try a lighter model, or start the app with VIEWER3D_SOFTWARE_GL=1.', 12000);
  });
})();
