/* Progressive zoom universe: Milky Way galaxy → Solar System.
   The camera starts wide in deep space and zooms continuously as the user scrolls,
   revealing each layer in sequence. Runs on the fixed #universe canvas. */
import * as THREE from './vendor/three.module.js';
import { EffectComposer } from './vendor/three/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/three/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/three/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/three/postprocessing/OutputPass.js';

const canvas = document.getElementById('universe');
if (canvas) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = innerWidth < 820;
  const tier = reduced ? 'still' : mobile ? 'light' : 'full';

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: tier === 'full' ? 'high-performance' : 'low-power' });
  } catch { renderer = null; }

  if (renderer) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.001, 200);
    camera.position.set(0, 0, 12);

    const pixelRatio = Math.min(devicePixelRatio || 1, tier === 'full' ? 1.75 : 1.25);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(innerWidth, innerHeight);

    let composer = null, bloomPass = null;
    if (tier !== 'still') {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), tier === 'full' ? 0.45 : 0.28, 0.6, 0.38);
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
    }

    // ─── helpers ───
    function radialTexture(stops, size = 128) {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      stops.forEach(([offset, color]) => g.addColorStop(offset, color));
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
      const tex = new THREE.CanvasTexture(c); tex.needsUpdate = true;
      return tex;
    }
    function smoothstepJS(e0, e1, x) { const k = Math.min(1, Math.max(0, (x - e0) / ((e1 - e0) || 1))); return k * k * (3 - 2 * k); }
    function fadeWindow(p, inStart, inEnd, outStart, outEnd) {
      const rise = inEnd > inStart ? smoothstepJS(inStart, inEnd, p) : 1;
      const fall = outEnd > outStart ? 1 - smoothstepJS(outStart, outEnd, p) : 1;
      return Math.min(rise, fall);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 1 — GALAXY  (scroll 0.00 – 0.25)
    // Deep starfield, spiral arms, galactic core glow
    // ═══════════════════════════════════════════════════════════════════════

    // Dense starfield (3 parallax layers)
    const starVertex = `
      attribute float aSize; attribute float aPhase; attribute vec3 aColor;
      uniform float uTime; uniform float uPixelRatio;
      varying vec3 vColor; varying float vTwinkle;
      void main() {
        vColor = aColor;
        vTwinkle = 0.55 + 0.45 * sin(uTime * 1.4 + aPhase);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float dist = max(-mvPosition.z, 0.5);
        gl_PointSize = min(aSize * uPixelRatio * (120.0 / dist), 6.0 * uPixelRatio);
        gl_Position = projectionMatrix * mvPosition;
      }`;
    const starFragment = `
      varying vec3 vColor; varying float vTwinkle;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float alpha = pow(smoothstep(0.5, 0.0, d), 1.6);
        gl_FragColor = vec4(vColor, alpha * vTwinkle);
      }`;

    function buildStarLayer(count, spread, depth, sizeRange) {
      const positions = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      const phases = new Float32Array(count);
      const colors = new Float32Array(count * 3);
      const palette = [
        new THREE.Color(0xffffff), new THREE.Color(0x06b6d4),
        new THREE.Color(0x2563eb), new THREE.Color(0x6d28d9),
        new THREE.Color(0xfbbf24),
      ];
      for (let i = 0; i < count; i++) {
        const k = i * 3;
        positions[k] = (Math.random() - 0.5) * spread;
        positions[k + 1] = (Math.random() - 0.5) * spread * 0.62;
        positions[k + 2] = -Math.random() * depth - 5;
        sizes[i] = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
        phases[i] = Math.random() * Math.PI * 2;
        const s = palette[(Math.random() * palette.length) | 0];
        colors.set([s.r, s.g, s.b], k);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
      geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pixelRatio } },
        vertexShader: starVertex, fragmentShader: starFragment,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const points = new THREE.Points(geo, mat);
      scene.add(points);
      return { points, mat };
    }

    const starCounts = tier === 'full' ? [3000, 1200, 400] : tier === 'light' ? [1200, 500, 160] : [1800, 0, 0];
    const starLayers = [];
    if (starCounts[0]) starLayers.push({ ...buildStarLayer(starCounts[0], 80, 70, [0.25, 0.6]), speed: 0.004, parallax: 0.015 });
    if (starCounts[1]) starLayers.push({ ...buildStarLayer(starCounts[1], 55, 42, [0.4, 0.85]), speed: 0.01, parallax: 0.04 });
    if (starCounts[2]) starLayers.push({ ...buildStarLayer(starCounts[2], 38, 24, [0.6, 1.3]), speed: 0.02, parallax: 0.07 });

    // Galactic core glow
    const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radialTexture([
        [0, 'rgba(255,240,210,0.9)'],
        [0.2, 'rgba(255,200,120,0.4)'],
        [0.5, 'rgba(180,120,255,0.12)'],
        [1, 'rgba(180,120,255,0)'],
      ]),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    coreGlow.position.set(0, 0, -30);
    coreGlow.scale.setScalar(22);
    scene.add(coreGlow);

    // Spiral arm dust (nebula)
    const nebulaVertex = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
    const nebulaFragment = `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB; uniform float uOpacity; uniform float uScale;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
      float vnoise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        float a = hash(i), b = hash(i + vec2(1.,0.)), c = hash(i + vec2(0.,1.)), d = hash(i + vec2(1.,1.));
        vec2 u = f * f * (3. - 2. * f);
        return mix(a,b,u.x) + (c-a) * u.y * (1.-u.x) + (d-b) * u.x * u.y;
      }
      float fbm(vec2 p){ float v=0.0, amp=0.5; for(int i=0;i<5;i++){ v += amp*vnoise(p); p *= 2.02; amp *= 0.52; } return v; }
      void main(){
        vec2 p = vUv * uScale + vec2(uTime * 0.008, uTime * 0.004);
        float n = fbm(p);
        float n2 = fbm(p * 1.6 + 11.3);
        vec3 color = mix(uColorA, uColorB, smoothstep(0.2, 0.85, n));
        float alpha = smoothstep(0.32, 0.92, n) * (0.4 + 0.5 * n2);
        float edge = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x)
                   * smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.65, vUv.y);
        gl_FragColor = vec4(color, alpha * uOpacity * edge);
      }`;

    const nebulaA = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 34, 1, 1),
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 }, uColorA: { value: new THREE.Color(0x6d28d9) },
          uColorB: { value: new THREE.Color(0x06b6d4) }, uOpacity: { value: 0.7 }, uScale: { value: 2.8 },
        },
        vertexShader: nebulaVertex, fragmentShader: nebulaFragment,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      })
    );
    nebulaA.position.z = -28;
    scene.add(nebulaA);

    const nebulaB = tier === 'full' ? new THREE.Mesh(
      new THREE.PlaneGeometry(56, 38, 1, 1),
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 30 }, uColorA: { value: new THREE.Color(0x2563eb) },
          uColorB: { value: new THREE.Color(0x9333ea) }, uOpacity: { value: 0.45 }, uScale: { value: 3.4 },
        },
        vertexShader: nebulaVertex, fragmentShader: nebulaFragment,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      })
    ) : null;
    if (nebulaB) { nebulaB.position.z = -38; scene.add(nebulaB); }

    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 2 — SOLAR SYSTEM  (scroll 0.20 – 0.50)
    // Sun glow, orbiting planets, asteroid belt
    // ═══════════════════════════════════════════════════════════════════════

    const sunLight = new THREE.DirectionalLight(0xfff2df, 1.1);
    sunLight.position.set(-1, 0.5, 1).normalize();
    scene.add(sunLight, new THREE.AmbientLight(0x1a1a2e, 0.5));

    // Sun
    const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radialTexture([[0, 'rgba(255,240,200,1)'], [0.2, 'rgba(255,200,100,0.6)'], [0.5, 'rgba(255,160,60,0.15)'], [1, 'rgba(255,140,40,0)']]),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    sunSprite.position.set(0, 0, -6);
    sunSprite.scale.setScalar(3.5);
    scene.add(sunSprite);

    // Planet shader (shared)
    const planetVertex = `
      varying vec3 vNormal; varying vec3 vWorldPosition; varying vec2 vUv;
      void main(){
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPosition = wp.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`;
    const planetFragment = `
      precision highp float;
      varying vec3 vNormal; varying vec3 vWorldPosition; varying vec2 vUv;
      uniform vec3 uDeep; uniform vec3 uMid; uniform vec3 uLight; uniform vec3 uRim;
      uniform vec3 uLightDir; uniform float uTime; uniform float uOpacity;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
      float vnoise(vec2 p){
        vec2 i=floor(p), f=fract(p);
        float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
        vec2 u=f*f*(3.-2.*f);
        return mix(a,b,u.x) + (c-a)*u.y*(1.-u.x) + (d-b)*u.x*u.y;
      }
      float fbm(vec2 p){ float v=0.0, amp=0.5; for(int i=0;i<4;i++){ v += amp*vnoise(p); p *= 2.05; amp *= 0.5; } return v; }
      void main(){
        vec3 n = normalize(vNormal);
        vec3 vd = normalize(cameraPosition - vWorldPosition);
        float diff = max(dot(n, normalize(uLightDir)), 0.0);
        vec2 p = vUv * vec2(4.0, 2.0) + vec2(uTime * 0.008, 0.0);
        float bands = fbm(p * 2.0) * 0.6 + fbm(p * 5.0 + 3.1) * 0.4;
        vec3 base = mix(uDeep, uMid, smoothstep(0.2, 0.7, bands));
        base = mix(base, uLight, smoothstep(0.78, 0.96, bands));
        vec3 lit = base * (0.3 + 0.85 * diff);
        float fresnel = pow(1.0 - max(dot(n, vd), 0.0), 2.4);
        gl_FragColor = vec4(lit + uRim * fresnel * 1.1, uOpacity);
      }`;
    const atmoFragment = `
      varying vec3 vNormal; varying vec3 vWorldPosition;
      uniform vec3 uColor; uniform float uPower; uniform float uIntensity; uniform float uOpacity;
      void main(){
        vec3 n = normalize(vNormal); vec3 vd = normalize(cameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - max(dot(n, vd), 0.0), uPower);
        gl_FragColor = vec4(uColor, fresnel * uIntensity * uOpacity);
      }`;

    function createPlanet({ radius = 1, deep, mid, light, rim, position }) {
      const group = new THREE.Group();
      group.position.copy(position);
      scene.add(group);

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uDeep: { value: new THREE.Color(deep) }, uMid: { value: new THREE.Color(mid) },
          uLight: { value: new THREE.Color(light) }, uRim: { value: new THREE.Color(rim) },
          uLightDir: { value: new THREE.Vector3(-1, 0.5, 1).normalize() },
          uTime: { value: Math.random() * 20 }, uOpacity: { value: 0 },
        },
        vertexShader: planetVertex, fragmentShader: planetFragment, transparent: true,
      });
      const core = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 48), mat);
      group.add(core);

      const atmoMat = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(rim) }, uPower: { value: 2.1 }, uIntensity: { value: 0.8 }, uOpacity: { value: 0 } },
        vertexShader: planetVertex, fragmentShader: atmoFragment,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
      });
      const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.08, 32, 32), atmoMat);
      group.add(atmosphere);

      return { group, core, mat, atmosphere, atmoMat, radius, basePos: position.clone() };
    }

    const mercury = createPlanet({ radius: 0.18, deep: 0x1a1a1a, mid: 0x8a7d6b, light: 0xc4b89a, rim: 0x999080, position: new THREE.Vector3(-1.8, 0.4, -4.5) });
    const venus = createPlanet({ radius: 0.32, deep: 0x2a1a08, mid: 0xc4882a, light: 0xf0c860, rim: 0xe8a030, position: new THREE.Vector3(1.2, -0.3, -5) });
    const earth = createPlanet({ radius: 0.42, deep: 0x0a1628, mid: 0x1a6b3a, light: 0x4aa860, rim: 0x4488cc, position: new THREE.Vector3(-0.5, 0.2, -5.5) });
    const mars = createPlanet({ radius: 0.28, deep: 0x1a0808, mid: 0xa3441f, light: 0xe88050, rim: 0xc06030, position: new THREE.Vector3(2.2, 0.5, -6) });
    const jupiter = createPlanet({ radius: 0.9, deep: 0x1c1330, mid: 0x8b6040, light: 0xd4a870, rim: 0xc09050, position: new THREE.Vector3(-2.8, -0.4, -7.5) });
    const saturn = createPlanet({ radius: 0.75, deep: 0x1a1520, mid: 0xb8a060, light: 0xe0d090, rim: 0xc8b070, position: new THREE.Vector3(3.5, 0.8, -9) });

    // Saturn ring
    const ringVertex = `varying float vRadius; void main(){ vRadius = length(position.xy); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
    const ringFragment = `
      precision highp float; varying float vRadius;
      uniform float uInner; uniform float uOuter; uniform vec3 uColor; uniform float uOpacity;
      float hash(float n){ return fract(sin(n) * 43758.5453123); }
      void main(){
        float t = (vRadius - uInner) / (uOuter - uInner);
        float bands = sin(t * 46.0) * 0.5 + 0.5;
        float grain = hash(floor(t * 70.0));
        float alpha = smoothstep(0.0, 0.08, t) * smoothstep(1.0, 0.85, t) * (0.3 + 0.55 * bands * grain);
        gl_FragColor = vec4(uColor, alpha * uOpacity);
      }`;
    const saturnRing = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 2.0, 100),
      new THREE.ShaderMaterial({
        uniforms: { uInner: { value: 1.1 }, uOuter: { value: 2.0 }, uColor: { value: new THREE.Color(0xc8b070) }, uOpacity: { value: 0 } },
        vertexShader: ringVertex, fragmentShader: ringFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    saturnRing.rotation.x = Math.PI * 0.44;
    saturnRing.rotation.z = 0.3;
    saturn.group.add(saturnRing);

    // Asteroid belt
    const asteroidCount = tier === 'full' ? 200 : 80;
    const asteroidGeo = new THREE.IcosahedronGeometry(0.06, 0);
    const asteroidPos = asteroidGeo.attributes.position;
    for (let i = 0; i < asteroidPos.count; i++) {
      const j = 0.6 + Math.random() * 0.8;
      asteroidPos.setXYZ(i, asteroidPos.getX(i) * j, asteroidPos.getY(i) * j, asteroidPos.getZ(i) * j);
    }
    asteroidPos.needsUpdate = true;
    asteroidGeo.computeVertexNormals();
    const asteroidMat = new THREE.MeshStandardMaterial({ color: 0x8c8478, roughness: 1, metalness: 0.05, transparent: true });
    const asteroidBelt = new THREE.InstancedMesh(asteroidGeo, asteroidMat, asteroidCount);
    const beltGroup = new THREE.Group();
    beltGroup.position.set(0, -0.15, -8);
    beltGroup.add(asteroidBelt);
    scene.add(beltGroup);
    {
      const dummy = new THREE.Object3D();
      for (let i = 0; i < asteroidCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 4 + Math.random() * 1.8;
        dummy.position.set(Math.cos(angle) * r, (Math.random() - 0.5) * 0.7, Math.sin(angle) * r * 0.4);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        dummy.scale.setScalar(0.4 + Math.random() * 1.4);
        dummy.updateMatrix();
        asteroidBelt.setMatrixAt(i, dummy.matrix);
      }
      asteroidBelt.instanceMatrix.needsUpdate = true;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 3 — COMETS / SATELLITES  (always present, subtle)
    // ═══════════════════════════════════════════════════════════════════════

    function cometTexture() {
      const w = 512, h = 48;
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.72, 'rgba(255,255,255,.2)');
      g.addColorStop(0.93, 'rgba(255,255,255,.7)');
      g.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = g; ctx.fillRect(0, h * 0.32, w, h * 0.36);
      const head = ctx.createRadialGradient(w * 0.94, h / 2, 0, w * 0.94, h / 2, h * 0.9);
      head.addColorStop(0, 'rgba(255,255,255,.9)');
      head.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = head; ctx.fillRect(0, 0, w, h);
      const tex = new THREE.CanvasTexture(c); tex.needsUpdate = true;
      return tex;
    }

    const cometCount = tier === 'full' ? 3 : 1;
    const comets = Array.from({ length: cometCount }, () => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.8, 0.14),
        new THREE.MeshBasicMaterial({ map: cometTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0 })
      );
      scene.add(mesh);
      return { mesh, life: 0, maxLife: 1, delay: Math.random() * 6, vx: 0, vy: 0 };
    });
    function launchComet(c) {
      const edge = Math.random() * Math.PI * 2;
      const r = 14;
      const x = Math.cos(edge) * r, y = Math.sin(edge) * r * 0.5;
      const angle = edge + Math.PI + (Math.random() - 0.5) * 0.5;
      c.vx = Math.cos(angle); c.vy = Math.sin(angle) * 0.5;
      c.mesh.position.set(x, y, -5 - Math.random() * 5);
      c.mesh.rotation.z = Math.atan2(c.vy, c.vx);
      c.life = 0; c.maxLife = 1.5 + Math.random() * 1;
      c.mesh.material.opacity = 0;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SCROLL-DRIVEN CAMERA FLIGHT
    // ═══════════════════════════════════════════════════════════════════════

    let mouseX = 0, mouseY = 0, smx = 0, smy = 0, visible = !document.hidden;
    let rawProgress = 0, smoothProgress = 0;

    addEventListener('pointermove', (e) => {
      mouseX = e.clientX / innerWidth - 0.5;
      mouseY = e.clientY / innerHeight - 0.5;
    }, { passive: true });

    addEventListener('scroll', () => {
      const total = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      rawProgress = Math.min(1, Math.max(0, scrollY / total));
    }, { passive: true });

    document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

    addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
      composer?.setSize(innerWidth, innerHeight);
      bloomPass?.setSize(innerWidth, innerHeight);
    });

    const clock = new THREE.Clock();

    function render() {
      requestAnimationFrame(render);
      if (!visible) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      smoothProgress += (rawProgress - smoothProgress) * Math.min(1, dt * 2.2);
      smx += (mouseX - smx) * Math.min(1, dt * 3);
      smy += (mouseY - smy) * Math.min(1, dt * 3);

      const p = smoothProgress;

      // ─── Camera zoom: galaxy → solar system ───
      // z goes from 12 (wide galaxy) down to 2 (solar system close-up)
      const galaxyFade = 1 - smoothstepJS(0.15, 0.4, p);
      const solarFade = smoothstepJS(0.15, 0.3, p);

      // Camera position — smooth exponential zoom
      const camZ = 12 - p * 10;
      camera.position.z = camZ + smx * 0.3;
      camera.position.x = Math.sin(t * 0.04) * 0.2 + smx * 0.8;
      camera.position.y = Math.cos(t * 0.035) * 0.12 - smy * 0.5;
      camera.rotation.z = Math.sin(t * 0.025) * 0.006 + smx * 0.008;
      camera.fov = 58;
      camera.updateProjectionMatrix();
      camera.lookAt(0, 0, -2);

      // ─── Stars ───
      starLayers.forEach((layer) => {
        layer.mat.uniforms.uTime.value = t;
        // Stars spread outward as we zoom in (parallax warp)
        const spread = 1 + p * 3;
        layer.points.rotation.y = t * layer.speed + smx * layer.parallax + p * 0.15;
        layer.points.rotation.x = smy * layer.parallax * 0.6;
        layer.points.scale.setScalar(spread);
      });

      // ─── Galactic core ───
      coreGlow.material.opacity = galaxyFade * 0.9;
      coreGlow.visible = galaxyFade > 0.01;
      coreGlow.scale.setScalar(22 + p * 8);

      // ─── Nebula ───
      nebulaA.material.uniforms.uTime.value = t;
      nebulaA.material.uniforms.uOpacity.value = galaxyFade * 0.65;
      nebulaA.rotation.z = t * 0.003;
      nebulaA.visible = galaxyFade > 0.01;
      if (nebulaB) {
        nebulaB.material.uniforms.uTime.value = t * 0.8 + 30;
        nebulaB.material.uniforms.uOpacity.value = galaxyFade * 0.4;
        nebulaB.rotation.z = -t * 0.002;
        nebulaB.visible = galaxyFade > 0.01;
      }

      // ─── Solar system planets ───
      const solarPlanets = [
        [mercury, 0.12, 0.22, 0.85, 1.0],
        [venus, 0.14, 0.24, 0.85, 1.0],
        [earth, 0.16, 0.26, 0.85, 1.0],
        [mars, 0.18, 0.28, 0.85, 1.0],
        [jupiter, 0.2, 0.3, 0.88, 1.0],
        [saturn, 0.22, 0.32, 0.9, 1.0],
      ];
      solarPlanets.forEach(([planet, fadeIn, fadeOutStart, fadeOutEnd, _]) => {
        const opacity = fadeWindow(p, fadeIn, fadeIn + 0.08, fadeOutStart, fadeOutEnd);
        planet.mat.uniforms.uTime.value = t;
        planet.mat.uniforms.uOpacity.value = opacity;
        planet.atmoMat.uniforms.uOpacity.value = opacity;
        planet.core.rotation.y = t * 0.06;
        planet.group.rotation.y = t * 0.03;
        planet.group.visible = opacity > 0.01;
      });

      // Saturn ring
      const saturnOpacity = fadeWindow(p, 0.22, 0.32, 0.9, 1.0);
      saturnRing.material.uniforms.uOpacity.value = saturnOpacity;
      saturnRing.rotation.z = 0.3 + t * 0.008;

      // Sun glow
      const sunOpacity = fadeWindow(p, 0.1, 0.2, 0.85, 1.0);
      sunSprite.material.opacity = sunOpacity;
      sunSprite.visible = sunOpacity > 0.01;

      // Asteroid belt
      const beltOpacity = fadeWindow(p, 0.18, 0.28, 0.85, 1.0);
      asteroidMat.opacity = beltOpacity * 0.5;
      beltGroup.visible = beltOpacity > 0.02;
      beltGroup.rotation.y = t * 0.015;

      // ─── Comets ───
      comets.forEach((c) => {
        if (c.delay > 0) { c.delay -= dt; return; }
        c.life += dt;
        if (c.life === dt) launchComet(c);
        const lt = c.life / c.maxLife;
        if (lt >= 1) { c.delay = 3 + Math.random() * (tier === 'full' ? 6 : 12); c.life = 0; c.mesh.material.opacity = 0; return; }
        c.mesh.position.x += c.vx * dt * 8;
        c.mesh.position.y += c.vy * dt * 8;
        c.mesh.quaternion.copy(camera.quaternion);
        c.mesh.rotateZ(Math.atan2(c.vy, c.vx));
        c.mesh.material.opacity = Math.sin(Math.min(1, lt * 4, (1 - lt) * 4) * Math.PI / 2) * 0.75;
      });

      // ─── Bloom ───
      if (bloomPass) bloomPass.strength = (tier === 'full' ? 0.45 : 0.28) + (1 - p) * 0.2;

      (composer || renderer).render(scene, camera);
    }

    if (tier === 'still') {
      renderer.render(scene, camera);
    } else {
      render();
    }
  }
}
