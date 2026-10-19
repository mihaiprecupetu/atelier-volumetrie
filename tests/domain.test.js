(function () {
  "use strict";

  const results = document.getElementById("results");
  const summary = document.getElementById("summary");
  let passed = 0;
  let failed = 0;

  function assert(name, condition, details) {
    const item = document.createElement("li");
    item.className = condition ? "pass" : "fail";
    item.textContent = `${condition ? "PASS" : "FAIL"} — ${name}${details ? `: ${details}` : ""}`;
    results.appendChild(item);
    if (condition) passed += 1;
    else failed += 1;
  }

  function closeTo(actual, expected, tolerance) {
    return Math.abs(actual - expected) <= tolerance;
  }

  const domain = window.VolumetrieDomain;
  const square = [
    { id: "a", latitude: 44.4, longitude: 26.1 },
    { id: "b", latitude: 44.4, longitude: 26.101 },
    { id: "c", latitude: 44.401, longitude: 26.101 },
    { id: "d", latitude: 44.401, longitude: 26.1 }
  ];
  const area = domain.polygonArea(domain.localPoints(square));
  assert("aria poligonului este pozitivă și orientativ corectă",
    area > 8000 && area < 9000, `${area.toFixed(2)} m²`);
  assert("un dreptunghi WGS84 valid trece validarea",
    domain.validatePolygon(square).length === 0);
  const bowTie = [square[0], square[2], square[1], square[3]];
  assert("un poligon auto-intersectat este respins",
    domain.validatePolygon(bowTie).some((error) => error.includes("intersectează")));
  assert("mai puțin de trei puncte este invalid",
    domain.validatePolygon(square.slice(0, 2)).length > 0);
  const centroid = domain.getCentroid(domain.localPoints(square));
  const localSquare = domain.localPoints(square);
  const averageX = localSquare.reduce((sum, point) => sum + point.x, 0) / localSquare.length;
  const averageY = localSquare.reduce((sum, point) => sum + point.y, 0) / localSquare.length;
  assert("centroidul dreptunghiului este centrat",
    closeTo(centroid.x, averageX, 0.01) && closeTo(centroid.y, averageY, 0.01));

  const project = domain.createProject().project;
  project.site.vertices = square;
  project.site.referenceAreaM2 = 10000;
  project.regulations = {
    potMaxPercent: 20,
    cutMax: 0.8,
    maxHeightM: 10,
    uniformSetbackM: null
  };
  const variant = {
    id: "variant-1",
    name: "Test",
    widthM: 12,
    depthM: 9,
    upperFloors: 1,
    groundFloorHeightM: 3,
    typicalFloorHeightM: 2.8
  };
  const evaluation = domain.evaluateVariant(variant, project);
  assert("amprenta și aria desfășurată se calculează",
    evaluation.footprintArea === 108 && evaluation.floorArea === 216 &&
    closeTo(evaluation.height, 5.8, 1e-9));
  assert("POT și CUT se raportează la aria selectată",
    closeTo(evaluation.pot, 1.08, 1e-9) && closeTo(evaluation.cut, 0.0216, 1e-9));
  project.site.referenceAreaM2 = 0;
  assert("aria de referință zero nu este înlocuită tacit cu aria conturului",
    domain.evaluateVariant(variant, project).pot === null);
  project.site.referenceAreaM2 = 10000;
  assert("acoperișul în două ape contribuie la înălțimea totală",
    closeTo(domain.evaluateVariant({
      ...variant,
      roofType: "gable",
      roofPitchDeg: 30
    }, project).roofRise, 9 / 2 * Math.tan(Math.PI / 6), 1e-9));
  assert("varianta validă raportează starea de încadrare orientativă",
    evaluation.status === "În limitele datelor introduse");
  project.regulations.potMaxPercent = 1;
  assert("depășirea POT este identificată",
    domain.evaluateVariant(variant, project).status === "Depășire");
  project.regulations.potMaxPercent = 20;
  project.regulations.uniformSetbackM = 2;
  const uniformlySetBack = domain.evaluateVariant(variant, project);
  assert("retragerea uniformă este respectată de amplasarea automată",
    uniformlySetBack.placement !== null && uniformlySetBack.footprintInside &&
    uniformlySetBack.status === "În limitele datelor introduse");
  const variantSpecificSetbacks = domain.evaluateVariant({
    ...variant,
    setbackDirections: { north: 200, east: 0, south: 0, west: 0 }
  }, project);
  assert("fiecare variantă își aplică propriile retrageri",
    variantSpecificSetbacks.placement === null && uniformlySetBack.placement !== null);
  project.regulations.uniformSetbackM = null;
  project.regulations.setbackDirections = { north: 10, east: 4, south: 2, west: 1 };
  const directionallySetBack = domain.evaluateVariant(variant, project);
  const localBounds = domain.localPoints(square);
  const xMin = Math.min(...localBounds.map((point) => point.x));
  const xMax = Math.max(...localBounds.map((point) => point.x));
  const yMin = Math.min(...localBounds.map((point) => point.y));
  const yMax = Math.max(...localBounds.map((point) => point.y));
  assert("amplasarea automată respectă retragerile N/E/S/V",
    directionallySetBack.placement !== null &&
    directionallySetBack.placement.center.x >= xMin + 7 - 0.01 &&
    directionallySetBack.placement.center.x <= xMax - 10 + 0.01 &&
    directionallySetBack.placement.center.y >= yMin + 6.5 - 0.01 &&
    directionallySetBack.placement.center.y <= yMax - 14.5 + 0.01);
  project.regulations.setbackDirections.north = 80;
  const movedSouth = domain.evaluateVariant(variant, project);
  assert("mărirea retragerii nordice mută automat casa spre sud",
    movedSouth.placement !== null &&
    movedSouth.placement.center.y < directionallySetBack.placement.center.y - 10 &&
    movedSouth.placement.center.y <= yMax - 80 - variant.depthM / 2 + 0.01);
  project.regulations.setbackDirections.north = 10;
  const reversedProject = JSON.parse(JSON.stringify(project));
  reversedProject.site.vertices = [...square].reverse();
  const reversedPlacement = domain.evaluateVariant(variant, reversedProject);
  assert("retragerile cardinale rămân coerente la inversarea ordinii conturului",
    reversedPlacement.placement !== null &&
    reversedPlacement.status === "În limitele datelor introduse");
  project.regulations.setbackDirections = { north: 200, east: 200, south: 200, west: 200 };
  const noRoom = domain.evaluateVariant(variant, project);
  assert("o variantă care nu încape cu retragerile cerute este respinsă",
    noRoom.placement === null && noRoom.status === "Neverificat");
  project.regulations.setbackDirections = { north: null, east: null, south: null, west: null };
  const rotation = 31 * Math.PI / 180;
  const rotatedRectangle = [
    [-30, -15], [30, -15], [30, 15], [-30, 15]
  ].map(([x, y], index) => ({
    id: `rot-${index}`,
    latitude: 44.4 + (x * Math.sin(rotation) + y * Math.cos(rotation)) / 111319.49,
    longitude: 26.1 + (x * Math.cos(rotation) - y * Math.sin(rotation)) /
      (111319.49 * Math.cos(44.4 * Math.PI / 180))
  }));
  const rotatedPoints = domain.localPoints(rotatedRectangle);
  const optimized = domain.findMaximumRectangle(rotatedPoints,
    { north: 0, east: 0, south: 0, west: 0 });
  const directionDifference = Math.abs(((optimized.rotationDegrees - 31 + 90) % 180 + 180) % 180 - 90);
  assert("amprenta maximă se aliniază la un teren rotit față de nord",
    optimized !== null && directionDifference < 6 &&
    optimized.area > 1200 && optimized.area < 1800,
    `${optimized?.width.toFixed(1)} × ${optimized?.depth.toFixed(1)} m la ${optimized?.rotationDegrees.toFixed(1)}°`);
  const alignedRotatedMaximum = domain.findMaximumRectangle(
    rotatedPoints,
    { north: 0, east: 0, south: 0, west: 0 },
    Infinity,
    ["N"]
  );
  const alignedDirectionDifference = Math.abs(
    (((alignedRotatedMaximum?.rotationDegrees ?? NaN) - 31 + 45) % 90 + 90) % 90 - 45
  );
  assert("alinierea cardinală păstrează unghiul laturii parcelei rotite",
    alignedRotatedMaximum !== null && alignedDirectionDifference < 0.6);
  const areaLimited = domain.findMaximumRectangle(rotatedPoints,
    { north: 0, east: 0, south: 0, west: 0 }, 500);
  assert("amprenta maximă respectă plafonul de arie POT/CUT",
    areaLimited !== null && areaLimited.area <= 500.01);
  const alignedVariant = {
    ...variant,
    widthM: 20,
    depthM: 10,
    rotationDegrees: 0,
    setbackDirections: { north: 2, east: 3, south: 0, west: 0 }
  };
  const alignedProject = domain.createProject().project;
  alignedProject.site.vertices = square;
  alignedProject.regulations.alignmentSides = ["NE"];
  const alignedPlacement = domain.evaluateVariant(alignedVariant, alignedProject).placement;
  const squareBounds = domain.localPoints(square);
  const squareMaxX = Math.max(...squareBounds.map((point) => point.x));
  const squareMaxY = Math.max(...squareBounds.map((point) => point.y));
  assert("alinierea la colțul NE respectă retragerile variantei pe ambele laturi",
    alignedPlacement !== null &&
    closeTo(alignedPlacement.center.x, squareMaxX - 3 - alignedVariant.widthM / 2, 0.03) &&
    closeTo(alignedPlacement.center.y, squareMaxY - 2 - alignedVariant.depthM / 2, 0.03));
  const alignedMaximum = domain.findMaximumRectangle(
    squareBounds,
    { north: 2, east: 3, south: 0, west: 0 },
    Infinity,
    ["NE"]
  );
  assert("optimizarea maximă păstrează alinierea la colțul selectat",
    alignedMaximum !== null &&
    closeTo(Math.max(...alignedMaximum.footprint.map((point) => point.x)),
      squareMaxX - 3, 0.03) &&
    closeTo(Math.max(...alignedMaximum.footprint.map((point) => point.y)),
      squareMaxY - 2, 0.03));
  const alignedAreaLimit = domain.findMaximumRectangle(
    squareBounds,
    { north: 2, east: 3, south: 0, west: 0 },
    500,
    ["NE"]
  );
  assert("plafonul POT/CUT păstrează alinierea selectată",
    alignedAreaLimit !== null && alignedAreaLimit.area <= 500.01 &&
    closeTo(Math.max(...alignedAreaLimit.footprint.map((point) => point.x)),
      squareMaxX - 3, 0.03) &&
    closeTo(Math.max(...alignedAreaLimit.footprint.map((point) => point.y)),
      squareMaxY - 2, 0.03));
  assert("dimensiunile invalide ale variantei nu sunt declarate conforme",
    domain.evaluateVariant({ ...variant, widthM: 0 }, project).status === "Geometrie invalidă");

  const file = domain.createProject();
  file.project.name = "Test import";
  file.project.site.vertices = square;
  file.project.variants = [variant];
  assert("formatul de proiect acceptat este valid",
    domain.validateProjectFile(file) === file);
  file.project.regulations.alignmentSides = ["N", "SV"];
  assert("fișierul păstrează până la două opțiuni de aliniere",
    domain.validateProjectFile(file) === file);
  file.project.regulations.alignmentSides = ["N", "S", "E"];
  let tooManyAlignmentSidesRejected = false;
  try {
    domain.validateProjectFile(file);
  } catch (error) {
    tooManyAlignmentSidesRejected = error.message.includes("maximum două");
  }
  assert("importul respinge mai mult de două opțiuni de aliniere",
    tooManyAlignmentSidesRejected);
  file.project.regulations.alignmentSides = ["N", "N"];
  let duplicateAlignmentSidesRejected = false;
  try {
    domain.validateProjectFile(file);
  } catch (error) {
    duplicateAlignmentSidesRejected = error.message.includes("maximum două");
  }
  assert("importul respinge opțiunile duplicate de aliniere",
    duplicateAlignmentSidesRejected);
  file.project.regulations.alignmentSides = [];
  const roundTrip = JSON.parse(JSON.stringify(file));
  assert("serializarea JSON păstrează un proiect valid",
    domain.validateProjectFile(roundTrip).project.name === "Test import");
  const legacyFile = JSON.parse(JSON.stringify(file));
  delete legacyFile.project.regulations.setbackDirections;
  assert("fișierele vechi fără retrageri direcționale rămân importabile",
    domain.validateProjectFile(legacyFile) === legacyFile);
  let rejectedNegativeSetback = false;
  try {
    domain.validateProjectFile({
      ...file,
      project: {
        ...file.project,
        regulations: {
          ...file.project.regulations,
          setbackDirections: { north: -1, east: null, south: null, west: null }
        }
      }
    });
  } catch {
    rejectedNegativeSetback = true;
  }
  assert("retragerile direcționale negative sunt respinse la import", rejectedNegativeSetback);
  let rejectedVersion = false;
  try {
    domain.validateProjectFile({ ...file, schemaVersion: 999 });
  } catch {
    rejectedVersion = true;
  }
  assert("versiunea necunoscută a fișierului este respinsă", rejectedVersion);
  let rejectedCrs = false;
  try {
    domain.validateProjectFile({
      ...file,
      project: { ...file.project, site: { ...file.project.site, crs: "EPSG:3844" } }
    });
  } catch {
    rejectedCrs = true;
  }
  assert("CRS-ul neimplementat este respins explicit", rejectedCrs);
  let rejectedAxisOrder = false;
  try {
    domain.validateProjectFile({
      ...file,
      project: { ...file.project, site: { ...file.project.site, coordinateOrder: ["longitude", "latitude"] } }
    });
  } catch {
    rejectedAxisOrder = true;
  }
  assert("ordinea axelor incompatibilă este respinsă", rejectedAxisOrder);

  summary.textContent = `${passed} teste trecute · ${failed} eșuate`;
  summary.className = failed ? "fail" : "pass";
})();
