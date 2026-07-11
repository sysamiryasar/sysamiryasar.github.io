/* The persistent WebGL universe: layered starfield, procedural nebula, a rotating
   ringed world, drifting comets, and a scroll-driven camera flight through the page.
   Runs entirely on the fixed #universe canvas behind all page content. */
import * as THREE from './vendor/three.module.js';
import { EffectComposer } from './vendor/three/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/three/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/three/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from './vendor/three/postprocessing/ShaderPass.js';
import { OutputPass } from './vendor/three/postprocessing/OutputPass.js';

const canvas = document.getElementById('universe');
if (canvas) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const mobile = innerWidth < 820;
  const tier = reduced ? 'still' : mobile ? 'light' : 'full';

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: tier === 'full' ? 'high-performance' : 'low-power' });
  } catch { renderer = null; }

  if (renderer) {
    const palette = {
      cyan: new THREE.Color(0x06b6d4),
      blue: new THREE.Color(0x2563eb),
      violet: new THREE.Color(0x6d28d9),
      orange: new THREE.Color(0xf59e0b),
      white: new THREE.Color(0xffffff),
    };
    // One color pair per section, in document order: hero, vision, systems, pricing, signal, journal, contact.
    const zoneColors = [
      [palette.cyan, palette.blue],
      [palette.blue, palette.violet],
      [palette.violet, palette.cyan],
      [palette.cyan, palette.orange],
      [palette.orange, palette.violet],
      [palette.violet, palette.blue],
      [palette.white, palette.cyan],
    ];

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 120);
    camera.position.set(0, 0, 9);

    const pixelRatio = Math.min(devicePixelRatio || 1, tier === 'full' ? 1.75 : 1.25);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(innerWidth, innerHeight);

    let composer = null, bloomPass = null;
    if (tier !== 'still') {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), tier === 'full' ? 0.5 : 0.32, 0.55, 0.42);
      composer.addPass(bloomPass);
    }

    // ---------- shared canvas-texture helpers ----------
    function radialTexture(stops, size = 128) {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      stops.forEach(([offset, color]) => g.addColorStop(offset, color));
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
      const tex = new THREE.CanvasTexture(c); tex.needsUpdate = true;
      return tex;
    }
    function cometTexture() {
      const w = 512, h = 48;
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.72, 'rgba(255,255,255,.22)');
      g.addColorStop(0.93, 'rgba(255,255,255,.75)');
      g.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = g; ctx.fillRect(0, h * 0.32, w, h * 0.36);
      const head = ctx.createRadialGradient(w * 0.94, h / 2, 0, w * 0.94, h / 2, h * 0.9);
      head.addColorStop(0, 'rgba(255,255,255,.95)');
      head.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = head; ctx.fillRect(0, 0, w, h);
      const tex = new THREE.CanvasTexture(c); tex.needsUpdate = true;
      return tex;
    }

    // ---------- starfield (three parallax layers) ----------
    const starLayers = [];
    const starVertex = `
      attribute float aSize; attribute float aPhase; attribute vec3 aColor;
      uniform float uTime; uniform float uPixelRatio;
      varying vec3 vColor; varying float vTwinkle;
      void main() {
        vColor = aColor;
        vTwinkle = 0.55 + 0.45 * sin(uTime * 1.4 + aPhase);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float dist = max(-mvPosition.z, 0.5);
        gl_PointSize = min(aSize * uPixelRatio * (120.0 / dist), 7.0 * uPixelRatio);
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
      const swatches = [palette.white, palette.cyan, palette.blue, palette.violet];
      for (let i = 0; i < count; i++) {
        const k = i * 3;
        positions[k] = (Math.random() - 0.5) * spread;
        positions[k + 1] = (Math.random() - 0.5) * spread * 0.62;
        positions[k + 2] = -Math.random() * depth - 9;
        sizes[i] = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
        phases[i] = Math.random() * Math.PI * 2;
        const s = swatches[(Math.random() * swatches.length) | 0];
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
    const starCounts = tier === 'full' ? [2200, 900, 320] : tier === 'light' ? [900, 380, 140] : [1400, 0, 0];
    if (starCounts[0]) starLayers.push({ ...buildStarLayer(starCounts[0], 60, 55, [0.3, 0.65]), speed: 0.006, parallax: 0.02 });
    if (starCounts[1]) starLayers.push({ ...buildStarLayer(starCounts[1], 46, 34, [0.45, 0.9]), speed: 0.014, parallax: 0.05 });
    if (starCounts[2]) starLayers.push({ ...buildStarLayer(starCounts[2], 34, 20, [0.7, 1.4]), speed: 0.026, parallax: 0.09 });

    if (tier === 'still') {
      renderer.render(scene, camera);
    } else {
      // ---------- procedural nebula ----------
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
          vec2 p = vUv * uScale + vec2(uTime * 0.012, uTime * 0.006);
          float n = fbm(p);
          float n2 = fbm(p * 1.6 + 11.3);
          vec3 color = mix(uColorA, uColorB, smoothstep(0.2, 0.85, n));
          float alpha = smoothstep(0.32, 0.92, n) * (0.45 + 0.55 * n2);
          float edge = smoothstep(0.0, 0.4, vUv.x) * smoothstep(1.0, 0.6, vUv.x) * smoothstep(0.0, 0.4, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
          gl_FragColor = vec4(color, alpha * uOpacity * edge);
        }`;
      function buildNebula(z, scale, opacity, uvScale) {
        const geo = new THREE.PlaneGeometry(46, 30, 1, 1);
        const mat = new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: Math.random() * 40 }, uColorA: { value: zoneColors[0][0].clone() },
            uColorB: { value: zoneColors[0][1].clone() }, uOpacity: { value: opacity }, uScale: { value: uvScale },
          },
          vertexShader: nebulaVertex, fragmentShader: nebulaFragment,
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.z = z; mesh.scale.setScalar(scale);
        scene.add(mesh);
        return mesh;
      }
      const nebulaA = buildNebula(-22, 1.35, tier === 'full' ? 0.85 : 0.55, 2.4);
      const nebulaB = tier === 'full' ? buildNebula(-32, 1.7, 0.55, 3.1) : null;

      // ---------- distant sun glow (decorative) + key light (tuned to read on the visible hemisphere) ----------
      const sunDir = new THREE.Vector3(-10, 4.5, -14).normalize();
      const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: radialTexture([[0, 'rgba(255,236,204,1)'], [0.25, 'rgba(255,196,120,.55)'], [0.6, 'rgba(245,158,11,.16)'], [1, 'rgba(245,158,11,0)']]),
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      sunSprite.position.copy(sunDir).multiplyScalar(26);
      sunSprite.scale.setScalar(14);
      scene.add(sunSprite);
      const lightDir = new THREE.Vector3(0.55, 0.4, 0.72).normalize();

      // ---------- hero planet: core + atmosphere shell + ring + moon ----------
      const planetGroup = new THREE.Group();
      planetGroup.position.set(3.4, 0.6, -3.5);
      scene.add(planetGroup);

      const planetVertex = `
        varying vec3 vNormal; varying vec3 vWorldPosition; varying vec2 vUv;
        void main(){
          vUv = uv;
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }`;
      const planetFragment = `
        precision highp float;
        varying vec3 vNormal; varying vec3 vWorldPosition; varying vec2 vUv;
        uniform vec3 uDeep; uniform vec3 uMid; uniform vec3 uLight; uniform vec3 uRim; uniform vec3 uLightDir; uniform float uTime; uniform float uOpacity;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
        float vnoise(vec2 p){
          vec2 i=floor(p), f=fract(p);
          float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
          vec2 u=f*f*(3.-2.*f);
          return mix(a,b,u.x) + (c-a)*u.y*(1.-u.x) + (d-b)*u.x*u.y;
        }
        float fbm(vec2 p){ float v=0.0, amp=0.5; for(int i=0;i<4;i++){ v += amp*vnoise(p); p *= 2.05; amp *= 0.5; } return v; }
        void main(){
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          float diff = max(dot(normal, normalize(uLightDir)), 0.0);
          vec2 p = vUv * vec2(4.0, 2.0) + vec2(uTime * 0.008, 0.0);
          float bands = fbm(p * 2.0) * 0.6 + fbm(p * 5.0 + 3.1) * 0.4;
          vec3 base = mix(uDeep, uMid, smoothstep(0.2, 0.7, bands));
          base = mix(base, uLight, smoothstep(0.78, 0.96, bands));
          vec3 lit = base * (0.3 + 0.85 * diff);
          float nightGlow = smoothstep(0.18, 0.0, diff) * smoothstep(0.55, 0.9, bands);
          lit += uRim * nightGlow * 0.35;
          float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.4);
          gl_FragColor = vec4(lit + uRim * fresnel * 1.1, uOpacity);
        }`;
      const atmoFragment = `
        varying vec3 vNormal; varying vec3 vWorldPosition;
        uniform vec3 uColor; uniform float uPower; uniform float uIntensity; uniform float uOpacity;
        void main(){
          vec3 normal = normalize(vNormal); vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), uPower);
          gl_FragColor = vec4(uColor, fresnel * uIntensity * uOpacity);
        }`;
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

      function createPlanet({ radius = 1, deep, mid, light, rim, ring, moon, position }) {
        const group = new THREE.Group();
        group.position.copy(position);
        scene.add(group);

        const mat = new THREE.ShaderMaterial({
          uniforms: {
            uDeep: { value: new THREE.Color(deep) }, uMid: { value: new THREE.Color(mid) },
            uLight: { value: new THREE.Color(light) }, uRim: { value: new THREE.Color(rim) },
            uLightDir: { value: lightDir }, uTime: { value: Math.random() * 20 }, uOpacity: { value: 1 },
          },
          vertexShader: planetVertex, fragmentShader: planetFragment, transparent: true,
        });
        const core = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 64), mat);
        group.add(core);

        const atmoMat = new THREE.ShaderMaterial({
          uniforms: { uColor: { value: new THREE.Color(rim) }, uPower: { value: 2.1 }, uIntensity: { value: 0.9 }, uOpacity: { value: 1 } },
          vertexShader: planetVertex, fragmentShader: atmoFragment,
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
        });
        const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.08, 48, 48), atmoMat);
        group.add(atmosphere);

        let ringMesh = null;
        if (ring) {
          ringMesh = new THREE.Mesh(
            new THREE.RingGeometry(radius * 1.55, radius * 2.5, 128),
            new THREE.ShaderMaterial({
              uniforms: { uInner: { value: radius * 1.55 }, uOuter: { value: radius * 2.5 }, uColor: { value: new THREE.Color(ring) }, uOpacity: { value: 1 } },
              vertexShader: ringVertex, fragmentShader: ringFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide,
            })
          );
          ringMesh.rotation.x = Math.PI * 0.44; ringMesh.rotation.z = 0.3;
          group.add(ringMesh);
        }

        let moonPivot = null, moonMesh = null;
        if (moon) {
          moonPivot = new THREE.Group(); group.add(moonPivot);
          moonMesh = new THREE.Mesh(
            new THREE.SphereGeometry(radius * 0.16, 24, 24),
            new THREE.MeshStandardMaterial({ color: 0xc7cede, roughness: 0.95, metalness: 0.02, transparent: true })
          );
          moonMesh.position.set(radius * 3.1, radius * 0.4, 0);
          moonPivot.add(moonMesh);
        }

        return { group, core, mat, atmosphere, atmoMat, ring: ringMesh, moonPivot, moon: moonMesh, radius, basePos: position.clone() };
      }

      const heroPlanet = createPlanet({
        deep: 0x140a2e, mid: 0x4c2f9e, light: 0x9fd8ff, rim: 0x06b6d4,
        ring: 0x6d28d9, moon: true, position: new THREE.Vector3(3.4, 0.6, -3.5),
      });
      const marsPlanet = createPlanet({
        radius: 0.62, deep: 0x2a0f08, mid: 0xa3441f, light: 0xe8a26a, rim: 0xf59e0b,
        ring: false, moon: false, position: new THREE.Vector3(-4.2, -0.5, -9),
      });
      const giantPlanet = createPlanet({
        radius: 1.5, deep: 0x1c1330, mid: 0x6d28d9, light: 0xd7c3ff, rim: 0x8b5cf6,
        ring: 0x2563eb, moon: true, position: new THREE.Vector3(-5.5, 1.1, -19),
      });

      const sunLight = new THREE.DirectionalLight(0xfff2df, 1.15);
      sunLight.position.copy(lightDir);
      scene.add(sunLight, new THREE.AmbientLight(0x2a2f4a, 0.6));

      // ---------- asteroid belt ----------
      const asteroidCount = tier === 'full' ? 260 : 110;
      const asteroidGeo = new THREE.IcosahedronGeometry(0.09, 0);
      const asteroidPos = asteroidGeo.attributes.position;
      for (let i = 0; i < asteroidPos.count; i++) {
        const jitter = 0.65 + Math.random() * 0.7;
        asteroidPos.setXYZ(i, asteroidPos.getX(i) * jitter, asteroidPos.getY(i) * jitter, asteroidPos.getZ(i) * jitter);
      }
      asteroidPos.needsUpdate = true;
      asteroidGeo.computeVertexNormals();
      const asteroidMat = new THREE.MeshStandardMaterial({ color: 0x8c8478, roughness: 1, metalness: 0.05, transparent: true });
      const asteroidBelt = new THREE.InstancedMesh(asteroidGeo, asteroidMat, asteroidCount);
      const beltGroup = new THREE.Group();
      beltGroup.position.set(1.2, -0.3, -13);
      beltGroup.add(asteroidBelt);
      scene.add(beltGroup);
      {
        const dummy = new THREE.Object3D();
        for (let i = 0; i < asteroidCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const r = 6.5 + Math.random() * 2.3;
          dummy.position.set(Math.cos(angle) * r, (Math.random() - 0.5) * 1.1, Math.sin(angle) * r * 0.42);
          dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
          dummy.scale.setScalar(0.5 + Math.random() * 1.7);
          dummy.updateMatrix();
          asteroidBelt.setMatrixAt(i, dummy.matrix);
        }
        asteroidBelt.instanceMatrix.needsUpdate = true;
      }

      // ---------- satellite flybys ----------
      function buildSatellite() {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcfd6e6, roughness: 0.5, metalness: 0.6, transparent: true });
        const panelMat = new THREE.MeshStandardMaterial({ color: 0x1c3a6e, roughness: 0.35, metalness: 0.2, emissive: 0x0b1f4a, emissiveIntensity: 0.4, transparent: true });
        group.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.22), bodyMat));
        const panelGeo = new THREE.BoxGeometry(0.5, 0.16, 0.012);
        const panelL = new THREE.Mesh(panelGeo, panelMat); panelL.position.x = -0.37; group.add(panelL);
        const panelR = new THREE.Mesh(panelGeo, panelMat); panelR.position.x = 0.37; group.add(panelR);
        return { group, materials: [bodyMat, panelMat] };
      }
      const satelliteCount = tier === 'full' ? 2 : 1;
      const satellites = Array.from({ length: satelliteCount }, () => {
        const built = buildSatellite();
        scene.add(built.group);
        return { ...built, life: 0, maxLife: 1, delay: 4 + Math.random() * 10, vx: 0, vy: 0 };
      });
      function launchSatellite(s) {
        const edge = Math.random() * Math.PI * 2;
        const startRadius = 13;
        const x = Math.cos(edge) * startRadius, y = Math.sin(edge) * startRadius * 0.5;
        const angle = edge + Math.PI + (Math.random() - 0.5) * 0.4;
        s.vx = Math.cos(angle) * 0.55; s.vy = Math.sin(angle) * 0.32;
        s.group.position.set(x, y, -7 - Math.random() * 5);
        s.life = 0; s.maxLife = 9 + Math.random() * 6;
        s.materials.forEach((m) => { m.opacity = 0; });
      }

      // ---------- black hole finale ----------
      const blackHolePos = new THREE.Vector3(4.4, 2.1, -18);
      const eventHorizon = new THREE.Mesh(
        new THREE.SphereGeometry(1.3, 48, 48),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 })
      );
      eventHorizon.position.copy(blackHolePos);
      scene.add(eventHorizon);

      const photonRingMat = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(0xfff4e0) }, uPower: { value: 1.5 }, uIntensity: { value: 0.55 }, uOpacity: { value: 0 } },
        vertexShader: planetVertex, fragmentShader: atmoFragment,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
      });
      const photonRing = new THREE.Mesh(new THREE.SphereGeometry(1.36, 48, 48), photonRingMat);
      photonRing.position.copy(blackHolePos);
      scene.add(photonRing);

      const diskVertex = `varying vec2 vUv; varying float vRadius; void main(){ vUv = uv; vRadius = length(position.xy); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
      const diskFragment = `
        precision highp float;
        varying vec2 vUv; varying float vRadius;
        uniform float uInner; uniform float uOuter; uniform float uTime; uniform float uOpacity;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
        float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.)); vec2 u=f*f*(3.-2.*f); return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y; }
        float fbm(vec2 p){ float v=0.0, amp=0.5; for(int i=0;i<4;i++){ v+=amp*vnoise(p); p*=2.1; amp*=0.5; } return v; }
        void main(){
          float t = clamp((vRadius - uInner) / (uOuter - uInner), 0.0, 1.0);
          float angle = vUv.x * 6.28318;
          float swirl = fbm(vec2(angle * 2.2 + uTime * 1.4, t * 3.0 - uTime * 0.6));
          vec3 hot = mix(vec3(1.0, 0.85, 0.55), vec3(0.55, 0.75, 1.0), t);
          vec3 color = mix(vec3(1.0, 0.98, 0.9), hot, smoothstep(0.0, 0.5, t));
          float density = smoothstep(0.0, 0.1, t) * smoothstep(1.0, 0.55, t) * (0.2 + 0.4 * swirl);
          gl_FragColor = vec4(color * (0.75 - t * 0.3), density * uOpacity);
        }`;
      const disk = new THREE.Mesh(
        new THREE.RingGeometry(1.4, 2.9, 160),
        new THREE.ShaderMaterial({
          uniforms: { uInner: { value: 1.4 }, uOuter: { value: 2.9 }, uTime: { value: 0 }, uOpacity: { value: 0 } },
          vertexShader: diskVertex, fragmentShader: diskFragment,
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        })
      );
      disk.position.copy(blackHolePos);
      disk.rotation.x = Math.PI * 0.38;
      scene.add(disk);

      const lensingShader = {
        uniforms: { tDiffuse: { value: null }, uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uStrength: { value: 0 }, uAspect: { value: innerWidth / innerHeight } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }`,
        fragmentShader: `
          uniform sampler2D tDiffuse; uniform vec2 uCenter; uniform float uStrength; uniform float uAspect;
          varying vec2 vUv;
          void main(){
            vec2 toCenter = vUv - uCenter;
            toCenter.x *= uAspect;
            float dist = length(toCenter);
            float pull = uStrength / (dist * dist * 11.0 + 0.06);
            float angle = pull * 0.55;
            float s = sin(angle), c = cos(angle);
            vec2 rotated = vec2(toCenter.x * c - toCenter.y * s, toCenter.x * s + toCenter.y * c);
            rotated *= (1.0 - min(pull * 0.5, 0.82));
            rotated.x /= uAspect;
            vec2 sampleUv = clamp(uCenter + rotated, 0.001, 0.999);
            gl_FragColor = texture2D(tDiffuse, sampleUv);
          }`,
      };
      const lensingPass = new ShaderPass(lensingShader);
      composer.addPass(lensingPass);
      composer.addPass(new OutputPass());

      // ---------- comets ----------
      const cometMap = cometTexture();
      const cometCount = tier === 'full' ? 4 : 2;
      const comets = Array.from({ length: cometCount }, () => {
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(3.2, 0.16),
          new THREE.MeshBasicMaterial({ map: cometMap, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0 })
        );
        scene.add(mesh);
        return { mesh, life: 0, maxLife: 1, delay: Math.random() * 6, vx: 0, vy: 0 };
      });
      function launchComet(c) {
        const edge = Math.random() * Math.PI * 2;
        const startRadius = 16;
        const x = Math.cos(edge) * startRadius, y = Math.sin(edge) * startRadius * 0.6;
        const angle = edge + Math.PI + (Math.random() - 0.5) * 0.6;
        c.vx = Math.cos(angle); c.vy = Math.sin(angle) * 0.6;
        c.mesh.position.set(x, y, -6 - Math.random() * 6);
        c.mesh.rotation.z = Math.atan2(c.vy, c.vx);
        c.life = 0; c.maxLife = 1.6 + Math.random() * 1.2;
        c.mesh.material.opacity = 0;
      }

      // ---------- scroll zones ----------
      let zoneStarts = [0];
      function computeZones() {
        const sections = Array.from(document.querySelectorAll('main#top > section.section'));
        const total = Math.max(1, document.documentElement.scrollHeight - innerHeight);
        zoneStarts = sections.map((sec) => Math.min(1, Math.max(0, (sec.getBoundingClientRect().top + scrollY) / total)));
        if (!zoneStarts.length) zoneStarts = [0];
      }
      computeZones();
      addEventListener('resize', computeZones);

      // ---------- interaction state ----------
      let mouseX = 0, mouseY = 0, smx = 0, smy = 0, visible = !document.hidden;
      let rawProgress = 0, smoothProgress = 0;
      addEventListener('pointermove', (e) => { mouseX = e.clientX / innerWidth - 0.5; mouseY = e.clientY / innerHeight - 0.5; }, { passive: true });
      addEventListener('scroll', () => {
        const total = Math.max(1, document.documentElement.scrollHeight - innerHeight);
        rawProgress = Math.min(1, Math.max(0, scrollY / total));
      }, { passive: true });
      document.addEventListener('visibilitychange', () => { visible = !document.hidden; });
      addEventListener('resize', () => {
        camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
        composer?.setSize(innerWidth, innerHeight);
        bloomPass?.setSize(innerWidth, innerHeight);
        if (lensingPass) lensingPass.uniforms.uAspect.value = innerWidth / innerHeight;
      });

      function smoothstepJS(e0, e1, x) { const k = Math.min(1, Math.max(0, (x - e0) / ((e1 - e0) || 1))); return k * k * (3 - 2 * k); }
      function fadeWindow(p, inStart, inEnd, outStart, outEnd) {
        const rise = inEnd > inStart ? smoothstepJS(inStart, inEnd, p) : 1;
        const fall = outEnd > outStart ? 1 - smoothstepJS(outStart, outEnd, p) : 1;
        return Math.min(rise, fall);
      }
      const zs = (i) => (i < zoneStarts.length ? zoneStarts[i] : 1);
      const blackHoleScreenPos = new THREE.Vector3();
      const tmpColorA = new THREE.Color(), tmpColorB = new THREE.Color();
      const clock = new THREE.Clock();
      function render() {
        requestAnimationFrame(render);
        if (!visible) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;
        smoothProgress += (rawProgress - smoothProgress) * Math.min(1, dt * 2.2);
        smx += (mouseX - smx) * Math.min(1, dt * 3);
        smy += (mouseY - smy) * Math.min(1, dt * 3);

        // locate the active zone pair and blend factor
        let zi = 0;
        while (zi < zoneStarts.length - 2 && smoothProgress >= zoneStarts[zi + 1]) zi++;
        const zStart = zoneStarts[zi], zEnd = zoneStarts[Math.min(zi + 1, zoneStarts.length - 1)] || 1;
        const localT = zEnd > zStart ? Math.min(1, Math.max(0, (smoothProgress - zStart) / (zEnd - zStart))) : 1;
        const pairA = zoneColors[Math.min(zi, zoneColors.length - 1)];
        const pairB = zoneColors[Math.min(zi + 1, zoneColors.length - 1)];
        tmpColorA.copy(pairA[0]).lerp(pairB[0], localT);
        tmpColorB.copy(pairA[1]).lerp(pairB[1], localT);
        nebulaA.material.uniforms.uColorA.value.copy(tmpColorA);
        nebulaA.material.uniforms.uColorB.value.copy(tmpColorB);
        nebulaA.material.uniforms.uTime.value = t;
        nebulaA.rotation.z = t * 0.004;
        if (nebulaB) {
          nebulaB.material.uniforms.uColorA.value.copy(tmpColorB);
          nebulaB.material.uniforms.uColorB.value.copy(tmpColorA);
          nebulaB.material.uniforms.uTime.value = t * 0.8 + 30;
          nebulaB.rotation.z = -t * 0.003;
        }

        const ease = 1 - Math.pow(1 - smoothProgress, 2);
        const finale = smoothstepJS(zs(6), 1, smoothProgress);
        camera.position.z = 9 - ease * 6.6 - finale * 3.5 + smx * 0.4;
        camera.position.x = Math.sin(t * 0.05) * 0.3 + smx * 1.1;
        camera.position.y = Math.cos(t * 0.045) * 0.18 - smy * 0.7;
        camera.rotation.z = Math.sin(t * 0.03) * 0.008 + smx * 0.01;
        camera.fov = 58 + finale * 9;
        camera.updateProjectionMatrix();
        camera.lookAt(0, 0, -4);

        starLayers.forEach((layer) => {
          layer.mat.uniforms.uTime.value = t;
          layer.points.rotation.y = t * layer.speed + smx * layer.parallax;
          layer.points.rotation.x = smy * layer.parallax * 0.6;
        });

        // hero planet: bespoke recede-into-the-distance animation, tinted to the active zone color
        const heroOpacity = fadeWindow(smoothProgress, 0, 0, zs(1), zs(2));
        heroPlanet.mat.uniforms.uTime.value = t;
        heroPlanet.mat.uniforms.uOpacity.value = heroOpacity;
        heroPlanet.atmoMat.uniforms.uOpacity.value = heroOpacity;
        heroPlanet.group.rotation.y = 0.15 + t * 0.05;
        heroPlanet.core.rotation.y = t * 0.09;
        heroPlanet.ring.rotation.z = 0.3 + t * 0.015;
        heroPlanet.ring.material.uniforms.uOpacity.value = heroOpacity;
        heroPlanet.moonPivot.rotation.y = t * 0.22;
        heroPlanet.moon.material.opacity = heroOpacity;
        const recede = 1 + ease * 2.4;
        heroPlanet.group.position.set(3.4 + ease * 2.6, 0.6 - ease * 0.4, -3.5 - ease * 5);
        heroPlanet.group.scale.setScalar(1 / Math.pow(recede, 0.35));
        heroPlanet.group.visible = heroOpacity > 0.01;
        heroPlanet.atmoMat.uniforms.uColor.value.copy(tmpColorB);
        heroPlanet.mat.uniforms.uRim.value.copy(tmpColorB);
        heroPlanet.ring.material.uniforms.uColor.value.copy(tmpColorA);

        // secondary worlds along the journey: each fades in and out across its own stretch of scroll
        [
          [marsPlanet, fadeWindow(smoothProgress, zs(0), zs(1), zs(2), zs(3)), 0.2],
          [giantPlanet, fadeWindow(smoothProgress, zs(3), zs(4), zs(6), 1), 0.28],
        ].forEach(([p, opacity, driftAmount]) => {
          p.mat.uniforms.uTime.value = t;
          p.mat.uniforms.uOpacity.value = opacity;
          p.atmoMat.uniforms.uOpacity.value = opacity;
          p.group.rotation.y = 0.1 + t * 0.035;
          p.core.rotation.y = t * 0.06;
          if (p.ring) { p.ring.rotation.z = 0.3 + t * 0.01; p.ring.material.uniforms.uOpacity.value = opacity; }
          if (p.moonPivot) { p.moonPivot.rotation.y = t * 0.16; p.moon.material.opacity = opacity; }
          p.group.position.set(p.basePos.x + smx * driftAmount, p.basePos.y - smy * (driftAmount * 0.6), p.basePos.z + ease * 1.3);
          p.group.visible = opacity > 0.015;
        });

        // asteroid belt: drifts into view between the systems and journal sections
        const beltOpacity = fadeWindow(smoothProgress, zs(1), zs(2), zs(4), zs(5));
        asteroidMat.opacity = beltOpacity;
        beltGroup.visible = beltOpacity > 0.02;
        beltGroup.rotation.y = t * 0.02;

        // black hole finale: fades in near the end and pulls the frame toward it
        const bhOpacity = fadeWindow(smoothProgress, zs(5), zs(6), 1, 1);
        eventHorizon.material.opacity = bhOpacity;
        eventHorizon.visible = photonRing.visible = disk.visible = bhOpacity > 0.01;
        photonRingMat.uniforms.uOpacity.value = bhOpacity;
        disk.material.uniforms.uOpacity.value = bhOpacity;
        disk.material.uniforms.uTime.value = t;
        disk.rotation.z = t * 0.05;
        if (lensingPass) {
          blackHoleScreenPos.copy(blackHolePos).project(camera);
          lensingPass.uniforms.uCenter.value.set((blackHoleScreenPos.x + 1) / 2, (blackHoleScreenPos.y + 1) / 2);
          lensingPass.uniforms.uStrength.value = bhOpacity * finale * 1.3;
        }

        comets.forEach((c) => {
          if (c.delay > 0) { c.delay -= dt; return; }
          c.life += dt;
          if (c.life === dt) launchComet(c);
          const lt = c.life / c.maxLife;
          if (lt >= 1) { c.delay = 2 + Math.random() * (tier === 'full' ? 5 : 9); c.life = 0; c.mesh.material.opacity = 0; return; }
          c.mesh.position.x += c.vx * dt * 9;
          c.mesh.position.y += c.vy * dt * 9;
          c.mesh.quaternion.copy(camera.quaternion);
          c.mesh.rotateZ(Math.atan2(c.vy, c.vx));
          c.mesh.material.opacity = Math.sin(Math.min(1, lt * 4, (1 - lt) * 4) * Math.PI / 2) * 0.9;
        });

        satellites.forEach((s) => {
          if (s.delay > 0) { s.delay -= dt; return; }
          s.life += dt;
          if (s.life === dt) launchSatellite(s);
          const lt = s.life / s.maxLife;
          if (lt >= 1) { s.delay = 6 + Math.random() * 14; s.life = 0; s.materials.forEach((m) => { m.opacity = 0; }); return; }
          s.group.position.x += s.vx * dt;
          s.group.position.y += s.vy * dt;
          s.group.rotation.x += dt * 0.4;
          s.group.rotation.y += dt * 0.25;
          const fade = Math.sin(Math.min(1, lt * 5, (1 - lt) * 5) * Math.PI / 2) * 0.85;
          s.materials.forEach((m) => { m.opacity = fade; });
        });

        if (bloomPass) bloomPass.strength = (tier === 'full' ? 0.5 : 0.32) + ease * 0.3 + finale * 0.06;
        (composer || renderer).render(scene, camera);
      }
      render();
    }
  }
}
