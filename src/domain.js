(function () {
  "use strict";

  const FORMAT = "volumetrie-project";
  const SCHEMA_VERSION = 1;

  function createProject() {
    const now = new Date().toISOString();
    return {
      format: FORMAT,
      schemaVersion: SCHEMA_VERSION,
      calculationVersion: "prototype-1",
      project: {
        id: crypto.randomUUID ? crypto.randomUUID() : `project-${Date.now()}`,
        name: "Studiu nou",
        description: "",
        createdAt: now,
        updatedAt: now,
        units: { length: "m", area: "m2" },
        site: {
          crs: "EPSG:4326",
          coordinateOrder: ["latitude", "longitude"],
          vertices: [],
          geometryInputMethod: "manual",
          digitization: null,
          referenceAreaM2: null,
          areaSource: "calculated",
          notes: ""
        },
        regulations: {
          potMaxPercent: null,
          cutMax: null,
          maxHeightM: null,
          maxAboveGroundLevels: null,
          referenceAreaMode: "calculated",
          setbacks: [],
          setbackDirections: { north: null, east: null, south: null, west: null },
          alignmentSides: [],
          uniformSetbackM: null,
          floorAreaMethod: "gross-level-sum-v1",
          source: {}
        },
        variants: []
      }
    };
  }

  function localPoints(vertices) {
    if (!vertices.length) return [];
    const lat0 = vertices.reduce((sum, vertex) => sum + vertex.latitude, 0) / vertices.length;
    const cosine = Math.cos(lat0 * Math.PI / 180);
    const origin = vertices[0];
    const metersPerDegree = 111319.49079327358;
    return vertices.map((vertex) => ({
      x: (vertex.longitude - origin.longitude) * metersPerDegree * cosine,
      y: (vertex.latitude - origin.latitude) * metersPerDegree
    }));
  }

  function polygonArea(points) {
    if (points.length < 3) return 0;
    let sum = 0;
    for (let i = 0; i < points.length; i += 1) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      sum += current.x * next.y - next.x * current.y;
    }
    return Math.abs(sum / 2);
  }

  function orientation(a, b, c) {
    const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
    if (Math.abs(value) < 1e-9) return 0;
    return value > 0 ? 1 : 2;
  }

  function onSegment(a, b, c) {
    return b.x <= Math.max(a.x, c.x) + 1e-9 &&
      b.x + 1e-9 >= Math.min(a.x, c.x) &&
      b.y <= Math.max(a.y, c.y) + 1e-9 &&
      b.y + 1e-9 >= Math.min(a.y, c.y);
  }

  function segmentsIntersect(p1, q1, p2, q2) {
    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);
    if (o1 !== o2 && o3 !== o4) return true;
    return (o1 === 0 && onSegment(p1, p2, q1)) ||
      (o2 === 0 && onSegment(p1, q2, q1)) ||
      (o3 === 0 && onSegment(p2, p1, q2)) ||
      (o4 === 0 && onSegment(p2, q1, q2));
  }

  function validatePolygon(vertices) {
    const errors = [];
    if (!Array.isArray(vertices) || vertices.length < 3) {
      return ["Adaugă cel puțin 3 vârfuri pentru a defini terenul."];
    }
    const points = localPoints(vertices);
    if (vertices.some((point) =>
      !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) ||
      point.latitude < -90 || point.latitude > 90 ||
      point.longitude < -180 || point.longitude > 180)) {
      errors.push("Coordonatele WGS84 trebuie să fie finite și în intervalele valide.");
      return errors;
    }
    for (let i = 0; i < points.length; i += 1) {
      const next = points[(i + 1) % points.length];
      if (Math.hypot(points[i].x - next.x, points[i].y - next.y) < 0.01) {
        errors.push(`Latura de la punctul ${i + 1} are lungime nulă.`);
        break;
      }
    }
    if (polygonArea(points) < 0.01) errors.push("Conturul are suprafață nulă sau prea mică.");
    for (let i = 0; i < points.length; i += 1) {
      const iNext = (i + 1) % points.length;
      for (let j = i + 1; j < points.length; j += 1) {
        const jNext = (j + 1) % points.length;
        if (i === j || iNext === j || jNext === i) continue;
        if (segmentsIntersect(points[i], points[iNext], points[j], points[jNext])) {
          errors.push("Poligonul se intersectează cu el însuși. Verifică ordinea punctelor.");
          return errors;
        }
      }
    }
    return errors;
  }

  function isInside(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
      const a = polygon[i];
      const b = polygon[j];
      const intersects = ((a.y > point.y) !== (b.y > point.y)) &&
        (point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || 1e-12) + a.x);
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function getCentroid(points) {
    if (!points.length) return { x: 0, y: 0 };
    let areaFactor = 0;
    let x = 0;
    let y = 0;
    for (let i = 0; i < points.length; i += 1) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      const cross = current.x * next.y - next.x * current.y;
      areaFactor += cross;
      x += (current.x + next.x) * cross;
      y += (current.y + next.y) * cross;
    }
    if (Math.abs(areaFactor) < 1e-8) {
      return {
        x: points.reduce((total, point) => total + point.x, 0) / points.length,
        y: points.reduce((total, point) => total + point.y, 0) / points.length
      };
    }
    return { x: x / (3 * areaFactor), y: y / (3 * areaFactor) };
  }

  function pointSegmentDistance(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared < 1e-12) return Math.hypot(point.x - start.x, point.y - start.y);
    const fraction = Math.max(0, Math.min(1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
    return Math.hypot(point.x - (start.x + fraction * dx), point.y - (start.y + fraction * dy));
  }

  function segmentDistance(a, b, c, d) {
    if (segmentsIntersect(a, b, c, d)) return 0;
    return Math.min(
      pointSegmentDistance(a, c, d),
      pointSegmentDistance(b, c, d),
      pointSegmentDistance(c, a, b),
      pointSegmentDistance(d, a, b)
    );
  }

  function getEdgeDirection(start, end, signedArea) {
    const direction = signedArea >= 0
      ? { x: end.y - start.y, y: start.x - end.x }
      : { x: start.y - end.y, y: end.x - start.x };
    if (Math.abs(direction.y) >= Math.abs(direction.x)) {
      return direction.y >= 0 ? "north" : "south";
    }
    return direction.x >= 0 ? "east" : "west";
  }

  function pointOnSegment(point, start, end) {
    return pointSegmentDistance(point, start, end) < 1e-7;
  }

  function isInsideOrOnBoundary(point, polygon) {
    for (let i = 0; i < polygon.length; i += 1) {
      if (pointOnSegment(point, polygon[i], polygon[(i + 1) % polygon.length])) return true;
    }
    return isInside(point, polygon);
  }

  function rectangleAt(centerX, centerY, width, depth, rotationRadians = 0) {
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    const cosine = Math.cos(rotationRadians);
    const sine = Math.sin(rotationRadians);
    return [[-halfWidth, -halfDepth], [halfWidth, -halfDepth],
      [halfWidth, halfDepth], [-halfWidth, halfDepth]].map(([x, y]) => ({
      x: centerX + x * cosine - y * sine,
      y: centerY + x * sine + y * cosine
    }));
  }

  function isFootprintInside(footprint, polygon) {
    if (!footprint.every((corner) => isInsideOrOnBoundary(corner, polygon))) return false;
    for (let i = 0; i < footprint.length; i += 1) {
      const next = (i + 1) % footprint.length;
      for (let j = 0; j < polygon.length; j += 1) {
        const polygonNext = (j + 1) % polygon.length;
        if (segmentsIntersect(footprint[i], footprint[next], polygon[j], polygon[polygonNext]) &&
            !footprint.some((corner) => pointOnSegment(corner, polygon[j], polygon[polygonNext]))) {
          return false;
        }
      }
    }
    for (const vertex of polygon) {
      const withinFootprint = vertex.x > Math.min(...footprint.map((point) => point.x)) + 1e-7 &&
        vertex.x < Math.max(...footprint.map((point) => point.x)) - 1e-7 &&
        vertex.y > Math.min(...footprint.map((point) => point.y)) + 1e-7 &&
        vertex.y < Math.max(...footprint.map((point) => point.y)) - 1e-7;
      if (withinFootprint) return false;
    }
    return true;
  }

  function placementMeetsSetbacks(footprint, polygon, setbacks) {
    const signedArea = polygon.reduce((sum, point, index) => {
      const next = polygon[(index + 1) % polygon.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0);
    for (let i = 0; i < polygon.length; i += 1) {
      const edgeStart = polygon[i];
      const edgeEnd = polygon[(i + 1) % polygon.length];
      const direction = getEdgeDirection(edgeStart, edgeEnd, signedArea);
      const required = setbacks[direction];
      if (!(required > 0)) continue;
      let distance = Infinity;
      for (let j = 0; j < footprint.length; j += 1) {
        distance = Math.min(distance, segmentDistance(
          footprint[j], footprint[(j + 1) % footprint.length], edgeStart, edgeEnd
        ));
      }
      if (distance + 1e-6 < required) return false;
    }
    return true;
  }

  const alignmentDirectionMap = {
    N: ["north"],
    S: ["south"],
    E: ["east"],
    V: ["west"],
    NE: ["north", "east"],
    NV: ["north", "west"],
    SE: ["south", "east"],
    SV: ["south", "west"]
  };

  function getAlignmentConstraints(polygon, setbacks, alignmentSides) {
    const selectedSides = alignmentSides || [];
    if (!Array.isArray(selectedSides) || selectedSides.length > 2 ||
        selectedSides.some((side) => !alignmentDirectionMap[side])) return null;
    const directions = [...new Set(selectedSides
      .flatMap((side) => alignmentDirectionMap[side] || []))];
    if (!directions.length) return [];
    const signedArea = polygon.reduce((sum, point, index) => {
      const next = polygon[(index + 1) % polygon.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0);
    const constraints = [];
    for (const direction of directions) {
      let longestEdge = null;
      for (let i = 0; i < polygon.length; i += 1) {
        const start = polygon[i];
        const end = polygon[(i + 1) % polygon.length];
        if (getEdgeDirection(start, end, signedArea) !== direction) continue;
        const length = Math.hypot(end.x - start.x, end.y - start.y);
        if (!longestEdge || length > longestEdge.length) {
          const normal = signedArea >= 0
            ? { x: end.y - start.y, y: start.x - end.x }
            : { x: start.y - end.y, y: end.x - start.x };
          longestEdge = {
            direction,
            start,
            end,
            length,
            normal: { x: normal.x / length, y: normal.y / length },
            angle: Math.atan2(end.y - start.y, end.x - start.x),
            setback: Number(setbacks[direction]) || 0
          };
        }
      }
      if (!longestEdge) return null;
      constraints.push(longestEdge);
    }
    return constraints;
  }

  function alignCenter(center, width, depth, angle, constraints) {
    if (!constraints.length) return center;
    const widthAxis = { x: Math.cos(angle), y: Math.sin(angle) };
    const depthAxis = { x: -Math.sin(angle), y: Math.cos(angle) };
    const angularTolerance = Math.PI / 360;
    const equations = constraints.map((constraint) => {
      const angleDifference = Math.abs(Math.atan2(
        Math.sin(4 * (constraint.angle - angle)),
        Math.cos(4 * (constraint.angle - angle))
      ) / 4);
      if (angleDifference > angularTolerance) return null;
      const support = width / 2 * Math.abs(
        widthAxis.x * constraint.normal.x + widthAxis.y * constraint.normal.y
      ) + depth / 2 * Math.abs(
        depthAxis.x * constraint.normal.x + depthAxis.y * constraint.normal.y
      );
      return {
        normal: constraint.normal,
        value: constraint.start.x * constraint.normal.x +
          constraint.start.y * constraint.normal.y - constraint.setback - support
      };
    });
    if (equations.some((equation) => equation === null)) return null;
    let alignedCenter = center;
    let independentEquation = null;
    for (const equation of equations.slice(1)) {
      const determinant = equations[0].normal.x * equation.normal.y -
        equations[0].normal.y * equation.normal.x;
      if (Math.abs(determinant) <= 1e-6) continue;
      independentEquation = equation;
      break;
    }
    if (independentEquation) {
      const first = equations[0];
      const second = independentEquation;
      const determinant = first.normal.x * second.normal.y -
        first.normal.y * second.normal.x;
      alignedCenter = {
        x: (first.value * second.normal.y - first.normal.y * second.value) / determinant,
        y: (first.normal.x * second.value - first.value * second.normal.x) / determinant
      };
    } else {
      const first = equations[0];
      const offset = first.value -
        (center.x * first.normal.x + center.y * first.normal.y);
      alignedCenter = {
        x: center.x + offset * first.normal.x,
        y: center.y + offset * first.normal.y
      };
    }
    if (equations.some((equation) => Math.abs(
      alignedCenter.x * equation.normal.x + alignedCenter.y * equation.normal.y - equation.value
    ) > 0.03)) return null;
    return alignedCenter;
  }

  function findAutomaticPlacement(
    polygon, width, depth, setbacks, rotationDegrees = 0, alignmentSides = []
  ) {
    if (polygon.length < 3 || !Number.isFinite(width) || !Number.isFinite(depth) ||
        width <= 0 || depth <= 0) return null;
    const constraints = getAlignmentConstraints(polygon, setbacks, alignmentSides);
    if (constraints === null) return null;
    const centroid = getCentroid(polygon);
    const bounds = polygon.reduce((result, point) => ({
      minX: Math.min(result.minX, point.x),
      maxX: Math.max(result.maxX, point.x),
      minY: Math.min(result.minY, point.y),
      maxY: Math.max(result.maxY, point.y)
    }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
    const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    const step = Math.max(0.25, span / 80);
    let best = null;
    const rotationRadians = rotationDegrees * Math.PI / 180;
    const consider = (x, y) => {
      const center = alignCenter({ x, y }, width, depth, rotationRadians, constraints);
      if (!center) return;
      const footprint = rectangleAt(center.x, center.y, width, depth, rotationRadians);
      if (!isFootprintInside(footprint, polygon) ||
          !placementMeetsSetbacks(footprint, polygon, setbacks)) return;
      const distance = Math.hypot(center.x - centroid.x, center.y - centroid.y);
      if (!best || distance < best.distance) best = { ...center, footprint, distance };
    };
    consider(centroid.x, centroid.y);
    if (best) return {
      center: { x: best.x, y: best.y },
      footprint: best.footprint,
      rotationDegrees
    };
    for (let x = bounds.minX + width / 2; x <= bounds.maxX - width / 2 + 1e-7; x += step) {
      for (let y = bounds.minY + depth / 2; y <= bounds.maxY - depth / 2 + 1e-7; y += step) {
        consider(x, y);
      }
    }
    if (!best) return null;
    let refinement = step / 4;
    for (let pass = 0; pass < 2; pass += 1) {
      const origin = { x: best.x, y: best.y };
      for (let dx = -2; dx <= 2; dx += 1) {
        for (let dy = -2; dy <= 2; dy += 1) {
          consider(origin.x + dx * refinement, origin.y + dy * refinement);
        }
      }
      refinement /= 4;
    }
    return {
      center: { x: best.x, y: best.y },
      footprint: best.footprint,
      rotationDegrees
    };
  }

  function findMaximumRectangle(polygon, setbacks, maxArea = Infinity, alignmentSides = []) {
    if (polygon.length < 3 || !Number.isFinite(maxArea) && maxArea !== Infinity) return null;
    const constraints = getAlignmentConstraints(polygon, setbacks, alignmentSides);
    if (constraints === null || maxArea <= 0) return null;
    const signedArea = polygon.reduce((sum, point, index) => {
      const next = polygon[(index + 1) % polygon.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0);
    const bounds = polygon.reduce((result, point) => ({
      minX: Math.min(result.minX, point.x),
      maxX: Math.max(result.maxX, point.x),
      minY: Math.min(result.minY, point.y),
      maxY: Math.max(result.maxY, point.y)
    }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
    const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    if (!(span > 0)) return null;
    let best = null;
    const aspectRatios = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2];
    const alignedAngles = constraints.flatMap((constraint) => [
      constraint.angle,
      constraint.angle + Math.PI / 2
    ]);
    const angles = constraints.length
      ? alignedAngles.map((angle) => ((angle % Math.PI) + Math.PI) % Math.PI)
      : Array.from({ length: 36 }, (_, index) => index * 5 * Math.PI / 180);
    const testCandidate = (angle, ratio, centerU, centerV, spanU, spanV) => {
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const candidateCenter = {
        x: centerU * cosine - centerV * sine,
        y: centerU * sine + centerV * cosine
      };
      const maximumWidth = Math.min(spanU, spanV * ratio,
        Number.isFinite(maxArea) ? Math.sqrt(maxArea * ratio) : Infinity);
      if (!(maximumWidth > 0)) return;
      const fits = (width) => {
        const center = alignCenter(
          candidateCenter, width, width / ratio, angle, constraints
        );
        if (!center) return false;
        const footprint = rectangleAt(center.x, center.y, width, width / ratio, angle);
        return isFootprintInside(footprint, polygon) &&
          placementMeetsSetbacks(footprint, polygon, setbacks);
      };
      let low = 0;
      let high = maximumWidth;
      for (let i = 0; i < 11; i += 1) {
        const middle = (low + high) / 2;
        if (fits(middle)) low = middle;
        else high = middle;
      }
      const area = low * (low / ratio);
      if (low > 0 && (!best || area > best.area)) {
        const width = low;
        const depth = width / ratio;
        const center = alignCenter(candidateCenter, width, depth, angle, constraints);
        if (!center) return;
        best = {
          center,
          width,
          depth,
          area,
          aspectRatio: ratio,
          rotationDegrees: angle * 180 / Math.PI,
          footprint: rectangleAt(center.x, center.y, width, depth, angle)
        };
      }
    };
    const searchAngle = (angle) => {
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const local = polygon.map((point) => ({
        x: point.x * cosine + point.y * sine,
        y: -point.x * sine + point.y * cosine
      }));
      const minX = Math.min(...local.map((point) => point.x));
      const maxX = Math.max(...local.map((point) => point.x));
      const minY = Math.min(...local.map((point) => point.y));
      const maxY = Math.max(...local.map((point) => point.y));
      const stepX = Math.max(span / 12, (maxX - minX) / 12);
      const stepY = Math.max(span / 12, (maxY - minY) / 12);
      for (const ratio of aspectRatios) {
        for (let x = minX + stepX / 2; x <= maxX; x += stepX) {
          for (let y = minY + stepY / 2; y <= maxY; y += stepY) {
            testCandidate(angle, ratio, x, y, maxX - minX, maxY - minY);
          }
        }
      }
    };
    for (const angle of [...new Set(angles.map((value) => value.toFixed(8)))]) {
      searchAngle(Number(angle));
    }
    if (!best) return null;
    const coarseBest = { ...best };
    const bestAngle = coarseBest.rotationDegrees * Math.PI / 180;
    const cosine = Math.cos(bestAngle);
    const sine = Math.sin(bestAngle);
    const centerU = coarseBest.center.x * cosine + coarseBest.center.y * sine;
    const centerV = -coarseBest.center.x * sine + coarseBest.center.y * cosine;
    const centerStep = span / 12 / 4;
    const ratioCandidates = [-0.2, -0.1, 0, 0.1, 0.2]
      .map((offset) => Math.max(0.4, Math.min(2.5, coarseBest.aspectRatio + offset)));
    for (let angleOffset = -4; angleOffset <= 4; angleOffset += 1) {
      const angle = bestAngle + angleOffset * Math.PI / 180;
      const local = polygon.map((point) => ({
        x: point.x * Math.cos(angle) + point.y * Math.sin(angle),
        y: -point.x * Math.sin(angle) + point.y * Math.cos(angle)
      }));
      const spanU = Math.max(...local.map((point) => point.x)) - Math.min(...local.map((point) => point.x));
      const spanV = Math.max(...local.map((point) => point.y)) - Math.min(...local.map((point) => point.y));
      for (const ratio of ratioCandidates) {
        for (let dx = -2; dx <= 2; dx += 1) {
          for (let dy = -2; dy <= 2; dy += 1) {
            testCandidate(
              angle, ratio,
              centerU + dx * centerStep,
              centerV + dy * centerStep,
              spanU, spanV
            );
          }
        }
      }
    }
    if (best.width < best.depth) {
      [best.width, best.depth] = [best.depth, best.width];
      best.rotationDegrees = (best.rotationDegrees + 90) % 180;
      best.footprint = rectangleAt(
        best.center.x, best.center.y, best.width, best.depth,
        best.rotationDegrees * Math.PI / 180
      );
    }
    return best;
  }

  function evaluateVariant(variant, project) {
    const vertices = project.site.vertices;
    const variantInputsValid = Number(variant.widthM) > 0 &&
      Number(variant.depthM) > 0 &&
      Number.isInteger(Number(variant.upperFloors)) &&
      Number(variant.upperFloors) >= 0 &&
      Number(variant.groundFloorHeightM) > 0 &&
      Number(variant.typicalFloorHeightM) > 0;
    const footprintArea = Math.max(0, Number(variant.widthM) || 0) *
      Math.max(0, Number(variant.depthM) || 0);
    const levels = Math.max(1, 1 + (Number(variant.upperFloors) || 0));
    const floorArea = footprintArea * levels;
    const height = (Number(variant.groundFloorHeightM) || 0) +
      (Number(variant.upperFloors) || 0) * (Number(variant.typicalFloorHeightM) || 0);
    const roofRise = getRoofRise(variant);
    const totalHeight = height + roofRise;
    const calculatedSiteArea = polygonArea(localPoints(vertices));
    const referenceArea = project.site.referenceAreaM2 !== null &&
      project.site.referenceAreaM2 !== undefined
      ? Number(project.site.referenceAreaM2)
      : calculatedSiteArea;
    const pot = referenceArea > 0 ? 100 * footprintArea / referenceArea : null;
    const cut = referenceArea > 0 ? floorArea / referenceArea : null;
    const polygon = localPoints(vertices);
    const plotErrors = validatePolygon(vertices);
    const regulations = project.regulations;
    const setbackDirections = variant.setbackDirections || regulations.setbackDirections || {};
    const setbacks = {};
    for (const direction of ["north", "east", "south", "west"]) {
      const directional = setbackDirections[direction];
      setbacks[direction] = directional !== null && directional !== undefined
        ? Number(directional)
        : Number(regulations.uniformSetbackM) || 0;
    }
    const placement = !plotErrors.length && variantInputsValid
      ? findAutomaticPlacement(
        polygon,
        Number(variant.widthM),
        Number(variant.depthM),
        setbacks,
        Number(variant.rotationDegrees) || 0,
        regulations.alignmentSides || []
      )
      : null;
    const footprintInside = Boolean(placement);
    const hasLimit = (value) => value !== null && value !== undefined &&
      value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
    const checks = [];
    if (!variantInputsValid) checks.push("invalid");
    if (hasLimit(regulations.potMaxPercent) && pot !== null) {
      checks.push(pot <= Number(regulations.potMaxPercent) ? "pass" : "over");
    } else checks.push("unknown");
    if (hasLimit(regulations.cutMax) && cut !== null) {
      checks.push(cut <= Number(regulations.cutMax) ? "pass" : "over");
    } else checks.push("unknown");
    if (hasLimit(regulations.maxHeightM)) {
      checks.push(totalHeight <= Number(regulations.maxHeightM) ? "pass" : "over");
    } else checks.push("unknown");
    if (vertices.length < 3) checks.push("unknown");
    else if (plotErrors.length) checks.push("invalid");
    else checks.push(footprintInside ? "pass" : "unknown");

    let status = "În limitele datelor introduse";
    if (checks.includes("invalid")) status = "Geometrie invalidă";
    else if (checks.includes("over")) status = "Depășire";
    else if (checks.includes("unknown")) status = "Neverificat";
    return {
      footprintArea,
      floorArea,
      height: totalHeight,
      wallHeight: height,
      pot,
      cut,
      referenceArea,
      footprintInside,
      placement,
      setbacks,
      roofRise,
      placementMessage: placement ? "Amplasare automată în zona construibilă" :
        "Nu s-a găsit o poziție pentru amprentă în zona construibilă.",
      status,
      checks
    };
  }

  function getRoofRise(variant) {
    const type = variant.roofType || (variant.roof === "flat" ? "flat" : "none");
    const pitch = Math.max(0, Number(variant.roofPitchDeg) || 0) * Math.PI / 180;
    if (type === "mono") return Math.max(0, Number(variant.widthM) || 0) * Math.tan(pitch);
    if (type === "gable") return Math.max(0, Number(variant.depthM) || 0) / 2 * Math.tan(pitch);
    if (type === "hip") {
      return Math.min(Number(variant.widthM) || 0, Number(variant.depthM) || 0) / 2 * Math.tan(pitch);
    }
    return 0;
  }

  function validateProjectFile(input) {
    if (!input || input.format !== FORMAT || input.schemaVersion !== SCHEMA_VERSION ||
        !input.project || typeof input.project !== "object") {
      throw new Error("Fișierul nu este un proiect Volumetrie compatibil (schema 1).");
    }
    const project = input.project;
    if (typeof project.name !== "string" || !project.site ||
        !project.regulations || !Array.isArray(project.variants)) {
      throw new Error("Proiectul nu conține toate secțiunile obligatorii.");
    }
    if (!Array.isArray(project.variants) || project.variants.length > 20) {
      throw new Error("Fișierul are o listă de variante invalidă (maximum 20).");
    }
    if (!project.site || project.site.crs !== "EPSG:4326" ||
        !Array.isArray(project.site.vertices) || project.site.vertices.length > 1000) {
      throw new Error("Prototipul acceptă proiecte cu teren WGS84 și maximum 1.000 de vârfuri.");
    }
    if (!Array.isArray(project.site.coordinateOrder) ||
        project.site.coordinateOrder.length !== 2 ||
        project.site.coordinateOrder[0] !== "latitude" ||
        project.site.coordinateOrder[1] !== "longitude") {
      throw new Error("Ordinea coordonatelor nu corespunde formatului WGS84 al prototipului.");
    }
    const numericFields = ["potMaxPercent", "cutMax", "maxHeightM", "uniformSetbackM"];
    const alignmentSides = project.regulations.alignmentSides;
    const validAlignmentSides = ["N", "S", "E", "V", "NE", "NV", "SE", "SV"];
    if (alignmentSides !== undefined &&
        (!Array.isArray(alignmentSides) || alignmentSides.length > 2 ||
          new Set(alignmentSides).size !== alignmentSides.length ||
          alignmentSides.some((side) => !validAlignmentSides.includes(side)))) {
      throw new Error("Selectează maximum două laturi de aliniere valide.");
    }
    for (const field of numericFields) {
      const value = project.regulations && project.regulations[field];
      if (value !== null && value !== undefined &&
          (typeof value !== "number" || !Number.isFinite(value))) {
        throw new Error(`Valoare invalidă în regulile proiectului: ${field}.`);
      }
      const setbackDirections = project.regulations.setbackDirections;
      if (setbackDirections !== undefined && (!setbackDirections ||
          typeof setbackDirections !== "object" || Array.isArray(setbackDirections))) {
        throw new Error("Retragerile pe direcții trebuie să fie un obiect valid.");
      }
      for (const direction of ["north", "east", "south", "west"]) {
        const value = setbackDirections?.[direction];
        if (value !== null && value !== undefined &&
            (typeof value !== "number" || !Number.isFinite(value) || value < 0)) {
          throw new Error(`Retragerea ${direction} trebuie să fie un număr pozitiv sau necompletată.`);
        }
      }
      if (value !== null && value !== undefined && Number(value) < 0) {
        throw new Error(`Valoarea ${field} nu poate fi negativă.`);
      }
      if (field === "potMaxPercent" && value !== null && value !== undefined && Number(value) > 100) {
        throw new Error("POT maxim trebuie să fie între 0 și 100%.");
      }
    }
    for (const [index, vertex] of project.site.vertices.entries()) {
      if (typeof vertex.latitude !== "number" || !Number.isFinite(vertex.latitude) ||
          typeof vertex.longitude !== "number" || !Number.isFinite(vertex.longitude) ||
          vertex.latitude < -90 || vertex.latitude > 90 ||
          vertex.longitude < -180 || vertex.longitude > 180) {
        throw new Error(`Coordonate invalide la punctul ${index + 1}.`);
      }
    }
    const vertexIds = project.site.vertices.map((vertex) => vertex.id);
    if (vertexIds.some((id) => typeof id !== "string" || !id) ||
        new Set(vertexIds).size !== vertexIds.length) {
      throw new Error("Identificatorii vârfurilor trebuie să fie texte unice.");
    }
    const referenceArea = project.site.referenceAreaM2;
    if (referenceArea !== null && referenceArea !== undefined &&
        (typeof referenceArea !== "number" || !Number.isFinite(referenceArea) || referenceArea <= 0)) {
      throw new Error("Suprafața de referință trebuie să fie un număr pozitiv sau necompletată.");
    }
    const variantIds = project.variants.map((variant) => variant.id);
    if (variantIds.some((id) => typeof id !== "string" || !id) ||
        new Set(variantIds).size !== variantIds.length) {
      throw new Error("Identificatorii variantelor trebuie să fie texte unice.");
    }
    for (const variant of project.variants) {
      if (typeof variant.widthM !== "number" || !Number.isFinite(variant.widthM) ||
          variant.widthM <= 0 || typeof variant.depthM !== "number" ||
          !Number.isFinite(variant.depthM) || variant.depthM <= 0 ||
          typeof variant.upperFloors !== "number" || !Number.isInteger(variant.upperFloors) ||
          variant.upperFloors < 0 || variant.upperFloors > 4 ||
          typeof variant.groundFloorHeightM !== "number" ||
          !Number.isFinite(variant.groundFloorHeightM) || variant.groundFloorHeightM <= 0 ||
          typeof variant.typicalFloorHeightM !== "number" ||
          !Number.isFinite(variant.typicalFloorHeightM) || variant.typicalFloorHeightM <= 0) {
        throw new Error("Fișierul conține o variantă cu dimensiuni invalide.");
      }
      if (variant.rotationDegrees !== undefined &&
          (typeof variant.rotationDegrees !== "number" || !Number.isFinite(variant.rotationDegrees))) {
        throw new Error("Unghiul de rotire al unei variante trebuie să fie finit.");
      }
      if (variant.roofType !== undefined &&
          !["none", "flat", "mono", "gable", "hip"].includes(variant.roofType)) {
        throw new Error("Fișierul conține un tip de acoperiș necunoscut.");
      }
      if (variant.roofPitchDeg !== undefined &&
          (typeof variant.roofPitchDeg !== "number" || !Number.isFinite(variant.roofPitchDeg) ||
            variant.roofPitchDeg < 5 || variant.roofPitchDeg > 60)) {
        throw new Error("Panta acoperișului trebuie să fie între 5° și 60°.");
      }
      if (variant.setbackDirections !== undefined &&
          (!variant.setbackDirections || typeof variant.setbackDirections !== "object" ||
            Array.isArray(variant.setbackDirections))) {
        throw new Error("Retragerile unei variante trebuie să fie un obiect valid.");
      }
      for (const direction of ["north", "south", "east", "west"]) {
        const setback = variant.setbackDirections?.[direction];
        if (setback !== null && setback !== undefined &&
            (typeof setback !== "number" || !Number.isFinite(setback) || setback < 0)) {
          throw new Error(`Retragerea ${direction} a unei variante trebuie să fie pozitivă sau necompletată.`);
        }
      }
    }
    return input;
  }

  window.VolumetrieDomain = {
    FORMAT,
    SCHEMA_VERSION,
    createProject,
    localPoints,
    polygonArea,
    validatePolygon,
    getCentroid,
    findAutomaticPlacement,
    findMaximumRectangle,
    getRoofRise,
    evaluateVariant,
    validateProjectFile
  };
})();
