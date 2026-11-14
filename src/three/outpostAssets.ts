import * as THREE from 'three';
import { OutpostLandmarkId } from '../data/missionData';
import { groundHeightAt } from '../sim/terrainField';
import { MissionZoneId } from '../sim/missionsData';
import {
  createAstronautChestDisplayTexture,
  createContactShadowTexture,
  createDustSpriteTexture,
  createExplorerEmblemTexture,
  createHullPanelTextures,
  createRoverNameplateTexture,
  createSolarWaferTextures,
  createSuitFabricTextures,
  createThermalFoilTextures,
} from './proceduralTextures';

export interface OutpostRig {
  interactiveTargets: THREE.Object3D[];
  dishMast: THREE.Group;
  solarWings: THREE.Group[];
  solarDustMats: THREE.MeshStandardMaterial[];
  windmillRotors: THREE.Group[];
  windmillVerticalRotors: THREE.Group[];
  roverGroup: THREE.Group;
  roverHead: THREE.Group;
  roverWheels: THREE.Group[];
  roverEyeMat: THREE.MeshStandardMaterial;
  roverGuideBeam: THREE.Mesh;
  roverGuideBeamMat: THREE.MeshBasicMaterial;
  updateRoverNameplate: (name: string) => void;
  astroGroup: THREE.Group;
  astroPelvisGroup: THREE.Group;
  astroTorsoGroup: THREE.Group;
  astroHeadGroup: THREE.Group;
  astroRightArmPivot: THREE.Group;
  astroLeftArmPivot: THREE.Group;
  astroRightElbowPivot: THREE.Group;
  astroLeftElbowPivot: THREE.Group;
  astroLeftLegPivot: THREE.Group;
  astroRightLegPivot: THREE.Group;
  astroLeftKneePivot: THREE.Group;
  astroRightKneePivot: THREE.Group;
  astroLeftAnklePivot: THREE.Group;
  astroRightAnklePivot: THREE.Group;
  powerConsoleGroup: THREE.Group;
  powerBeaconRing: THREE.Mesh;
  powerBeaconDiamond: THREE.Mesh;
  powerBeaconRingMat: THREE.MeshBasicMaterial;
  zoneBeaconGroup: THREE.Group;
  zoneBeaconRing: THREE.Mesh;
  zoneBeaconDiamond: THREE.Mesh;
  zoneBeaconMat: THREE.MeshStandardMaterial;
  dustDevilGroup: THREE.Group;
  dustDevilFunnel: THREE.Mesh;
  dustDevilPoints: THREE.Points;
  dustDevilParticleSeeds: Float32Array;
  habShelterGroup: THREE.Group;
  habShelterRing: THREE.Mesh;
  habShelterDiamond: THREE.Mesh;
  tank2ValveWheel: THREE.Mesh;
  tank2LeakPoints: THREE.Points;
  tank2LeakPositions: Float32Array;
  tank2LeakMat: THREE.PointsMaterial;
  recyclerStatusMat: THREE.MeshStandardMaterial;
  ghFrostMat: THREE.MeshPhysicalMaterial;
  matWarmWindow: THREE.MeshStandardMaterial;
  matConsoleScreen: THREE.MeshStandardMaterial;
  habWindowGlow: THREE.PointLight | null;
  ghLight: THREE.PointLight;
  roverBasePos: { x: number; z: number };
  astroBasePos: { x: number; z: number; yaw: number };
  stationInteractPoints: Record<OutpostLandmarkId, THREE.Vector3>;
  landmarkCenters: Record<OutpostLandmarkId, THREE.Vector3>;
  zonePositions: Record<MissionZoneId, THREE.Vector3>;
  dispose: () => void;
}

/** Builds a beveled rounded-rect ExtrudeGeometry centered on X/Z */
function createBeveledPanelGeometry(
  w: number,
  h: number,
  depth: number,
  bevel = 0.04,
): THREE.ExtrudeGeometry {
  const hw = w * 0.5;
  const hh = h * 0.5;
  const r = Math.min(w, h) * 0.12;
  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

/** Builds a parabolic dish via LatheGeometry */
function createParabolicDishGeometry(radius: number, depth: number): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = t * radius;
    const y = t * t * depth;
    pts.push(new THREE.Vector2(r, y));
  }
  return new THREE.LatheGeometry(pts, 24);
}

/** Builds a helical coil spring via TubeGeometry */
function createHelicalSpringGeometry(
  radius: number,
  height: number,
  turns: number,
  wireRadius: number,
): THREE.TubeGeometry {
  const pts: THREE.Vector3[] = [];
  const samples = turns * 12;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const a = t * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, t * height, Math.sin(a) * radius));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curve, samples, wireRadius, 6, false);
}

/** Builds an organic arched plant leaf for the hydroponic greenhouse */
function createLeafGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.06, 0.1, 0.02, 0.24);
  shape.lineTo(0, 0.28);
  shape.lineTo(-0.02, 0.24);
  shape.quadraticCurveTo(-0.06, 0.1, 0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.008,
    bevelEnabled: false,
  });
  geo.rotateX(-0.35);
  return geo;
}

