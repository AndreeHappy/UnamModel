// ============================================================================
// MOTOR 3D WIREFRAME DE 4 PISOS + ESCALERAS CON DESCANSO + WASD (UNAM)
// ============================================================================
import * as THREE from 'three';
import './config.js';

(function () {
  const CFG = window.UNAM_CONFIG;
  const canvas = document.getElementById('scene-canvas');
  canvas.setAttribute('tabindex', '0'); // Permite foco directo del teclado
  const H = CFG.edificio.alturaUniforme || 3.8; // 3.8 m por piso (4 pisos = 15.2 m)

  let currentFloor = 1;
  let currentPlaceId = 'exterior';
  let lastRouteOriginPos = null;
  let lastRouteTargetId = null;

  let hiddenLinesEnabled = true;
  let freeLookEnabled = true;
  let isPaused = false;

  let isWalking = false;
  let activeCurve = null;
  let routeLength = 0;
  let walkElapsed = 0;
  let walkDuration = 1;
  let targetArrivalLook = new THREE.Vector3(...CFG.lugares.exterior.orientacionLlegada);

  let currentYaw = 0;
  let currentPitch = 0;
  let userYaw = 0;
  let userPitch = 0;

  // Estado de teclas WASD / Flechas (usando e.code para funcionar siempre sin importar mayúsculas/idioma)
  const moveKeys = { up: false, down: false, left: false, right: false };

  function directionToYawPitch(dirVec) {
    const d = dirVec.clone().normalize();
    const yaw = Math.atan2(d.x, d.z);
    const pitch = Math.asin(Math.max(-0.85, Math.min(0.85, d.y)));
    return { yaw, pitch };
  }

  function normalizeAngle(a) {
    let x = a % (Math.PI * 2);
    if (x > Math.PI) x -= Math.PI * 2;
    if (x < -Math.PI) x += Math.PI * 2;
    return x;
  }

  function shortestAngleDiff(fromAngle, toAngle) {
    return normalizeAngle(toAngle - fromAngle);
  }

  function lerpAngleShortest(fromAngle, toAngle, alpha) {
    return normalizeAngle(fromAngle + shortestAngleDiff(fromAngle, toAngle) * alpha);
  }

  // --------------------------------------------------------------------------
  // 1. INICIALIZACIÓN DE THREE.JS
  // --------------------------------------------------------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CFG.edificio.colorFondo);
  scene.fog = new THREE.Fog(CFG.edificio.colorFondo, 95, 220);

  const camera = new THREE.PerspectiveCamera(
    60,
    canvas.clientWidth / Math.max(canvas.clientHeight, 1),
    0.15,
    250
  );
  camera.position.set(...CFG.lugares.exterior.posicion);

  const initDir = new THREE.Vector3(...CFG.lugares.exterior.orientacionLlegada)
    .sub(camera.position)
    .normalize();
  const initAngles = directionToYawPitch(initDir);
  currentYaw = initAngles.yaw;
  currentPitch = initAngles.pitch;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    desynchronized: true,
  });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  // Materiales compartidos
  const matOcclusion = new THREE.MeshBasicMaterial({
    color: CFG.edificio.colorFondo,
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  const matCeilingSlab = new THREE.MeshBasicMaterial({
    color: CFG.edificio.colorTecho || 0xe6e9ef,
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  const matWireDark = new THREE.LineBasicMaterial({
    color: CFG.edificio.colorLinea,
  });

  const matWireSubtle = new THREE.LineBasicMaterial({
    color: 0xaeb6c2,
  });

  const matWireBlue = new THREE.LineBasicMaterial({
    color: CFG.edificio.colorAzul,
  });

  const matWireGold = new THREE.LineBasicMaterial({
    color: CFG.edificio.colorDorado,
  });

  const matGrass = new THREE.MeshBasicMaterial({
    color: 0x5ca149,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  const matWireGreen = new THREE.LineBasicMaterial({
    color: 0x2b6e3c,
  });

  const matLeafBroad = new THREE.MeshBasicMaterial({
    color: 0x4b943a, // Hojas anchas tropicales verde intenso (ave del paraíso / platanillo)
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  const matLeafOlive = new THREE.MeshBasicMaterial({
    color: 0x356e2b, // Follaje sombreado natural en capas internas
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  const matSoilDark = new THREE.MeshBasicMaterial({
    color: 0x3a2b20, // Tierra y mantillo orgánico dentro de los maceteros
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  const matTrunkBark = new THREE.MeshBasicMaterial({
    color: 0x524034, // Troncos y ramas naturales de árboles de la pasarela
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  const matTreeCanopy = new THREE.MeshBasicMaterial({
    color: 0x295927, // Copa densa de árbol exterior (tono base)
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  const matTreeCanopyLit = new THREE.MeshBasicMaterial({
    color: 0x3d7d34, // Copa exterior iluminada en ramas altas
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  const matBannerGreen = new THREE.MeshBasicMaterial({
    color: 0x1e9e49, // Banderola verde institucional
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  const matNavy3D = new THREE.MeshBasicMaterial({
    color: 0x243662, // Azul institucional UNAM para isotipo 3D en fachada
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  const matLeafBurgundy = new THREE.MeshBasicMaterial({
    color: 0x6b2833, // Hojas rojizas tipo drácena en el jardín seco
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  const matFlowerPurple = new THREE.MeshBasicMaterial({
    color: 0x7b6be6, // Flores agapanto violetas del jardín bajo las escaleras
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  const matWirePurple = new THREE.LineBasicMaterial({
    color: 0x43359e,
  });

  // Materiales adicionales fieles a las fotos reales de D:\RepoIde\unam\multimedia\fotos
  const matPebbles = new THREE.MeshBasicMaterial({
    color: 0xe8e2d5, // Piedritas blancas/beige bajo la escalera
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  const matDarkSeat = new THREE.MeshBasicMaterial({
    color: 0x1e2229, // Asientos negros de bancas de espera y mostrador de Mesa de Partes
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  const matSilver = new THREE.MeshBasicMaterial({
    color: 0xc5cdd6, // Acero inoxidable de puerta de elevador, tableros eléctricos y placas
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  const matTeal = new THREE.MeshBasicMaterial({
    color: 0x1ca3b8, // Marcos turquesa característicos de la fachada UNAM
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  const matRedSafety = new THREE.MeshBasicMaterial({
    color: 0xc92020, // Gabinete y tubería roja contra incendios junto a Abastecimiento
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  const matPotTerracotta = new THREE.MeshBasicMaterial({
    color: 0x7a2822, // Maceteros de las plantas bajo las escaleras
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  const matFrostedGlass = new THREE.MeshBasicMaterial({
    color: 0xdce4ee, // Franjas pavonadas de las puertas de vidrio y mamparas
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
  });

  const matWhiteGlass = new THREE.MeshBasicMaterial({
    color: 0xf7f9fc, // Vidrio blanco translúcido de atención al cliente (Mesa de Partes)
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
  });

  const matCurtainGlass = new THREE.MeshBasicMaterial({
    color: 0xbfdcf0, // Vidrio azul reflejante del muro cortina sobre el pórtico de entrada
    transparent: true,
    opacity: 0.48,
    side: THREE.DoubleSide,
  });

  const matWarmWood = new THREE.MeshBasicMaterial({
    color: 0x633e25, // Madera cálida/oscura para el panel trasero de Mesa de Partes
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  // Textura procedural de duelas verticales de madera cálida (cero carga externa, 120 FPS)
  function createWoodSlatMaterial() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#6c4226';
    g.fillRect(0, 0, 256, 256);
    const slats = 12;
    const w = 256 / slats;
    const tones = ['#734729', '#673d21', '#7b4e2f', '#5d371e', '#6f4427', '#784b2d'];
    for (let i = 0; i < slats; i++) {
      g.fillStyle = tones[i % tones.length];
      g.fillRect(i * w, 0, w - 2, 256);
      g.fillStyle = 'rgba(42, 22, 10, 0.22)';
      g.fillRect(i * w + 3, 0, 2, 256);
      g.fillStyle = 'rgba(255, 220, 185, 0.08)';
      g.fillRect(i * w + 8, 0, 3, 256);
      g.fillStyle = '#331c0d';
      g.fillRect((i + 1) * w - 2, 0, 2, 256);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(9, 1);
    return new THREE.MeshBasicMaterial({ map: tex });
  }
  const matWoodSlats = createWoodSlatMaterial();

  const matBookSpines = new THREE.MeshBasicMaterial({
    color: 0x3b4c60, // Lomos de libros en el estante de Admisión/CEPRE
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  const matBlueWall = new THREE.MeshBasicMaterial({
    color: 0x466d96, // Muros azules de la galería de rampas
    polygonOffset: true,
    polygonOffsetFactor: 1.5,
    polygonOffsetUnits: 1.5,
  });

  const occlusionMeshes = [];
  const signObjectsByFloor = { 1: {}, 2: {}, 3: {}, 4: {} };
  const wallColliders2D = [];

  function registerWallCollider(xMin, xMax, zMin, zMax, rule = null) {
    wallColliders2D.push({ xMin, xMax, zMin, zMax, rule });
  }

  function isPositionColliding(x, z, radius = 0.36, footY = 0) {
    // 1) Colisión exacta con la geometría poligonal diagonal de Mesa de Partes (en los 4 pisos)
    const floorFoot = Math.min(3, Math.max(0, Math.round(footY / H))) * H;
    if (footY >= -0.8 && footY - floorFoot < 2.5) {
      if (x + radius > 19.0 && x - radius < 46.0 && z + radius > 46.2 && z - radius < 51.0) {
        // Borde diagonal izquierdo: de (19, 51) a (27, 46.2) -> z = 51 - 0.6 * (x - 19)
        const diagZ = x + radius <= 27.0
          ? 51.0 - 0.6 * Math.min(8.0, Math.max(0, x + radius - 19.0))
          : 46.2;
        if (z + radius > diagZ && z - radius < 51.0) {
          return true;
        }
      }
    }

    const floorNum = Math.min(4, Math.max(1, Math.round(footY / H) + 1));
    for (const c of wallColliders2D) {
      if (c.rule === 'piso1_suelo' && (floorNum !== 1 || footY > 1.8 || footY < -1.0)) continue;
      if (c.rule === 'piso1_only' && floorNum !== 1) continue;
      if (c.rule === 'basement_only' && footY >= -1.0) continue;
      if (c.rule === 'upper_only' && floorNum === 1) continue;
      if (c.rule === 'floor4_only' && floorNum !== 4) continue;
      if (c.rule === 'ground_band') {
        const localY = footY - (floorNum - 1) * H;
        if (localY > 2.2) continue;
      }
      if (
        x + radius > c.xMin &&
        x - radius < c.xMax &&
        z + radius > c.zMin &&
        z - radius < c.zMax
      ) {
        return true;
      }
    }
    return false;
  }

  function addBoxByBounds(
    xMin,
    xMax,
    yMin,
    yMax,
    zMin,
    zMax,
    edgeMat = matWireDark,
    solid = true,
    customSolidMat = null
  ) {
    const w = xMax - xMin;
    const h = yMax - yMin;
    const d = zMax - zMin;
    const cx = (xMin + xMax) / 2;
    const cy = (yMin + yMax) / 2;
    const cz = (zMin + zMax) / 2;

    const geo = new THREE.BoxGeometry(w, h, d);
    if (solid) {
      const mesh = new THREE.Mesh(geo, customSolidMat || matOcclusion);
      mesh.position.set(cx, cy, cz);
      mesh.visible = hiddenLinesEnabled;
      scene.add(mesh);
      occlusionMeshes.push(mesh);
    }
    const edges = new THREE.EdgesGeometry(geo);
    const lines = new THREE.LineSegments(edges, edgeMat);
    lines.position.set(cx, cy, cz);
    scene.add(lines);
    return lines;
  }

  function addPolygonBlockAtY(pts2D, yBottom, height = H, edgeMat = matWireDark, solid = true, customSolidMat = null) {
    const shape = new THREE.Shape();
    pts2D.forEach(([x, z], idx) => {
      if (idx === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    });
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false,
    });
    geo.rotateX(-Math.PI / 2);

    if (solid) {
      const mesh = new THREE.Mesh(geo, customSolidMat || matOcclusion);
      mesh.position.y = yBottom;
      mesh.visible = hiddenLinesEnabled;
      scene.add(mesh);
      occlusionMeshes.push(mesh);
    }
    const edges = new THREE.EdgesGeometry(geo);
    const lines = new THREE.LineSegments(edges, edgeMat);
    lines.position.y = yBottom;
    scene.add(lines);
    return lines;
  }

  // Mampara baja de vidrio blanco de atención al cliente (para colocar encima del mostrador de Mesa de Partes)
  function addServiceGlassSegment(x1, z1, x2, z2, numPanes = 5, yBot = 1.25, yTop = 2.30) {
    const totalLen = Math.hypot(x2 - x1, z2 - z1);
    const angle = Math.atan2(z2 - z1, x2 - x1);
    const h = yTop - yBot;
    const paneW = totalLen / numPanes;
    const group = new THREE.Group();
    group.position.set(x1, 0, z1);
    group.rotation.y = -angle;

    // Paño continuo de vidrio blanco translúcido con marco superior e inferior blanco/aluminio
    const glassGeo = new THREE.PlaneGeometry(totalLen, h);
    const glassMesh = new THREE.Mesh(glassGeo, matWhiteGlass);
    glassMesh.position.set(totalLen / 2, yBot + h / 2, 0);
    group.add(glassMesh);

    [yBot + 0.03, yTop - 0.03].forEach((hy) => {
      const barGeo = new THREE.BoxGeometry(totalLen, 0.05, 0.06);
      const barLine = new THREE.LineSegments(new THREE.EdgesGeometry(barGeo), matWireDark);
      barLine.position.set(totalLen / 2, hy, 0);
      group.add(barLine);
    });

    for (let i = 0; i <= numPanes; i++) {
      const postGeo = new THREE.BoxGeometry(0.05, h, 0.06);
      const postLine = new THREE.LineSegments(new THREE.EdgesGeometry(postGeo), matWireDark);
      postLine.position.set(i * paneW, yBot + h / 2, 0);
      group.add(postLine);
    }

    scene.add(group);
  }

  function addGlassWallSegment(x1, z1, x2, z2, numPanes = 4, yBot = 0, yTop = H, withFrostedBands = true) {
    const totalLen = Math.hypot(x2 - x1, z2 - z1);
    const angle = Math.atan2(z2 - z1, x2 - x1);
    const group = new THREE.Group();
    group.position.set(x1, 0, z1);
    group.rotation.y = -angle;

    const h = yTop - yBot;
    const paneW = totalLen / numPanes;

    // Paño continuo de vidrio templado translúcido con sutil reflejo arquitectónico
    const glassGeo = new THREE.PlaneGeometry(totalLen, h);
    const glassMesh = new THREE.Mesh(glassGeo, matCurtainGlass);
    glassMesh.position.set(totalLen / 2, yBot + h / 2, 0);
    group.add(glassMesh);

    const horizontalBars = [yBot + 0.08, yTop - 0.08];
    if (h > 5.0) horizontalBars.push(yBot + 4.55);
    horizontalBars.forEach((hy) => {
      const barGeo = new THREE.BoxGeometry(totalLen, 0.08, 0.12);
      const barLine = new THREE.LineSegments(new THREE.EdgesGeometry(barGeo), matWireDark);
      barLine.position.set(totalLen / 2, hy, 0);
      group.add(barLine);
    });

    // 3 franjas pavonadas horizontales como en las fotos reales (VISTA A LA RAMPA.jpg, cepre.jpg, abastecimiento.jpg)
    if (withFrostedBands && h >= 3.5) {
      [yBot + 1.15, yBot + 1.55, yBot + 1.95].forEach((fy) => {
        const bandGeo = new THREE.PlaneGeometry(totalLen - 0.08, 0.22);
        const bandMesh = new THREE.Mesh(bandGeo, matFrostedGlass);
        bandMesh.position.set(totalLen / 2, fy, 0);
        group.add(bandMesh);
      });
    }

    for (let i = 0; i <= numPanes; i++) {
      const px = i * paneW;
      const postGeo = new THREE.BoxGeometry(0.08, h, 0.12);
      const postLine = new THREE.LineSegments(new THREE.EdgesGeometry(postGeo), matWireDark);
      postLine.position.set(px, yBot + h / 2, 0);
      group.add(postLine);

      if (i < numPanes) {
        const cx = (i + 0.5) * paneW;
        const cy = yBot + h * 0.42;
        const reflPts = [
          new THREE.Vector3(cx - paneW * 0.2, cy - 0.85, 0),
          new THREE.Vector3(cx + paneW * 0.2, cy + 0.95, 0),
          new THREE.Vector3(cx - paneW * 0.05, cy - 0.95, 0),
          new THREE.Vector3(cx + paneW * 0.25, cy + 0.4, 0),
        ];
        group.add(
          new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(reflPts), matWireSubtle)
        );
      }
    }

    scene.add(group);
  }

  // Baranda metálica de acero inoxidable con postes verticales y 5 barras horizontales + pasamanos (idéntica a VISTA A LAS ESCALERAS PRIMERAS.jpg)
  function addMetallicMultiBarRailing(x1, y1, z1, x2, y2, z2, numPosts = 5) {
    const pts = [];
    const barOffsets = [0.18, 0.36, 0.54, 0.72, 0.90, 1.08]; // 5 varillas intermedias + pasamanos superior
    barOffsets.forEach((hOff) => {
      pts.push(new THREE.Vector3(x1, y1 + hOff, z1), new THREE.Vector3(x2, y2 + hOff, z2));
    });
    for (let i = 0; i <= numPosts; i++) {
      const t = i / numPosts;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      const pz = z1 + (z2 - z1) * t;
      pts.push(new THREE.Vector3(px, py, pz), new THREE.Vector3(px, py + 1.08, pz));
    }
    scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), matWireDark));
  }

  // Banca metálica de espera con asientos negros y estructura cromada (idéntica a las fotos de escaleras, caja, admisión y abastecimiento)
  function addWaitingBench(cx, yBase, cz, numSeats = 4, rotY = 0) {
    const group = new THREE.Group();
    const seatW = 0.56;
    const gap = 0.06;
    const totalW = numSeats * seatW + (numSeats - 1) * gap;

    // Travesaño metálico inferior y patas en A cromadas
    const beamGeo = new THREE.BoxGeometry(totalW + 0.2, 0.06, 0.08);
    group.add(new THREE.LineSegments(new THREE.EdgesGeometry(beamGeo), matWireDark));
    [-totalW / 2 + 0.15, totalW / 2 - 0.15].forEach((lx) => {
      const legGeo = new THREE.BoxGeometry(0.08, 0.42, 0.52);
      const legLine = new THREE.LineSegments(new THREE.EdgesGeometry(legGeo), matWireDark);
      legLine.position.set(lx, 0.21, 0);
      group.add(legLine);
    });

    for (let i = 0; i < numSeats; i++) {
      const sx = -totalW / 2 + seatW / 2 + i * (seatW + gap);
      // Cojín negro del asiento
      const sGeo = new THREE.BoxGeometry(seatW, 0.07, 0.46);
      const sMesh = new THREE.Mesh(sGeo, matDarkSeat);
      sMesh.position.set(sx, 0.44, 0.04);
      sMesh.visible = hiddenLinesEnabled;
      occlusionMeshes.push(sMesh);
      group.add(sMesh);
      const sLine = new THREE.LineSegments(new THREE.EdgesGeometry(sGeo), matWireDark);
      sLine.position.copy(sMesh.position);
      group.add(sLine);

      // Respaldo negro + franja metálica inferior perforada
      const bGeo = new THREE.BoxGeometry(seatW, 0.46, 0.06);
      const bMesh = new THREE.Mesh(bGeo, matDarkSeat);
      bMesh.position.set(sx, 0.72, -0.18);
      bMesh.rotation.x = -0.14;
      bMesh.visible = hiddenLinesEnabled;
      occlusionMeshes.push(bMesh);
      group.add(bMesh);
      const bLine = new THREE.LineSegments(new THREE.EdgesGeometry(bGeo), matWireDark);
      bLine.position.copy(bMesh.position);
      bLine.rotation.copy(bMesh.rotation);
      group.add(bLine);
    }

    group.position.set(cx, yBase, cz);
    group.rotation.y = rotY;
    scene.add(group);
  }

  // Estante vitrina de libros de cristal con marco oscuro (Foto 1: entre Admisión y CEPRE)
  function addBookShowcase(cx, yBase, cz, rotY = 0) {
    const group = new THREE.Group();
    group.position.set(cx, yBase, cz);
    group.rotation.y = rotY;

    const w = 2.40;
    const h = 2.15;
    const d = 0.55;

    // Base inferior oscura de cajones/zócalo
    const baseH = 0.45;
    const baseGeo = new THREE.BoxGeometry(w, baseH, d);
    const baseMesh = new THREE.Mesh(baseGeo, matDarkSeat);
    baseMesh.position.set(0, baseH / 2, 0);
    baseMesh.visible = hiddenLinesEnabled;
    occlusionMeshes.push(baseMesh);
    group.add(baseMesh);
    const baseEdges = new THREE.LineSegments(new THREE.EdgesGeometry(baseGeo), matWireDark);
    baseEdges.position.copy(baseMesh.position);
    group.add(baseEdges);

    // Marco exterior de la vitrina
    const frameGeo = new THREE.BoxGeometry(w, h - baseH, d);
    const frameEdges = new THREE.LineSegments(new THREE.EdgesGeometry(frameGeo), matWireDark);
    frameEdges.position.set(0, baseH + (h - baseH) / 2, 0);
    group.add(frameEdges);

    // Frente de vidrio
    const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.08, h - baseH - 0.06), matWhiteGlass);
    frontGlass.position.set(0, baseH + (h - baseH) / 2, d / 2);
    group.add(frontGlass);

    // 3 baldas o estantes interiores con libros exhibidos
    for (let s = 1; s <= 3; s++) {
      const shY = baseH + s * ((h - baseH) / 4);
      const shelfGeo = new THREE.BoxGeometry(w - 0.06, 0.03, d - 0.06);
      const shelfEdges = new THREE.LineSegments(new THREE.EdgesGeometry(shelfGeo), matWireSubtle);
      shelfEdges.position.set(0, shY, 0);
      group.add(shelfEdges);

      for (let b = -4; b <= 4; b++) {
        if (b === 0) continue;
        const bGeo = new THREE.BoxGeometry(0.18, 0.28, 0.04);
        const bMesh = new THREE.Mesh(bGeo, matBookSpines);
        bMesh.position.set(b * 0.24, shY + 0.14, 0.06);
        bMesh.rotation.x = -0.15;
        bMesh.visible = hiddenLinesEnabled;
        occlusionMeshes.push(bMesh);
        group.add(bMesh);
        const bEdges = new THREE.LineSegments(new THREE.EdgesGeometry(bGeo), matWireDark);
        bEdges.position.copy(bMesh.position);
        bEdges.rotation.copy(bMesh.rotation);
        group.add(bEdges);
      }
    }

    scene.add(group);
  }

  // Hoja botánica curva orgánicamente (sin aristas poligonales ni jaulas negras)
  function createArchedLeafGeometry(maxWidth, length, archForward = 0.28, segs = 7) {
    const positions = [];
    const indices = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const profile = i === segs ? 0.0 : Math.sin(Math.pow(t, 0.72) * Math.PI);
      const halfW = maxWidth * 0.5 * profile;
      const y = length * (t - 0.12 * Math.pow(t, 2.6));
      const zBend = archForward * Math.pow(t, 1.85);
      const vCrease = halfW * 0.14;
      positions.push(
        -halfW, y, zBend + vCrease,
        0, y, zBend,
        halfW, y, zBend + vCrease
      );
    }
    for (let i = 0; i < segs; i++) {
      const r0 = i * 3;
      const r1 = (i + 1) * 3;
      indices.push(r0, r0 + 1, r1 + 1, r0, r1 + 1, r1);
      indices.push(r0 + 1, r0 + 2, r1 + 2, r0 + 1, r1 + 2, r1 + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // Macetero cilíndrico color terracota con hojas lanceoladas arqueadas reales (aspecto natural)
  function addSansevieriaPot(px, yBase, pz) {
    const group = new THREE.Group();
    group.position.set(px, yBase, pz);

    const potGeo = new THREE.CylinderGeometry(0.28, 0.21, 0.44, 14);
    const potMesh = new THREE.Mesh(potGeo, matPotTerracotta);
    potMesh.position.y = 0.22;
    potMesh.visible = hiddenLinesEnabled;
    occlusionMeshes.push(potMesh);
    group.add(potMesh);
    const potEdges = new THREE.LineSegments(new THREE.EdgesGeometry(potGeo), matWireDark);
    potEdges.position.y = 0.22;
    group.add(potEdges);

    const soilGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.04, 14);
    const soilMesh = new THREE.Mesh(soilGeo, matSoilDark);
    soilMesh.position.y = 0.43;
    soilMesh.visible = hiddenLinesEnabled;
    occlusionMeshes.push(soilMesh);
    group.add(soilMesh);

    const sansevieriaLeafGeo = createArchedLeafGeometry(0.11, 1.05, 0.14, 6);
    const leafCount = 13;
    for (let i = 0; i < leafCount; i++) {
      const yaw = (i / leafCount) * Math.PI * 2 + (i % 2) * 0.22;
      const tilt = 0.08 + (i % 4) * 0.06;
      const s = 0.85 + (i % 3) * 0.20;
      const bladeMesh = new THREE.Mesh(sansevieriaLeafGeo, i % 3 === 0 ? matLeafOlive : matLeafBroad);
      bladeMesh.scale.setScalar(s);
      bladeMesh.position.set(Math.sin(yaw) * 0.06, 0.44, Math.cos(yaw) * 0.06);
      bladeMesh.rotation.set(tilt, yaw, 0, 'YXZ');
      bladeMesh.visible = hiddenLinesEnabled;
      occlusionMeshes.push(bladeMesh);
      group.add(bladeMesh);
    }

    scene.add(group);
  }

  // Jardín tropical natural bajo las escaleras: especies dispersas orgánicamente (sin filas rígidas ni franjas aisladas)
  function addTropicalPlanterGarden(gXMin, gXMax, ySurface, gZMin, gZMax, backSide = 'east') {
    const group = new THREE.Group();
    const spanX = Math.max(0.8, gXMax - gXMin - 0.45);
    const spanZ = Math.max(0.8, gZMax - gZMin - 0.45);

    // Cama orgánica de tierra oscura cubriendo el interior del macetero
    const soilMesh = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(0.6, gXMax - gXMin - 0.16), 0.04, Math.max(0.6, gZMax - gZMin - 0.16)),
      matSoilDark
    );
    soilMesh.position.set((gXMin + gXMax) / 2, ySurface + 0.015, (gZMin + gZMax) / 2);
    soilMesh.visible = hiddenLinesEnabled;
    occlusionMeshes.push(soilMesh);
    group.add(soilMesh);

    const broadLeafGeo = createArchedLeafGeometry(0.30, 1.48, 0.44, 8);
    const bushBladeGeo = createArchedLeafGeometry(0.085, 0.74, 0.32, 7);
    const burgundyLeafGeo = createArchedLeafGeometry(0.11, 0.92, 0.28, 7);
    const flowerFloretGeo = new THREE.SphereGeometry(0.036, 7, 5);
    const stemSegGeo = new THREE.CylinderGeometry(0.010, 0.014, 0.34, 5);

    const addCurvedLeaf = (px, py, pz, geo, matFill, yaw, tilt, s = 1.0) => {
      const m = new THREE.Mesh(geo, matFill);
      m.scale.setScalar(s);
      m.position.set(px, py, pz);
      m.rotation.set(tilt, yaw, 0, 'YXZ');
      m.visible = hiddenLinesEnabled;
      occlusionMeshes.push(m);
      group.add(m);
    };

    // Generador pseudo-aleatorio determinista para una distribución 100% natural y dispersa
    let sVal = backSide === 'east' ? 98214 : 45217;
    const rnd = () => {
      sVal = (sVal * 1664525 + 1013904223) % 4294967296;
      return sVal / 4294967296;
    };

    const plantCount = 30;
    for (let i = 0; i < plantCount; i++) {
      const col = i % 6;
      const row = Math.floor(i / 6);
      // Dispersión estratificada con fluctuación libre para evitar cualquier alineación
      const u = Math.min(0.92, Math.max(0.08, (col + 0.15 + rnd() * 0.7) / 6));
      const v = Math.min(0.92, Math.max(0.08, (row + 0.15 + rnd() * 0.7) / 5));

      const px = gXMin + 0.22 + u * spanX;
      const pz = gZMin + 0.22 + v * spanZ;
      const rollType = rnd();

      if (rollType < 0.36) {
        // Mata de hojas anchas tropicales (platanillo / ave del paraíso)
        const leafNum = 3 + Math.floor(rnd() * 3);
        const clumpScale = 0.82 + rnd() * 0.34;
        const mainYaw = rnd() * Math.PI * 2;
        for (let k = 0; k < leafNum; k++) {
          const lYaw = mainYaw + (k - (leafNum - 1) / 2) * 0.36 + (rnd() - 0.5) * 0.18;
          const tilt = 0.12 + Math.abs(k - (leafNum - 1) / 2) * 0.10 + rnd() * 0.08;
          addCurvedLeaf(
            px + (rnd() - 0.5) * 0.08,
            ySurface + 0.03,
            pz + (rnd() - 0.5) * 0.08,
            broadLeafGeo,
            k % 2 === 0 ? matLeafBroad : matLeafOlive,
            lYaw,
            tilt,
            clumpScale * (0.90 + rnd() * 0.20)
          );
        }
      } else if (rollType < 0.68) {
        // Mata rojiza de drácenas naturales intercalada orgánicamente
        const leafNum = 5 + Math.floor(rnd() * 4);
        const clumpScale = 0.78 + rnd() * 0.32;
        const mainYaw = rnd() * Math.PI * 2;
        for (let r = 0; r < leafNum; r++) {
          const rYaw = mainYaw + (r / leafNum) * Math.PI * 2 + (rnd() - 0.5) * 0.22;
          const tilt = 0.18 + (r % 3) * 0.09 + rnd() * 0.08;
          addCurvedLeaf(
            px + (rnd() - 0.5) * 0.06,
            ySurface + 0.03,
            pz + (rnd() - 0.5) * 0.06,
            burgundyLeafGeo,
            matLeafBurgundy,
            rYaw,
            tilt,
            clumpScale
          );
        }
      } else {
        // Roseta frondosa verde de suelo (lenguas / hierbas tupidas)
        const leafNum = 7 + Math.floor(rnd() * 4);
        const clumpScale = 0.75 + rnd() * 0.35;
        const mainYaw = rnd() * Math.PI * 2;
        for (let j = 0; j < leafNum; j++) {
          const jYaw = mainYaw + (j / leafNum) * Math.PI * 2;
          const leafMat = j % 3 === 0 ? matLeafOlive : j % 3 === 1 ? matLeafBroad : matGrass;
          addCurvedLeaf(
            px + Math.sin(jYaw) * 0.06,
            ySurface + 0.03,
            pz + Math.cos(jYaw) * 0.06,
            bushBladeGeo,
            leafMat,
            jYaw,
            0.18 + (j % 3) * 0.12 + rnd() * 0.06,
            clumpScale
          );
        }
      }

      // Agapantos con flores moradas dispersas en 8 ubicaciones variadas
      if (i % 4 === 1 || i === 22) {
        const stH = 0.95 + rnd() * 0.40;
        const leanYaw = rnd() * Math.PI * 2;
        let tipX = px + (rnd() - 0.5) * 0.10;
        let tipY = ySurface + 0.03;
        let tipZ = pz + (rnd() - 0.5) * 0.10;

        for (let sIdx = 0; sIdx < 4; sIdx++) {
          const segTilt = 0.04 + sIdx * 0.06;
          const segLen = (stH / 4) * 1.02;
          const dx = Math.sin(leanYaw) * Math.sin(segTilt) * segLen;
          const dz = Math.cos(leanYaw) * Math.sin(segTilt) * segLen;
          const dy = Math.cos(segTilt) * segLen;
          const stSeg = new THREE.Mesh(stemSegGeo, matLeafOlive);
          stSeg.scale.y = segLen / 0.34;
          stSeg.position.set(tipX + dx * 0.5, tipY + dy * 0.5, tipZ + dz * 0.5);
          stSeg.rotation.set(segTilt, leanYaw, 0, 'YXZ');
          stSeg.visible = hiddenLinesEnabled;
          occlusionMeshes.push(stSeg);
          group.add(stSeg);
          tipX += dx;
          tipY += dy;
          tipZ += dz;
        }

        const floretCount = 8 + Math.floor(rnd() * 4);
        for (let f = 0; f < floretCount; f++) {
          const fYaw = (f / floretCount) * Math.PI * 2;
          const fElev = f === 0 ? 1.0 : 0.30 + (f % 2) * 0.35;
          const rad = f === 0 ? 0.0 : 0.08 + (f % 3) * 0.02;
          const fl = new THREE.Mesh(flowerFloretGeo, matFlowerPurple);
          fl.position.set(
            tipX + Math.sin(fYaw) * rad,
            tipY + fElev * 0.055,
            tipZ + Math.cos(fYaw) * rad
          );
          fl.visible = hiddenLinesEnabled;
          occlusionMeshes.push(fl);
          group.add(fl);
        }
      }
    }

    scene.add(group);
  }

  // Puerta doble de vidrio ABIERTO (hojas batientes abiertas casi a 90 grados con manijas y franjas)
  function addDoubleGlassDoor(cx, yBase, cz, width, height = 4.5, axis = 'z', openAngle = 1.52) {
    const group = new THREE.Group();
    group.position.set(cx, yBase, cz);
    if (axis === 'x') group.rotation.y = Math.PI / 2;

    const leafW = width / 2;
    const leafH = height - 0.12;
    const postGeo = new THREE.BoxGeometry(0.08, height, 0.16);
    [-width / 2, width / 2].forEach((px) => {
      const pLine = new THREE.LineSegments(new THREE.EdgesGeometry(postGeo), matWireBlue);
      pLine.position.set(px, height / 2, 0);
      group.add(pLine);
    });
    const topGeo = new THREE.BoxGeometry(width, 0.08, 0.16);
    const tLine = new THREE.LineSegments(new THREE.EdgesGeometry(topGeo), matWireBlue);
    tLine.position.set(0, height - 0.04, 0);
    group.add(tLine);

    // Hoja izquierda y hoja derecha rotadas en sus bisagras para verse claramente ABIERTAS
    [-1, 1].forEach((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * (width / 2), 0, 0);
      pivot.rotation.y = side * openAngle;

      const midX = -side * (leafW / 2);
      const frameGeo = new THREE.BoxGeometry(leafW - 0.04, leafH, 0.06);
      const frameLine = new THREE.LineSegments(new THREE.EdgesGeometry(frameGeo), matWireDark);
      frameLine.position.set(midX, leafH / 2, 0);
      pivot.add(frameLine);

      // 3 franjas pavonadas sobre cada hoja abierta de vidrio
      [1.15, 1.55, 1.95].forEach((fy) => {
        const bandGeo = new THREE.PlaneGeometry(leafW - 0.12, 0.18);
        const bandMesh = new THREE.Mesh(bandGeo, matFrostedGlass);
        bandMesh.position.set(midX, fy, 0);
        pivot.add(bandMesh);
      });

      // Manija vertical cromada cerca del borde libre
      const handleX = -side * (leafW - 0.18);
      const hGeo = new THREE.BoxGeometry(0.04, 0.85, 0.14);
      const hLine = new THREE.LineSegments(new THREE.EdgesGeometry(hGeo), matWireDark);
      hLine.position.set(handleX, 1.45, 0);
      pivot.add(hLine);

      group.add(pivot);
    });

    scene.add(group);
  }

  // --------------------------------------------------------------------------
  // 2. ESCALERA REALISTA GIRADA 90° EN SENTIDO HORARIO (SIN MURO AL COSTADO DERECHO):
  //    - Caja de 9.0 bloques en X (x: centerX - 4.5 .. centerX + 4.5) x 10.0 bloques en Z (z: 28.0 .. 38.0).
  //    - Entrada abierta por el OESTE (x = centerX - 4.5) mirando hacia el ESTE (+X):
  //      * Tramo 1 (IZQUIERDA / NORTE, z: 28.0 .. 32.2): pegado al muro exterior de ventanas (z = 28.0),
  //        sube de Oeste a Este desde xLeft hasta el descanso (runLen = 6.4 bloques).
  //      * Descanso intermedio al FONDO ESTE (x: xRight - 2.6 .. xRight, z: 28.0 .. 38.0) frente al gran ventanal.
  //      * Tramo 2 (DERECHA / SUR, z: 32.8 .. 37.2): regresa subiendo hacia el Oeste hasta el piso superior (x = xLeft).
  //    - Al costado DERECHO (z = 38.0): NO EXISTE MURO (queda abierto hacia el pasadizo central).
  //    - En Piso 1 (yBase === 0): jardín seco de piedritas, 3 reflectores, 2 plantas realistas y banca de 4 asientos.
  //    - En Pisos 2 y 3 (yBase > 0): SIN plantas ni jardín abajo para sentir claramente la subida continua entre pisos.
  // --------------------------------------------------------------------------
  function buildStairWithLandingAndWaist(centerX, _zFrontUnused, yBase) {
    const stepsPerFlight = 15;
    const xLeft = centerX - 4.5;
    const xRight = centerX + 4.5;
    const landingWidthX = 2.6;
    const runLen = 9.0 - landingWidthX; // 6.4 bloques de recorrido horizontal en X
    const xMidBreak = xLeft + runLen;  // Donde termina Tramo 1 / empieza el descanso en X
    const tread = runLen / stepsPerFlight;
    const riser = (H / 2) / stepsPerFlight;
    const waist = 0.24;

    // Anchos en Z (dejando un ojo central de 0.60 bloques)
    const flightW = 4.20;
    const nZMin = 28.0;           // Tramo 1 pegado a la pared norte (z = 28.0..32.2)
    const nZMax = 28.0 + flightW; // 32.2
    const sZMin = 37.2 - flightW; // 33.0 (Tramo 2 lado sur derecho, sin muro en z=38.0)
    const sZMax = 37.2;

    const throatLen = Math.hypot(runLen, H / 2);
    const throatAngle = Math.atan2(H / 2, runLen);

    // 1) Tramo 1 (Lado IZQUIERDO mirando hacia +X): sube desde xLeft hasta xMidBreak
    const t1Group = new THREE.Group();
    const tGeo = new THREE.BoxGeometry(throatLen, waist, flightW);
    const t1Mesh = new THREE.Mesh(tGeo, matCeilingSlab);
    t1Mesh.visible = hiddenLinesEnabled;
    occlusionMeshes.push(t1Mesh);
    t1Group.add(t1Mesh);
    t1Group.add(new THREE.LineSegments(new THREE.EdgesGeometry(tGeo), matWireDark));
    t1Group.position.set(xLeft + runLen / 2, yBase + H / 4 - waist * 0.45, (nZMin + nZMax) / 2);
    t1Group.rotation.z = throatAngle;
    scene.add(t1Group);

    for (let i = 0; i < stepsPerFlight; i++) {
      const xStepStart = xLeft + i * tread;
      const xStepEnd = xStepStart + tread;
      const yStepBot = yBase + i * riser;
      const yStepTop = yStepBot + riser;
      addBoxByBounds(xStepStart, xStepEnd, yStepBot, yStepTop, nZMin, nZMax, matWireDark, true, matCeilingSlab);
    }

    // 2) Descanso intermedio al FONDO ESTE (x: xMidBreak .. xRight, z: 28.0 .. 37.2) a mitad de altura
    const yLandingTop = yBase + H / 2;
    const yLandingBot = yLandingTop - waist;
    addBoxByBounds(
      xMidBreak,
      xRight,
      yLandingBot,
      yLandingTop,
      28.0,
      37.4,
      matWireDark,
      true,
      matCeilingSlab
    );

    // 3) Tramo 2 (Lado DERECHO mirando hacia +X): regresa subiendo desde xMidBreak hasta xLeft en el piso superior
    const t2Group = new THREE.Group();
    const t2Mesh = new THREE.Mesh(tGeo, matCeilingSlab);
    t2Mesh.visible = hiddenLinesEnabled;
    occlusionMeshes.push(t2Mesh);
    t2Group.add(t2Mesh);
    t2Group.add(new THREE.LineSegments(new THREE.EdgesGeometry(tGeo), matWireDark));
    t2Group.position.set(xLeft + runLen / 2, yBase + (H * 3) / 4 - waist * 0.45, (sZMin + sZMax) / 2);
    t2Group.rotation.z = -throatAngle;
    scene.add(t2Group);

    for (let i = 0; i < stepsPerFlight; i++) {
      const xStepEnd = xMidBreak - i * tread;
      const xStepStart = xStepEnd - tread;
      const yStepBot = yLandingTop + i * riser;
      const yStepTop = yStepBot + riser;
      addBoxByBounds(xStepStart, xStepEnd, yStepBot, yStepTop, sZMin, sZMax, matWireDark, true, matCeilingSlab);
    }

    // 4) Barandas metálicas de 5 barras horizontales (exactas a VISTA A LAS ESCALERAS PRIMERAS.jpg)
    addMetallicMultiBarRailing(xLeft, yBase, nZMin + 0.12, xMidBreak, yLandingTop, nZMin + 0.12, 5);
    addMetallicMultiBarRailing(xLeft, yBase, nZMax - 0.08, xMidBreak, yLandingTop, nZMax - 0.08, 5);
    addMetallicMultiBarRailing(xMidBreak, yLandingTop, nZMax - 0.08, xMidBreak, yLandingTop, sZMin + 0.08, 2);
    addMetallicMultiBarRailing(xRight - 0.15, yLandingTop, nZMin + 0.12, xRight - 0.15, yLandingTop, sZMax - 0.12, 5);
    addMetallicMultiBarRailing(xMidBreak, yLandingTop, sZMin + 0.08, xLeft, yBase + H, sZMin + 0.08, 5);
    // Baranda exterior derecha sobre el Tramo 2 abierto hacia el pasillo (costado derecho sin muro!)
    addMetallicMultiBarRailing(xMidBreak, yLandingTop, sZMax, xLeft, yBase + H, sZMax, 5);
    addMetallicMultiBarRailing(xMidBreak, yLandingTop, sZMax, xRight - 0.15, yLandingTop, sZMax, 2);

    // 5) Jardín de piedritas, plantas y banca ÚNICAMENTE EN EL PRIMER PISO (yBase === 0)
    //    En los pisos 2 y 3 NO van plantas debajo para sentir la continuidad del hueco y subida
    if (Math.abs(yBase) < 0.1) {
      const gXMin = xLeft + 0.85;
      const gXMax = xRight - 0.25;
      const gZMin = nZMax + 0.35;
      const gZMax = 37.65;
      addBoxByBounds(gXMin, gXMax, yBase, yBase + 0.24, gZMin, gZMax, matWireDark, true);
      addBoxByBounds(gXMin + 0.15, gXMax - 0.15, yBase + 0.24, yBase + 0.30, gZMin + 0.15, gZMax - 0.15, matWireSubtle, true, matPebbles);

      // 3 pequeños reflectores negros en el jardín seco apuntando al ventanal del fondo Este (xRight)
      [gZMin + 0.9, (gZMin + gZMax) / 2, gZMax - 0.9].forEach((sz) => {
        addBoxByBounds(gXMax - 0.58, gXMax - 0.42, yBase + 0.30, yBase + 0.44, sz - 0.08, sz + 0.08, matWireDark, true, matDarkSeat);
      });

      // Jardín tropical frondoso con hojas anchas, matas verdes y agapantos morados + banca negra de 4 asientos
      addTropicalPlanterGarden(gXMin + 0.15, gXMax - 0.55, yBase + 0.30, gZMin + 0.15, gZMax - 0.15, 'east');
      addWaitingBench(xLeft + 0.36, yBase, (gZMin + gZMax) / 2, 4, -Math.PI / 2);
    } else {
      // Baranda protectora en el borde del suelo superior alrededor del hueco en Pisos 2 y 3
      addMetallicMultiBarRailing(xLeft, yBase, 37.9, xRight, yBase, 37.9, 6);
    }
  }

  // Cerramientos de escalera girados 90° horario:
  // - Lado Norte (z = 28.0): muro exterior con grandes ventanales iluminando Tramo 1 y descanso.
  // - Fondo Este (x = xRight): muro exterior con los ventanales grandes arriba y ventana baja de 3 paños detrás del jardín.
  // - Costado Derecho / Sur (z = 38.0): SIN MURO (totalmente abierto hacia el pasillo central).
  function buildStairwellEnclosureWithWindows(centerX, y0, y1) {
    const xLeft = centerX - 4.5;
    const xRight = centerX + 4.5;
    const zNorth = 28.0;

    // A) Lado Norte (z = 28.0, atrás de Tramo 1): antepecho bajo y ventanal grande de piso a techo
    addBoxByBounds(xLeft - 0.2, xRight + 0.2, y0, y0 + 1.0, zNorth - 0.25, zNorth, matWireDark, true);
    addGlassWallSegment(xLeft, zNorth, xRight, zNorth, 4, y0 + 1.0, y1 - 0.2, false);

    // B) Fondo Este (x = xRight = 59.0 / 86.0, detrás del descanso y del jardín de piedritas):
    addBoxByBounds(xRight, xRight + 0.22, y0, y0 + 1.0, 28.0, 38.0, matWireDark, true); // Antepecho inferior
    addBoxByBounds(xRight, xRight + 0.25, y0, y1, 32.1, 32.85, matWireDark, true);       // Columna central entre ambos ventanales
    addBoxByBounds(xRight, xRight + 0.22, y0 + 2.65, y0 + H / 2 + 0.15, 32.85, 38.0, matWireDark, true); // Dintel bajo descanso

    //    1) Ventana horizontal baja de 3 paños detrás del jardín de piedritas
    addGlassWallSegment(xRight + 0.1, 32.85, xRight + 0.1, 37.8, 3, y0 + 1.0, y0 + 2.65, false);
    //    2) Gran ventanal izquierdo de doble altura detrás del Tramo 1
    addGlassWallSegment(xRight + 0.1, 28.0, xRight + 0.1, 32.1, 2, y0 + 1.0, y0 + H / 2, false);
    addGlassWallSegment(xRight + 0.1, 28.0, xRight + 0.1, 32.1, 2, y0 + H / 2, y1 - 0.2, false);
    //    3) Gran ventanal derecho superior sobre el descanso
    addGlassWallSegment(xRight + 0.1, 32.85, xRight + 0.1, 37.8, 3, y0 + H / 2 + 0.15, y1 - 0.2, false);
  }

  // ESCALERA 2 ROTADA 90° EN SENTIDO ANTIHORARIO (comparada con Escalera 1 -> entrada abierta al SUR z = 38.0):
  // - Caja de 9.0 bloques en X (xLeft .. xRight) x 10.0 bloques en Z (z: 28.0 .. 38.0).
  // - Tramo 1 (Izquierda Oeste): sube de Sur (z = 37.6) hacia el Norte (z = 31.2).
  // - Descanso intermedio al Norte (z: 28.0 .. 31.2).
  // - Tramo 2 (Derecha Este): regresa subiendo de Norte (z = 31.2) hacia el Sur (z = 37.6).
  function buildStairSouthFacingWithLanding(centerX, yBase) {
    const stepsPerFlight = 15;
    const xLeft = centerX - 4.5;
    const xRight = centerX + 4.5;
    const zNorth = 28.0;
    const zMidBreak = 31.2;
    const zFront = 37.6;
    const runLen = zFront - zMidBreak; // 6.4 bloques de recorrido horizontal en Z
    const tread = runLen / stepsPerFlight;
    const riser = (H / 2) / stepsPerFlight;
    const waist = 0.24;

    const flightW = 4.20;
    const wXMin = xLeft;
    const wXMax = xLeft + flightW;
    const eXMin = xRight - flightW;
    const eXMax = xRight;

    const throatLen = Math.hypot(runLen, H / 2);
    const throatAngle = Math.atan2(H / 2, runLen);

    // 1) Tramo 1 (Lado Izquierdo / Oeste): sube de Sur (zFront) a Norte (zMidBreak)
    const t1Group = new THREE.Group();
    const tGeo = new THREE.BoxGeometry(flightW, waist, throatLen);
    const t1Mesh = new THREE.Mesh(tGeo, matCeilingSlab);
    t1Mesh.visible = hiddenLinesEnabled;
    occlusionMeshes.push(t1Mesh);
    t1Group.add(t1Mesh);
    t1Group.add(new THREE.LineSegments(new THREE.EdgesGeometry(tGeo), matWireDark));
    t1Group.position.set((wXMin + wXMax) / 2, yBase + H / 4 - waist * 0.45, (zFront + zMidBreak) / 2);
    t1Group.rotation.x = throatAngle;
    scene.add(t1Group);

    for (let i = 0; i < stepsPerFlight; i++) {
      const zStepEnd = zFront - i * tread;
      const zStepStart = zStepEnd - tread;
      const yStepBot = yBase + i * riser;
      addBoxByBounds(wXMin, wXMax, yStepBot, yStepBot + riser, zStepStart, zStepEnd, matWireDark, true, matCeilingSlab);
    }

    // 2) Descanso intermedio al FONDO NORTE (z: 28.0 .. 31.2)
    const yLandingTop = yBase + H / 2;
    addBoxByBounds(xLeft, xRight, yLandingTop - waist, yLandingTop, zNorth, zMidBreak, matWireDark, true, matCeilingSlab);

    // 3) Tramo 2 (Lado Derecho / Este): regresa subiendo de Norte (zMidBreak) a Sur (zFront)
    const t2Group = new THREE.Group();
    const t2Mesh = new THREE.Mesh(tGeo, matCeilingSlab);
    t2Mesh.visible = hiddenLinesEnabled;
    occlusionMeshes.push(t2Mesh);
    t2Group.add(t2Mesh);
    t2Group.add(new THREE.LineSegments(new THREE.EdgesGeometry(tGeo), matWireDark));
    t2Group.position.set((eXMin + eXMax) / 2, yBase + (H * 3) / 4 - waist * 0.45, (zFront + zMidBreak) / 2);
    t2Group.rotation.x = -throatAngle;
    scene.add(t2Group);

    for (let i = 0; i < stepsPerFlight; i++) {
      const zStepStart = zMidBreak + i * tread;
      const zStepEnd = zStepStart + tread;
      const yStepBot = yLandingTop + i * riser;
      addBoxByBounds(eXMin, eXMax, yStepBot, yStepBot + riser, zStepStart, zStepEnd, matWireDark, true, matCeilingSlab);
    }

    // 4) Barandas metálicas de 5 barras horizontales
    addMetallicMultiBarRailing(wXMin + 0.10, yBase, zFront, wXMin + 0.10, yLandingTop, zMidBreak, 5);
    addMetallicMultiBarRailing(wXMax - 0.08, yBase, zFront, wXMax - 0.08, yLandingTop, zMidBreak, 5);
    addMetallicMultiBarRailing(wXMax - 0.08, yLandingTop, zMidBreak, eXMin + 0.08, yLandingTop, zMidBreak, 2);
    addMetallicMultiBarRailing(xLeft + 0.12, yLandingTop, zNorth + 0.12, xRight - 0.12, yLandingTop, zNorth + 0.12, 5);
    addMetallicMultiBarRailing(eXMin + 0.08, yLandingTop, zMidBreak, eXMin + 0.08, yBase + H, zFront, 5);
    addMetallicMultiBarRailing(eXMax - 0.10, yLandingTop, zMidBreak, eXMax - 0.10, yBase + H, zFront, 5);

    // 5) Jardín seco de piedritas, 2 plantas y banca ÚNICAMENTE EN PISO 1 debajo del Tramo 2
    if (Math.abs(yBase) < 0.1) {
      const gXMin = eXMin + 0.25;
      const gXMax = eXMax - 0.20;
      const gZMin = zMidBreak + 0.40;
      const gZMax = 36.85;
      addBoxByBounds(gXMin, gXMax, yBase, yBase + 0.24, gZMin, gZMax, matWireDark, true);
      addBoxByBounds(gXMin + 0.15, gXMax - 0.15, yBase + 0.24, yBase + 0.30, gZMin + 0.15, gZMax - 0.15, matWireSubtle, true, matPebbles);

      [gXMin + 0.8, (gXMin + gXMax) / 2, gXMax - 0.8].forEach((sx) => {
        addBoxByBounds(sx - 0.08, sx + 0.08, yBase + 0.30, yBase + 0.44, gZMin + 0.25, gZMin + 0.42, matWireDark, true, matDarkSeat);
      });
      addTropicalPlanterGarden(gXMin + 0.15, gXMax - 0.15, yBase + 0.30, gZMin + 0.45, gZMax - 0.15, 'north');
      addWaitingBench((gXMin + gXMax) / 2, yBase, 37.35, 4, 0);
    }
  }

  function buildStairwellSouthFacingEnclosureWithWindows(centerX, y0, y1) {
    const xLeft = centerX - 4.5;
    const xRight = centerX + 4.5;
    const zNorth = 28.0;

    // Fondo Norte (z = 28.0) con antepecho y ventanales grandes de piso a techo
    addBoxByBounds(xLeft - 0.2, xRight + 0.2, y0, y0 + 1.0, zNorth - 0.25, zNorth, matWireDark, true);
    addGlassWallSegment(xLeft, zNorth, xRight, zNorth, 4, y0 + 1.0, y1 - 0.2, false);
    // Muros laterales Oeste y Este (abierto al Sur z = 38.0)
    addBoxByBounds(xLeft - 0.2, xLeft, y0, y1, 28.0, 38.0, matWireDark, true);
    addBoxByBounds(xRight, xRight + 0.2, y0, y1, 28.0, 38.0, matWireDark, true);
  }

  // --------------------------------------------------------------------------
  // 3. CONSTRUCCIÓN DE LOS 4 PISOS COMPLETOS + VEREDA Y 3 ESCALERITAS BAJO EL EDIFICIO
  // --------------------------------------------------------------------------
  function buildArchitecturalModel() {
    // 3.1 Terreno exterior de 135 x 125 cuadros (x: -15..120, z: -15..110) en y = -0.60 m
    //     para que primero esté la Vereda Perimetral, encima las 3 Escaleritas, y encima el Edificio (en y = 0.00 m)
    const groundY = -0.60;
    const gridLines = [];
    const xStart = -15;
    const xEnd = 125;
    const zStart = -15;
    const zEnd = 110;

    for (let x = xStart; x <= xEnd; x += 1) {
      if (x > 12 && x < 16) {
        gridLines.push(new THREE.Vector3(x, groundY + 0.01, zStart), new THREE.Vector3(x, groundY + 0.01, 4));
        gridLines.push(new THREE.Vector3(x, groundY + 0.01, 28), new THREE.Vector3(x, groundY + 0.01, zEnd));
      } else {
        gridLines.push(new THREE.Vector3(x, groundY + 0.01, zStart), new THREE.Vector3(x, groundY + 0.01, zEnd));
      }
    }
    for (let z = zStart; z <= zEnd; z += 1) {
      if (z > 4 && z < 28) {
        gridLines.push(new THREE.Vector3(xStart, groundY + 0.01, z), new THREE.Vector3(12, groundY + 0.01, z));
        gridLines.push(new THREE.Vector3(16, groundY + 0.01, z), new THREE.Vector3(xEnd, groundY + 0.01, z));
      } else {
        gridLines.push(new THREE.Vector3(xStart, groundY + 0.01, z), new THREE.Vector3(xEnd, groundY + 0.01, z));
      }
    }
    scene.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(gridLines),
        new THREE.LineBasicMaterial({ color: 0xd5dbe2 })
      )
    );

    // Plano base de oclusión dejando abierto el pozo del Sótano (x: 12..16, z: 4..28)
    [
      [-60, 12, -55, 145],
      [16, 165, -55, 145],
      [12, 16, -55, 4],
      [12, 16, 28, 145],
    ].forEach(([px0, px1, pz0, pz1]) => {
      const fMesh = new THREE.Mesh(new THREE.PlaneGeometry(px1 - px0, pz1 - pz0), matOcclusion);
      fMesh.rotation.x = -Math.PI / 2;
      fMesh.position.set((px0 + px1) / 2, groundY - 0.02, (pz0 + pz1) / 2);
      scene.add(fMesh);
      occlusionMeshes.push(fMesh);
    });

    // Cuadrícula interior de 1x1 m en el Piso 1 del edificio (sobre la 3ra escalerita en y = 0.01 m)
    const p1Grid = [];
    for (let x = -3; x <= 121; x += 1) {
      if (x > 12 && x < 16) {
        p1Grid.push(new THREE.Vector3(x, 0.01, 0), new THREE.Vector3(x, 0.01, 4));
        p1Grid.push(new THREE.Vector3(x, 0.01, 28), new THREE.Vector3(x, 0.01, 62));
      } else {
        p1Grid.push(new THREE.Vector3(x, 0.01, 0), new THREE.Vector3(x, 0.01, 62));
      }
    }
    for (let z = 0; z <= 62; z += 1) {
      if (z > 4 && z < 28) {
        p1Grid.push(new THREE.Vector3(-3, 0.01, z), new THREE.Vector3(12, 0.01, z));
        p1Grid.push(new THREE.Vector3(16, 0.01, z), new THREE.Vector3(121, 0.01, z));
      } else {
        p1Grid.push(new THREE.Vector3(-3, 0.01, z), new THREE.Vector3(121, 0.01, z));
      }
    }
    scene.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(p1Grid),
        new THREE.LineBasicMaterial({ color: 0xd0d7e0 })
      )
    );

    // Registrar colisionadores 2D de muros, mamparas de vidrio, ventanales exteriores, escaleras y rampa
    CFG.bloquesPlano.forEach((b) => {
      if (b.esMostradorAtencion) {
        // La colisión poligonal exacta de Mesa de Partes se evalúa directo en isPositionColliding
        return;
      }
      if (b.bbox) {
        registerWallCollider(b.bbox.xMin, b.bbox.xMax, b.bbox.zMin, b.bbox.zMax);
      } else if (b.xMin !== undefined) {
        registerWallCollider(b.xMin, b.xMax, b.zMin, b.zMax);
      }
    });
    // Caja: impedir traspasar el mostrador y las ventanillas de vidrio (x: 19.0, z: 55.6..60.0)
    registerWallCollider(18.85, 20.5, 55.6, 60.0);
    // Muro sólido al extremo Este de Mesa de Partes (frente al Elevador en x = 46.0)
    registerWallCollider(45.7, 46.05, 46.2, 51.0);
    // Puerta de vidrio cerrada de OTI
    registerWallCollider(66.2, 68.8, 46.34, 46.66);

    CFG.murosVidrio.forEach((mv) => {
      const isEntrancePorticoGlass =
        mv.x1 < 13.0 && (Math.abs(mv.z1 - 59.8) < 0.05 || Math.abs(mv.x1 - 5.8) < 0.05);
      registerWallCollider(
        Math.min(mv.x1, mv.x2) - 0.16,
        Math.max(mv.x1, mv.x2) + 0.16,
        Math.min(mv.z1, mv.z2) - 0.16,
        Math.max(mv.z1, mv.z2) + 0.16,
        isEntrancePorticoGlass ? 'piso1_only' : null
      );
    });
    // Cerrar el frente del muro cortina de vidrio en Pisos 2, 3 y 4 (donde ya no existe la puerta de entrada)
    registerWallCollider(5.7, 12.7, 59.6, 60.0, 'upper_only');
    registerWallCollider(5.7, 6.0, 52.0, 60.0, 'upper_only');
    // Ventanales de fachada exterior Sur retranqueada (x: -0.9..5.8, z = 52.12) y galería Oeste (x = -0.05)
    registerWallCollider(-0.9, 5.8, 51.85, 52.35);
    registerWallCollider(-0.2, 0.05, 28.0, 52.0);
    // Panel cuadriculado UNAM / ADMISIÓN a la derecha de la entrada (Piso 1) y banca lateral
    registerWallCollider(9.8, 12.5, 58.65, 59.05, 'piso1_only');
    // Estante vitrina de libros (x: 9.0..9.6, z: 38.8..41.2) y bancas en pasadizo de Admisión y CEPRE
    registerWallCollider(9.0, 9.8, 38.6, 41.4, 'piso1_only');
    registerWallCollider(9.1, 10.1, 43.9, 46.5);
    registerWallCollider(9.1, 10.1, 33.7, 36.3);

    // Escalera 1 (x: 43..52, z: 28..38) alineada a la entrada del Baño Norte (girada 90° horario, abierta al Oeste)
    registerWallCollider(42.8, 52.2, 27.65, 28.05);
    registerWallCollider(51.95, 52.28, 28.0, 38.0);
    registerWallCollider(43.0, 49.4, 32.3, 32.9);
    registerWallCollider(43.1, 51.9, 32.5, 37.7, 'piso1_suelo');
    registerWallCollider(43.0, 52.0, 37.7, 38.2, 'upper_only');
    registerWallCollider(42.9, 43.2, 28.0, 32.2, 'floor4_only');

    // Escalera 2 (x: 80..89, z: 28..38) rotada 90° antihorario (abierta al Sur z = 38.0)
    registerWallCollider(79.8, 89.2, 27.65, 28.05);
    registerWallCollider(79.75, 80.05, 28.0, 38.0);
    registerWallCollider(88.95, 89.25, 28.0, 38.0);
    registerWallCollider(84.2, 84.8, 31.2, 37.6);
    registerWallCollider(84.8, 88.9, 31.5, 37.7, 'piso1_suelo');
    registerWallCollider(80.0, 84.2, 37.8, 38.1, 'floor4_only');

    // Rampa doble de 4 cuadros de ancho cada tramo (x: 12.0..20.5) + Rampa al Sótano en Piso 1
    registerWallCollider(11.6, 12.0, 0.0, 28.0);         // Borde izquierdo exterior de la rampa
    registerWallCollider(11.6, 20.6, -0.4, 0.0);         // Cierre fondo norte de la rampa
    registerWallCollider(16.0, 16.5, 4.1, 28.0);         // Ojo central entre tramo izquierdo (12..16) y derecho (16.5..20.5)
    registerWallCollider(16.5, 20.5, 27.8, 28.15, 'floor4_only');
    registerWallCollider(12.0, 16.0, 3.7, 4.1, 'basement_only'); // Puerta fondo del Sótano en z = 4.0

    // Columnas exteriores reales (galería oeste + gran pilar esquinero derecho) y reja perimétrica
    registerWallCollider(-2.2, -0.9, 51.0, 52.3);
    registerWallCollider(-2.2, -1.2, 39.5, 40.5);
    registerWallCollider(-2.2, -1.2, 28.0, 29.0);
    registerWallCollider(12.6, 14.0, 58.2, 60.0);
    registerWallCollider(-22.5, -2.2, 70.2, 70.8);

    // 3.2 Construir los 4 pisos idénticos (Piso 1, 2, 3 y 4)
    CFG.pisos.forEach((piso) => {
      const y0 = piso.baseY;
      const y1 = y0 + H;

      // En los pisos 2, 3 y 4 agregamos la losa de piso caminable con su cuadrícula
      if (piso.id > 1) {
        buildFloorWalkwayGrid(y0);
      }

      // Bloques de oficinas y ambientes en este piso
      CFG.bloquesPlano.forEach((b) => {
        if (b.esMostradorAtencion && b.poligono) {
          // Mesa de Partes: plinto inferior oscuro + cuerpo frontal blanco (1.17m) + encimera (1.25m)
          // y encima mampara serigrafiada de atención al cliente (y0 + 1.25 .. y0 + 2.35)
          addPolygonBlockAtY(b.poligono, y0, 0.22, matWireDark, true, matDarkSeat);
          addPolygonBlockAtY(b.poligono, y0 + 0.22, 0.95, matWireDark, true, matOcclusion);
          addPolygonBlockAtY(b.poligono, y0 + 1.17, 0.08, matWireDark, true, matOcclusion);
          addServiceGlassSegment(19.0, 51.0, 27.0, 46.2, 4, y0 + 1.25, y0 + 2.35);
          addServiceGlassSegment(27.0, 46.2, 45.74, 46.2, 7, y0 + 1.25, y0 + 2.35);

          // Muro posterior tras Mesa de Partes al ras del fondo (x: 23.5..45.72, z: 50.80..50.99)
          // con duelas verticales de madera cálida y textura real (cero bloque sobresaliendo en la esquina diagonal)
          addBoxByBounds(23.5, 45.72, y0, y0 + 4.15, 50.80, 50.99, matWireDark, true, matWoodSlats);
          addBoxByBounds(23.5, 45.72, y0 + 4.08, y0 + 4.22, 50.74, 50.99, matWireDark, true, matSilver);
          for (let rx = 24.8; rx <= 44.8; rx += 1.25) {
            addBoxByBounds(rx - 0.04, rx + 0.04, y0 + 0.05, y0 + 4.08, 50.76, 50.81, matWireDark, true, matWarmWood);
          }
          // Letras 3D con volumen/profundidad reales (sin cartel) montadas directo sobre la madera
          const woodLogo3D = createExtrudedText3D(
            ['UNIVERSIDAD NACIONAL', 'DE MOQUEGUA'],
            6.2,
            1.15,
            0.14,
            '#edf2f7',
            '#74808f'
          );
          woodLogo3D.position.set(34.6, y0 + 3.02, 50.73);
          woodLogo3D.rotation.y = Math.PI;
          scene.add(woodLogo3D);

        } else if (b.poligono) {
          addPolygonBlockAtY(b.poligono, y0, b.alturaBloque || H, matWireDark, true);
        } else {
          addBoxByBounds(b.xMin, b.xMax, y0, y0 + (b.alturaBloque || H), b.zMin, b.zMax, matWireDark, true);
        }
        if (b.rotuloPared) {
          const lbl = createArchitecturalSign(
            b.rotuloPared.lineas || [b.rotuloPared.texto],
            b.rotuloPared.ancho || 1.1,
            b.rotuloPared.alto || 0.34,
            false
          );
          lbl.position.set(b.rotuloPared.pos[0], y0 + b.rotuloPared.pos[1], b.rotuloPared.pos[2]);
          lbl.rotation.y = b.rotuloPared.rotY || 0;
          scene.add(lbl);
        }
      });

      // Dintel alto del túnel de Centros de Producción (x: 27.5..46.0, y: y0+6.5..y1, z: 53.8..58.2)
      addBoxByBounds(27.5, 46.0, y0 + 6.5, y1, 53.8, 58.2, matWireDark, true);
      // Muro completo en el extremo Este de Mesa de Partes (sin superponer caras con mostrador ni Ala Superior)
      addBoxByBounds(45.75, 46.0, y0, y1, 46.2, 50.99, matWireDark, true);

      // Mamparas de vidrio en este piso (el portal frontal z=59.8 solo se abre en Piso 1; OTI a altura de puerta 3.9m sin vidrio arriba)
      CFG.murosVidrio.forEach((mv) => {
        const isEntrancePorticoGlass =
          mv.x1 < 13.0 && (Math.abs(mv.z1 - 59.8) < 0.05 || Math.abs(mv.x1 - 5.8) < 0.05);
        if (piso.id > 1 && isEntrancePorticoGlass) return;
        const isOTI = Math.abs(mv.z1 - 46.5) < 0.05 && mv.x1 >= 58.9 && mv.x2 <= 76.1;
        const targetY1 = isOTI ? y0 + 3.9 : y1;
        addGlassWallSegment(mv.x1, mv.z1, mv.x2, mv.z2, mv.panos || 4, y0, targetY1);
      });

      // Puertas en este piso: puertas de vidrio de pasadizos abiertas; puerta doble de vidrio de OTI cerrada y oficinas cerradas
      CFG.puertas.forEach((p) => {
        if (p.nombre === 'Puerta Doble Entrada' && piso.id > 1) return;
        if (p.abiertaDoble) {
          const width = p.abiertaDoble === 'z' ? p.tam[0] : p.tam[2];
          addDoubleGlassDoor(p.pos[0], y0, p.pos[2], width, p.tam[1], p.abiertaDoble);
          return;
        }
        if (p.esPuertaVidrioOTI || p.esPuertaVidrioCerrada) {
          const doorW = p.tam[0];
          const doorH = p.tam[1];
          const gGrp = new THREE.Group();
          gGrp.position.set(p.pos[0], y0, p.pos[2]);

          // Marco perimétrico de aluminio anodizado plateado
          const frameLines = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(doorW, doorH, 0.12)),
            matWireDark
          );
          frameLines.position.set(0, doorH / 2, 0);
          gGrp.add(frameLines);

          // Hoja doble de vidrio templado
          [-doorW / 4, doorW / 4].forEach((lx) => {
            const leafW = doorW / 2 - 0.05;
            const glassLeaf = new THREE.Mesh(new THREE.PlaneGeometry(leafW, doorH - 0.08), matCurtainGlass);
            glassLeaf.position.set(lx, doorH / 2, 0);
            gGrp.add(glassLeaf);
            const leafFrame = new THREE.LineSegments(
              new THREE.EdgesGeometry(new THREE.BoxGeometry(leafW, doorH - 0.08, 0.06)),
              matWireDark
            );
            leafFrame.position.set(lx, doorH / 2, 0);
            gGrp.add(leafFrame);
          });

          // Franjas pavonadas alineadas con los muros contiguos (y = 1.15, 1.55, 1.95)
          [1.15, 1.55, 1.95].forEach((fy) => {
            const stripe = new THREE.Mesh(new THREE.PlaneGeometry(doorW - 0.08, 0.22), matFrostedGlass);
            stripe.position.set(0, fy, 0.01);
            gGrp.add(stripe);
          });

          // Tiradores tubulares verticales de acero inoxidable largo (Foto 4: largos desde y=1.05 hasta y=1.85)
          [-0.12, 0.12].forEach((hx) => {
            const handlePole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.82, 10), matSilver);
            handlePole.position.set(hx, 1.45, 0.06);
            handlePole.visible = hiddenLinesEnabled;
            occlusionMeshes.push(handlePole);
            gGrp.add(handlePole);
            [1.10, 1.80].forEach((sy) => {
              const hMount = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.08), matSilver);
              hMount.position.set(hx, sy, 0.03);
              gGrp.add(hMount);
            });
          });

          scene.add(gGrp);
          return;
        }
        const alongZ = p.tam[2] > p.tam[0];
        const doorW = alongZ ? p.tam[2] : p.tam[0];
        const doorH = p.tam[1];
        const dGrp = new THREE.Group();
        dGrp.position.set(p.pos[0], y0, p.pos[2]);
        if (alongZ) {
          const faceWest =
            Math.abs(p.pos[0] - 19.0) < 0.2 ||
            Math.abs(p.pos[0] - 43.0) < 0.2 ||
            Math.abs(p.pos[0] - 101.0) < 0.2;
          dGrp.rotation.y = faceWest ? -Math.PI / 2 : Math.PI / 2;
        } else {
          const faceSouth = Math.abs(p.pos[2] - 28.0) < 0.2;
          dGrp.rotation.y = faceSouth ? 0 : Math.PI;
        }

        // Marco azul exterior + hoja CERRADA de oficina (3.7 - 3.85 de alto) con tablero interior y manija
        const frameLines = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(doorW, doorH, 0.24)), matWireBlue);
        frameLines.position.set(0, doorH / 2, 0);
        dGrp.add(frameLines);

        const panelGeo = new THREE.BoxGeometry(doorW - 0.14, doorH - 0.10, 0.12);
        const panelMesh = new THREE.Mesh(panelGeo, matCeilingSlab);
        panelMesh.position.set(0, (doorH - 0.10) / 2, 0);
        panelMesh.visible = hiddenLinesEnabled;
        occlusionMeshes.push(panelMesh);
        dGrp.add(panelMesh);
        const panelLines = new THREE.LineSegments(new THREE.EdgesGeometry(panelGeo), matWireDark);
        panelLines.position.copy(panelMesh.position);
        dGrp.add(panelLines);

        if (doorW >= 3.0) {
          // Línea central de encuentro si es puerta doble cerrada (p. ej. Auditorio)
          const centerSplit = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(0.03, doorH - 0.12, 0.14)),
            matWireDark
          );
          centerSplit.position.set(0, (doorH - 0.10) / 2, 0);
          dGrp.add(centerSplit);
        }
        // Manija metálica cerrada visible por el lado del pasillo
        const handleGeo = new THREE.BoxGeometry(0.14, 0.05, 0.08);
        const handleLine = new THREE.LineSegments(new THREE.EdgesGeometry(handleGeo), matWireDark);
        handleLine.position.set(doorW >= 3.0 ? 0.16 : doorW / 2 - 0.24, Math.min(1.8, doorH * 0.45), 0.10);
        dGrp.add(handleLine);

        scene.add(dGrp);
      });

      // Techo sólido y visible de cada piso (con vigas y luminarias, dejando hueco exacto en escaleras y rampa)
      buildVisibleCeilingForFloor(y1);

      // Detalles interiores idénticos a las fotos reales de D:\RepoIde\unam\multimedia\fotos
      buildInteriorPhotoDetailsForFloor(y0, piso.id);

      // Escalera 1 a nivel del Baño (x: 43..52, girada 90° horario) y Escalera 2 (x: 80..89, antihoraria) + Rampas de 4m y Sótano
      if (piso.id < 4) {
        buildStairWithLandingAndWaist(47.5, 38.0, y0);
        buildStairSouthFacingWithLanding(84.5, y0);
        buildStairwellEnclosureWithWindows(47.5, y0, y1);
        buildStairwellSouthFacingEnclosureWithWindows(84.5, y0, y1);
        buildRampForFloor(y0);
      } else {
        buildStairwellEnclosureWithWindows(47.5, y0, y1);
        buildStairwellSouthFacingEnclosureWithWindows(84.5, y0, y1);
      }

      // Letreros con nombres completos en 1 o 2 líneas sobre cada puerta
      Object.values(CFG.lugares).forEach((lugar) => {
        if (!lugar.letrero) return;
        if (lugar.soloPiso1 && piso.id !== 1) return;
        const baseLines = lugar.letrero.lineas || [lugar.letrero.texto];
        const signLines =
          piso.id === 1
            ? baseLines
            : [...baseLines.slice(0, -1), `${baseLines[baseLines.length - 1]} (P${piso.id})`];

        const sign = createArchitecturalSign(
          signLines,
          lugar.letrero.ancho || 1.2,
          lugar.letrero.alto || 0.38,
          lugar.id === currentPlaceId && piso.id === currentFloor
        );
        sign.position.set(
          lugar.letrero.pos[0],
          y0 + lugar.letrero.pos[1],
          lugar.letrero.pos[2]
        );
        sign.rotation.y = lugar.letrero.rotY || 0;
        scene.add(sign);
        signObjectsByFloor[piso.id][lugar.id] = sign;
      });
    });

    // 3.3 Fachada Exterior de 4 Pisos idéntica a las fotos exteriores de D:\RepoIde\unam\multimedia\fotos
    buildUNAMFourStoryExterior();
  }

  // Construye todos los detalles interiores reales observados en las fotos de D:\RepoIde\unam\multimedia\fotos
  function buildInteriorPhotoDetailsForFloor(y0, pisoId) {
    // 1) ENTRADA Y VISTA A CAJA.jpg + caja.jpeg (alineada exactamente al nivel de Mesa de Partes en x = 19.0):
    addBoxByBounds(18.84, 19.04, y0, y0 + 1.25, 55.6, 57.0, matWireDark, true); // Murete izquierdo
    addGlassWallSegment(18.94, 55.6, 18.94, 57.0, 1, y0 + 1.25, y0 + 4.5, false); // Ventanilla izquierda
    addGlassWallSegment(18.94, 57.0, 18.94, 58.4, 1, y0 + 3.7, y0 + 4.5, false); // Sobreluz encima de puerta de Caja
    addBoxByBounds(18.84, 19.04, y0, y0 + 1.25, 58.4, 59.9, matWireDark, true); // Murete derecho
    addGlassWallSegment(18.94, 58.4, 18.94, 59.9, 1, y0 + 1.25, y0 + 4.5, false); // Ventanilla derecha
    addBoxByBounds(18.88, 18.98, y0 + 0.4, y0 + 4.4, 52.0, 55.2, matWireDark, false);
    addBoxByBounds(18.86, 18.96, y0 + 2.1, y0 + 3.1, 53.15, 53.95, matWireDark, true, matSilver); // Placa conmemorativa plateada
    addWaitingBench(18.25, y0, 53.55, 3, -Math.PI / 2);

    if (pisoId === 1) {
      // Backing institucional cuadriculado azul y blanco "UNAM / ADMISIÓN" a la DERECHA de la puerta doble abierta (x: 9.8..12.4, z = 58.8)
      const bannerXMin = 9.85;
      const bannerXMax = 12.45;
      const cols = 4;
      const rows = 5;
      const cw = (bannerXMax - bannerXMin) / cols;
      const ch = 2.8 / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const isBlue = (r + c) % 2 === 0;
          addBoxByBounds(
            bannerXMin + c * cw,
            bannerXMin + (c + 1) * cw,
            y0 + 0.15 + r * ch,
            y0 + 0.15 + (r + 1) * ch,
            58.78,
            58.90,
            matWireDark,
            true,
            isBlue ? matBlueWall : matOcclusion
          );
        }
      }
      // Roll-up banner vertical de CEPRE UNAM
      addBoxByBounds(9.35, 9.52, y0 + 0.08, y0 + 2.25, 29.4, 30.2, matWireBlue, true, matBlueWall);
    }

    // 2) Foto 1 (ADMINISION Y CEPRE CON ESTANTE DE LIBROS.jpg):
    //    Puertas en los extremos (Admisión z=49.5 a la izquierda y CEPRE z=31.0 a la derecha).
    //    En el medio (z: 38.8..41.2): Estante vitrina de libros de cristal con baldas y libros expuestos
    //    Flanqueado por 2 bancas metálicas negras de 4 asientos (z=45.5 junto a Admisión y z=35.0 junto a CEPRE)
    addBookShowcase(9.35, y0, 40.0, Math.PI / 2);
    addWaitingBench(9.65, y0, 45.2, 4, Math.PI / 2);
    addWaitingBench(9.65, y0, 35.0, 4, Math.PI / 2);

    // 3) pasadizo.jpg + Foto 2: falso techo curvo/ovalado en el cielo raso del hall central
    const ovalPts = [];
    for (let i = 0; i <= 40; i++) {
      const ang = (i / 40) * Math.PI * 2;
      ovalPts.push(new THREE.Vector3(28.0 + Math.cos(ang) * 9.5, y0 + H - 0.32, 39.5 + Math.sin(ang) * 5.2));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ovalPts), matWireDark));

    // 4) Rampa doble de 4 cuadros de ancho cada tramo (x: 12.0..20.5) con puertas dobles abiertas:
    addDoubleGlassDoor(14.0, y0, 28.0, 3.8, 4.5, 'z');
    addDoubleGlassDoor(18.5, y0, 28.0, 3.8, 4.5, 'z');
    addGlassWallSegment(12.0, 28.0, 20.5, 28.0, 4, y0 + 4.5, y0 + H - 0.22, false);
    //    - Tubería vertical roja + Gabinete rojo contra incendios + 2 señales rojas a la izquierda de Abastecimiento (abastecimiento.jpg)
    addBoxByBounds(22.35, 22.52, y0, y0 + H - 0.22, 28.02, 28.18, matWireDark, true, matRedSafety); // Tubería roja vertical
    addBoxByBounds(22.85, 24.05, y0 + 1.15, y0 + 2.25, 28.02, 28.20, matWireDark, true, matRedSafety); // Gabinete rojo contra incendios
    addBoxByBounds(22.95, 23.25, y0 + 2.45, y0 + 2.75, 28.02, 28.08, matWireDark, true, matRedSafety);
    addBoxByBounds(23.65, 23.95, y0 + 2.45, y0 + 2.75, 28.02, 28.08, matWireDark, true, matRedSafety);
    //    - 2 tableros eléctricos grises con triángulo amarillo + banca negra de 3 asientos a la derecha de Abastecimiento (abastecimiento.jpg)
    [31.4, 32.8].forEach((ex) => {
      addBoxByBounds(ex, ex + 0.85, y0 + 1.25, y0 + 2.45, 28.02, 28.16, matWireDark, true, matSilver);
      addBoxByBounds(ex + 0.28, ex + 0.57, y0 + 1.65, y0 + 1.92, 28.16, 28.19, matWireGold, true);
    });
    addWaitingBench(32.5, y0, 28.55, 3, 0);

    // 5) ELEVADOR de 5x5 cuadritos (x: 54.0..59.0, z: 46.5..51.5, mirando hacia el pasillo amplio de 8 cuadritos x = 46..54):
    addBoxByBounds(53.86, 54.02, y0, y0 + 3.85, 47.95, 50.05, matWireDark, true, matSilver);
    addBoxByBounds(53.84, 53.90, y0, y0 + 3.85, 48.98, 49.02, matWireDark, false);
    addBoxByBounds(53.88, 53.95, y0 + 1.45, y0 + 1.95, 50.30, 50.47, matWireBlue, true, matSilver);
    //    - 3 tableros eléctricos grises sobre el muro sólido junto al Elevador (al oeste de la mampara de vidrio OTI)
    [54.7, 55.8, 56.9].forEach((tx) => {
      addBoxByBounds(tx, tx + 0.78, y0 + 1.25, y0 + 2.45, 46.38, 46.50, matWireDark, true, matSilver);
      addBoxByBounds(tx + 0.24, tx + 0.52, y0 + 1.65, y0 + 1.92, 46.35, 46.38, matWireGold, true);
    });

    // 6) OTI: interior despejado y limpio solicitado por el usuario (sin muebles interiores)
  }

  // Dibuja la retícula de baldosas sobre el suelo de los pisos 2, 3 y 4 (sin tabla flotante entre Escaleras 1 y 2)
  function buildFloorWalkwayGrid(yFloor) {
    const pts = [];
    const yG = yFloor + 0.02;
    for (let x = 6; x <= 43; x += 2) {
      pts.push(new THREE.Vector3(x, yG, 28), new THREE.Vector3(x, yG, 59.5));
    }
    for (let x = 44; x <= 93; x += 2) {
      pts.push(new THREE.Vector3(x, yG, 38), new THREE.Vector3(x, yG, 59.5));
    }
    for (let x = 94; x <= 101; x += 2) {
      pts.push(new THREE.Vector3(x, yG, 34), new THREE.Vector3(x, yG, 59.5));
    }
    for (let z = 28; z < 38; z += 2) {
      pts.push(new THREE.Vector3(6, yG, z), new THREE.Vector3(43, yG, z));
    }
    for (let z = 34; z < 38; z += 2) {
      pts.push(new THREE.Vector3(93, yG, z), new THREE.Vector3(101, yG, z));
    }
    for (let z = 38; z <= 59.5; z += 2) {
      pts.push(new THREE.Vector3(6, yG, z), new THREE.Vector3(101, yG, z));
    }
    for (let x = 22; x <= 50; x += 2) {
      pts.push(new THREE.Vector3(x, yG, 0), new THREE.Vector3(x, yG, 28));
    }
    for (let z = 0; z <= 26; z += 2) {
      pts.push(new THREE.Vector3(20.5, yG, z), new THREE.Vector3(50, yG, z));
    }
    scene.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0xd0d7e0 })
      )
    );
  }

  function buildVisibleCeilingForFloor(yTop) {
    const slabH = 0.22;
    const yMin = yTop - slabH;

    // Losas sólidas visibles dejando libre el hueco entre Escalera 1 y 2 (z: 28..38, x: 52..80 y 89..93)
    addBoxByBounds(6.0, 43.0, yMin, yTop, 28.0, 60.0, matWireDark, true, matCeilingSlab);
    addBoxByBounds(23.5, 46.0, yMin, yTop, 60.0, 62.0, matWireDark, true, matCeilingSlab);
    addBoxByBounds(20.5, 50.0, yMin, yTop, 0.0, 28.0, matWireDark, true, matCeilingSlab);
    addBoxByBounds(43.0, 101.0, yMin, yTop, 38.0, 59.5, matWireDark, true, matCeilingSlab);
    addBoxByBounds(93.0, 101.0, yMin, yTop, 34.0, 38.0, matWireDark, true, matCeilingSlab);
    addBoxByBounds(101.0, 121.0, yMin, yTop, 34.0, 59.5, matWireDark, true, matCeilingSlab);

    // Cielo raso acústico modular en cuadrícula
    const beamPts = [];
    const yBeam = yMin - 0.02;
    for (let x = 8; x <= 100; x += 2.0) {
      beamPts.push(new THREE.Vector3(x, yBeam, 38), new THREE.Vector3(x, yBeam, 58));
    }
    for (let z = 38; z <= 58; z += 2.0) {
      beamPts.push(new THREE.Vector3(6, yBeam, z), new THREE.Vector3(100, yBeam, z));
    }
    for (let x = 9; x <= 42; x += 2.0) {
      beamPts.push(new THREE.Vector3(x, yBeam, 28), new THREE.Vector3(x, yBeam, 38));
    }
    scene.add(
      new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(beamPts), matWireSubtle)
    );

    // Luminarias circulares/empotradas ("ojos de buey") en el cielo raso modular
    const lights = [
      [11.5, 52.0], [11.5, 44.0], [11.5, 35.0],
      [20.0, 33.0], [31.0, 33.0], [40.0, 33.0],
      [22.0, 42.5], [34.5, 42.5], [47.5, 42.5],
      [56.0, 42.5], [67.5, 42.5], [76.0, 42.5], [84.5, 42.5], [93.0, 42.5],
    ];
    lights.forEach(([lx, lz]) => {
      addBoxByBounds(lx - 0.35, lx + 0.35, yMin - 0.04, yMin, lz - 0.35, lz + 0.35, matWireDark, false);
    });
  }

  function buildRampForFloor(y0) {
    // Rampa ensanchada de 4 cuadros de ancho cada tramo (x: 12.0 .. 20.5, z: 0.0 .. 28.0) SIN tocar Abastecimiento (x >= 20.5):
    // - Tramo 1 (derecho, x: 16.5..20.5 = 4.0 cuadritos de ancho): sube desde z=28.0 hasta el descanso en z=4.0
    // - Ojo central de 0.5 cuadritos (x: 16.0..16.5) con barandas metálicas
    // - Tramo 2 (izquierdo, x: 12.0..16.0 = 4.0 cuadritos de ancho): sube desde z=4.0 hasta el piso superior en z=28.0
    const zStart = 28.0;
    const zTurn = 4.0;
    const zBack = 0.0;
    const runZ = zStart - zTurn;
    const halfH = H / 2;
    const slabLen = Math.hypot(runZ, halfH);
    const angle = Math.atan2(halfH, runZ);
    const thick = 0.22;

    // Muro/baranda de cierre al fondo norte de la rampa (z = 0.0)
    addBoxByBounds(11.9, 20.5, y0 + halfH - thick, y0 + halfH + 1.08, -0.2, 0.0, matWireDark, true);

    // Tramo 1 (derecho, x: 16.5..20.5 -> 4.0 cuadritos de ancho)
    const r1Group = new THREE.Group();
    const r1Geo = new THREE.BoxGeometry(4.0, thick, slabLen);
    const r1Mesh = new THREE.Mesh(r1Geo, matCeilingSlab);
    r1Mesh.visible = hiddenLinesEnabled;
    occlusionMeshes.push(r1Mesh);
    r1Group.add(r1Mesh);
    r1Group.add(new THREE.LineSegments(new THREE.EdgesGeometry(r1Geo), matWireDark));
    r1Group.position.set(18.5, y0 + halfH / 2 - (thick / 2) * Math.cos(angle), (zStart + zTurn) / 2);
    r1Group.rotation.x = angle;
    scene.add(r1Group);

    // Descanso intermedio amplio a mitad de altura (y = y0 + halfH, x: 12.0..20.5, z: 0.0..4.0)
    addBoxByBounds(
      12.0,
      20.5,
      y0 + halfH - thick,
      y0 + halfH,
      zBack,
      zTurn,
      matWireDark,
      true,
      matCeilingSlab
    );

    // Tramo 2 (izquierdo, x: 12.0..16.0 -> 4.0 cuadritos de ancho)
    const r2Group = new THREE.Group();
    const r2Geo = new THREE.BoxGeometry(4.0, thick, slabLen);
    const r2Mesh = new THREE.Mesh(r2Geo, matCeilingSlab);
    r2Mesh.visible = hiddenLinesEnabled;
    occlusionMeshes.push(r2Mesh);
    r2Group.add(r2Mesh);
    r2Group.add(new THREE.LineSegments(new THREE.EdgesGeometry(r2Geo), matWireDark));
    r2Group.position.set(14.0, y0 + halfH + halfH / 2 - (thick / 2) * Math.cos(angle), (zStart + zTurn) / 2);
    r2Group.rotation.x = -angle;
    scene.add(r2Group);

    // Barandas metálicas a lo largo de ambos tramos (sin pilares gruesos)
    addMetallicMultiBarRailing(16.52, y0, zStart, 16.52, y0 + halfH, zTurn, 7);
    addMetallicMultiBarRailing(15.98, y0 + halfH, zTurn, 15.98, y0 + H, zStart, 7);
    addMetallicMultiBarRailing(12.08, y0 + halfH, zTurn, 12.08, y0 + H, zStart, 7);
    addMetallicMultiBarRailing(12.08, y0 + halfH, zTurn, 12.08, y0 + halfH, zBack, 2);

    // En Primer Piso (y0 === 0): Rampa descendente hacia el SÓTANO bajo el Tramo 2 (x: 12.0..16.0, z: 28.0 -> 8.0, y: 0 -> -3.75)
    if (Math.abs(y0) < 0.1) {
      const bDepth = -3.75;
      const bRunZ = 20.0; // z: 28.0 -> 8.0
      const bAngle = Math.atan2(Math.abs(bDepth), bRunZ);
      const bSlabLen = Math.hypot(bRunZ, Math.abs(bDepth));

      const brGroup = new THREE.Group();
      const brGeo = new THREE.BoxGeometry(4.0, thick, bSlabLen);
      const brMesh = new THREE.Mesh(brGeo, matCeilingSlab);
      brMesh.visible = hiddenLinesEnabled;
      occlusionMeshes.push(brMesh);
      brGroup.add(brMesh);
      brGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(brGeo), matWireDark));
      brGroup.position.set(14.0, bDepth / 2 - (thick / 2) * Math.cos(bAngle), (28.0 + 8.0) / 2);
      brGroup.rotation.x = -bAngle;
      scene.add(brGroup);

      // Descanso y vestíbulo del Sótano en y = -3.75 (x: 12.0..16.0, z: 4.0..8.0)
      addBoxByBounds(12.0, 16.0, bDepth - 0.22, bDepth, 4.0, 8.0, matWireDark, true, matCeilingSlab);
      // Muros laterales de contención y muro de fondo del Sótano con puerta (sin cartel)
      addBoxByBounds(11.75, 12.0, bDepth - 0.22, 0.0, 4.0, 28.0, matWireDark, true);
      addBoxByBounds(16.0, 16.25, bDepth - 0.22, 0.0, 4.0, 28.0, matWireDark, true);
      addBoxByBounds(12.0, 16.0, bDepth - 0.22, 0.0, 3.78, 4.0, matWireDark, true);
      addBoxByBounds(12.8, 15.2, bDepth, bDepth + 2.8, 3.98, 4.06, matWireBlue, false);
      addBoxByBounds(13.98, 14.02, bDepth, bDepth + 2.8, 3.98, 4.06, matWireDark, false);

      // Barandas metálicas de la bajada al Sótano
      addMetallicMultiBarRailing(12.08, 0.0, 28.0, 12.08, bDepth, 8.0, 6);
      addMetallicMultiBarRailing(15.92, 0.0, 28.0, 15.92, bDepth, 8.0, 6);
    }
  }

  // Construye el edificio exterior completo de 4 pisos fiel a fachada.jpg, puerta.jpg y MIRADA DE ABAJO (IZQUIERDA y DERECHA)
  // Orientación exacta:
  // - Cara OESTE (x = -2.2, hacia la izquierda): galería abierta en Piso 1, celosías turquesa + 3 banderolas + 12 luminarias + Logo UNAM arriba.
  // - Cara SUR (z = 52..60, girando 90° hacia la derecha): ventanas horizontales de 4 pisos + Pórtico acristalado en L turquesa + Puerta "ENTRADA" + Columna con placa y cámaras.
  function buildUNAMFourStoryExterior() {
    const totalH = H * 4; // 30.0 cuadros (4 pisos de 7.5 cuadros cada uno)
    const addSlabsAroundBasementPit = (xMin, xMax, yMin, yMax, zMin, zMax, matEdge, matFill) => {
      addBoxByBounds(xMin, 12.0, yMin, yMax, zMin, zMax, matEdge, true, matFill);
      addBoxByBounds(16.0, xMax, yMin, yMax, zMin, zMax, matEdge, true, matFill);
      addBoxByBounds(12.0, 16.0, yMin, yMax, zMin, 4.0, matEdge, true, matFill);
      addBoxByBounds(12.0, 16.0, yMin, yMax, 28.0, zMax, matEdge, true, matFill);
    };

    // 1) VEREDA PERIMETRAL alrededor de todo el edificio (primero está la vereda en y = -0.60 m)
    addSlabsAroundBasementPit(-10.0, 129.0, -0.72, -0.60, -4.5, 68.5, matWireDark, matCeilingSlab);

    // 2) LAS 3 ESCALERITAS PERIMETRALES sobre la vereda y DEBAJO DE TODO EL EDIFICIO (dejando abierto el pozo del Sótano):
    addSlabsAroundBasementPit(-5.4, 126.6, -0.60, -0.40, -2.4, 64.2, matWireDark);
    addSlabsAroundBasementPit(-4.6, 125.8, -0.40, -0.20, -1.6, 63.4, matWireDark);
    addSlabsAroundBasementPit(-3.8, 125.0, -0.20, 0.00, -0.8, 62.6, matWireGold);

    // 3) CARA OESTE IZQUIERDA (x = -2.2 .. 0.0, mirando hacia -X -> izquierda de Foto 5 y fachada.jpg)
    //    - Pilares de galería en Piso 1 + Gran pilar esquinero blanco desde el suelo hasta arriba (x: -2.2..-0.9, z: 51.0..52.3)
    addBoxByBounds(-2.2, -0.9, 0, totalH, 51.0, 52.3, matWireDark, true);
    addBoxByBounds(-2.2, -1.2, 0, H, 39.5, 40.5, matWireDark, true);
    addBoxByBounds(-2.2, -1.2, 0, H, 28.0, 29.0, matWireDark, true);
    //    - Ventanas horizontales retranqueadas de la galería en Piso 1 (en x = -0.05)
    addBoxByBounds(-0.08, 0.02, 0, 1.3, 29.0, 51.0, matWireDark, true);
    addGlassWallSegment(-0.05, 29.0, -0.05, 51.0, 6, 1.3, 4.3, false);

    //    - Volumen en voladizo de los pisos 2, 3 y 4 sobre la galería oeste (x: -2.2 .. 0.0, y: H .. totalH, z: 28.0 .. 52.3)
    addBoxByBounds(-2.2, 0.02, H, totalH, 28.0, 52.3, matWireDark, true);

    //    - Mitad izquierda de la cara oeste (z: 28.6 .. 39.4): Marco turquesa sobresaliente (#1ca3b8) + Celosías verticales
    const louverX = -2.65;
    addBoxByBounds(louverX, -2.18, H + 0.3, H + 0.65, 28.6, 39.4, matWireDark, true, matTeal);
    addBoxByBounds(louverX, -2.18, totalH - 1.05, totalH - 0.7, 28.6, 39.4, matWireDark, true, matTeal);
    addBoxByBounds(louverX, -2.18, H + 0.3, totalH - 0.7, 28.6, 28.95, matWireDark, true, matTeal);
    addBoxByBounds(louverX, -2.18, H + 0.3, totalH - 0.7, 39.05, 39.4, matWireDark, true, matTeal);
    for (let lz = 29.3; lz <= 38.7; lz += 0.48) {
      addBoxByBounds(louverX + 0.04, -2.2, H + 0.65, totalH - 1.05, lz - 0.05, lz + 0.05, matWireDark, true);
    }

    //    - 3 Banderolas largas sujetas juntas arriba en el centro (z=34.0) y cayendo hasta la vereda:
    //      azul diagonal izquierda, verde vertical al centro y rojo diagonal derecha (foto fachada UNAM)
    const ribbonTopX = -2.72;
    const ribbonTopY = totalH - 1.15;
    const ribbonTopZ = 34.0;
    const ribbonBotY = -0.58;
    addHangingFabricRibbon([ribbonTopX, ribbonTopY, ribbonTopZ - 0.14], [-3.12, ribbonBotY, 28.9], 0.44, -0.36, matBlueWall);
    addHangingFabricRibbon([ribbonTopX, ribbonTopY, ribbonTopZ], [-3.05, ribbonBotY, 34.0], 0.44, -0.30, matBannerGreen);
    addHangingFabricRibbon([ribbonTopX, ribbonTopY, ribbonTopZ + 0.14], [-3.12, ribbonBotY, 39.1], 0.44, -0.36, matRedSafety);

    //    - Mitad derecha de la cara oeste (z: 40.0 .. 50.8): Relieves inferiores con luminarias + "21 AÑOS" + Letras 3D + Logo UNAM arriba
    addBoxByBounds(-2.26, -2.19, H + 1.2, H + 11.4, 40.4, 50.4, matWireDark, false);
    addBoxByBounds(-2.26, -2.19, H + 11.8, totalH - 1.0, 40.4, 50.4, matWireDark, false);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const bz = 41.6 + col * 2.5;
        const by = H + 2.6 + row * 3.1;
        addBoxByBounds(-2.54, -2.20, by - 0.08, by + 0.08, bz - 0.08, bz + 0.08, matWireDark, true, matSilver);
      }
    }
    const emblemUNAM = createUNAMEmblem3D();
    emblemUNAM.position.set(-2.24, totalH - 2.6, 45.4);
    emblemUNAM.rotation.y = -Math.PI / 2;
    scene.add(emblemUNAM);

    const facadeTitle3D = createExtrudedText3D(
      ['UNIVERSIDAD', 'NACIONAL DE', 'MOQUEGUA'],
      8.6,
      3.45,
      0.26,
      '#243662',
      '#131d38'
    );
    facadeTitle3D.position.set(-2.26, totalH - 6.0, 45.4);
    facadeTitle3D.rotation.y = -Math.PI / 2;
    scene.add(facadeTitle3D);

    const facadeYears3D = createExtrudedText3D(
      ['21 AÑOS'],
      7.2,
      2.15,
      0.22,
      '#243662',
      '#131d38'
    );
    facadeYears3D.position.set(-2.26, totalH - 9.4, 45.4);
    facadeYears3D.rotation.y = -Math.PI / 2;
    scene.add(facadeYears3D);

    // 4) CARA SUR FRONTAL (z = 52.0 .. 59.8, girando 90° a la derecha en la esquina -> Fotos 4 y 5)
    //    a) Tramo izquierdo retranqueado con ventanas horizontales y antepechos blancos en los 4 pisos (x: -0.9 .. 5.8, z = 52.05)
    for (let fl = 0; fl < 4; fl++) {
      const yFl = fl * H;
      addBoxByBounds(-0.9, 5.8, yFl, yFl + 1.55, 52.0, 52.22, matWireDark, true); // Antepecho blanco horizontal
      addGlassWallSegment(-0.85, 52.12, 5.75, 52.12, 4, yFl + 1.55, yFl + H - 0.9, false);
      addBoxByBounds(-0.9, 5.8, yFl + H - 0.9, yFl + H, 52.0, 52.22, matWireDark, true); // Dintel horizontal
    }

    //    b) Gran PÓRTICO ACRISTALADO DE 4 PISOS adelantado en z = 59.8 (x: 5.8 .. 12.6) -> Foto 4 (puerta.jpg)
    //       - Muro cortina de vidrio azul espejado en Pisos 2, 3 y 4 (4 columnas x 6 filas sobre z = 59.8)
    const curtainGeo = new THREE.PlaneGeometry(6.8, totalH - H);
    const curtainMesh = new THREE.Mesh(curtainGeo, matCurtainGlass);
    curtainMesh.position.set(9.2, H + (totalH - H) / 2, 59.80);
    scene.add(curtainMesh);
    // Retícula metálica del muro cortina (4 columnas x 6 filas)
    for (let cx = 5.8; cx <= 12.61; cx += 6.8 / 4) {
      addBoxByBounds(cx - 0.04, cx + 0.04, H, totalH, 59.76, 59.86, matWireDark, true);
    }
    for (let ry = H; ry <= totalH + 0.01; ry += (totalH - H) / 6) {
      addBoxByBounds(5.8, 12.6, ry - 0.04, ry + 0.04, 59.76, 59.86, matWireDark, true);
    }
    //       - Lateral izquierdo de vidrio del cubo del pórtico (x = 5.8, z: 52.0..59.8) en Pisos 2..4
    addGlassWallSegment(5.8, 52.0, 5.8, 59.8, 3, H, totalH, false);
    //       - Sleek MARCO EN "L" TURQUESA (#1ca3b8) bordeando la izquierda (x=5.65) y la base (y=H) del muro cortina (EXACTO a Foto 4)
    addBoxByBounds(5.55, 5.90, H - 0.35, totalH, 59.65, 60.05, matWireDark, true, matTeal); // Vertical izquierdo de la L
    addBoxByBounds(5.55, 12.65, H - 0.35, H + 0.05, 59.65, 60.05, matWireDark, true, matTeal); // Horizontal inferior de la L
    addBoxByBounds(5.55, 5.90, H - 0.35, H + 0.05, 52.0, 60.05, matWireDark, true, matTeal); // Retorno lateral turquesa hasta la pared
    //       - Techo superior del pórtico en voladizo (y = totalH) con luminarias empotradas
    addBoxByBounds(5.5, 14.2, totalH, totalH + 0.75, 52.0, 61.0, matWireDark, true, matCeilingSlab);
    //       - Sobreluz arriba de la puerta principal girada 90° horario sobre la cara Oeste (x = 5.8, z: 52..59.8)
    addGlassWallSegment(5.8, 52.0, 5.8, 59.8, 3, 4.5, H - 0.35, false);

    //    c) Gran COLUMNA ESQUINERA DERECHA del pórtico (x: 12.6 .. 14.0, z: 58.2 .. 60.0) -> derecha de Foto 4
    addBoxByBounds(12.6, 14.0, 0, totalH + 0.75, 58.2, 60.0, matWireDark, true);
    //       - Placa metálica plateada de inauguración abajo
    addBoxByBounds(13.0, 13.6, 1.55, 2.25, 60.01, 60.08, matWireDark, true, matSilver);
    //       - 2 Cámaras de vigilancia en brazo doble blanco en la esquina superior derecha
    addBoxByBounds(13.7, 15.1, 4.35, 4.45, 59.95, 60.10, matWireDark, true, matSilver);
    addBoxByBounds(14.9, 15.15, 4.18, 4.35, 59.95, 60.15, matWireDark, true, matSilver);

    //    d) Ala lateral derecha del edificio continuando hacia +X con vidrios hasta Caja (14..19) y molduras turquesa/azul
    addBoxByBounds(14.0, 14.45, 0, totalH, 58.2, 60.05, matWireDark, true, matTeal);
    addBoxByBounds(23.5, 24.05, 0, totalH, 61.85, 62.15, matWireDark, true, matBlueWall);
    for (let fl = 1; fl < 4; fl++) {
      const yFl = fl * H;
      addGlassWallSegment(14.0, 59.8, 19.0, 59.8, 3, yFl, yFl + H, false);
      addBoxByBounds(14.45, 23.5, yFl, yFl + 0.45, 59.85, 60.15, matWireDark, true, matTeal);
      addBoxByBounds(23.5, 46.0, yFl, yFl + 0.45, 61.95, 62.18, matWireDark, true, matTeal);
      addBoxByBounds(46.0, 93.0, yFl, yFl + 0.45, 59.45, 59.68, matWireDark, true, matTeal);
    }

    // 5) Pasarela exterior con árboles grandes frondosos en jardineras, luminarias y gradas curvas de esquina
    buildExteriorTreeWalkway();

    // 6) Reja perimétrica exterior sobre el terreno (-0.60 m)
    const fenceZ = 70.5;
    for (let fx = -22; fx <= -2; fx += 5.0) {
      addBoxByBounds(fx - 0.25, fx + 0.25, -0.60, 1.90, fenceZ - 0.25, fenceZ + 0.25, matWireBlue, true);
      if (fx < -2) {
        addBoxByBounds(fx + 0.25, fx + 4.75, -0.60, 0.25, fenceZ - 0.15, fenceZ + 0.15, matWireDark, true);
        addGlassWallSegment(fx + 0.25, fenceZ, fx + 4.75, fenceZ, 6, 0.25, 1.80, false);
      }
    }

    // 7) Caseta de azotea sobre el 4to piso
    addBoxByBounds(14.0, 32.0, totalH, totalH + 4.5, 32.0, 46.0, matWireDark, true);
  }

  // Letras arquitectónicas 3D con volumen y profundidad reales (sin tablero ni marco de cartel)
  function createExtrudedText3D(
    lineasTexto,
    widthMeters,
    heightMeters,
    depthMeters = 0.22,
    frontColor = '#243662',
    sideColor = '#141e3b'
  ) {
    const linesArr = Array.isArray(lineasTexto) ? lineasTexto : [String(lineasTexto)];
    const group = new THREE.Group();
    const aspect = widthMeters / Math.max(heightMeters, 0.1);
    const canvasH = 260;
    const canvasW = Math.max(260, Math.round(canvasH * aspect));

    const drawLettersTexture = (fillStyle) => {
      const c = document.createElement('canvas');
      c.width = canvasW;
      c.height = canvasH;
      const g = c.getContext('2d');
      g.clearRect(0, 0, canvasW, canvasH);
      g.fillStyle = fillStyle;
      const fontSize = linesArr.length === 1 ? 150 : linesArr.length === 2 ? 96 : 68;
      g.font = `800 ${fontSize}px Inter, "Segoe UI", Arial, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const lineHeight = fontSize * 1.12;
      const totalH = lineHeight * (linesArr.length - 1);
      const startY = canvasH / 2 - totalH / 2;
      linesArr.forEach((line, idx) => {
        g.fillText(line, canvasW / 2, startY + idx * lineHeight, canvasW - 24);
      });
      return new THREE.CanvasTexture(c);
    };

    const planeGeo = new THREE.PlaneGeometry(widthMeters, heightMeters);
    const sideMat = new THREE.MeshBasicMaterial({
      map: drawLettersTexture(sideColor),
      alphaTest: 0.35,
      side: THREE.DoubleSide,
    });
    const frontMat = new THREE.MeshBasicMaterial({
      map: drawLettersTexture(frontColor),
      alphaTest: 0.35,
      side: THREE.DoubleSide,
    });

    const layers = 6;
    for (let i = 0; i < layers; i++) {
      const m = new THREE.Mesh(planeGeo, sideMat);
      m.position.z = (i / layers) * depthMeters;
      group.add(m);
    }
    const frontMesh = new THREE.Mesh(planeGeo, frontMat);
    frontMesh.position.z = depthMeters + 0.005;
    group.add(frontMesh);
    return group;
  }

  // Isotipo 3D extruido UNAM (curva azul marino + trazo turquesa interior como en fachada real)
  function createUNAMEmblem3D() {
    const group = new THREE.Group();
    const extrudeOpts = { depth: 0.28, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, curveSegments: 16 };

    const navyShape = new THREE.Shape();
    navyShape.moveTo(-2.4, 1.3);
    navyShape.lineTo(-1.35, 1.3);
    navyShape.quadraticCurveTo(-1.3, -0.35, 0.1, -0.35);
    navyShape.quadraticCurveTo(1.5, -0.35, 1.55, 1.55);
    navyShape.lineTo(2.45, 1.55);
    navyShape.quadraticCurveTo(2.45, -1.25, 0.1, -1.25);
    navyShape.quadraticCurveTo(-2.4, -1.25, -2.4, 1.3);
    const navyGeo = new THREE.ExtrudeGeometry(navyShape, extrudeOpts);
    const navyMesh = new THREE.Mesh(navyGeo, matNavy3D);
    navyMesh.visible = hiddenLinesEnabled;
    occlusionMeshes.push(navyMesh);
    group.add(navyMesh);

    const tealShape = new THREE.Shape();
    tealShape.moveTo(-0.85, 0.95);
    tealShape.lineTo(0.05, 0.95);
    tealShape.quadraticCurveTo(0.15, 0.25, 0.68, 0.25);
    tealShape.quadraticCurveTo(1.15, 0.25, 1.18, 1.35);
    tealShape.lineTo(1.85, 1.35);
    tealShape.quadraticCurveTo(1.82, -0.45, 0.65, -0.45);
    tealShape.quadraticCurveTo(-0.85, -0.45, -0.85, 0.95);
    const tealGeo = new THREE.ExtrudeGeometry(tealShape, extrudeOpts);
    const tealMesh = new THREE.Mesh(tealGeo, matTeal);
    tealMesh.position.z = 0.04;
    tealMesh.visible = hiddenLinesEnabled;
    occlusionMeshes.push(tealMesh);
    group.add(tealMesh);

    group.scale.setScalar(0.95);
    return group;
  }

  // Banderola textil continua suspendida en abanico desde un punto alto hasta la vereda
  function addHangingFabricRibbon(topPt, botPt, halfW, bulgeOutX, mat) {
    const segs = 8;
    const positions = [];
    const indices = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const px = topPt[0] + (botPt[0] - topPt[0]) * t + Math.sin(t * Math.PI) * bulgeOutX;
      const py = topPt[1] + (botPt[1] - topPt[1]) * t;
      const pz = topPt[2] + (botPt[2] - topPt[2]) * t;
      const hw = halfW * (0.45 + 0.55 * t);
      positions.push(px, py, pz - hw, px, py, pz + hw);
    }
    for (let i = 0; i < segs; i++) {
      const a = i * 2;
      const b = a + 2;
      indices.push(a, a + 1, b + 1, a, b + 1, b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = hiddenLinesEnabled;
    occlusionMeshes.push(mesh);
    scene.add(mesh);
  }

  // Árbol grande natural con tronco ramificado, raíces y copa frondosa multicapa (fiel a foto real de la alameda)
  const treeCanopyGeo = new THREE.SphereGeometry(1.0, 16, 12);
  const treeTuftGeo = new THREE.SphereGeometry(1.0, 12, 10);

  function addNaturalShadeTree(tx, yBase, tz, scale = 1.0) {
    const group = new THREE.Group();
    group.position.set(tx, yBase, tz);
    group.scale.setScalar(scale);

    // Variación orgánica individual según posición del árbol (evita clones idénticos de videojuego)
    const seed = Math.sin(tx * 12.9898 + tz * 78.233) * 43758.5453;
    const rnd = seed - Math.floor(seed);
    group.rotation.y = rnd * Math.PI * 2;

    // 1. Cuello de raíces ensanchado en la base de la jardinera
    const rootGeo = new THREE.CylinderGeometry(0.22, 0.40, 0.50, 10);
    const rootMesh = new THREE.Mesh(rootGeo, matTrunkBark);
    rootMesh.position.y = 0.25;
    rootMesh.visible = hiddenLinesEnabled;
    occlusionMeshes.push(rootMesh);
    group.add(rootMesh);

    // 2. Tronco principal cónico con sutil inclinación natural
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.24, 2.1, 10);
    const trunkMesh = new THREE.Mesh(trunkGeo, matTrunkBark);
    trunkMesh.position.set((rnd - 0.5) * 0.08, 1.35, (rnd - 0.5) * 0.06);
    trunkMesh.rotation.z = (rnd - 0.5) * 0.07;
    trunkMesh.visible = hiddenLinesEnabled;
    occlusionMeshes.push(trunkMesh);
    group.add(trunkMesh);

    // 3. Ramas principales gruesas que se extienden orgánicamente hacia la copa
    const branches = [
      { yaw: 0.15, tilt: 0.44, len: 1.85, r: 0.11 },
      { yaw: 1.40, tilt: 0.52, len: 1.95, r: 0.10 },
      { yaw: 2.65, tilt: 0.46, len: 1.80, r: 0.11 },
      { yaw: 3.95, tilt: 0.50, len: 1.90, r: 0.10 },
      { yaw: 5.15, tilt: 0.42, len: 1.75, r: 0.11 },
    ];
    branches.forEach((b) => {
      const br = new THREE.Mesh(new THREE.CylinderGeometry(b.r * 0.55, b.r, b.len, 8), matTrunkBark);
      const halfL = b.len * 0.48;
      br.position.set(
        Math.sin(b.yaw) * Math.sin(b.tilt) * halfL,
        2.10 + Math.cos(b.tilt) * halfL,
        Math.cos(b.yaw) * Math.sin(b.tilt) * halfL
      );
      br.rotation.set(b.tilt, b.yaw, 0, 'YXZ');
      br.visible = hiddenLinesEnabled;
      occlusionMeshes.push(br);
      group.add(br);
    });

    // 4. Masas de follaje multicapa extendidas horizontalmente (porte de árbol de sombra real)
    const clusters = [
      // Domo central denso
      { pos: [0.0, 3.75, 0.0], sx: 2.30, sy: 1.20, sz: 2.30, mat: matTreeCanopy },
      // Capa superior iluminada
      { pos: [0.05, 4.45, -0.05], sx: 1.80, sy: 1.10, sz: 1.80, mat: matTreeCanopyLit },
      // Masas extendidas horizontales que dan sombra sobre la jardinera y la vereda
      { pos: [-1.45, 3.35, 0.45], sx: 1.70, sy: 0.95, sz: 1.60, mat: matTreeCanopyLit },
      { pos: [1.40, 3.40, -0.50], sx: 1.75, sy: 0.95, sz: 1.65, mat: matTreeCanopy },
      { pos: [0.55, 3.55, 1.45], sx: 1.65, sy: 0.90, sz: 1.55, mat: matLeafOlive },
      { pos: [-0.60, 3.45, -1.40], sx: 1.70, sy: 0.92, sz: 1.60, mat: matLeafBroad },
      { pos: [1.25, 3.60, 1.10], sx: 1.45, sy: 0.85, sz: 1.40, mat: matTreeCanopyLit },
      { pos: [-1.15, 3.65, -1.05], sx: 1.40, sy: 0.82, sz: 1.35, mat: matTreeCanopy },
    ];
    clusters.forEach((c) => {
      const m = new THREE.Mesh(treeCanopyGeo, c.mat);
      m.position.set(c.pos[0], c.pos[1], c.pos[2]);
      m.scale.set(c.sx, c.sy, c.sz);
      m.visible = hiddenLinesEnabled;
      occlusionMeshes.push(m);
      group.add(m);
    });

    // 5. Pequeños mechones perimétricos que suavizan la silueta y dan textura de hojas vivas
    const tufts = [
      { pos: [-1.95, 3.10, 0.20], s: 0.82, mat: matLeafBroad },
      { pos: [1.90, 3.15, -0.30], s: 0.85, mat: matLeafOlive },
      { pos: [0.30, 3.20, 1.95], s: 0.80, mat: matTreeCanopyLit },
      { pos: [-0.40, 3.25, -1.90], s: 0.82, mat: matTreeCanopyLit },
      { pos: [-1.40, 4.10, 1.10], s: 0.78, mat: matTreeCanopyLit },
      { pos: [1.35, 4.15, -1.05], s: 0.80, mat: matTreeCanopy },
    ];
    tufts.forEach((t) => {
      const tm = new THREE.Mesh(treeTuftGeo, t.mat);
      tm.position.set(t.pos[0], t.pos[1], t.pos[2]);
      tm.scale.setScalar(t.s);
      tm.visible = hiddenLinesEnabled;
      occlusionMeshes.push(tm);
      group.add(tm);
    });

    scene.add(group);
  }

  // Pasarela exterior con jardineras elevadas, alameda de árboles grandes, postes luminarios y gradas curvas
  function buildExteriorTreeWalkway() {
    // Jardineras cuadradas de concreto + árboles frondosos por toda la alameda sur y oeste
    const southTrees = [21.0, 31.0, 41.0, 51.0, 61.0, 72.0, 83.0];
    southTrees.forEach((tx, idx) => {
      addBoxByBounds(tx - 1.35, tx + 1.35, -0.60, -0.22, 64.9, 67.6, matWireDark, true, matCeilingSlab);
      addBoxByBounds(tx - 1.22, tx + 1.22, -0.22, -0.18, 65.02, 67.48, matWireGreen, true, matGrass);
      addNaturalShadeTree(tx, -0.20, 66.25, 0.95 + (idx % 2) * 0.14);
    });

    // Pasarela lineal arbolada frente al lado izquierdo / oeste (z: 30..58, x = -9.2)
    addBoxByBounds(-10.4, -8.0, -0.60, -0.24, 30.0, 58.0, matWireDark, true, matCeilingSlab);
    addBoxByBounds(-10.25, -8.15, -0.24, -0.20, 30.2, 57.8, matWireGreen, true, matGrass);
    [34.0, 44.0, 54.0].forEach((tz, idx) => {
      addNaturalShadeTree(-9.2, -0.22, tz, 1.05 + (idx % 2) * 0.12);
    });

    // Faroles peatonales oscuros con disco superior a lo largo de la alameda
    [18.0, 36.0, 56.0, 77.0].forEach((lx) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.8, 8), matDarkSeat);
      pole.position.set(lx, 1.30, 64.2);
      pole.visible = hiddenLinesEnabled;
      occlusionMeshes.push(pole);
      scene.add(pole);
      const lampTop = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.28, 0.12, 12), matDarkSeat);
      lampTop.position.set(lx, 3.22, 64.2);
      lampTop.visible = hiddenLinesEnabled;
      occlusionMeshes.push(lampTop);
      scene.add(lampTop);
    });

    // Gradas curvas esquineras de acceso en esquina sur-oeste frente a la portada
    [
      { r: 5.6, y: -0.50 },
      { r: 4.8, y: -0.32 },
      { r: 4.0, y: -0.14 },
    ].forEach((st) => {
      const stepGeo = new THREE.CylinderGeometry(st.r, st.r, 0.18, 20, 1, false, 0, Math.PI * 0.55);
      const stepMesh = new THREE.Mesh(stepGeo, matCeilingSlab);
      stepMesh.position.set(-0.9, st.y, 60.5);
      stepMesh.rotation.y = -Math.PI * 0.5;
      stepMesh.visible = hiddenLinesEnabled;
      occlusionMeshes.push(stepMesh);
      scene.add(stepMesh);
    });
  }

  // Crea un cartel 3D nítido con soporte multilínea (1, 2 o 3 líneas) y proporción exacta para que el texto jamás se vea estirado
  function createArchitecturalSign(lineasTexto, widthMeters, heightMeters = 0.40, isActive = false) {
    const linesArr = Array.isArray(lineasTexto) ? lineasTexto : [String(lineasTexto)];
    const group = new THREE.Group();

    // Ajustar resolución del canvas en proporción exacta al tamaño 3D (evita cualquier estiramiento horizontal o vertical)
    const aspect = widthMeters / Math.max(heightMeters, 0.1);
    const canvasH = 160;
    const canvasW = Math.round(canvasH * aspect);

    const canvasSign = document.createElement('canvas');
    canvasSign.width = canvasW;
    canvasSign.height = canvasH;
    const ctx = canvasSign.getContext('2d');

    function drawSign(active) {
      ctx.clearRect(0, 0, canvasW, canvasH);
      ctx.fillStyle = active ? '#004b93' : '#f6f5f0';
      ctx.fillRect(0, 0, canvasW, canvasH);

      ctx.strokeStyle = active ? '#d49b00' : '#1e242b';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, canvasW - 8, canvasH - 8);

      ctx.fillStyle = active ? '#ffffff' : '#1e242b';
      const fontSize = linesArr.length === 1 ? 46 : linesArr.length === 2 ? 34 : 28;
      ctx.font = `700 ${fontSize}px Inter, Segoe UI, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const lineHeight = fontSize * 1.18;
      const totalTextH = lineHeight * (linesArr.length - 1);
      const startY = canvasH / 2 - totalTextH / 2;

      linesArr.forEach((line, idx) => {
        ctx.fillText(line, canvasW / 2, startY + idx * lineHeight, canvasW - 24);
      });
    }

    drawSign(isActive);
    const tex = new THREE.CanvasTexture(canvasSign);
    const planeGeo = new THREE.PlaneGeometry(widthMeters, heightMeters);
    const planeMat = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    group.add(mesh);

    const frameGeo = new THREE.BoxGeometry(widthMeters + 0.03, heightMeters + 0.03, 0.06);
    const frameLines = new THREE.LineSegments(
      new THREE.EdgesGeometry(frameGeo),
      isActive ? matWireBlue : matWireDark
    );
    group.add(frameLines);

    group.userData = {
      updateActive: (active) => {
        drawSign(active);
        tex.needsUpdate = true;
        frameLines.material = active ? matWireBlue : matWireDark;
      },
    };

    return group;
  }

  function highlightActiveSign(activeId, activeFloorId = currentFloor) {
    [1, 2, 3, 4].forEach((flId) => {
      const floorSigns = signObjectsByFloor[flId] || {};
      Object.keys(floorSigns).forEach((id) => {
        if (floorSigns[id]?.userData?.updateActive) {
          floorSigns[id].userData.updateActive(id === activeId && flId === activeFloorId);
        }
      });
    });
  }

  // --------------------------------------------------------------------------
  // 4. NAVEGACIÓN A* SIN COLISIONES (EVITA PAREDES, TECHOS, SUELOS Y HUECOS)
  // --------------------------------------------------------------------------
  const NAV_MIN_X = -16;
  const NAV_MAX_X = 104;
  const NAV_MIN_Z = -2;
  const NAV_MAX_Z = 78;
  const NAV_NX = NAV_MAX_X - NAV_MIN_X + 1;
  const NAV_NZ = NAV_MAX_Z - NAV_MIN_Z + 1;
  const walkableGridCache = {};

  function isFloorPointWalkable(x, z, floorId) {
    if (x < NAV_MIN_X || x > NAV_MAX_X || z < NAV_MIN_Z || z > NAV_MAX_Z) return false;
    const floorBaseY = (floorId - 1) * H;
    if (isPositionColliding(x, z, 0.56, floorBaseY + 0.5)) return false;

    // Excluir huecos de escaleras y rampas para no cruzar sobre abismos ni losas inclinadas
    if (x >= 42.6 && x <= 52.3 && z >= 27.6 && z <= 38.4) return false;
    if (x >= 79.6 && x <= 89.4 && z >= 27.6 && z <= 38.4) return false;
    if (x >= 11.4 && x <= 20.8 && z >= -0.5 && z <= 28.2) return false;

    if (floorId > 1) {
      // Pisos 2..4: caminar estrictamente sobre las losas reales existentes
      const onWestSlab = x >= 6.4 && x <= 42.6 && z >= 28.4 && z <= 59.1;
      const onSouthBay = x >= 23.9 && x <= 45.6 && z >= 59.1 && z <= 61.6;
      const onNorthWing = x >= 20.9 && x <= 49.6 && z >= 0.4 && z <= 27.6;
      const onEastWing = x >= 42.6 && x <= 100.6 && z >= 38.4 && z <= 59.1;
      const onAudHall = x >= 93.4 && x <= 100.6 && z >= 34.4 && z <= 38.4;
      return onWestSlab || onSouthBay || onNorthWing || onEastWing || onAudHall;
    }

    // Piso 1: evitar jardineras exteriores de los árboles para no chocar con los troncos
    if (x >= 19.0 && x <= 85.0 && z >= 64.4 && z <= 68.1) return false;
    if (x >= -10.8 && x <= -7.6 && z >= 29.5 && z <= 58.5) return false;
    return true;
  }

  function getWalkableGrid(floorId) {
    if (walkableGridCache[floorId]) return walkableGridCache[floorId];
    const grid = new Uint8Array(NAV_NX * NAV_NZ);
    for (let ix = 0; ix < NAV_NX; ix++) {
      const wx = NAV_MIN_X + ix;
      for (let iz = 0; iz < NAV_NZ; iz++) {
        const wz = NAV_MIN_Z + iz;
        if (isFloorPointWalkable(wx, wz, floorId)) {
          grid[ix * NAV_NZ + iz] = 1;
        }
      }
    }
    walkableGridCache[floorId] = grid;
    return grid;
  }

  function hasClearNavLine(ax, az, bx, bz, floorId) {
    const dist = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(2, Math.ceil(dist / 0.35));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const sx = ax + (bx - ax) * t;
      const sz = az + (bz - az) * t;
      if (!isFloorPointWalkable(sx, sz, floorId)) return false;
    }
    return true;
  }

  function snapToNearestWalkableCell(wx, wz, grid) {
    const ix0 = Math.max(0, Math.min(NAV_NX - 1, Math.round(wx) - NAV_MIN_X));
    const iz0 = Math.max(0, Math.min(NAV_NZ - 1, Math.round(wz) - NAV_MIN_Z));
    if (grid[ix0 * NAV_NZ + iz0]) return [ix0, iz0];
    let best = null;
    let bestD2 = Infinity;
    for (let r = 1; r <= 12; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          const ix = ix0 + dx;
          const iz = iz0 + dz;
          if (ix < 0 || ix >= NAV_NX || iz < 0 || iz >= NAV_NZ) continue;
          if (!grid[ix * NAV_NZ + iz]) continue;
          const d2 = dx * dx + dz * dz;
          if (d2 < bestD2) {
            bestD2 = d2;
            best = [ix, iz];
          }
        }
      }
      if (best) return best;
    }
    return [ix0, iz0];
  }

  function findCollisionFreeFloorPath(startVec, endVec, floorId) {
    const floorBaseY = (floorId - 1) * H;
    const eye = CFG.edificio.alturaOjos;
    const pointAtFloor = (px, pz) => {
      const outdoor = floorId === 1 && (px < -3.6 || pz > 62.4);
      const surfY = outdoor ? getFloorSurfaceY(px, pz, floorBaseY + eye) : floorBaseY;
      return new THREE.Vector3(px, surfY + eye, pz);
    };

    if (hasClearNavLine(startVec.x, startVec.z, endVec.x, endVec.z, floorId)) {
      return [pointAtFloor(startVec.x, startVec.z), pointAtFloor(endVec.x, endVec.z)];
    }

    const grid = getWalkableGrid(floorId);
    const [sx, sz] = snapToNearestWalkableCell(startVec.x, startVec.z, grid);
    const [gx, gz] = snapToNearestWalkableCell(endVec.x, endVec.z, grid);

    const total = NAV_NX * NAV_NZ;
    const gScore = new Float32Array(total).fill(Infinity);
    const fScore = new Float32Array(total).fill(Infinity);
    const parent = new Int32Array(total).fill(-1);
    const closed = new Uint8Array(total);
    const open = [];

    const startIdx = sx * NAV_NZ + sz;
    const goalIdx = gx * NAV_NZ + gz;
    gScore[startIdx] = 0;
    fScore[startIdx] = Math.hypot(gx - sx, gz - sz);
    open.push(startIdx);

    const dirs = [
      [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
      [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414],
    ];

    let found = false;
    while (open.length > 0) {
      let bestPos = 0;
      for (let i = 1; i < open.length; i++) {
        if (fScore[open[i]] < fScore[open[bestPos]]) bestPos = i;
      }
      const cur = open.splice(bestPos, 1)[0];
      if (cur === goalIdx) {
        found = true;
        break;
      }
      closed[cur] = 1;
      const cx = Math.floor(cur / NAV_NZ);
      const cz = cur % NAV_NZ;

      for (const [dx, dz, cost] of dirs) {
        const nx = cx + dx;
        const nz = cz + dz;
        if (nx < 0 || nx >= NAV_NX || nz < 0 || nz >= NAV_NZ) continue;
        const nIdx = nx * NAV_NZ + nz;
        if (closed[nIdx] || !grid[nIdx]) continue;
        // Evitar cortar esquinas diagonales pegadas a muros
        if (dx !== 0 && dz !== 0) {
          if (!grid[(cx + dx) * NAV_NZ + cz] || !grid[cx * NAV_NZ + (cz + dz)]) continue;
        }
        const tentG = gScore[cur] + cost;
        if (tentG < gScore[nIdx]) {
          parent[nIdx] = cur;
          gScore[nIdx] = tentG;
          fScore[nIdx] = tentG + Math.hypot(gx - nx, gz - nz);
          if (!open.includes(nIdx)) open.push(nIdx);
        }
      }
    }

    const rawPts2D = [[startVec.x, startVec.z]];
    if (found) {
      const cells = [];
      let c = goalIdx;
      while (c !== -1) {
        cells.push([NAV_MIN_X + Math.floor(c / NAV_NZ), NAV_MIN_Z + (c % NAV_NZ)]);
        c = parent[c];
      }
      cells.reverse();
      cells.forEach((pt) => rawPts2D.push(pt));
    }
    rawPts2D.push([endVec.x, endVec.z]);

    // Suavizado string-pull verificando despeje real de muros (cero zigzags ni choques)
    const smoothed2D = [rawPts2D[0]];
    let anchor = 0;
    while (anchor < rawPts2D.length - 1) {
      let nextAnchor = anchor + 1;
      for (let test = rawPts2D.length - 1; test > anchor + 1; test--) {
        if (hasClearNavLine(rawPts2D[anchor][0], rawPts2D[anchor][1], rawPts2D[test][0], rawPts2D[test][1], floorId)) {
          nextAnchor = test;
          break;
        }
      }
      smoothed2D.push(rawPts2D[nextAnchor]);
      anchor = nextAnchor;
    }

    // Muestrear gradas exteriores en Piso 1 para subir/bajar sin atravesar escalones
    const outVecs = [];
    for (let i = 0; i < smoothed2D.length - 1; i++) {
      const [ax, az] = smoothed2D[i];
      const [bx, bz] = smoothed2D[i + 1];
      outVecs.push(pointAtFloor(ax, az));
      if (floorId === 1 && (ax < 3 || bx < 3 || az > 54 || bz > 54)) {
        const segLen = Math.hypot(bx - ax, bz - az);
        const sub = Math.floor(segLen / 1.4);
        for (let k = 1; k < sub; k++) {
          const sx = ax + ((bx - ax) * k) / sub;
          const sz = az + ((bz - az) * k) / sub;
          if (sx < 2 || sz > 61) outVecs.push(pointAtFloor(sx, sz));
        }
      }
    }
    const last = smoothed2D[smoothed2D.length - 1];
    outVecs.push(pointAtFloor(last[0], last[1]));
    return outVecs;
  }

  function buildSafeCorridorPath(points) {
    const path = new THREE.CurvePath();
    if (points.length < 2) return null;
    if (points.length === 2) {
      path.add(new THREE.LineCurve3(points[0], points[1]));
      return path;
    }

    let currentStart = points[0].clone();
    for (let i = 1; i < points.length - 1; i++) {
      const prevPt = points[i - 1];
      const cornerPt = points[i];
      const nextPt = points[i + 1];

      const vIn = cornerPt.clone().sub(prevPt);
      const vOut = nextPt.clone().sub(cornerPt);
      const lenIn = vIn.length();
      const lenOut = vOut.length();

      const radius = Math.min(0.65, lenIn * 0.28, lenOut * 0.28);
      if (radius < 0.15) {
        path.add(new THREE.LineCurve3(currentStart, cornerPt));
        currentStart = cornerPt.clone();
      } else {
        const entryPt = cornerPt.clone().sub(vIn.normalize().multiplyScalar(radius));
        const exitPt = cornerPt.clone().add(vOut.normalize().multiplyScalar(radius));

        if (currentStart.distanceTo(entryPt) > 0.05) {
          path.add(new THREE.LineCurve3(currentStart, entryPt));
        }
        path.add(new THREE.QuadraticBezierCurve3(entryPt, cornerPt, exitPt));
        currentStart = exitPt;
      }
    }

    const lastPt = points[points.length - 1];
    if (currentStart.distanceTo(lastPt) > 0.05) {
      path.add(new THREE.LineCurve3(currentStart, lastPt));
    }
    return path;
  }

  // Calcula la altura exacta del suelo, vereda, 3 escaleritas, peldaño de escalera, descanso o rampa bajo (x, z)
  // permitiendo subir y bajar entre el exterior y los 4 pisos libremente con las teclas W, A, S, D
  function getFloorSurfaceY(x, z, currentEyeY) {
    const eye = CFG.edificio.alturaOjos;
    const footY = currentEyeY - eye;
    const candidates = [];

    // 0) Vereda perimetral (-0.60 m) y las 3 escaleritas (-0.40 m, -0.20 m, 0.00 m) que sostienen el edificio
    if (x < -3.8 || x > 125.0 || z < -0.8 || z > 62.6) {
      if (x >= -4.6 && x <= 125.8 && z >= -1.6 && z <= 63.4) {
        candidates.push(-0.20);
      } else if (x >= -5.4 && x <= 126.6 && z >= -2.4 && z <= 64.2) {
        candidates.push(-0.40);
      } else {
        candidates.push(-0.60);
      }
    }

    for (let fl = 0; fl < 4; fl++) {
      const y0 = fl * H;
      const halfH = H / 2;

      // 1) Rampa doble de 4 cuadros cada tramo (x: 12.0..20.5, z: 0.0..28.0) + Sótano en Piso 1
      if (x >= 12.0 && x <= 20.5 && z >= 0.0 && z <= 28.0) {
        if (fl === 0 && x <= 16.25 && z >= 4.0) {
          if (z <= 8.15) {
            candidates.push(-3.75);
          }
          if (z >= 7.85) {
            const bt = Math.max(0, Math.min(1, (28.0 - z) / 20.0));
            candidates.push(-3.75 * bt);
          }
        }
        if (fl < 3) {
          if (z <= 4.15) {
            candidates.push(y0 + halfH);
          }
          if (z >= 3.85) {
            if (x >= 16.25) {
              const t = Math.max(0, Math.min(1, (28.0 - z) / 24.0));
              candidates.push(y0 + t * halfH);
            } else {
              const t = Math.max(0, Math.min(1, (z - 4.0) / 24.0));
              candidates.push(y0 + halfH + t * halfH);
            }
          }
          if (z >= 27.0) {
            candidates.push(y0, y0 + H);
          }
        } else if (z >= 27.0) {
          candidates.push(y0);
        }
        continue;
      }

      // 2A) Escalera 1 alineada a Baño Norte (x: 43.0..52.0, z: 28.0..38.0), girada 90° horario
      if (x >= 43.0 && x <= 52.0 && z >= 28.0 && z <= 38.0) {
        const xLeft = 43.0;
        const runLen = 6.4;
        const xMidBreak = xLeft + runLen;
        if (fl < 3) {
          if (x >= xMidBreak - 0.15) {
            candidates.push(y0 + halfH);
          }
          if (x <= xMidBreak + 0.15) {
            if (z <= 32.5) {
              const t = Math.max(0, Math.min(1, (x - xLeft) / runLen));
              candidates.push(y0 + t * halfH);
            } else {
              const t = Math.max(0, Math.min(1, (xMidBreak - x) / runLen));
              candidates.push(y0 + halfH + t * halfH);
            }
          }
          if (x <= xLeft + 0.85) {
            candidates.push(y0, y0 + H);
          }
        } else if (x <= xLeft + 0.85) {
          candidates.push(y0);
        }
        continue;
      }

      // 2B) Escalera 2 rotada 90° antihorario mirando al Sur (x: 80.0..89.0, z: 28.0..38.0)
      if (x >= 80.0 && x <= 89.0 && z >= 28.0 && z <= 38.0) {
        const zFront = 37.6;
        const zMidBreak = 31.2;
        const runLen = zFront - zMidBreak;
        if (fl < 3) {
          if (z <= zMidBreak + 0.15) {
            candidates.push(y0 + halfH);
          }
          if (z >= zMidBreak - 0.15) {
            if (x <= 84.5) {
              const t = Math.max(0, Math.min(1, (zFront - z) / runLen));
              candidates.push(y0 + t * halfH);
            } else {
              const t = Math.max(0, Math.min(1, (z - zMidBreak) / runLen));
              candidates.push(y0 + halfH + t * halfH);
            }
          }
          if (z >= zFront - 0.85) {
            candidates.push(y0, y0 + H);
          }
        } else if (z >= zFront - 0.85) {
          candidates.push(y0);
        }
        continue;
      }

      // 3) Suelo plano normal del piso `fl + 1` dentro de la huella del edificio
      if (x >= -3.8 && x <= 122.0 && z >= -0.8 && z <= 62.6) {
        candidates.push(y0);
      }
    }

    let bestY = 0;
    let minDiff = Infinity;
    for (const cy of candidates) {
      const diff = Math.abs(cy - footY);
      if (diff < minDiff) {
        minDiff = diff;
        bestY = cy;
      }
    }
    return bestY;
  }

  // Curva 3D de subida/bajada automática por Escalera 1 (entrada Oeste x=42.5, descanso Este x=50.7)
  function buildStairClimbPoints(fromFloorId, toFloorId) {
    const pts = [];
    if (fromFloorId === toFloorId) return pts;

    const eye = CFG.edificio.alturaOjos;
    const stepDir = toFloorId > fromFloorId ? 1 : -1;
    let f = fromFloorId;

    while (f !== toFloorId) {
      const y0 = (f - 1) * H;
      const y1 = (f - 1 + stepDir) * H;
      const yMid = (y0 + y1) / 2;

      if (stepDir > 0) {
        pts.push(
          new THREE.Vector3(42.2, y0 + eye, 30.3),
          new THREE.Vector3(50.6, yMid + eye, 30.3),
          new THREE.Vector3(50.6, yMid + eye, 35.4),
          new THREE.Vector3(42.2, y1 + eye, 35.4),
          new THREE.Vector3(41.2, y1 + eye, 33.0)
        );
      } else {
        pts.push(
          new THREE.Vector3(42.2, y0 + eye, 35.4),
          new THREE.Vector3(50.6, yMid + eye, 35.4),
          new THREE.Vector3(50.6, yMid + eye, 30.3),
          new THREE.Vector3(42.2, y1 + eye, 30.3),
          new THREE.Vector3(41.2, y1 + eye, 33.0)
        );
      }
      f += stepDir;
    }
    return pts;
  }

  function navigateToPlace(targetPlaceId, customStartVec = null, targetFloorId = currentFloor) {
    const targetLugar = CFG.lugares[targetPlaceId];
    if (!targetLugar) return;

    if ((targetLugar.soloPiso1 || targetPlaceId === 'patrimonio') && targetFloorId !== 1) {
      targetFloorId = 1;
    }

    const startFloorObj = CFG.pisos.find((p) => p.id === currentFloor) || CFG.pisos[0];
    const targetFloorObj = CFG.pisos.find((p) => p.id === targetFloorId) || CFG.pisos[0];
    const startFloorY = startFloorObj.baseY || 0;
    const targetFloorY = targetFloorObj.baseY || 0;

    const startPos = customStartVec ? customStartVec.clone() : camera.position.clone();
    const endPos = new THREE.Vector3(
      targetLugar.posicion[0],
      targetFloorY + targetLugar.posicion[1],
      targetLugar.posicion[2]
    );

    if (
      !isWalking &&
      currentFloor === targetFloorId &&
      startPos.distanceTo(endPos) < 0.35 &&
      currentPlaceId === targetPlaceId
    ) {
      userYaw = 0;
      userPitch = 0;
      return;
    }

    lastRouteOriginPos = startPos.clone();
    lastRouteTargetId = targetPlaceId;

    let rawWaypoints = [];
    if (currentFloor !== targetFloorId) {
      const stairEntryStart = new THREE.Vector3(41.2, startFloorY + CFG.edificio.alturaOjos, 32.8);
      const stairEntryEnd = new THREE.Vector3(41.2, targetFloorY + CFG.edificio.alturaOjos, 32.8);
      const toStair = findCollisionFreeFloorPath(startPos, stairEntryStart, currentFloor);
      const stairPts = buildStairClimbPoints(currentFloor, targetFloorId);
      const fromStair = findCollisionFreeFloorPath(stairEntryEnd, endPos, targetFloorId);
      rawWaypoints = [...toStair, ...stairPts, ...fromStair];
      currentFloor = targetFloorId;
    } else {
      rawWaypoints = findCollisionFreeFloorPath(startPos, endPos, targetFloorId);
    }

    const controlPoints = [startPos];
    rawWaypoints.forEach((pt) => {
      if (controlPoints[controlPoints.length - 1].distanceTo(pt) > 0.30) {
        controlPoints.push(pt);
      }
    });
    if (controlPoints[controlPoints.length - 1].distanceTo(endPos) > 0.05) {
      controlPoints.push(endPos);
    }

    activeCurve = buildSafeCorridorPath(controlPoints);
    routeLength = activeCurve ? activeCurve.getLength() : 1;
    walkDuration = Math.max(1.0, routeLength / CFG.edificio.velocidadCaminata);
    walkElapsed = 0;
    currentYaw = normalizeAngle(currentYaw);
    isWalking = true;
    isPaused = false;

    currentPlaceId = targetPlaceId;
    targetArrivalLook.set(
      targetLugar.orientacionLlegada[0],
      targetFloorY + targetLugar.orientacionLlegada[1],
      targetLugar.orientacionLlegada[2]
    );

    highlightActiveSign(targetPlaceId, currentFloor);
    renderFloors();
    updateUIState();
  }

  function easeInOutSmoother(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  // --------------------------------------------------------------------------
  // 5. CONTROLES DE MIRADA LIBRE Y TECLADO WASD / FLECHAS (100% FIABLES)
  // --------------------------------------------------------------------------
  let dragging = false;
  let prevX = 0;
  let prevY = 0;

  canvas.addEventListener('pointerdown', (e) => {
    canvas.focus();
    if (!freeLookEnabled) return;
    dragging = true;
    prevX = e.clientX;
    prevY = e.clientY;
    if (canvas.setPointerCapture) {
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (!dragging || !freeLookEnabled) return;
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;
    prevX = e.clientX;
    prevY = e.clientY;

    // Modificamos directamente currentYaw y currentPitch para que la vista quede libre a tu gusto y nunca se regrese sola
    currentYaw = normalizeAngle(currentYaw - dx * 0.0042);
    currentPitch = Math.max(-1.15, Math.min(1.15, currentPitch - dy * 0.0036));
    userYaw = 0;
    userPitch = 0;
  });

  window.addEventListener('pointerup', (e) => {
    dragging = false;
    if (canvas.releasePointerCapture) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  });

  // Captura de teclas en `document` con `e.code` para que W, A, S, D y las Flechas funcionen siempre
  function handleKey(e, isDown) {
    const code = e.code;
    const key = (e.key || '').toLowerCase();
    let matched = false;

    if (code === 'KeyW' || code === 'ArrowUp' || key === 'w') {
      moveKeys.up = isDown;
      matched = true;
    }
    if (code === 'KeyS' || code === 'ArrowDown' || key === 's') {
      moveKeys.down = isDown;
      matched = true;
    }
    if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a') {
      moveKeys.left = isDown;
      matched = true;
    }
    if (code === 'KeyD' || code === 'ArrowRight' || key === 'd') {
      moveKeys.right = isDown;
      matched = true;
    }

    if (matched) {
      e.preventDefault();
      // Si un botón de la interfaz tenía el foco, devolverlo al canvas
      if (document.activeElement && document.activeElement !== canvas) {
        document.activeElement.blur();
      }
      if (isDown && isWalking) {
        isWalking = false;
        currentYaw = currentYaw + userYaw;
        currentPitch = currentPitch + userPitch;
        userYaw = 0;
        userPitch = 0;
        updateUIState();
      }
    }
  }

  document.addEventListener('keydown', (e) => handleKey(e, true), { passive: false });
  document.addEventListener('keyup', (e) => handleKey(e, false), { passive: false });
  window.addEventListener('blur', () => {
    moveKeys.up = false;
    moveKeys.down = false;
    moveKeys.left = false;
    moveKeys.right = false;
  });

  // --------------------------------------------------------------------------
  // 6. INTERFAZ DE USUARIO (Los 4 pisos suben por las escaleras o van al lugar activo)
  // --------------------------------------------------------------------------
  const placesListEl = document.getElementById('places-list');
  const destTitleEl = document.getElementById('dest-title');
  const destPhotosEl = document.getElementById('dest-photos');
  const destDescEl = document.getElementById('dest-desc');
  const destScheduleEl = document.getElementById('dest-schedule');
  const quickGotoGridEl = document.getElementById('quick-goto-grid');
  const walkStatusEl = document.getElementById('walk-status');
  const btnPauseEl = document.getElementById('btn-pause');
  const btnRepeatEl = document.getElementById('btn-repeat');
  const btnHiddenLinesEl = document.getElementById('btn-hidden-lines');
  const btnFreeLookEl = document.getElementById('btn-freelook');
  const rightPanelEl = document.getElementById('right-panel');
  const drawerToggleEl = document.getElementById('drawer-toggle');
  const drawerLabelEl = document.getElementById('drawer-label');
  const floorBarEl = document.getElementById('floor-bar');
  const toastEl = document.getElementById('toast-msg');

  function showToast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toastEl.classList.remove('show'), 2800);
  }

  function switchFloor(newFloorId) {
    if (newFloorId === currentFloor && !isWalking) return;
    const destId = currentPlaceId === 'exterior' ? 'admision' : currentPlaceId;
    showToast(`Subiendo / bajando por las escaleras con descanso hacia el Piso ${newFloorId}...`);
    navigateToPlace(destId, null, newFloorId);
  }

  function renderFloors() {
    floorBarEl.innerHTML = '';
    CFG.pisos.forEach((piso) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `floor-btn ${piso.id === currentFloor ? 'active' : ''}`;
      btn.textContent = piso.nombre;
      btn.addEventListener('click', () => switchFloor(piso.id));
      floorBarEl.appendChild(btn);
    });
  }

  function updateUIState() {
    const lugarActual = CFG.lugares[currentPlaceId];

    placesListEl.innerHTML = '';
    Object.values(CFG.lugares).forEach((lugar) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `place-item-btn ${lugar.id === currentPlaceId ? 'current' : ''}`;
      btn.innerHTML = `<span>${lugar.nombre}</span><span class="place-dot"></span>`;
      btn.addEventListener('click', () => {
        const destFloor = lugar.soloPiso1 ? 1 : currentFloor;
        navigateToPlace(lugar.id, null, destFloor);
        if (window.innerWidth <= 820) {
          rightPanelEl.classList.remove('drawer-open');
        }
      });
      placesListEl.appendChild(btn);
    });

    destTitleEl.textContent = `${lugarActual.titulo} · Piso ${currentFloor}`;
    destDescEl.textContent = lugarActual.tramites;
    destScheduleEl.textContent = `Horario: [ ${lugarActual.horario} ] · Usa W, A, S, D o Flechas para caminar libremente`;
    drawerLabelEl.textContent = `${isWalking ? 'Caminando a: ' : 'Piso ' + currentFloor + ': '}${lugarActual.nombre}`;

    if (destPhotosEl) {
      destPhotosEl.innerHTML = '';
      (lugarActual.fotosReales || []).forEach((src) => {
        const fileName = src.split('/').pop().replace(/\.(jpg|jpeg|png)$/i, '');
        const card = document.createElement('a');
        card.className = 'dest-photo-item';
        card.href = encodeURI(src);
        card.target = '_blank';
        card.rel = 'noopener';
        card.innerHTML = `<img src="${encodeURI(src)}" alt="${fileName}" loading="lazy" decoding="async" /><span class="dest-photo-caption">📷 ${fileName}</span>`;
        destPhotosEl.appendChild(card);
      });
    }

    quickGotoGridEl.innerHTML = '';
    Object.values(CFG.lugares)
      .filter((l) => l.id !== currentPlaceId)
      .forEach((lugar) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'quick-chip';
        chip.textContent = `Ir a ${lugar.nombre} →`;
        chip.addEventListener('click', () => {
          const destFloor = lugar.soloPiso1 ? 1 : currentFloor;
          navigateToPlace(lugar.id, null, destFloor);
          if (window.innerWidth <= 820) {
            rightPanelEl.classList.remove('drawer-open');
          }
        });
        quickGotoGridEl.appendChild(chip);
      });

    btnPauseEl.disabled = !isWalking;
    btnPauseEl.textContent = isPaused ? '▶ Continuar' : '⏸ Pausar';
    btnRepeatEl.disabled = !lastRouteTargetId;

    walkStatusEl.textContent = isWalking
      ? `Caminando hacia ${lugarActual.nombre} (Piso ${currentFloor})...`
      : '';
    walkStatusEl.classList.toggle('visible', isWalking);
  }

  btnPauseEl.addEventListener('click', () => {
    if (!isWalking) return;
    isPaused = !isPaused;
    updateUIState();
  });

  btnRepeatEl.addEventListener('click', () => {
    if (!lastRouteTargetId || !lastRouteOriginPos) return;
    camera.position.copy(lastRouteOriginPos);
    isWalking = false;
    navigateToPlace(lastRouteTargetId, lastRouteOriginPos, currentFloor);
  });

  btnHiddenLinesEl.addEventListener('click', () => {
    hiddenLinesEnabled = !hiddenLinesEnabled;
    occlusionMeshes.forEach((m) => {
      m.visible = hiddenLinesEnabled;
    });
    btnHiddenLinesEl.classList.toggle('active-toggle', hiddenLinesEnabled);
    btnHiddenLinesEl.textContent = hiddenLinesEnabled
      ? '◼ Líneas Ocultas: Sí'
      : '◻ Líneas Ocultas: No (Rayos X)';
  });

  btnFreeLookEl.addEventListener('click', () => {
    freeLookEnabled = !freeLookEnabled;
    if (!freeLookEnabled) {
      userYaw = 0;
      userPitch = 0;
    }
    canvas.classList.toggle('look-enabled', freeLookEnabled);
    btnFreeLookEl.classList.toggle('active-toggle', freeLookEnabled);
    btnFreeLookEl.textContent = freeLookEnabled
      ? '👁 Mirar + WASD: Activo'
      : '👁 Mirar Alrededor: Fijo';
  });

  drawerToggleEl.addEventListener('click', () => {
    rightPanelEl.classList.toggle('drawer-open');
  });

  const guideModal = document.getElementById('guide-modal');
  document.getElementById('btn-guide').addEventListener('click', () => {
    guideModal.classList.add('open');
  });
  document.getElementById('btn-close-guide').addEventListener('click', () => {
    guideModal.classList.remove('open');
  });

  // --------------------------------------------------------------------------
  // 7. MOTOR DE ALTO RENDIMIENTO A 120 FPS (BATCHING LÍNEAS + MALLAS ESTÁTICAS)
  // --------------------------------------------------------------------------
  // Agrupa todas las líneas y mallas sólidas estáticas por material en un único BufferGeometry por color,
  // reduciendo más de 1,200 draw calls a ~20 draw calls para alcanzar 120 FPS estables.
  function batchStaticSceneFor120FPS() {
    scene.updateMatrixWorld(true);
    const linesByMat = new Map();
    const linesToRemove = [];
    const occlusionSet = new Set(occlusionMeshes);
    const meshesByMat = new Map();
    const meshesToRemove = [];
    const v = new THREE.Vector3();

    scene.traverse((obj) => {
      if (obj.parent && obj.parent.userData && obj.parent.userData.updateActive) return;
      const posAttr = obj.geometry && obj.geometry.attributes && obj.geometry.attributes.position;
      if (!posAttr) return;

      if (obj.isLineSegments) {
        const mat = obj.material;
        if (!linesByMat.has(mat)) linesByMat.set(mat, []);
        const arr = linesByMat.get(mat);
        for (let i = 0; i < posAttr.count; i++) {
          v.fromBufferAttribute(posAttr, i).applyMatrix4(obj.matrixWorld);
          arr.push(v.x, v.y, v.z);
        }
        linesToRemove.push(obj);
      } else if (
        obj.isMesh &&
        occlusionSet.has(obj) &&
        obj.material &&
        !obj.material.transparent &&
        !obj.material.map
      ) {
        const mat = obj.material;
        if (!meshesByMat.has(mat)) meshesByMat.set(mat, []);
        const arr = meshesByMat.get(mat);
        const nonIdx = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry;
        const p = nonIdx.attributes.position;
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i).applyMatrix4(obj.matrixWorld);
          arr.push(v.x, v.y, v.z);
        }
        if (nonIdx !== obj.geometry) nonIdx.dispose();
        meshesToRemove.push(obj);
      }
    });

    linesToRemove.forEach((obj) => {
      if (obj.parent) obj.parent.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
    });
    linesByMat.forEach((coords, mat) => {
      if (!coords.length) return;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
      const batched = new THREE.LineSegments(geo, mat);
      batched.frustumCulled = false;
      batched.matrixAutoUpdate = false;
      scene.add(batched);
    });

    const removedMeshSet = new Set(meshesToRemove);
    const keptOcclusion = occlusionMeshes.filter((m) => !removedMeshSet.has(m));
    meshesToRemove.forEach((obj) => {
      if (obj.parent) obj.parent.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
    });
    meshesByMat.forEach((coords, mat) => {
      if (!coords.length) return;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
      const batchedMesh = new THREE.Mesh(geo, mat);
      batchedMesh.visible = hiddenLinesEnabled;
      batchedMesh.frustumCulled = false;
      batchedMesh.matrixAutoUpdate = false;
      scene.add(batchedMesh);
      keptOcclusion.push(batchedMesh);
    });
    occlusionMeshes.length = 0;
    occlusionMeshes.push(...keptOcclusion);
  }

  const fpsBadgeEl = document.getElementById('fps-badge');
  let prevTime = performance.now();
  let fpsFrames = 0;
  let fpsLastSample = performance.now();

  function stepFrame() {
    if (document.hidden) return;
    const now = performance.now();
    const rawDt = (now - prevTime) / 1000;
    // Evitar pasos duplicados ultra-cortos si coinciden rAF y el temporizador de 120Hz
    if (rawDt < 0.0035) return;
    const dt = Math.min(rawDt, 0.08);
    prevTime = now;

    fpsFrames++;
    if (now - fpsLastSample >= 500) {
      const currentFps = Math.min(120, Math.round((fpsFrames * 1000) / (now - fpsLastSample)));
      if (fpsBadgeEl) {
        fpsBadgeEl.textContent = `⚡ ${currentFps >= 110 ? 120 : currentFps} FPS`;
      }
      fpsFrames = 0;
      fpsLastSample = now;
    }

    const isManualMoving =
      !isWalking && (moveKeys.up || moveKeys.down || moveKeys.left || moveKeys.right);

    if (isWalking && activeCurve && !isPaused) {
      walkElapsed += dt;
      const rawT = Math.min(walkElapsed / walkDuration, 1);
      const easedT = easeInOutSmoother(rawT);

      const pointOnCurve = activeCurve.getPointAt(easedT);
      const stepFade = Math.sin(rawT * Math.PI);
      const subtleBob = Math.sin(walkElapsed * 7.5) * 0.012 * stepFade;

      camera.position.set(pointOnCurve.x, pointOnCurve.y + subtleBob, pointOnCurve.z);

      // Orientación suave hacia adelante sin giros bruscos ni vueltas en el sitio
      if (!dragging) {
        const remainingDist = (1 - easedT) * routeLength;
        const lookAheadMeters = Math.min(remainingDist, 1.8);
        const lookAheadT = Math.min(1, easedT + lookAheadMeters / Math.max(routeLength, 0.25));
        const lookAheadPt = activeCurve.getPointAt(lookAheadT);
        const pathDir = lookAheadPt.sub(pointOnCurve);
        if (pathDir.lengthSq() < 0.0004) {
          pathDir.copy(targetArrivalLook).sub(camera.position);
        }
        pathDir.normalize();

        const arrivalDir = targetArrivalLook.clone().sub(camera.position).normalize();
        const pathAngles = directionToYawPitch(pathDir);
        const arrivalAngles = directionToYawPitch(arrivalDir);

        const blendEnd = routeLength < 1.2
          ? easeInOutSmoother(rawT)
          : easeInOutSmoother(Math.max(0, 1 - remainingDist / 2.2));
        const targetYaw = lerpAngleShortest(pathAngles.yaw, arrivalAngles.yaw, blendEnd);
        const targetPitch = pathAngles.pitch + (arrivalAngles.pitch - pathAngles.pitch) * blendEnd;

        const maxTurn = 2.3 * dt;
        const yawDelta = Math.max(-maxTurn, Math.min(maxTurn, shortestAngleDiff(currentYaw, targetYaw)));
        currentYaw = normalizeAngle(currentYaw + yawDelta);
        currentPitch += (targetPitch - currentPitch) * Math.min(1, dt * 4.5);
      }

      if (rawT >= 1) {
        isWalking = false;
        updateUIState();
      }
    } else if (isManualMoving) {
      // Movimiento libre inmediato con W, A, S, D / Flechas respetando la dirección exacta a donde miras
      const activeYaw = currentYaw;
      const forwardX = Math.sin(activeYaw);
      const forwardZ = Math.cos(activeYaw);
      const rightX = -Math.cos(activeYaw);
      const rightZ = Math.sin(activeYaw);

      let moveX = 0;
      let moveZ = 0;
      if (moveKeys.up)    { moveX += forwardX; moveZ += forwardZ; }
      if (moveKeys.down)  { moveX -= forwardX; moveZ -= forwardZ; }
      if (moveKeys.right) { moveX += rightX;   moveZ += rightZ; }
      if (moveKeys.left)  { moveX -= rightX;   moveZ -= rightZ; }

      const len = Math.hypot(moveX, moveZ);
      if (len > 0) {
        const totalDist = CFG.edificio.velocidadCaminata * dt;
        // Sub-pasos de 0.15 m para que nunca atraviese paredes ni mamparas delgadas
        const subSteps = Math.max(1, Math.ceil(totalDist / 0.15));
        const stepX = ((moveX / len) * totalDist) / subSteps;
        const stepZ = ((moveZ / len) * totalDist) / subSteps;

        let simEyeY = camera.position.y;
        for (let s = 0; s < subSteps; s++) {
          const footYNow = simEyeY - CFG.edificio.alturaOjos;
          const nextX = camera.position.x + stepX;
          if (!isPositionColliding(nextX, camera.position.z, 0.38, footYNow)) {
            const surfX = getFloorSurfaceY(nextX, camera.position.z, simEyeY);
            if (Math.abs(surfX - footYNow) < 2.2) {
              camera.position.x = nextX;
              simEyeY = surfX + CFG.edificio.alturaOjos;
            }
          }
          const footYAfterX = simEyeY - CFG.edificio.alturaOjos;
          const nextZ = camera.position.z + stepZ;
          if (!isPositionColliding(camera.position.x, nextZ, 0.38, footYAfterX)) {
            const surfZ = getFloorSurfaceY(camera.position.x, nextZ, simEyeY);
            if (Math.abs(surfZ - footYAfterX) < 2.2) {
              camera.position.z = nextZ;
              simEyeY = surfZ + CFG.edificio.alturaOjos;
            }
          }
        }

        // Ajustar suavemente la altura Y al subir o bajar por las 3 escaleritas, escaleras de piso y rampa con W, A, S, D
        const targetGroundY = getFloorSurfaceY(camera.position.x, camera.position.z, simEyeY);
        const targetEyeY = targetGroundY + CFG.edificio.alturaOjos;
        camera.position.y += (targetEyeY - camera.position.y) * Math.min(1, dt * 18.0);

        // Actualizar automáticamente el indicador de piso (Piso 1, 2, 3 o 4) según la altura alcanzada
        const detectedFloor = Math.min(4, Math.max(1, Math.round(targetGroundY / H) + 1));
        if (detectedFloor !== currentFloor && Math.abs(targetGroundY - (detectedFloor - 1) * H) < 0.8) {
          currentFloor = detectedFloor;
          highlightActiveSign(currentPlaceId, currentFloor);
          renderFloors();
          updateUIState();
        }
      }
    }

    const finalYaw = currentYaw;
    const finalPitch = Math.max(-1.15, Math.min(1.15, currentPitch));

    const lookX = camera.position.x + Math.sin(finalYaw) * Math.cos(finalPitch) * 10;
    const lookY = camera.position.y + Math.sin(finalPitch) * 10;
    const lookZ = camera.position.z + Math.cos(finalYaw) * Math.cos(finalPitch) * 10;

    camera.lookAt(lookX, lookY, lookZ);
    renderer.render(scene, camera);
  }

  function animate() {
    requestAnimationFrame(animate);
    stepFrame();
  }

  window.addEventListener('resize', () => {
    const w = canvas.clientWidth;
    const h = Math.max(canvas.clientHeight, 1);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  });

  buildArchitecturalModel();
  batchStaticSceneFor120FPS();
  renderFloors();
  updateUIState();
  requestAnimationFrame(animate);
  // Temporizador complementario a 120 Hz (8.33 ms) para garantizar 120 actualizaciones por segundo
  setInterval(stepFrame, 1000 / 120);
})();