export function buildOutpostAssets(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  quality: 'high' | 'low',
  isSoftwareGl: boolean,
): OutpostRig {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    textures.push(t);
    return t;
  };

  const castShadow = !isSoftwareGl;
  const maxAniso = isSoftwareGl ? 1 : Math.min(renderer.capabilities.getMaxAnisotropy(), 8);

  // Procedural PBR texture sets
  const hullTex = createHullPanelTextures(maxAniso, 3, 2);
  trackTex(hullTex.map);
  trackTex(hullTex.normalMap);
  trackTex(hullTex.roughnessMap);

  const solarTex = createSolarWaferTextures(maxAniso);
  trackTex(solarTex.map);
  trackTex(solarTex.normalMap);
  trackTex(solarTex.roughnessMap);

  const foilTex = createThermalFoilTextures(maxAniso);
  trackTex(foilTex.map);
  trackTex(foilTex.normalMap);
  trackTex(foilTex.roughnessMap);

  const suitTex = createSuitFabricTextures(maxAniso);
  trackTex(suitTex.map);
  trackTex(suitTex.normalMap);
  trackTex(suitTex.roughnessMap);

  const shadowTex = trackTex(createContactShadowTexture());
  const roverNameTex = trackTex(createRoverNameplateTexture(maxAniso));
  const chestDcmTex = trackTex(createAstronautChestDisplayTexture(maxAniso));
  const explorerEmblemTex = trackTex(createExplorerEmblemTexture(maxAniso));
  void chestDcmTex;

  // Calibrated PBR Materials
  const matHullPanel = trackMat(
    new THREE.MeshStandardMaterial({
      map: hullTex.map,
      normalMap: hullTex.normalMap,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: hullTex.roughnessMap,
      roughness: 0.52,
      metalness: 0.22,
    }),
  );
  const matDarkSteel = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#3c536e',
      roughness: 0.44,
      metalness: 0.52,
    }),
  );
  const matBrushedAlum = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#b8c4d4',
      roughness: 0.26,
      metalness: 0.86,
    }),
  );
  const matMarsOrange = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#e85d04',
      roughness: 0.44,
      metalness: 0.16,
    }),
  );
  const matThermalFoil = trackMat(
    new THREE.MeshStandardMaterial({
      map: foilTex.map,
      normalMap: foilTex.normalMap,
      normalScale: new THREE.Vector2(1.1, 1.1),
      roughnessMap: foilTex.roughnessMap,
      roughness: 0.28,
      metalness: 0.9,
    }),
  );
  const matSuitFabric = trackMat(
    new THREE.MeshStandardMaterial({
      map: suitTex.map,
      normalMap: suitTex.normalMap,
      normalScale: new THREE.Vector2(0.65, 0.65),
      roughnessMap: suitTex.roughnessMap,
      roughness: 0.72,
      metalness: 0.06,
    }),
  );
  const matGoldVisor = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#ffcf72',
      metalness: 0.34,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.75,
      transparent: true,
      opacity: isSoftwareGl ? 0.54 : 0.42,
      depthWrite: false,
    }),
  );
  const matSolarWafer = trackMat(
    new THREE.MeshStandardMaterial({
      map: solarTex.map,
      normalMap: solarTex.normalMap,
      normalScale: new THREE.Vector2(0.75, 0.75),
      roughnessMap: solarTex.roughnessMap,
      roughness: 0.25,
      metalness: 0.68,
    }),
  );
  const matWarmWindow = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ffe08a',
      emissive: '#ffb703',
      emissiveIntensity: 1.45,
      roughness: 0.15,
      metalness: 0.1,
    }),
  );
  const matTireRubber = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#1b2029',
      roughness: 0.88,
      metalness: 0.08,
    }),
  );
  const matOpticGlass = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#10243d',
      roughness: 0.05,
      metalness: 0.35,
      clearcoat: 1.0,
    }),
  );
  const matGreenhouseGlass = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#d4f1ff',
      roughness: 0.08,
      metalness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    }),
  );
  const matPlantLeaf = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#22c55e',
      roughness: 0.58,
      metalness: 0.04,
      emissive: '#14532d',
      emissiveIntensity: 0.22,
      side: THREE.DoubleSide,
    }),
  );
  const matCopperPipe = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#c87544',
      roughness: 0.32,
      metalness: 0.82,
    }),
  );

  const addContactShadow = (parent: THREE.Object3D, rx: number, rz: number, opacity = 0.68) => {
    const plane = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(rx * 2, rz * 2)),
      trackMat(
        new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          depthWrite: false,
          opacity,
        }),
      ),
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0.03;
    parent.add(plane);
  };

  const interactiveTargets: THREE.Object3D[] = [];
  const registerInteractive = (group: THREE.Group, id: OutpostLandmarkId) => {
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.userData.landmarkId = id;
        interactiveTargets.push(child);
      }
    });
  };

  // ============================================================================
  // 1. MARS HABITAT (Modular Pressurized Outpost Base)
  // ============================================================================
  const habGroup = new THREE.Group();
  const habX = 4.4;
  const habZ = -3.4;
  const habY = groundHeightAt(habX, habZ);
  habGroup.position.set(habX, habY, habZ);
  habGroup.rotation.y = -0.34;
  addContactShadow(habGroup, 3.8, 3.5, 0.72);

  // Heavy structural sub-frame & 6 hydraulic landing legs
  const deckTruss = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.68, 2.86, 0.32, 8)), matDarkSteel);
  deckTruss.position.y = 0.52;
  deckTruss.castShadow = castShadow;
  deckTruss.receiveShadow = true;
  habGroup.add(deckTruss);

  const legProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.36, 0.0),
    new THREE.Vector2(0.32, 0.09),
    new THREE.Vector2(0.16, 0.14),
    new THREE.Vector2(0.13, 0.58),
    new THREE.Vector2(0.18, 0.64),
    new THREE.Vector2(0.0, 0.64),
  ];
  const legGeo = trackGeo(new THREE.LatheGeometry(legProfile, 12));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const leg = new THREE.Mesh(legGeo, matBrushedAlum);
    leg.position.set(Math.cos(a) * 2.48, 0.0, Math.sin(a) * 2.48);
    leg.castShadow = castShadow;
    habGroup.add(leg);
  }

  // Modular main hull using LatheGeometry stepped pressure shell + modular armored wall panels
  const habHullProfile = [
    new THREE.Vector2(0.0, 0.66),
    new THREE.Vector2(2.45, 0.66),
    new THREE.Vector2(2.48, 0.85),
    new THREE.Vector2(2.38, 2.25),
    new THREE.Vector2(2.15, 2.45),
    new THREE.Vector2(1.85, 2.75),
    new THREE.Vector2(1.25, 3.08),
    new THREE.Vector2(0.55, 3.24),
    new THREE.Vector2(0.0, 3.26),
  ];
  const habShell = new THREE.Mesh(trackGeo(new THREE.LatheGeometry(habHullProfile, 16)), matHullPanel);
  habShell.castShadow = castShadow;
  habShell.receiveShadow = true;
  habGroup.add(habShell);

  // Orange thermal collar & gold foil thermal skirt around lower hull
  const foilSkirt = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.5, 2.52, 0.24, 16)), matThermalFoil);
  foilSkirt.position.y = 0.78;
  habGroup.add(foilSkirt);

  const orangeBand = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.26, 2.38, 0.18, 16)), matMarsOrange);
  orangeBand.position.y = 2.32;
  habGroup.add(orangeBand);

  // 8 Curved structural exterior buttress ribs (ExtrudeGeometry)
  const ribShape = new THREE.Shape();
  ribShape.moveTo(0, 0);
  ribShape.lineTo(0.26, 0);
  ribShape.lineTo(0.2, 1.45);
  ribShape.quadraticCurveTo(0.12, 1.95, -0.32, 2.25);
  ribShape.lineTo(-0.42, 2.12);
  ribShape.quadraticCurveTo(-0.02, 1.82, 0.02, 1.38);
  ribShape.closePath();
  const ribGeo = trackGeo(
    new THREE.ExtrudeGeometry(ribShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    }),
  );
  ribGeo.translate(0, 0, -0.07);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    // Leave front-left bay clear for airlock module
    if (Math.abs(Math.sin(a - 2.1)) < 0.28 && Math.cos(a - 2.1) > 0) continue;
    const rib = new THREE.Mesh(ribGeo, matDarkSteel);
    rib.position.set(Math.cos(a) * 2.35, 0.68, Math.sin(a) * 2.35);
    rib.rotation.y = -a;
    rib.castShadow = castShadow;
    habGroup.add(rib);
  }

  // Recessed Multi-Pane Cockpit/Lab Windows with hollow beveled frame + glowing interior light
  const winOuterShape = new THREE.Shape();
  winOuterShape.moveTo(-0.44, -0.26);
  winOuterShape.lineTo(0.44, -0.26);
  winOuterShape.lineTo(0.44, 0.26);
  winOuterShape.lineTo(-0.44, 0.26);
  winOuterShape.closePath();
  const winHole = new THREE.Path();
  winHole.moveTo(-0.34, -0.17);
  winHole.lineTo(0.34, -0.17);
  winHole.lineTo(0.34, 0.17);
  winHole.lineTo(-0.34, 0.17);
  winHole.closePath();
  winOuterShape.holes.push(winHole);

  const winFrameGeo = trackGeo(
    new THREE.ExtrudeGeometry(winOuterShape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    }),
  );
  winFrameGeo.center();

  const winGlassGeo = trackGeo(new THREE.BoxGeometry(0.68, 0.34, 0.06));
  const winMullionGeo = trackGeo(new THREE.BoxGeometry(0.05, 0.34, 0.09));
  [-0.56, 0.0, 0.56].forEach((ang) => {
    const wx = Math.sin(ang) * 2.41;
    const wz = Math.cos(ang) * 2.41;
    const frame = new THREE.Mesh(winFrameGeo, matDarkSteel);
    frame.position.set(wx, 1.62, wz);
    frame.rotation.y = ang;
    habGroup.add(frame);

    const glass = new THREE.Mesh(winGlassGeo, matWarmWindow);
    glass.position.set(Math.sin(ang) * 2.38, 1.62, Math.cos(ang) * 2.38);
    glass.rotation.y = ang;
    habGroup.add(glass);

    const mullion = new THREE.Mesh(winMullionGeo, matDarkSteel);
    mullion.position.set(wx, 1.62, wz);
    mullion.rotation.y = ang;
    habGroup.add(mullion);
  });

  let habWindowGlow: THREE.PointLight | null = null;
  if (quality === 'high') {
    habWindowGlow = new THREE.PointLight('#ffb703', 2.4, 7.0, 2);
    habWindowGlow.position.set(0, 1.7, 3.2);
    habGroup.add(habWindowGlow);
  }

  // Detailed Forward Airlock Vestibule + Mechanical Bulkhead Door + Grounded Steps + Handrails
  const airlockGroup = new THREE.Group();
  airlockGroup.position.set(-1.55, 0.0, 1.85);
  airlockGroup.rotation.y = -0.62;

  const airlockBody = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(1.36, 1.48, 1.45, 0.06)),
    matHullPanel,
  );
  airlockBody.position.y = 1.38;
  airlockBody.castShadow = castShadow;
  airlockBody.receiveShadow = true;
  airlockGroup.add(airlockBody);

  // Solid airlock support plinth grounded deep into Martian terrain
  const airlockPlinth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.26, 0.95, 1.38)), matDarkSteel);
  airlockPlinth.position.set(0, 0.22, 0.02);
  airlockPlinth.castShadow = castShadow;
  airlockPlinth.receiveShadow = true;
  airlockGroup.add(airlockPlinth);

  // Mechanical bulkhead door frame & wheel lock
  const doorFrame = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.92, 1.15, 0.14, 0.03)),
    matDarkSteel,
  );
  doorFrame.position.set(0, 1.32, 0.74);
  airlockGroup.add(doorFrame);

  const doorLeaf = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.72, 0.96, 0.08, 0.02)),
    matMarsOrange,
  );
  doorLeaf.position.set(0, 1.32, 0.79);
  airlockGroup.add(doorLeaf);

  const doorPorthole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 14)), matWarmWindow);
  doorPorthole.rotation.x = Math.PI / 2;
  doorPorthole.position.set(0, 1.54, 0.82);
  airlockGroup.add(doorPorthole);

  const lockWheel = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.1, 0.022, 8, 16)), matBrushedAlum);
  lockWheel.position.set(0.18, 1.24, 0.86);
  airlockGroup.add(lockWheel);

  // Grounded entry steps & twin tubular handrails
  const stepFoundation = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.02, 0.5, 0.92)), matDarkSteel);
  stepFoundation.position.set(0, -0.08, 1.15);
  stepFoundation.receiveShadow = true;
  airlockGroup.add(stepFoundation);

  for (let s = 0; s < 3; s++) {
    const step = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.98, 0.16, 0.3)), matBrushedAlum);
    step.position.set(0, 0.14 + s * 0.22, 1.34 - s * 0.24);
    step.castShadow = castShadow;
    airlockGroup.add(step);
  }
  [-0.5, 0.5].forEach((hx) => {
    const railCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(hx, 0.05, 1.48),
      new THREE.Vector3(hx, 0.68, 1.46),
      new THREE.Vector3(hx, 1.15, 0.84),
    ]);
    const rail = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(railCurve, 10, 0.025, 6, false)), matBrushedAlum);
    airlockGroup.add(rail);
  });
  habGroup.add(airlockGroup);

  // Exterior HVAC Ventilation & Coolant Pipes on right flank
  const hvacBox = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(0.85, 0.55, 0.55, 0.04)), matDarkSteel);
  hvacBox.position.set(2.35, 1.42, -0.45);
  hvacBox.rotation.y = 0.2;
  hvacBox.castShadow = castShadow;
  habGroup.add(hvacBox);

  const pipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.35, 1.7, -0.45),
    new THREE.Vector3(2.55, 2.35, -0.45),
    new THREE.Vector3(1.9, 2.85, -0.4),
  ]);
  const habPipe = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(pipeCurve, 12, 0.06, 8, false)), matCopperPipe);
  habGroup.add(habPipe);

  // Rooftop High-Gain Parabolic Communications Dish + Lattice Mast
  const dishMast = new THREE.Group();
  dishMast.position.set(0.55, 3.2, -0.3);

  const turretBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.28, 0.36, 0.25, 10)), matDarkSteel);
  turretBase.position.y = 0.12;
  dishMast.add(turretBase);

  const mastCol = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.07, 0.1, 0.92, 10)), matBrushedAlum);
  mastCol.position.y = 0.65;
  mastCol.castShadow = castShadow;
  dishMast.add(mastCol);

  const dishHolder = new THREE.Group();
  dishHolder.position.set(0, 1.12, 0.05);
  dishHolder.rotation.x = 0.72;

  const parabolicDish = new THREE.Mesh(
    trackGeo(createParabolicDishGeometry(0.72, 0.26)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: '#f2f5f9',
        roughness: 0.3,
        metalness: 0.35,
        side: THREE.DoubleSide,
      }),
    ),
  );
  dishHolder.add(parabolicDish);

  const feedHorn = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.07, 0.42, 8)), matMarsOrange);
  feedHorn.position.y = 0.28;
  dishHolder.add(feedHorn);
  dishMast.add(dishHolder);
  habGroup.add(dishMast);

  // Secondary telemetry whip antenna
  const whip = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.014, 0.028, 1.45, 6)), matBrushedAlum);
  whip.position.set(-0.95, 3.7, -0.5);
  habGroup.add(whip);
  const beaconTip = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.05, 8, 8)), matWarmWindow);
  beaconTip.position.set(-0.95, 4.44, -0.5);
  habGroup.add(beaconTip);

  // Exterior airlock floodlights, safety chevron trim & radiator louvers on Habitat 01
  const floodLamp = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(0.36, 0.12, 0.09, 0.015)), matWarmWindow);
  floodLamp.position.set(0, 2.08, 0.8);
  airlockGroup.add(floodLamp);

  const louverBarGeo = trackGeo(new THREE.BoxGeometry(0.68, 0.045, 0.14));
  for (let l = 0; l < 4; l++) {
    const louver = new THREE.Mesh(louverBarGeo, matBrushedAlum);
    louver.position.set(-0.85, 3.12 + l * 0.08, 0.55);
    louver.rotation.x = 0.25;
    habGroup.add(louver);
  }

  // CHAPEA-Inspired 3D-Printed Regolith-Shielded Rear Crew & Science Wing (4.4, -8.0)
  const matRegolithPrint = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#a8674b',
      roughness: 0.9,
      metalness: 0.06,
    }),
  );
  const chapeaWing = new THREE.Group();
  const cwX = 4.4;
  const cwZ = -8.0;
  const cwY = groundHeightAt(cwX, cwZ);
  chapeaWing.position.set(cwX, cwY, cwZ);
  addContactShadow(chapeaWing, 3.6, 3.0, 0.65);

  const chapeaPlinth = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(4.6, 0.34, 3.4, 0.05)), matDarkSteel);
  chapeaPlinth.position.y = 0.17;
  chapeaPlinth.castShadow = castShadow;
  chapeaPlinth.receiveShadow = true;
  chapeaWing.add(chapeaPlinth);

  // Layered 3D-printed regolith shell ribs for GCR radiation shielding
  for (let layer = 0; layer < 5; layer++) {
    const w = 4.25 - layer * 0.14;
    const d = 3.05 - layer * 0.12;
    const ring = new THREE.Mesh(
      trackGeo(createBeveledPanelGeometry(w, 0.34, d, 0.04)),
      layer % 2 === 0 ? matRegolithPrint : matHullPanel,
    );
    ring.position.y = 0.52 + layer * 0.34;
    ring.castShadow = castShadow;
    ring.receiveShadow = true;
    chapeaWing.add(ring);
  }

  // Upper observation cupola + twin CO2 scrubber tanks + side service ladder
  const cupola = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.95, 1.15, 0.68, 12)), matDarkSteel);
  cupola.position.set(0, 2.35, 0.15);
  cupola.castShadow = castShadow;
  chapeaWing.add(cupola);

  const cupolaGlass = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.88, 0.88, 0.28, 12)), matWarmWindow);
  cupolaGlass.position.set(0, 2.42, 0.15);
  chapeaWing.add(cupolaGlass);

  const cupolaCap = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.55, 1.0, 0.24, 12)), matHullPanel);
  cupolaCap.position.set(0, 2.78, 0.15);
  chapeaWing.add(cupolaCap);

  [-1.35, 1.35].forEach((sx) => {
    const scrubber = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.28, 0.28, 1.55, 12)), matBrushedAlum);
    scrubber.position.set(sx, 1.05, 1.62);
    scrubber.castShadow = castShadow;
    chapeaWing.add(scrubber);

    const collar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.3, 0.3, 0.14, 12)), matMarsOrange);
    collar.position.set(sx, 1.55, 1.62);
    chapeaWing.add(collar);
  });

  // External steel service ladder on east flank of CHAPEA wing
  [-0.2, 0.2].forEach((lz) => {
    const rail = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 2.1, 6)), matBrushedAlum);
    rail.position.set(2.15, 1.25, lz);
    chapeaWing.add(rail);
  });
  for (let r = 0; r < 6; r++) {
    const rung = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.016, 0.016, 0.42, 6)), matBrushedAlum);
    rung.rotation.x = Math.PI / 2;
    rung.position.set(2.15, 0.45 + r * 0.34, 0);
    chapeaWing.add(rung);
  }

  // Pressurized connector corridor linking Habitat 01 to CHAPEA Rear Wing
  const rearConnStart = new THREE.Vector3(habX, habY + 1.15, habZ - 2.1);
  const rearConnEnd = new THREE.Vector3(cwX, cwY + 1.15, cwZ + 1.5);
  const rearConnGeo = trackGeo(new THREE.TubeGeometry(new THREE.LineCurve3(rearConnStart, rearConnEnd), 8, 0.56, 12, false));
  const rearConnMesh = new THREE.Mesh(rearConnGeo, matHullPanel);
  rearConnMesh.castShadow = castShadow;
  scene.add(rearConnMesh);
  for (let r = 1; r <= 3; r++) {
    const pos = new THREE.Vector3().lerpVectors(rearConnStart, rearConnEnd, r / 4);
    const ring = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.6, 0.045, 8, 16)), matDarkSteel);
    ring.position.copy(pos);
    ring.lookAt(rearConnEnd);
    scene.add(ring);
  }

  registerInteractive(chapeaWing, 'habitat');
  scene.add(chapeaWing);

  registerInteractive(habGroup, 'habitat');
  scene.add(habGroup);

  // ============================================================================
  // 2. BIO-DOME GREENHOUSE (Metallic Ribcage, Glass Dome, Leafy Hydroponics, Pipes)
  // ============================================================================
  const ghGroup = new THREE.Group();
  const ghX = 8.6;
  const ghZ = -0.1;
  const ghY = groundHeightAt(ghX, ghZ);
  ghGroup.position.set(ghX, ghY, ghZ);
  addContactShadow(ghGroup, 2.6, 2.6, 0.68);

  // Foundation collar & bolted steel rim
  const ghFoundation = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.05, 2.22, 0.38, 16)), matDarkSteel);
  ghFoundation.position.y = 0.19;
  ghFoundation.castShadow = castShadow;
  ghFoundation.receiveShadow = true;
  ghGroup.add(ghFoundation);

  const ghRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.98, 0.07, 8, 24)), matBrushedAlum);
  ghRim.rotation.x = Math.PI / 2;
  ghRim.position.y = 0.38;
  ghGroup.add(ghRim);

  // Interior hydroponic planter beds & sculpted multi-leaf plants
  const bedMat = trackMat(new THREE.MeshStandardMaterial({ color: '#2b3b4e', roughness: 0.55, metalness: 0.4 }));
  const leafGeo = trackGeo(createLeafGeometry());
  const planterAngles = [0, 1, 2, 3, 4, 5].map((i) => (i / 6) * Math.PI * 2);

  planterAngles.forEach((a) => {
    const rack = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(0.82, 0.24, 0.42, 0.02)), bedMat);
    rack.position.set(Math.cos(a) * 1.05, 0.52, Math.sin(a) * 1.05);
    rack.rotation.y = -a + Math.PI / 2;
    ghGroup.add(rack);

    // 3 leafy plant clusters per planter
    [-0.24, 0, 0.24].forEach((offset) => {
      const px = Math.cos(a) * 1.05 - Math.sin(a) * offset;
      const pz = Math.sin(a) * 1.05 + Math.cos(a) * offset;
      for (let l = 0; l < 5; l++) {
        const leaf = new THREE.Mesh(leafGeo, matPlantLeaf);
        leaf.position.set(px, 0.65, pz);
        leaf.rotation.y = (l / 5) * Math.PI * 2 + a;
        leaf.scale.setScalar(0.85 + (l % 2) * 0.25);
        ghGroup.add(leaf);
      }
    });
  });

  // Central hydroponic tower + warm grow-light canopy
  const centerTower = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.32, 1.55, 12)), matBrushedAlum);
  centerTower.position.y = 1.05;
  ghGroup.add(centerTower);

  const growRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.75, 0.045, 8, 24)), matWarmWindow);
  growRing.rotation.x = Math.PI / 2;
  growRing.position.y = 1.48;
  ghGroup.add(growRing);

  const ghLight = new THREE.PointLight('#ffd166', 2.6, 7.5, 2);
  ghLight.position.set(0, 1.45, 0);
  ghGroup.add(ghLight);

  // Curved glass dome + arched metallic structural ribs (TubeGeometry)
  const glassDome = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(1.94, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5)),
    matGreenhouseGlass,
  );
  glassDome.position.y = 0.38;
  glassDome.renderOrder = 3;
  ghGroup.add(glassDome);

  // Dynamic frost dome overlay for Mission 4 ("Cold Greenhouse")
  const ghFrostMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#bfe8ff',
      emissive: '#7dd3fc',
      emissiveIntensity: 0.18,
      roughness: 0.72,
      metalness: 0.05,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    }),
  );
  const ghFrostDome = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(1.965, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5)),
    ghFrostMat,
  );
  ghFrostDome.position.y = 0.38;
  ghFrostDome.renderOrder = 4;
  ghGroup.add(ghFrostDome);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const archPts: THREE.Vector3[] = [];
    for (let s = 0; s <= 10; s++) {
      const phi = (s / 10) * (Math.PI * 0.5);
      const r = Math.cos(phi) * 1.97;
      const y = 0.38 + Math.sin(phi) * 1.97;
      archPts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    const archCurve = new THREE.CatmullRomCurve3(archPts);
    const rib = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(archCurve, 14, 0.038, 6, false)), matBrushedAlum);
    rib.castShadow = castShadow;
    ghGroup.add(rib);
  }
  const midRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.42, 0.035, 8, 24)), matBrushedAlum);
  midRing.rotation.x = Math.PI / 2;
  midRing.position.y = 1.74;
  ghGroup.add(midRing);

  // Exterior Water Storage Tank & Copper Supply Pipes
  const tankProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.42, 0),
    new THREE.Vector2(0.44, 0.95),
    new THREE.Vector2(0.32, 1.15),
    new THREE.Vector2(0, 1.22),
  ];
  const waterTank = new THREE.Mesh(trackGeo(new THREE.LatheGeometry(tankProfile, 16)), matHullPanel);
  waterTank.position.set(-2.35, 0.05, 1.1);
  waterTank.castShadow = castShadow;
  ghGroup.add(waterTank);

  const waterPipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.15, 0.55, 1.0),
    new THREE.Vector3(-1.95, 0.55, 0.72),
    new THREE.Vector3(-1.72, 0.32, 0.55),
  ]);
  const waterPipe = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(waterPipeCurve, 10, 0.05, 8, false)), matCopperPipe);
  ghGroup.add(waterPipe);

  // Ribbed Pressurized Airlock Connector Tunnel between Habitat & Greenhouse
  const habAnchor = new THREE.Vector3(habX + 1.85, habY + 1.15, habZ + 1.25);
  const ghAnchor = new THREE.Vector3(ghX - 1.55, ghY + 0.85, ghZ - 0.75);
  const tunnelCurve = new THREE.LineCurve3(habAnchor, ghAnchor);
  const tunnelMesh = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(tunnelCurve, 10, 0.44, 12, false)), matHullPanel);
  tunnelMesh.castShadow = castShadow;
  scene.add(tunnelMesh);

  for (let r = 1; r <= 4; r++) {
    const t = r / 5;
    const pos = new THREE.Vector3().lerpVectors(habAnchor, ghAnchor, t);
    const ring = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.47, 0.04, 8, 16)), matDarkSteel);
    ring.position.copy(pos);
    ring.lookAt(ghAnchor);
    scene.add(ring);
  }

  registerInteractive(ghGroup, 'greenhouse');
  scene.add(ghGroup);

  // ============================================================================
  // 3. EXPANDED SOLAR MICROGRID (5 Tracking Arrays + LiFePO4 Battery Container Bank)
  // ============================================================================
  const solarGroup = new THREE.Group();
  const solarWings: THREE.Group[] = [];
  const solarLocations: [number, number][] = [
    [9.4, -4.6],
    [11.4, -2.4],
    [13.8, -5.2],
    [14.2, -1.5],
    [11.8, -7.2],
  ];

  const pedProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.48, 0),
    new THREE.Vector2(0.42, 0.22),
    new THREE.Vector2(0.18, 0.32),
    new THREE.Vector2(0.12, 1.45),
    new THREE.Vector2(0.22, 1.58),
    new THREE.Vector2(0, 1.62),
  ];
  const pedGeo = trackGeo(new THREE.LatheGeometry(pedProfile, 14));
  const subPanelGeo = trackGeo(createBeveledPanelGeometry(0.72, 0.62, 0.04, 0.015));

  const solarDustMats: THREE.MeshStandardMaterial[] = [];

  solarLocations.forEach(([sx, sz]) => {
    const unit = new THREE.Group();
    unit.position.set(sx, groundHeightAt(sx, sz), sz);
    addContactShadow(unit, 1.5, 1.2, 0.6);

    const pedestal = new THREE.Mesh(pedGeo, matDarkSteel);
    pedestal.castShadow = castShadow;
    pedestal.receiveShadow = true;
    unit.add(pedestal);

    const wingPivot = new THREE.Group();
    wingPivot.position.set(0, 1.65, 0);

    // Metallic rear truss frame
    const backingFrame = new THREE.Mesh(
      trackGeo(createBeveledPanelGeometry(2.55, 1.48, 0.05, 0.02)),
      matBrushedAlum,
    );
    backingFrame.rotation.x = Math.PI / 2;
    backingFrame.castShadow = castShadow;
    wingPivot.add(backingFrame);

    // 6 distinct beveled photovoltaic sub-panels (3x2 grid)
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const panel = new THREE.Mesh(subPanelGeo, matSolarWafer);
        panel.rotation.x = Math.PI / 2;
        panel.position.set((col - 1) * 0.78, 0.055, (row - 0.5) * 0.68);
        wingPivot.add(panel);
      }
    }

    // Translucent settled-dust coat overlay (visible during/after M2 storm until cleaned)
    const dustCoatMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#c96f3b',
        roughness: 0.95,
        metalness: 0.02,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      }),
    );
    solarDustMats.push(dustCoatMat);
    const dustOverlay = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(2.42, 1.38)),
      dustCoatMat,
    );
    dustOverlay.rotation.x = -Math.PI / 2;
    dustOverlay.position.y = 0.095;
    wingPivot.add(dustOverlay);

    // Junction box underneath
    const jBox = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.35, 0.16, 0.28)), matMarsOrange);
    jBox.position.set(0, -0.1, 0);
    wingPivot.add(jBox);

    wingPivot.rotation.set(0.55, -0.52, 0);
    unit.add(wingPivot);
    solarWings.push(wingPivot);
    solarGroup.add(unit);
  });

  // Armored LiFePO4 Battery Container Bank & Inverter Skid (14.5, -3.6)
  const batBank = new THREE.Group();
  const bbX = 14.5;
  const bbZ = -3.6;
  batBank.position.set(bbX, groundHeightAt(bbX, bbZ), bbZ);
  batBank.rotation.y = -0.35;
  addContactShadow(batBank, 1.8, 1.2, 0.64);

  const batSkid = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(2.4, 0.22, 1.4, 0.03)), matDarkSteel);
  batSkid.position.y = 0.11;
  batSkid.castShadow = castShadow;
  batBank.add(batSkid);

  const batContainer = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(2.15, 1.18, 1.15, 0.04)), matHullPanel);
  batContainer.position.y = 0.8;
  batContainer.castShadow = castShadow;
  batBank.add(batContainer);

  const batOrangeStripe = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.2, 0.14, 1.18)), matMarsOrange);
  batOrangeStripe.position.y = 1.2;
  batBank.add(batOrangeStripe);

  for (let b = -1; b <= 1; b++) {
    const bus = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 8)), matCopperPipe);
    bus.position.set(b * 0.52, 1.48, 0);
    batBank.add(bus);
  }
  const batStatusLed = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.38, 0.12, 0.05)), matWarmWindow);
  batStatusLed.position.set(0, 0.86, 0.59);
  batBank.add(batStatusLed);
  solarGroup.add(batBank);

  registerInteractive(solarGroup, 'solar');
  scene.add(solarGroup);

  // ============================================================================
  // 4. ROVER-7 (Sculpted Chassis, Rocker-Bogie Suspension, Treaded Wheels, Optics)
  // ============================================================================
  const roverGroup = new THREE.Group();
  const roverBaseX = 2.1;
  const roverBaseZ = 3.25;
  roverGroup.position.set(roverBaseX, groundHeightAt(roverBaseX, roverBaseZ), roverBaseZ);
  roverGroup.rotation.y = -1.02; // Hero 3/4 angle showcasing 6 wheels, suspension, and ROVER-7 nameplate
  addContactShadow(roverGroup, 1.45, 1.15, 0.74);

  // Sculpted beveled aerospace chassis
  const chassisShape = new THREE.Shape();
  chassisShape.moveTo(-0.85, -0.2);
  chassisShape.lineTo(0.75, -0.2);
  chassisShape.lineTo(0.95, 0.05);
  chassisShape.lineTo(0.78, 0.28);
  chassisShape.lineTo(-0.78, 0.28);
  chassisShape.lineTo(-0.92, 0.06);
  chassisShape.closePath();
  const chassisGeo = trackGeo(
    new THREE.ExtrudeGeometry(chassisShape, {
      depth: 1.12,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2,
    }),
  );
  chassisGeo.center();
  chassisGeo.rotateY(Math.PI / 2);

  const roverChassis = new THREE.Mesh(chassisGeo, matHullPanel);
  roverChassis.position.y = 0.64;
  roverChassis.castShadow = castShadow;
  roverChassis.receiveShadow = true;
  roverGroup.add(roverChassis);

  // Gold Kapton thermal foil battery compartment
  const foilBelly = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.96, 0.24, 1.24, 0.02)),
    matThermalFoil,
  );
  foilBelly.position.y = 0.44;
  roverGroup.add(foilBelly);

  // Dynamic Nameplate decal on left side (updates with child's custom Rover name)
  const namePlateMat = trackMat(new THREE.MeshStandardMaterial({ map: roverNameTex, roughness: 0.4 }));
  const namePlate = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.92, 0.34)),
    namePlateMat,
  );
  namePlate.position.set(-0.62, 0.68, 0.0);
  namePlate.rotation.y = -Math.PI / 2;
  roverGroup.add(namePlate);

  let currentRoverLabel = 'ROVER-7';
  const updateRoverNameplate = (rawName: string) => {
    const clean = (rawName.trim() || 'Rusty').toUpperCase().slice(0, 12);
    if (clean === currentRoverLabel) return;
    currentRoverLabel = clean;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 96;
    const g = c.getContext('2d');
    if (!g) return;
    g.fillStyle = '#0B1D36';
    g.fillRect(0, 0, 256, 96);
    g.strokeStyle = '#FFB703';
    g.lineWidth = 6;
    g.strokeRect(5, 5, 246, 86);
    g.fillStyle = '#F8F9FA';
    g.font = 'bold 34px Orbitron, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(clean, 128, 48);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    trackTex(tex);
    namePlateMat.map = tex;
    namePlateMat.needsUpdate = true;
  };

  // Dorsal solar deck on rear of rover
  const roverSolarDeck = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(1.02, 0.88, 0.05, 0.015)),
    matSolarWafer,
  );
  roverSolarDeck.rotation.x = Math.PI / 2;
  roverSolarDeck.position.set(0, 0.94, -0.24);
  roverGroup.add(roverSolarDeck);

  // Rear RTG cooling radiator fins
  for (let f = -2; f <= 2; f++) {
    const fin = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.03, 0.3, 0.24)), matDarkSteel);
    fin.position.set(f * 0.14, 0.72, -0.94);
    roverGroup.add(fin);
  }

  // Rocker-Bogie Suspension Arms & Helical Shock Coils + 6 Detailed Treaded Wheels
  const roverWheels: THREE.Group[] = [];
  const wheelZList = [-0.66, 0.0, 0.66];
  const lugGeo = trackGeo(new THREE.BoxGeometry(0.18, 0.03, 0.045));
  const springGeo = trackGeo(createHelicalSpringGeometry(0.05, 0.26, 5, 0.014));

  [-1, 1].forEach((side) => {
    const sx = side * 0.78;
    // Rocker-bogie linkage struts
    const rockerCurve1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.56, 0.62, 0.05),
      new THREE.Vector3(sx, 0.52, 0.34),
      new THREE.Vector3(sx, 0.28, 0.66),
    ]);
    const rockerCurve2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.56, 0.62, 0.05),
      new THREE.Vector3(sx, 0.5, -0.32),
      new THREE.Vector3(sx, 0.28, -0.66),
    ]);
    const middleStrut = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx, 0.52, 0.0),
      new THREE.Vector3(sx, 0.28, 0.0),
    ]);
    [rockerCurve1, rockerCurve2, middleStrut].forEach((c) => {
      const arm = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(c, 10, 0.032, 6, false)), matBrushedAlum);
      arm.castShadow = castShadow;
      roverGroup.add(arm);
    });

    // Helical shock springs
    [-0.45, 0.45].forEach((sz) => {
      const spring = new THREE.Mesh(springGeo, matMarsOrange);
      spring.position.set(side * 0.66, 0.4, sz);
      roverGroup.add(spring);
    });

    // 3 detailed wheels per side
    wheelZList.forEach((wz) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(sx, 0.28, wz);

      const tire = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.26, 0.26, 0.22, 18)), matTireRubber);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = castShadow;
      wGroup.add(tire);

      // 12 sculpted chevron tread lugs around tire perimeter
      for (let t = 0; t < 12; t++) {
        const ta = (t / 12) * Math.PI * 2;
        const lug = new THREE.Mesh(lugGeo, matTireRubber);
        lug.position.set(0, Math.cos(ta) * 0.265, Math.sin(ta) * 0.265);
        lug.rotation.x = ta;
        wGroup.add(lug);
      }

      // Recessed alloy rim & planetary gold hub cap
      const rim = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.16, 0.16, 0.23, 14)), matBrushedAlum);
      rim.rotation.z = Math.PI / 2;
      wGroup.add(rim);

      const hub = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.08, 0.25, 10)), matGoldVisor);
      hub.rotation.z = Math.PI / 2;
      wGroup.add(hub);

      roverWheels.push(wGroup);
      roverGroup.add(wGroup);
    });
  });

  // Stereo Camera Mast + Lathe Lens Barrels + Headlamps
  const mastTube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.075, 0.66, 10)), matBrushedAlum);
  mastTube.position.set(0, 1.14, 0.56);
  mastTube.castShadow = castShadow;
  roverGroup.add(mastTube);

  const roverHead = new THREE.Group();
  roverHead.position.set(0, 1.5, 0.56);
  const headPod = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.62, 0.24, 0.32, 0.04)),
    matHullPanel,
  );
  headPod.castShadow = castShadow;
  roverHead.add(headPod);

  const lensBarrelProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.075, 0),
    new THREE.Vector2(0.075, 0.12),
    new THREE.Vector2(0.06, 0.14),
    new THREE.Vector2(0.055, 0.09),
  ];
  const barrelGeo = trackGeo(new THREE.LatheGeometry(lensBarrelProfile, 14));
  barrelGeo.rotateX(Math.PI / 2);

  [-0.16, 0.16].forEach((lx) => {
    const barrel = new THREE.Mesh(barrelGeo, matDarkSteel);
    barrel.position.set(lx, 0, 0.14);
    roverHead.add(barrel);

    const optic = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.05, 12, 10)), matOpticGlass);
    optic.position.set(lx, 0, 0.24);
    roverHead.add(optic);
  });

  // Glowing mood sensor bar & companion target spotlight beam
  const roverEyeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#22C55E',
      emissive: '#22C55E',
      emissiveIntensity: 1.9,
      roughness: 0.2,
    }),
  );
  const sensorBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.055, 0.045)), roverEyeMat);
  sensorBar.position.set(0, -0.05, 0.18);
  roverHead.add(sensorBar);

  // Soft volumetric guide beam pointing from Rover head toward active mission zone
  const roverGuideBeamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#FFB703',
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  const beamGeo = trackGeo(new THREE.ConeGeometry(0.45, 3.6, 14, 1, true));
  beamGeo.translate(0, -1.8, 0);
  beamGeo.rotateX(-Math.PI / 2);
  const roverGuideBeam = new THREE.Mesh(beamGeo, roverGuideBeamMat);
  roverGuideBeam.position.set(0, 0.0, 0.25);
  roverGuideBeam.visible = false;
  roverHead.add(roverGuideBeam);

  roverGroup.add(roverHead);

  [-0.38, 0.38].forEach((hx) => {
    const lamp = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.055, 0.06, 10)), matWarmWindow);
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(hx, 0.72, 0.94);
    roverGroup.add(lamp);
  });

  // Front tubular bullbar bumper on rover
  const bumperCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.46, 0.45, 0.92),
    new THREE.Vector3(-0.42, 0.56, 1.04),
    new THREE.Vector3(0.42, 0.56, 1.04),
    new THREE.Vector3(0.46, 0.45, 0.92),
  ]);
  const bumperMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(bumperCurve, 12, 0.032, 8, false)),
    matBrushedAlum,
  );
  roverGroup.add(bumperMesh);

  // Rear whip antenna on rover
  const roverAntenna = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.01, 0.02, 0.85, 6)), matBrushedAlum);
  roverAntenna.position.set(-0.42, 1.32, -0.68);
  roverGroup.add(roverAntenna);

  registerInteractive(roverGroup, 'rover');
  scene.add(roverGroup);

  // ============================================================================
  // 5. JUNIOR COMMANDER ASTRONAUT (Kid-Friendly Stylized Explorer Character)
  // ============================================================================
  const astroGroup = new THREE.Group();
  const astroX = 4.95;
  const astroZ = 2.65;
  astroGroup.position.set(astroX, groundHeightAt(astroX, astroZ), astroZ);
  astroGroup.rotation.y = -0.45;
  addContactShadow(astroGroup, 0.54, 0.54, 0.68);

  // Calibrated Stylized Explorer Materials (soft ivory suit, slate gear, vibrant orange, amber LEDs)
  const matKidSuitWhite = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#f2f3f6',
      normalMap: suitTex.normalMap,
      normalScale: new THREE.Vector2(0.32, 0.32),
      roughness: 0.78,
      metalness: 0.02,
    }),
  );
  const matHelmetShellWhite = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#f4f6fa',
      roughness: 0.34,
      metalness: 0.08,
    }),
  );
  const matSlateGear = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#4b5462',
      roughness: 0.68,
      metalness: 0.1,
    }),
  );
  const matExplorerOrange = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#f97316',
      roughness: 0.42,
      metalness: 0.08,
    }),
  );
  const matAmberLed = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ffd166',
      emissive: '#ff9e1b',
      emissiveIntensity: 2.1,
      roughness: 0.2,
    }),
  );
  const matBlueRimGlow = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#9ee6ff',
      emissive: '#38bdf8',
      emissiveIntensity: 1.45,
      roughness: 0.2,
    }),
  );
  const matBlueBubbleVisor = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#a8e8ff',
      metalness: 0.05,
      roughness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      envMapIntensity: 1.65,
      transparent: true,
      opacity: isSoftwareGl ? 0.3 : 0.22,
      depthWrite: false,
    }),
  );
  const matKidSkin = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#eab08a',
      roughness: 0.64,
      metalness: 0.0,
      sheen: 0.32,
      sheenRoughness: 0.65,
      sheenColor: new THREE.Color('#ffd3ba'),
    }),
  );
  const matFreckle = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#c47b59',
      roughness: 0.72,
    }),
  );
  const matChestnutHair = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#5a3622',
      roughness: 0.76,
      metalness: 0.04,
    }),
  );
  const matEmblemFace = trackMat(
    new THREE.MeshStandardMaterial({
      map: explorerEmblemTex,
      roughness: 0.48,
      metalness: 0.04,
    }),
  );
  void matGoldVisor;

  // Pelvis / Utility Belt Hub (world y = 0.86)
  const astroPelvisGroup = new THREE.Group();
  astroPelvisGroup.position.y = 0.86;
  astroGroup.add(astroPelvisGroup);

  const pelvisProfile = [
    new THREE.Vector2(0.0, -0.08),
    new THREE.Vector2(0.138, -0.068),
    new THREE.Vector2(0.172, 0.0),
    new THREE.Vector2(0.162, 0.075),
    new THREE.Vector2(0.0, 0.082),
  ];
  const pelvisBrief = new THREE.Mesh(
    trackGeo(new THREE.LatheGeometry(pelvisProfile, 20)),
    matKidSuitWhite,
  );
  pelvisBrief.scale.set(1.06, 1.0, 0.8);
  pelvisBrief.castShadow = castShadow;
  astroPelvisGroup.add(pelvisBrief);

  // Orange hip-back accent panels (matching turnaround back view)
  [-0.125, 0.125].forEach((ox) => {
    const hipAccent = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.068, 12, 10)),
      matExplorerOrange,
    );
    hipAccent.scale.set(0.75, 1.15, 0.65);
    hipAccent.position.set(ox, -0.032, -0.082);
    astroPelvisGroup.add(hipAccent);
  });

  // Chunky Dark-Slate Utility Belt + Silver Buckle + Belt Loops
  const waistBelt = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.164, 0.024, 10, 26)),
    matSlateGear,
  );
  waistBelt.rotation.x = Math.PI / 2;
  waistBelt.scale.set(1.07, 0.82, 1.0);
  waistBelt.position.y = 0.035;
  astroPelvisGroup.add(waistBelt);

  const beltBuckle = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.072, 0.056, 0.028, 0.008)),
    matBrushedAlum,
  );
  beltBuckle.position.set(0, 0.035, 0.145);
  astroPelvisGroup.add(beltBuckle);

  // Right Hip (-X, viewer's left): Padded Slate Utility Pouch with Orange Flap + Orange D-Ring Carabiner
  const rightPouchGroup = new THREE.Group();
  rightPouchGroup.position.set(-0.175, -0.015, 0.055);
  rightPouchGroup.rotation.y = -0.35;
  const rightPouchBody = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.075, 0.11, 0.068, 0.016)),
    matSlateGear,
  );
  rightPouchBody.castShadow = castShadow;
  rightPouchGroup.add(rightPouchBody);
  const rightPouchFlap = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.072, 0.044, 0.072, 0.014)),
    matExplorerOrange,
  );
  rightPouchFlap.position.set(0, 0.036, 0.004);
  rightPouchGroup.add(rightPouchFlap);
  astroPelvisGroup.add(rightPouchGroup);

  const carabiner = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.032, 0.009, 8, 18)),
    matExplorerOrange,
  );
  carabiner.scale.set(0.82, 1.25, 1.0);
  carabiner.position.set(-0.095, -0.025, 0.145);
  carabiner.rotation.y = -0.25;
  astroPelvisGroup.add(carabiner);

  // Left Hip (+X, viewer's right): Insulated White Energy Flask with Glowing Amber Indicator Bars
  const flaskGroup = new THREE.Group();
  flaskGroup.position.set(0.172, -0.015, 0.042);
  const flaskBody = new THREE.Mesh(
    trackGeo(new THREE.CapsuleGeometry(0.038, 0.064, 6, 12)),
    matHelmetShellWhite,
  );
  flaskBody.castShadow = castShadow;
  flaskGroup.add(flaskBody);
  const flaskHolder = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.042, 0.042, 0.052, 12)),
    matSlateGear,
  );
  flaskHolder.position.y = -0.012;
  flaskGroup.add(flaskHolder);
  const flaskCap = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.018, 0.022, 0.028, 10)),
    matSlateGear,
  );
  flaskCap.position.y = 0.062;
  flaskGroup.add(flaskCap);
  const flaskLedTop = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.036, 0.011, 0.012)),
    matAmberLed,
  );
  flaskLedTop.position.set(0.018, 0.022, 0.034);
  flaskGroup.add(flaskLedTop);
  const flaskLedVert = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.01, 0.03, 0.01)),
    matAmberLed,
  );
  flaskLedVert.position.set(0.038, -0.012, 0.014);
  flaskGroup.add(flaskLedVert);
  astroPelvisGroup.add(flaskGroup);

  // Rear Belt Utility Pouches (matching back turnaround)
  [-0.085, 0.085].forEach((bx) => {
    const backPouch = new THREE.Mesh(
      trackGeo(createBeveledPanelGeometry(0.068, 0.088, 0.052, 0.012)),
      matSlateGear,
    );
    backPouch.position.set(bx, 0.0, -0.145);
    astroPelvisGroup.add(backPouch);
  });

  // 2-Segment Articulated Kid Explorer Legs (Padded wrinkled trousers + Knee Pads + Chunky Explorer Boots)
  const buildLeg = (isRight: boolean) => {
    const side = isRight ? 1 : -1;
    const hipPivot = new THREE.Group();
    hipPivot.position.set(side * 0.112, -0.02, 0);
    hipPivot.rotation.y = side * -0.055;

    const hipSocket = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.086, 14, 12)),
      matKidSuitWhite,
    );
    hipSocket.castShadow = castShadow;
    hipPivot.add(hipSocket);

    // Padded thigh with subtle soft fabric fold wave
    const thighProfile = [
      new THREE.Vector2(0.07, -0.38),
      new THREE.Vector2(0.084, -0.31),
      new THREE.Vector2(0.08, -0.24),
      new THREE.Vector2(0.088, -0.14),
      new THREE.Vector2(0.088, -0.05),
      new THREE.Vector2(0.084, 0.0),
    ];
    const thigh = new THREE.Mesh(
      trackGeo(new THREE.LatheGeometry(thighProfile, 16)),
      matKidSuitWhite,
    );
    thigh.scale.set(0.98, 1.0, 1.05);
    thigh.castShadow = castShadow;
    hipPivot.add(thigh);

    if (!isRight) {
      // Right-leg (-X) dark-slate thigh strap with buckle
      const thighStrap = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.085, 0.015, 8, 18)),
        matSlateGear,
      );
      thighStrap.rotation.x = Math.PI / 2;
      thighStrap.scale.set(1.0, 1.08, 1.0);
      thighStrap.position.y = -0.16;
      hipPivot.add(thighStrap);

      const strapBuckle = new THREE.Mesh(
        trackGeo(createBeveledPanelGeometry(0.044, 0.044, 0.018, 0.005)),
        matSlateGear,
      );
      strapBuckle.position.set(0, -0.16, 0.09);
      hipPivot.add(strapBuckle);
    } else {
      // Left-leg (+X) orange vertical stripe & zipper tab accent
      const thighOrangeStripe = new THREE.Mesh(
        trackGeo(new THREE.CapsuleGeometry(0.015, 0.24, 4, 8)),
        matExplorerOrange,
      );
      thighOrangeStripe.position.set(0.048, -0.15, 0.072);
      hipPivot.add(thighOrangeStripe);
    }

    // Knee Pivot (world y = 0.46)
    const kneePivot = new THREE.Group();
    kneePivot.position.set(0, -0.38, 0);
    hipPivot.add(kneePivot);

    const kneeBall = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.07, 14, 12)),
      matKidSuitWhite,
    );
    kneePivot.add(kneeBall);

    // Rounded dark-slate explorer knee pad
    const kneePad = new THREE.Mesh(
      trackGeo(createBeveledPanelGeometry(0.086, 0.1, 0.036, 0.016)),
      matSlateGear,
    );
    kneePad.position.set(0, -0.01, 0.068);
    kneePad.castShadow = castShadow;
    kneePivot.add(kneePad);

    // Padded lower trouser leg with cozy cloth bunching above boot cuff
    const shinProfile = [
      new THREE.Vector2(0.062, -0.35),
      new THREE.Vector2(0.082, -0.29),
      new THREE.Vector2(0.072, -0.22),
      new THREE.Vector2(0.082, -0.14),
      new THREE.Vector2(0.072, -0.06),
      new THREE.Vector2(0.068, 0.0),
    ];
    const shin = new THREE.Mesh(
      trackGeo(new THREE.LatheGeometry(shinProfile, 16)),
      matKidSuitWhite,
    );
    shin.scale.set(0.98, 1.0, 1.05);
    shin.castShadow = castShadow;
    kneePivot.add(shin);

    // Ankle Pivot (world y = 0.11 -> chunky boot sole flush at y = 0)
    const anklePivot = new THREE.Group();
    anklePivot.position.set(0, -0.35, 0);
    kneePivot.add(anklePivot);

    // Chunky Stylized Explorer Boot (matching front/side/back turnaround!)
    const bootUpper = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.074, 0.078, 0.095, 16)),
      matSlateGear,
    );
    bootUpper.position.set(0, -0.01, 0.005);
    bootUpper.castShadow = castShadow;
    anklePivot.add(bootUpper);

    // Top ankle strap collar + white side badge
    const ankleCollar = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.075, 0.014, 8, 18)),
      matSlateGear,
    );
    ankleCollar.rotation.x = Math.PI / 2;
    ankleCollar.position.set(0, 0.025, 0.004);
    anklePivot.add(ankleCollar);

    const bootFrontWhite = new THREE.Mesh(
      trackGeo(createBeveledPanelGeometry(0.054, 0.036, 0.022, 0.006)),
      matHelmetShellWhite,
    );
    bootFrontWhite.position.set(0, 0.025, 0.078);
    anklePivot.add(bootFrontWhite);

    // Bright orange vertical boot tongue latch
    const bootOrangeLatch = new THREE.Mesh(
      trackGeo(createBeveledPanelGeometry(0.036, 0.068, 0.024, 0.007)),
      matExplorerOrange,
    );
    bootOrangeLatch.position.set(0, -0.022, 0.078);
    anklePivot.add(bootOrangeLatch);

    // Rounded slate toe box + crisp white bridge strap
    const toeBox = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.08, 16, 12)),
      matSlateGear,
    );
    toeBox.scale.set(0.95, 0.54, 1.44);
    toeBox.position.set(0, -0.062, 0.056);
    toeBox.castShadow = castShadow;
    anklePivot.add(toeBox);

    const toeWhiteBridge = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.072, 0.076, 0.044, 16, 1, false, -Math.PI * 0.45, Math.PI * 0.9)),
      matHelmetShellWhite,
    );
    toeWhiteBridge.rotation.z = Math.PI / 2;
    toeWhiteBridge.rotation.y = Math.PI / 2;
    toeWhiteBridge.scale.set(0.9, 1.0, 0.95);
    toeWhiteBridge.position.set(0, -0.05, 0.076);
    anklePivot.add(toeWhiteBridge);

    // White heel patch (visible in back turnaround)
    const heelWhitePatch = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.062, 12, 10)),
      matHelmetShellWhite,
    );
    heelWhitePatch.scale.set(0.88, 0.6, 0.72);
    heelWhitePatch.position.set(0, -0.055, -0.046);
    anklePivot.add(heelWhitePatch);

    // Heavy lugged tread outsole (bottom flush at y = -0.11 -> world y = 0)
    const bootSole = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.084, 0.088, 0.036, 18)),
      matSlateGear,
    );
    bootSole.scale.set(0.98, 1.0, 1.64);
    bootSole.position.set(0, -0.092, 0.034);
    bootSole.castShadow = castShadow;
    anklePivot.add(bootSole);

    astroPelvisGroup.add(hipPivot);
    return { hipPivot, kneePivot, anklePivot };
  };

  const leftLegRig = buildLeg(false);
  const rightLegRig = buildLeg(true);
  const astroLeftLegPivot = leftLegRig.hipPivot;
  const astroRightLegPivot = rightLegRig.hipPivot;
  const astroLeftKneePivot = leftLegRig.kneePivot;
  const astroRightKneePivot = rightLegRig.kneePivot;
  const astroLeftAnklePivot = leftLegRig.anklePivot;
  const astroRightAnklePivot = rightLegRig.anklePivot;

  // Articulated Upper Torso (Waist pivot at world y = 0.93)
  const astroTorsoGroup = new THREE.Group();
  astroTorsoGroup.position.y = 0.07;
  astroPelvisGroup.add(astroTorsoGroup);

  // Soft padded ivory suit torso
  const torsoProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.15, 0.02),
    new THREE.Vector2(0.168, 0.14),
    new THREE.Vector2(0.194, 0.3),
    new THREE.Vector2(0.184, 0.4),
    new THREE.Vector2(0.132, 0.45),
    new THREE.Vector2(0.0, 0.46),
  ];
  const suitTorso = new THREE.Mesh(
    trackGeo(new THREE.LatheGeometry(torsoProfile, 22)),
    matKidSuitWhite,
  );
  suitTorso.scale.set(1.06, 1.0, 0.8);
  suitTorso.castShadow = castShadow;
  astroTorsoGroup.add(suitTorso);

  // Vibrant Orange Vertical Explorer Stripes on chest/ribs
  [-1, 1].forEach((side) => {
    const chestStripeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.125, 0.38, 0.075),
      new THREE.Vector3(side * 0.115, 0.24, 0.132),
      new THREE.Vector3(side * 0.095, 0.05, 0.125),
    ]);
    const chestStripe = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(chestStripeCurve, 12, 0.02, 8, false)),
      matExplorerOrange,
    );
    astroTorsoGroup.add(chestStripe);

    // Dark-Slate Over-Shoulder Harness Straps wrapping into Chest Pack & Waist
    const harnessCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.11, 0.36, -0.12),
      new THREE.Vector3(side * 0.115, 0.44, 0.01),
      new THREE.Vector3(side * 0.088, 0.32, 0.142),
      new THREE.Vector3(side * 0.135, 0.17, 0.128),
      new THREE.Vector3(side * 0.158, 0.14, -0.02),
      new THREE.Vector3(side * 0.11, 0.14, -0.14),
    ]);
    const harnessStrap = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(harnessCurve, 20, 0.017, 8, false)),
      matSlateGear,
    );
    harnessStrap.castShadow = castShadow;
    astroTorsoGroup.add(harnessStrap);
  });

  // Front Rounded White Chest Pack with Glowing Amber Slit + Twin-Peak ▲▲ Emblem
  const chestPackGroup = new THREE.Group();
  chestPackGroup.position.set(0, 0.245, 0.158);
  const chestPackBody = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.17, 0.145, 0.062, 0.022)),
    matHelmetShellWhite,
  );
  chestPackBody.castShadow = castShadow;
  chestPackGroup.add(chestPackBody);

  const chestAmberBar = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.11, 0.016, 0.014, 0.004)),
    matAmberLed,
  );
  chestAmberBar.position.set(0, 0.044, 0.045);
  chestPackGroup.add(chestAmberBar);

  const chestEmblemPlate = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.125, 0.075)),
    matEmblemFace,
  );
  chestEmblemPlate.position.set(0, -0.016, 0.054);
  chestPackGroup.add(chestEmblemPlate);
  astroTorsoGroup.add(chestPackGroup);

  // Back Rounded White Explorer Backpack with Glowing 'T' Amber LEDs, Twin-Peak ▲▲ Emblem & Orange Side Pods
  const backpackGroup = new THREE.Group();
  backpackGroup.position.set(0, 0.27, -0.185);
  const packBody = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.22, 0.29, 0.095, 0.028)),
    matHelmetShellWhite,
  );
  packBody.castShadow = castShadow;
  backpackGroup.add(packBody);

  const packSlateInner = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.24, 0.25, 0.06, 0.016)),
    matSlateGear,
  );
  packSlateInner.position.set(0, -0.005, 0.032);
  backpackGroup.add(packSlateInner);

  // Glowing Amber 'T' Light Bars on Back
  const packLedTop = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.12, 0.018, 0.014, 0.005)),
    matAmberLed,
  );
  packLedTop.position.set(0, 0.1, -0.068);
  backpackGroup.add(packLedTop);

  const packLedVert = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.022, 0.09, 0.014, 0.005)),
    matAmberLed,
  );
  packLedVert.position.set(0, 0.036, -0.068);
  backpackGroup.add(packLedVert);

  const packEmblem = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.13, 0.08)),
    matEmblemFace,
  );
  packEmblem.rotation.y = Math.PI;
  packEmblem.position.set(0, -0.065, -0.076);
  backpackGroup.add(packEmblem);

  [-0.125, 0.125].forEach((sx) => {
    const sidePod = new THREE.Mesh(
      trackGeo(createBeveledPanelGeometry(0.036, 0.09, 0.056, 0.01)),
      matExplorerOrange,
    );
    sidePod.position.set(sx, -0.045, 0.005);
    backpackGroup.add(sidePod);
  });
  astroTorsoGroup.add(backpackGroup);

  // Kid Explorer Head & Clear Sky-Blue Bubble Helmet (world neck y = 1.35)
  const astroHeadGroup = new THREE.Group();
  astroHeadGroup.position.set(0, 0.425, 0.005);
  astroTorsoGroup.add(astroHeadGroup);

  // Dark-slate ribbed neck collar + front glowing amber chin light pod
  const neckCollar = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.128, 0.024, 10, 24)),
    matSlateGear,
  );
  neckCollar.rotation.x = Math.PI / 2 + 0.06;
  astroHeadGroup.add(neckCollar);

  const chinPod = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.115, 0.052, 0.054, 0.015)),
    matSlateGear,
  );
  chinPod.position.set(0, 0.015, 0.132);
  astroHeadGroup.add(chinPod);

  const chinAmberLed = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.068, 0.017, 0.014, 0.004)),
    matAmberLed,
  );
  chinAmberLed.position.set(0, 0.015, 0.165);
  astroHeadGroup.add(chinAmberLed);

  // Expressive Kid Explorer Face Inside Helmet (center at y = 0.21 -> world 1.56)
  const headCranium = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.118, 22, 18)),
    matKidSkin,
  );
  headCranium.scale.set(0.94, 1.03, 0.96);
  headCranium.position.set(0, 0.205, 0.01);
  astroHeadGroup.add(headCranium);

  // Rounded gentle cheeks & friendly chin
  [-0.056, 0.056].forEach((cx) => {
    const cheek = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.044, 12, 10)),
      matKidSkin,
    );
    cheek.position.set(cx, 0.175, 0.072);
    astroHeadGroup.add(cheek);

    // Cute subtle freckles across upper cheeks
    [
      [0.0, 0.012],
      [-0.014, 0.006],
      [0.014, 0.006],
    ].forEach(([fx, fy]) => {
      const dot = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.0036, 6, 6)),
        matFreckle,
      );
      dot.position.set(cx + fx * (cx < 0 ? 1 : -1), 0.186 + fy, 0.104);
      astroHeadGroup.add(dot);
    });
  });

  // Side-parted Chestnut Brown Hair (swept bangs across forehead + side locks + crown)
  const hairBack = new THREE.Mesh(
    trackGeo(
      new THREE.SphereGeometry(0.125, 22, 16, Math.PI * 0.72, Math.PI * 1.56, 0, Math.PI * 0.72),
    ),
    matChestnutHair,
  );
  hairBack.scale.set(0.96, 1.04, 0.98);
  hairBack.position.set(0, 0.212, 0.006);
  astroHeadGroup.add(hairBack);

  // Sweeping side-parted front hair bangs
  const leftBang = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.088, 16, 12)),
    matChestnutHair,
  );
  leftBang.scale.set(1.05, 0.56, 0.72);
  leftBang.position.set(-0.045, 0.285, 0.068);
  leftBang.rotation.z = 0.42;
  leftBang.rotation.y = 0.28;
  astroHeadGroup.add(leftBang);

  const rightBang = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.078, 16, 12)),
    matChestnutHair,
  );
  rightBang.scale.set(0.96, 0.52, 0.68);
  rightBang.position.set(0.058, 0.282, 0.068);
  rightBang.rotation.z = -0.48;
  rightBang.rotation.y = -0.28;
  astroHeadGroup.add(rightBang);

  // Hair framing both cheeks inside helmet
  [-0.098, 0.098].forEach((hx) => {
    const sideLock = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.028, 0.075, 6, 10)),
      matChestnutHair,
    );
    sideLock.position.set(hx, 0.19, 0.036);
    sideLock.rotation.z = hx < 0 ? 0.12 : -0.12;
    astroHeadGroup.add(sideLock);
  });

  // Friendly Button Nose
  const nose = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.017, 10, 8)),
    matKidSkin,
  );
  nose.scale.set(1.12, 0.88, 1.18);
  nose.position.set(0, 0.194, 0.118);
  astroHeadGroup.add(nose);

  // Big Expressive Eyes with White Specular Catchlights + Friendly Smile
  const matSclera = trackMat(
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.18 }),
  );
  const matIris = trackMat(
    new THREE.MeshStandardMaterial({ color: '#2b1910', roughness: 0.1, metalness: 0.05 }),
  );
  const matMouth = trackMat(
    new THREE.MeshStandardMaterial({ color: '#b86357', roughness: 0.5 }),
  );
  const matEyeCatchlight = trackMat(
    new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  );

  [-0.04, 0.04].forEach((ex) => {
    const sclera = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.02, 12, 10)),
      matSclera,
    );
    sclera.scale.set(1.06, 0.96, 0.62);
    sclera.position.set(ex, 0.214, 0.102);
    astroHeadGroup.add(sclera);

    const iris = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.0145, 12, 10)),
      matIris,
    );
    iris.scale.set(1, 1.04, 0.66);
    iris.position.set(ex, 0.214, 0.109);
    astroHeadGroup.add(iris);

    const catchlight = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.0048, 8, 8)),
      matEyeCatchlight,
    );
    catchlight.position.set(ex + 0.0045, 0.22, 0.116);
    astroHeadGroup.add(catchlight);

    const brow = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.0062, 0.026, 4, 8)),
      matChestnutHair,
    );
    brow.rotation.z = ex < 0 ? Math.PI / 2 - 0.14 : Math.PI / 2 + 0.14;
    brow.position.set(ex, 0.244, 0.104);
    astroHeadGroup.add(brow);
  });

  const smile = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.024, 0.0048, 6, 14, Math.PI * 0.72)),
    matMouth,
  );
  smile.rotation.z = Math.PI + 0.44;
  smile.position.set(0, 0.162, 0.106);
  astroHeadGroup.add(smile);

  // Rounded White Bubble Helmet Shell (radius 0.216 -> iconic friendly kid-explorer silhouette)
  const helmetRearShell = new THREE.Mesh(
    trackGeo(
      new THREE.SphereGeometry(
        0.216,
        28,
        20,
        Math.PI * 0.8,
        Math.PI * 1.4,
        Math.PI * 0.12,
        Math.PI * 0.78,
      ),
    ),
    matHelmetShellWhite,
  );
  helmetRearShell.position.set(0, 0.212, 0.0);
  helmetRearShell.castShadow = castShadow;
  astroHeadGroup.add(helmetRearShell);

  const helmetCrown = new THREE.Mesh(
    trackGeo(
      new THREE.SphereGeometry(0.216, 26, 12, 0, Math.PI * 2, 0, Math.PI * 0.24),
    ),
    matHelmetShellWhite,
  );
  helmetCrown.position.set(0, 0.212, 0.0);
  helmetCrown.castShadow = castShadow;
  astroHeadGroup.add(helmetCrown);

  // Top crest ridge & rear dark-slate vent plate
  const helmetCrest = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.056, 0.022, 0.09, 0.008)),
    matHelmetShellWhite,
  );
  helmetCrest.position.set(0, 0.425, 0.01);
  astroHeadGroup.add(helmetCrest);

  const rearVentPlate = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.11, 0.036, 0.024, 0.008)),
    matSlateGear,
  );
  rearVentPlate.position.set(0, 0.165, -0.205);
  astroHeadGroup.add(rearVentPlate);

  // Sky-blue glowing interior visor bezel ring
  const visorBezel = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.172, 0.011, 8, 28)),
    matBlueRimGlow,
  );
  visorBezel.position.set(0, 0.212, 0.118);
  astroHeadGroup.add(visorBezel);

  // Crystal-Clear Sky-Blue Bubble Dome Visor protruding cleanly on +Z
  const visorDome = new THREE.Mesh(
    trackGeo(
      new THREE.SphereGeometry(
        0.205,
        28,
        18,
        Math.PI * 0.16,
        Math.PI * 0.68,
        Math.PI * 0.16,
        Math.PI * 0.66,
      ),
    ),
    matBlueBubbleVisor,
  );
  visorDome.position.set(0, 0.212, 0.038);
  visorDome.renderOrder = 4;
  astroHeadGroup.add(visorDome);

  // Iconic Twin Circular Ear Pods with Glowing Amber-Orange LED Halo Rings
  [-0.212, 0.212].forEach((hx) => {
    const earHousing = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.072, 0.068, 0.044, 20)),
      matSlateGear,
    );
    earHousing.rotation.z = Math.PI / 2;
    earHousing.position.set(hx, 0.205, 0.01);
    astroHeadGroup.add(earHousing);

    const earInnerCap = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.056, 0.056, 0.052, 18)),
      matSlateGear,
    );
    earInnerCap.rotation.z = Math.PI / 2;
    earInnerCap.position.set(hx + (hx < 0 ? -0.004 : 0.004), 0.205, 0.01);
    astroHeadGroup.add(earInnerCap);

    const earLedRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.048, 0.0085, 8, 22)),
      matAmberLed,
    );
    earLedRing.rotation.y = Math.PI / 2;
    earLedRing.position.set(hx + (hx < 0 ? -0.025 : 0.025), 0.205, 0.01);
    astroHeadGroup.add(earLedRing);
  });

  // 2-Segment Articulated Kid Explorer Arms (Orange shoulder pads + folded sleeves + slate cuff + orange-patched gloves)
  const buildArm = (isRight: boolean) => {
    const side = isRight ? 1 : -1;
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(side * 0.222, 0.37, 0);

    const shoulderCap = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.072, 14, 12)),
      matKidSuitWhite,
    );
    shoulderCap.castShadow = castShadow;
    shoulderPivot.add(shoulderCap);

    // Contoured Vibrant Orange Shoulder Pad hugging upper deltoid
    const orangeShoulderPad = new THREE.Mesh(
      trackGeo(createBeveledPanelGeometry(0.052, 0.115, 0.112, 0.018)),
      matExplorerOrange,
    );
    orangeShoulderPad.position.set(side * 0.042, -0.02, 0);
    orangeShoulderPad.rotation.z = side * -0.15;
    orangeShoulderPad.castShadow = castShadow;
    shoulderPivot.add(orangeShoulderPad);

    const upperArmProfile = [
      new THREE.Vector2(0.054, -0.22),
      new THREE.Vector2(0.064, -0.14),
      new THREE.Vector2(0.06, -0.07),
      new THREE.Vector2(0.066, 0.0),
    ];
    const upperArm = new THREE.Mesh(
      trackGeo(new THREE.LatheGeometry(upperArmProfile, 14)),
      matKidSuitWhite,
    );
    upperArm.castShadow = castShadow;
    shoulderPivot.add(upperArm);

    // Elbow Pivot
    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(0, -0.22, 0);
    shoulderPivot.add(elbowPivot);

    const elbowBall = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.054, 12, 10)),
      matKidSuitWhite,
    );
    elbowPivot.add(elbowBall);

    const foreArmProfile = [
      new THREE.Vector2(0.048, -0.2),
      new THREE.Vector2(0.058, -0.12),
      new THREE.Vector2(0.052, -0.05),
      new THREE.Vector2(0.054, 0.0),
    ];
    const foreArm = new THREE.Mesh(
      trackGeo(new THREE.LatheGeometry(foreArmProfile, 14)),
      matKidSuitWhite,
    );
    foreArm.castShadow = castShadow;
    elbowPivot.add(foreArm);

    // Chunky Dark-Slate Wrist Cuff Band
    const wristCuff = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.058, 0.056, 0.056, 16)),
      matSlateGear,
    );
    wristCuff.position.y = -0.185;
    wristCuff.castShadow = castShadow;
    elbowPivot.add(wristCuff);

    // Dark-Slate Articulated Explorer Glove with Orange Back-of-Hand Armor Patch
    const palm = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.048, 12, 10)),
      matSlateGear,
    );
    palm.scale.set(0.76, 1.08, 0.96);
    palm.position.set(0, -0.242, 0.006);
    palm.castShadow = castShadow;
    elbowPivot.add(palm);

    const gloveOrangePatch = new THREE.Mesh(
      trackGeo(createBeveledPanelGeometry(0.026, 0.052, 0.048, 0.01)),
      matExplorerOrange,
    );
    gloveOrangePatch.position.set(side * 0.025, -0.236, 0.004);
    elbowPivot.add(gloveOrangePatch);

    [-0.018, 0, 0.018].forEach((fz) => {
      const finger = new THREE.Mesh(
        trackGeo(new THREE.CapsuleGeometry(0.012, 0.038, 4, 8)),
        matSlateGear,
      );
      finger.position.set(-side * 0.008, -0.292, fz + 0.008);
      finger.rotation.z = side * -0.22;
      elbowPivot.add(finger);
    });

    const thumb = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.012, 0.028, 4, 8)),
      matSlateGear,
    );
    thumb.position.set(-side * 0.028, -0.258, 0.036);
    thumb.rotation.x = -0.45;
    thumb.rotation.z = side * -0.32;
    elbowPivot.add(thumb);

    astroTorsoGroup.add(shoulderPivot);
    return { shoulderPivot, elbowPivot };
  };

  const leftArmRig = buildArm(false);
  const rightArmRig = buildArm(true);
  const astroLeftArmPivot = leftArmRig.shoulderPivot;
  const astroRightArmPivot = rightArmRig.shoulderPivot;
  const astroLeftElbowPivot = leftArmRig.elbowPivot;
  const astroRightElbowPivot = rightArmRig.elbowPivot;

  // Natural relaxed resting arm pose
  astroLeftArmPivot.rotation.z = -0.11;
  astroRightArmPivot.rotation.z = 0.11;
  astroLeftElbowPivot.rotation.x = -0.34;
  astroRightElbowPivot.rotation.x = -0.34;

  registerInteractive(astroGroup, 'astronaut');
  scene.add(astroGroup);

  // ============================================================================
  // 6. OUTPOST POWER CONSOLE (Central Energy Router + Glowing World Beacon)
  // ============================================================================
  const powerConsoleGroup = new THREE.Group();
  const consoleX = 6.15;
  const consoleZ = -0.35;
  const consoleY = groundHeightAt(consoleX, consoleZ);
  powerConsoleGroup.position.set(consoleX, consoleY, consoleZ);
  powerConsoleGroup.rotation.y = -0.45;
  addContactShadow(powerConsoleGroup, 0.72, 0.72, 0.65);

  const consoleBase = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.86, 0.18, 0.78, 0.03)),
    matDarkSteel,
  );
  consoleBase.position.y = 0.09;
  consoleBase.castShadow = castShadow;
  consoleBase.receiveShadow = true;
  powerConsoleGroup.add(consoleBase);

  const consolePedestal = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.46, 0.88, 0.36, 0.03)),
    matHullPanel,
  );
  consolePedestal.position.y = 0.54;
  consolePedestal.castShadow = castShadow;
  powerConsoleGroup.add(consolePedestal);

  const consoleHead = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.68, 0.48, 0.24, 0.03)),
    matDarkSteel,
  );
  consoleHead.position.set(0, 1.06, 0.06);
  consoleHead.rotation.x = -0.42;
  consoleHead.castShadow = castShadow;
  powerConsoleGroup.add(consoleHead);

  const matConsoleScreen = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ffb703',
      emissive: '#ffb703',
      emissiveIntensity: 1.5,
      roughness: 0.18,
      metalness: 0.15,
    }),
  );
  const consoleScreen = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.54, 0.32)),
    matConsoleScreen,
  );
  consoleScreen.position.set(0, 0.01, 0.155);
  consoleHead.add(consoleScreen);

  const consoleTrim = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.56, 0.12, 0.08, 0.015)),
    matMarsOrange,
  );
  consoleTrim.position.set(0, 0.84, 0.18);
  powerConsoleGroup.add(consoleTrim);

  // World-space target marker ring & hovering indicator diamond (prominent during Tutorial 04)
  const powerBeaconRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#ffb703',
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const powerBeaconRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.82, 0.98, 32)),
    powerBeaconRingMat,
  );
  powerBeaconRing.rotation.x = -Math.PI / 2;
  powerBeaconRing.position.y = 0.08;
  powerConsoleGroup.add(powerBeaconRing);

  const powerBeaconDiamond = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.16, 0)),
    matConsoleScreen,
  );
  powerBeaconDiamond.position.set(0, 1.85, 0.04);
  powerConsoleGroup.add(powerBeaconDiamond);

  registerInteractive(powerConsoleGroup, 'power-console');
  scene.add(powerConsoleGroup);

  // ============================================================================
  // 7. MISSION 1 ZONE: O2 TANK 2 & ISRU VALVE ASSEMBLY (with White Vapour Leak)
  // ============================================================================
  const tank2Group = new THREE.Group();
  const tank2X = 1.45;
  const tank2Z = -0.85;
  const tank2Y = groundHeightAt(tank2X, tank2Z);
  tank2Group.position.set(tank2X, tank2Y, tank2Z);
  tank2Group.rotation.y = 0.25;
  addContactShadow(tank2Group, 1.35, 1.0, 0.65);

  const tankRack = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(1.75, 0.18, 1.1, 0.03)),
    matDarkSteel,
  );
  tankRack.position.y = 0.09;
  tankRack.castShadow = castShadow;
  tankRack.receiveShadow = true;
  tank2Group.add(tankRack);

  // Twin vertical pressurized O2 cylinders (Tank 1 nominal, Tank 2 accented)
  const o2BodyProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.32, 0),
    new THREE.Vector2(0.34, 1.25),
    new THREE.Vector2(0.24, 1.48),
    new THREE.Vector2(0, 1.54),
  ];
  const o2TankGeo = trackGeo(new THREE.LatheGeometry(o2BodyProfile, 16));
  const tank1Mesh = new THREE.Mesh(o2TankGeo, matHullPanel);
  tank1Mesh.position.set(-0.42, 0.16, 0);
  tank1Mesh.castShadow = castShadow;
  tank2Group.add(tank1Mesh);

  const tank2Mesh = new THREE.Mesh(o2TankGeo, matHullPanel);
  tank2Mesh.position.set(0.42, 0.16, 0);
  tank2Mesh.castShadow = castShadow;
  tank2Group.add(tank2Mesh);

  const tank2Band = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.35, 0.35, 0.18, 16)), matMarsOrange);
  tank2Band.position.set(0.42, 1.15, 0);
  tank2Group.add(tank2Band);

  // Manifold pipe & orange manual isolation wheel valve
  const manifoldCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.42, 1.52, 0),
    new THREE.Vector3(0, 1.66, 0.12),
    new THREE.Vector3(0.42, 1.52, 0),
    new THREE.Vector3(0.42, 1.12, 0.42),
  ]);
  const manifoldPipe = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(manifoldCurve, 16, 0.045, 8, false)),
    matCopperPipe,
  );
  tank2Group.add(manifoldPipe);

  const tank2ValveWheel = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.14, 0.025, 8, 16)), matMarsOrange);
  tank2ValveWheel.position.set(0.42, 1.12, 0.48);
  tank2Group.add(tank2ValveWheel);

  // White cryogenic O2 vapour leak particle stream
  const leakCount = 42;
  const tank2LeakPositions = new Float32Array(leakCount * 3);
  for (let i = 0; i < leakCount; i++) {
    tank2LeakPositions[i * 3] = 0.42 + (Math.random() - 0.5) * 0.08;
    tank2LeakPositions[i * 3 + 1] = 1.15 + Math.random() * 0.65;
    tank2LeakPositions[i * 3 + 2] = 0.48 + Math.random() * 0.9;
  }
  const leakGeo = trackGeo(new THREE.BufferGeometry());
  leakGeo.setAttribute('position', new THREE.BufferAttribute(tank2LeakPositions, 3));
  const dustSpriteTex = trackTex(createDustSpriteTexture());
  const tank2LeakMat = trackMat(
    new THREE.PointsMaterial({
      map: dustSpriteTex,
      color: '#e0f2fe',
      size: 0.28,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const tank2LeakPoints = new THREE.Points(leakGeo, tank2LeakMat);
  tank2Group.add(tank2LeakPoints);
  tank2Group.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) c.userData.missionZoneId = 'tank2';
  });
  scene.add(tank2Group);

  // ============================================================================
  // 8. MISSION 3 ZONE: WATER RECYCLER & SPARE-PARTS BAY
  // ============================================================================
  const recyclerGroup = new THREE.Group();
  const recX = 6.45;
  const recZ = -2.55;
  const recY = groundHeightAt(recX, recZ);
  recyclerGroup.position.set(recX, recY, recZ);
  recyclerGroup.rotation.y = -0.3;
  addContactShadow(recyclerGroup, 1.2, 1.0, 0.62);

  const recDeck = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(1.5, 0.16, 1.05, 0.03)),
    matDarkSteel,
  );
  recDeck.position.y = 0.08;
  recDeck.castShadow = castShadow;
  recyclerGroup.add(recDeck);

  const recCabinet = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(1.18, 1.12, 0.72, 0.04)),
    matHullPanel,
  );
  recCabinet.position.y = 0.68;
  recCabinet.castShadow = castShadow;
  recyclerGroup.add(recCabinet);

  const matWaterBlue = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 0.35,
      roughness: 0.12,
      metalness: 0.1,
      transparent: true,
      opacity: 0.72,
    }),
  );
  const sightGlass = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.18, 0.76, 14)), matWaterBlue);
  sightGlass.position.set(-0.28, 0.7, 0.38);
  recyclerGroup.add(sightGlass);

  const recyclerStatusMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#22C55E',
      emissive: '#22C55E',
      emissiveIntensity: 1.5,
      roughness: 0.2,
    }),
  );
  const recGauge = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.38, 0.24, 0.06)), recyclerStatusMat);
  recGauge.position.set(0.24, 0.85, 0.38);
  recyclerGroup.add(recGauge);

  recyclerGroup.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) c.userData.missionZoneId = 'recycler';
  });
  scene.add(recyclerGroup);

  // ============================================================================
  // 9. MISSION 5 ZONE: WATER-WALL RADIATION STORM SHELTER
  // ============================================================================
  const shelterGroup = new THREE.Group();
  const shX = -0.35;
  const shZ = -4.25;
  const shY = groundHeightAt(shX, shZ);
  shelterGroup.position.set(shX, shY, shZ);
  shelterGroup.rotation.y = 0.38;
  addContactShadow(shelterGroup, 1.75, 1.5, 0.7);

  const shelterVault = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(2.35, 1.38, 1.95, 0.08)),
    matDarkSteel,
  );
  shelterVault.position.y = 0.72;
  shelterVault.castShadow = castShadow;
  shelterVault.receiveShadow = true;
  shelterGroup.add(shelterVault);

  // Visible translucent blue water-wall shielding tanks hugging exterior walls
  const waterWallMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#0ea5e9',
      emissive: '#0369a1',
      emissiveIntensity: 0.28,
      roughness: 0.15,
      metalness: 0.08,
      transparent: true,
      opacity: 0.68,
    }),
  );
  [-1.24, 1.24].forEach((wx) => {
    const wallTank = new THREE.Mesh(
      trackGeo(createBeveledPanelGeometry(0.18, 1.12, 1.72, 0.03)),
      waterWallMat,
    );
    wallTank.position.set(wx, 0.68, 0);
    wallTank.castShadow = castShadow;
    shelterGroup.add(wallTank);
  });

  const shelterHatch = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.92, 1.05, 0.12, 0.03)),
    matMarsOrange,
  );
  shelterHatch.position.set(0, 0.64, 1.01);
  shelterGroup.add(shelterHatch);

  const shelterSign = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.56, 0.16, 0.04)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: '#ffb703',
        emissive: '#ffb703',
        emissiveIntensity: 1.2,
      }),
    ),
  );
  shelterSign.position.set(0, 1.26, 1.02);
  shelterGroup.add(shelterSign);

  shelterGroup.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) c.userData.missionZoneId = 'shelter';
  });
  scene.add(shelterGroup);

  // ============================================================================
  // 10. ACTIVE CRITICAL SOL WORLD BEACON (Highlights current Mission Zone)
  // ============================================================================
  const zoneBeaconGroup = new THREE.Group();
  const zoneBeaconMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#FFB703',
      emissive: '#E85D04',
      emissiveIntensity: 1.8,
      roughness: 0.2,
    }),
  );
  const zoneBeaconRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(1.15, 1.38, 32)),
    trackMat(
      new THREE.MeshBasicMaterial({
        color: '#FFB703',
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    ),
  );
  zoneBeaconRing.rotation.x = -Math.PI / 2;
  zoneBeaconRing.position.y = 0.08;
  zoneBeaconGroup.add(zoneBeaconRing);

  const zoneBeaconDiamond = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.2, 0)),
    zoneBeaconMat,
  );
  zoneBeaconDiamond.position.set(0, 2.35, 0);
  zoneBeaconGroup.add(zoneBeaconDiamond);
  zoneBeaconGroup.visible = false;
  scene.add(zoneBeaconGroup);

  // ============================================================================
  // 11. LOCALIZED MARS DUST DEVIL VORTEX + HABITAT AIRLOCK SHELTER BEACON
  // ============================================================================
  const dustDevilGroup = new THREE.Group();
  const funnelGeo = trackGeo(new THREE.CylinderGeometry(1.75, 0.42, 7.2, 20, 1, true));
  funnelGeo.translate(0, 3.6, 0);
  const funnelMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#d97736',
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const dustDevilFunnel = new THREE.Mesh(funnelGeo, funnelMat);
  dustDevilGroup.add(dustDevilFunnel);

  const vortexCount = quality === 'high' ? 160 : 90;
  const vortexPos = new Float32Array(vortexCount * 3);
  const dustDevilParticleSeeds = new Float32Array(vortexCount * 3); // [phaseAngle, heightNorm, swirlSpeed]
  for (let i = 0; i < vortexCount; i++) {
    const hNorm = Math.random();
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.45 + hNorm * 1.65 + (Math.random() - 0.5) * 0.25;
    vortexPos[i * 3] = Math.cos(angle) * radius;
    vortexPos[i * 3 + 1] = hNorm * 7.2;
    vortexPos[i * 3 + 2] = Math.sin(angle) * radius;
    dustDevilParticleSeeds[i * 3] = angle;
    dustDevilParticleSeeds[i * 3 + 1] = hNorm;
    dustDevilParticleSeeds[i * 3 + 2] = 3.2 + (1 - hNorm) * 4.5;
  }
  const vortexGeo = trackGeo(new THREE.BufferGeometry());
  vortexGeo.setAttribute('position', new THREE.BufferAttribute(vortexPos, 3));
  const vortexMat = trackMat(
    new THREE.PointsMaterial({
      map: dustSpriteTex,
      color: '#f59e56',
      size: 0.58,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    }),
  );
  const dustDevilPoints = new THREE.Points(vortexGeo, vortexMat);
  dustDevilGroup.add(dustDevilPoints);
  dustDevilGroup.visible = false;
  scene.add(dustDevilGroup);

  const habShelterGroup = new THREE.Group();
  habShelterGroup.position.set(habX - 1.2, habY + 0.08, habZ + 1.5);
  const habShelterRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(1.55, 1.88, 36)),
    trackMat(
      new THREE.MeshBasicMaterial({
        color: '#22C55E',
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    ),
  );
  habShelterRing.rotation.x = -Math.PI / 2;
  habShelterGroup.add(habShelterRing);

  const habShelterDiamond = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.28, 0)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: '#22C55E',
        emissive: '#22C55E',
        emissiveIntensity: 2.1,
        roughness: 0.2,
      }),
    ),
  );
  habShelterDiamond.position.set(0, 2.85, 0);
  habShelterGroup.add(habShelterDiamond);
  habShelterGroup.visible = false;
  scene.add(habShelterGroup);

  // ============================================================================
  // 12. AEOLUS MARS WIND TURBINES (2 Ridge Horizontal Wide-Chord + 1 Vertical Helical)
  // ============================================================================
  const windmillGroup = new THREE.Group();
  const windmillRotors: THREE.Group[] = [];
  const windmillVerticalRotors: THREE.Group[] = [];

  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.lineTo(0.24, 0.35);
  bladeShape.lineTo(0.18, 2.35);
  bladeShape.lineTo(0.05, 2.75);
  bladeShape.lineTo(-0.06, 2.72);
  bladeShape.lineTo(-0.11, 0.32);
  bladeShape.closePath();
  const windBladeGeo = trackGeo(
    new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 2,
    }),
  );
  windBladeGeo.translate(0, 0, -0.022);

  const towerProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.56, 0.0),
    new THREE.Vector2(0.42, 0.45),
    new THREE.Vector2(0.28, 3.2),
    new THREE.Vector2(0.2, 6.4),
    new THREE.Vector2(0.0, 6.45),
  ];
  const windTowerGeo = trackGeo(new THREE.LatheGeometry(towerProfile, 14));

  const windLocations: [number, number, number][] = [
    [-10.2, -7.8, 0.38],
    [16.8, -8.2, -0.45],
  ];

  windLocations.forEach(([wx, wz, yaw]) => {
    const turbine = new THREE.Group();
    turbine.position.set(wx, groundHeightAt(wx, wz), wz);
    turbine.rotation.y = yaw;
    addContactShadow(turbine, 1.9, 1.9, 0.65);

    const pad = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.15, 1.32, 0.26, 8)), matDarkSteel);
    pad.position.y = 0.13;
    pad.castShadow = castShadow;
    pad.receiveShadow = true;
    turbine.add(pad);

    const tower = new THREE.Mesh(windTowerGeo, matHullPanel);
    tower.position.y = 0.24;
    tower.castShadow = castShadow;
    turbine.add(tower);

    const orangeCollar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.29, 0.31, 0.24, 14)), matMarsOrange);
    orangeCollar.position.y = 3.45;
    turbine.add(orangeCollar);

    // 4 steel guy-struts anchoring base
    for (let s = 0; s < 4; s++) {
      const a = (s / 4) * Math.PI * 2 + Math.PI / 4;
      const strutCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(a) * 1.05, 0.25, Math.sin(a) * 1.05),
        new THREE.Vector3(Math.cos(a) * 0.32, 1.95, Math.sin(a) * 0.32),
      ]);
      const strut = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(strutCurve, 6, 0.032, 6, false)), matDarkSteel);
      turbine.add(strut);
    }

    // Nacelle housing + aviation strobe + rear cooler
    const nacelle = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(0.68, 0.64, 1.35, 0.05)), matHullPanel);
    nacelle.position.set(0, 6.72, -0.15);
    nacelle.castShadow = castShadow;
    turbine.add(nacelle);

    const nacelleBeacon = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.075, 10, 8)), matWarmWindow);
    nacelleBeacon.position.set(0, 7.12, -0.45);
    turbine.add(nacelleBeacon);

    // 3-blade wide-chord rotor assembly (spins around local Z)
    const rotorHub = new THREE.Group();
    rotorHub.position.set(0, 6.72, 0.68);
    const noseCone = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.24, 0.56, 14)), matMarsOrange);
    noseCone.rotation.x = Math.PI / 2;
    noseCone.position.z = 0.24;
    rotorHub.add(noseCone);

    for (let b = 0; b < 3; b++) {
      const bWrap = new THREE.Group();
      bWrap.rotation.z = (b / 3) * Math.PI * 2;
      const blade = new THREE.Mesh(windBladeGeo, matBrushedAlum);
      blade.rotation.y = 0.22; // wide-chord pitch angle for thin 0.02 kg/m3 Mars air
      blade.castShadow = castShadow;
      bWrap.add(blade);
      rotorHub.add(bWrap);
    }

    turbine.add(rotorHub);
    windmillRotors.push(rotorHub);
    windmillGroup.add(turbine);
  });

  // Compact Vertical-Axis Helical Turbine near Weather Mast (-2.6, 1.2)
  const vTurbine = new THREE.Group();
  const vtX = -2.6;
  const vtZ = 1.2;
  vTurbine.position.set(vtX, groundHeightAt(vtX, vtZ), vtZ);
  addContactShadow(vTurbine, 0.9, 0.9, 0.55);

  const vtBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.45, 0.58, 0.34, 10)), matDarkSteel);
  vtBase.position.y = 0.17;
  vtBase.castShadow = castShadow;
  vTurbine.add(vtBase);

  const vtShaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.065, 3.0, 10)), matBrushedAlum);
  vtShaft.position.y = 1.65;
  vtShaft.castShadow = castShadow;
  vTurbine.add(vtShaft);

  const vRotor = new THREE.Group();
  vRotor.position.y = 2.05;
  for (let b = 0; b < 3; b++) {
    const startAng = (b / 3) * Math.PI * 2;
    const hPts: THREE.Vector3[] = [];
    for (let s = 0; s <= 12; s++) {
      const t = s / 12;
      const ang = startAng + t * 1.45;
      const rad = 0.42 + Math.sin(t * Math.PI) * 0.22;
      hPts.push(new THREE.Vector3(Math.cos(ang) * rad, (t - 0.5) * 1.65, Math.sin(ang) * rad));
    }
    const hBlade = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hPts), 14, 0.048, 8, false)),
      matMarsOrange,
    );
    hBlade.castShadow = castShadow;
    vRotor.add(hBlade);
  }
  vTurbine.add(vRotor);
  windmillVerticalRotors.push(vRotor);
  windmillGroup.add(vTurbine);

  registerInteractive(windmillGroup, 'windmill');
  scene.add(windmillGroup);

  // ============================================================================
  // 13. SWIM SUBSURFACE ICE DRILL DERRICK & CORE LAB (-14.5, -10.5 Crater Mascon)
  // ============================================================================
  const iceDrillGroup = new THREE.Group();
  const idX = -14.5;
  const idZ = -10.5;
  const idY = groundHeightAt(idX, idZ);
  iceDrillGroup.position.set(idX, idY, idZ);
  iceDrillGroup.rotation.y = 0.48;
  addContactShadow(iceDrillGroup, 2.4, 2.4, 0.65);

  const drillDeck = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.85, 2.05, 0.26, 8)), matDarkSteel);
  drillDeck.position.y = 0.13;
  drillDeck.castShadow = castShadow;
  drillDeck.receiveShadow = true;
  iceDrillGroup.add(drillDeck);

  // Frosted ice borehole collar
  const iceCollar = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.45, 0.11, 8, 18)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: '#bae6fd',
        emissive: '#0284c7',
        emissiveIntensity: 0.35,
        roughness: 0.25,
      }),
    ),
  );
  iceCollar.rotation.x = Math.PI / 2;
  iceCollar.position.y = 0.28;
  iceDrillGroup.add(iceCollar);

  // 3 Tripod derrick legs
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * 1.45, 0.24, Math.sin(a) * 1.45),
      new THREE.Vector3(0, 3.65, 0),
    ]);
    const leg = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(c, 8, 0.065, 8, false)), matMarsOrange);
    leg.castShadow = castShadow;
    iceDrillGroup.add(leg);
  }
  const drillMotor = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(0.68, 0.56, 0.68, 0.04)), matDarkSteel);
  drillMotor.position.y = 2.6;
  iceDrillGroup.add(drillMotor);

  const drillBit = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.07, 2.6, 10)), matBrushedAlum);
  drillBit.position.y = 1.3;
  iceDrillGroup.add(drillBit);

  // Meltwater condenser tank & core tray beside derrick
  const meltTank = new THREE.Mesh(trackGeo(o2TankGeo), matWaterBlue);
  meltTank.scale.setScalar(0.85);
  meltTank.position.set(1.25, 0.25, 0.4);
  meltTank.castShadow = castShadow;
  iceDrillGroup.add(meltTank);

  const drillBeacon = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.09, 10, 8)), matWarmWindow);
  drillBeacon.position.set(0, 3.75, 0);
  iceDrillGroup.add(drillBeacon);

  registerInteractive(iceDrillGroup, 'ice-drill');
  scene.add(iceDrillGroup);

  // ============================================================================
  // 14. ARES HEAVY LANDING PAD & PROPELLANT DEPOT (16.8, 9.2)
  // ============================================================================
  const landingPadGroup = new THREE.Group();
  const lpX = 16.8;
  const lpZ = 9.2;
  const lpY = groundHeightAt(lpX, lpZ);
  landingPadGroup.position.set(lpX, lpY, lpZ);
  addContactShadow(landingPadGroup, 5.4, 5.4, 0.5);

  const apronSlab = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(4.8, 5.15, 0.22, 8)), matDarkSteel);
  apronSlab.position.y = 0.11;
  apronSlab.receiveShadow = true;
  landingPadGroup.add(apronSlab);

  const padRingMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ffb703',
      roughness: 0.6,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  const padCircle = new THREE.Mesh(trackGeo(new THREE.RingGeometry(2.6, 2.95, 32)), padRingMat);
  padCircle.rotation.x = -Math.PI / 2;
  padCircle.position.y = 0.23;
  landingPadGroup.add(padCircle);

  // 4 corner perimeter approach beacons
  for (let c = 0; c < 4; c++) {
    const a = (c / 4) * Math.PI * 2 + Math.PI / 4;
    const post = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.09, 0.65, 8)), matDarkSteel);
    post.position.set(Math.cos(a) * 4.45, 0.42, Math.sin(a) * 4.45);
    landingPadGroup.add(post);

    const lamp = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.085, 8, 8)), matWarmWindow);
    lamp.position.set(Math.cos(a) * 4.45, 0.78, Math.sin(a) * 4.45);
    landingPadGroup.add(lamp);
  }

  // Twin vertical CH4/LOX propellant storage spheres + stacked cargo container
  [-1.2, 1.2].forEach((cz, idx) => {
    const propTank = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.68, 16, 12)), idx === 0 ? matHullPanel : matBrushedAlum);
    propTank.position.set(4.65, 0.95, cz);
    propTank.castShadow = castShadow;
    landingPadGroup.add(propTank);

    const leg = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.32, 0.44, 0.55, 8)), matDarkSteel);
    leg.position.set(4.65, 0.28, cz);
    landingPadGroup.add(leg);
  });

  const cargoPod = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(1.9, 1.15, 1.15, 0.04)), matMarsOrange);
  cargoPod.position.set(4.4, 0.64, -3.1);
  cargoPod.rotation.y = 0.22;
  cargoPod.castShadow = castShadow;
  landingPadGroup.add(cargoPod);

  registerInteractive(landingPadGroup, 'landing-pad');
  scene.add(landingPadGroup);

  const landmarkCenters: Record<OutpostLandmarkId, THREE.Vector3> = {
    habitat: new THREE.Vector3(habX, habY + 1.8, habZ),
    greenhouse: new THREE.Vector3(ghX, ghY + 1.2, ghZ),
    solar: new THREE.Vector3(11.4, groundHeightAt(11.4, -3.4) + 1.4, -3.4),
    rover: new THREE.Vector3(roverBaseX, groundHeightAt(roverBaseX, roverBaseZ) + 0.85, roverBaseZ),
    astronaut: new THREE.Vector3(astroX, groundHeightAt(astroX, astroZ) + 1.1, astroZ),
    'power-console': new THREE.Vector3(consoleX, consoleY + 1.1, consoleZ),
    windmill: new THREE.Vector3(-10.2, groundHeightAt(-10.2, -7.8) + 4.2, -7.8),
    'ice-drill': new THREE.Vector3(idX, idY + 1.8, idZ),
    'landing-pad': new THREE.Vector3(lpX, lpY + 1.2, lpZ),
  };

  // Optimal surface coordinates for proximity interaction during exploration
  const stationInteractPoints: Record<OutpostLandmarkId, THREE.Vector3> = {
    habitat: new THREE.Vector3(habX - 1.2, habY, habZ + 1.5), // Near airlock front steps
    greenhouse: new THREE.Vector3(ghX, ghY, ghZ),
    solar: new THREE.Vector3(11.4, groundHeightAt(11.4, -3.4), -3.4),
    rover: new THREE.Vector3(roverBaseX, groundHeightAt(roverBaseX, roverBaseZ), roverBaseZ),
    astronaut: new THREE.Vector3(astroX, groundHeightAt(astroX, astroZ), astroZ),
    'power-console': new THREE.Vector3(consoleX, consoleY, consoleZ),
    windmill: new THREE.Vector3(-10.2, groundHeightAt(-10.2, -7.8), -7.8),
    'ice-drill': new THREE.Vector3(idX, idY, idZ),
    'landing-pad': new THREE.Vector3(lpX, lpY, lpZ),
  };

  const zonePositions: Record<MissionZoneId, THREE.Vector3> = {
    tank2: new THREE.Vector3(tank2X, tank2Y, tank2Z),
    solar: new THREE.Vector3(9.8, groundHeightAt(9.8, -3.8), -3.8),
    recycler: new THREE.Vector3(recX, recY, recZ),
    greenhouse: new THREE.Vector3(ghX, ghY, ghZ),
    shelter: new THREE.Vector3(shX, shY, shZ),
  };

  return {
    interactiveTargets,
    dishMast,
    solarWings,
    solarDustMats,
    windmillRotors,
    windmillVerticalRotors,
    roverGroup,
    roverHead,
    roverWheels,
    roverEyeMat,
    roverGuideBeam,
    roverGuideBeamMat,
    updateRoverNameplate,
    astroGroup,
    astroPelvisGroup,
    astroTorsoGroup,
    astroHeadGroup,
    astroRightArmPivot,
    astroLeftArmPivot,
    astroRightElbowPivot,
    astroLeftElbowPivot,
    astroLeftLegPivot,
    astroRightLegPivot,
    astroLeftKneePivot,
    astroRightKneePivot,
    astroLeftAnklePivot,
    astroRightAnklePivot,
    powerConsoleGroup,
    powerBeaconRing,
    powerBeaconDiamond,
    powerBeaconRingMat,
    zoneBeaconGroup,
    zoneBeaconRing,
    zoneBeaconDiamond,
    zoneBeaconMat,
    dustDevilGroup,
    dustDevilFunnel,
    dustDevilPoints,
    dustDevilParticleSeeds,
    habShelterGroup,
    habShelterRing,
    habShelterDiamond,
    tank2ValveWheel,
    tank2LeakPoints,
    tank2LeakPositions,
    tank2LeakMat,
    recyclerStatusMat,
    ghFrostMat,
    matWarmWindow,
    matConsoleScreen,
    habWindowGlow,
    ghLight,
    roverBasePos: { x: roverBaseX, z: roverBaseZ },
    astroBasePos: { x: astroX, z: astroZ, yaw: -0.45 },
    stationInteractPoints,
    landmarkCenters,
    zonePositions,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
