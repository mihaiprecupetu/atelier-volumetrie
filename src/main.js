(function () {
  "use strict";

  const STORAGE_KEY = "volumetrie.project.v1";
  const THEME_STORAGE_KEY = "volumetrie.theme.v1";
  const steps = ["project", "site", "rules", "variants"];
  const domain = window.VolumetrieDomain;
  let storageBlocked = false;
  let startupError = null;
  let state = loadProject();
  let activeStep = "project";
  let selectedVariantId = state.project.variants[0]?.id || null;
  let drawingEnabled = true;
  let toastTimer;
  let map;
  let viewerMode = "3d";

  function loadProject() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return domain.createProject();
      const parsed = domain.validateProjectFile(JSON.parse(saved));
      return parsed;
    } catch (error) {
      console.error("Local project could not be loaded:", error);
      storageBlocked = true;
      startupError = "Proiectul local nu a putut fi citit. Importă o copie sau creează explicit un proiect nou.";
      return domain.createProject();
    }
    if (state.project.site.vertices.length >= 3) map && (map._hasFittedBounds = false);
  }

  function saveProject() {
    state.project.updatedAt = new Date().toISOString();
    if (storageBlocked) {
      setSaveStatus(startupError || "Stocarea locală este indisponibilă · exportă proiectul", true);
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSaveStatus("Salvat local · " + new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }), false);
    } catch (error) {
      console.error("Local project save failed:", error);
      setSaveStatus("Salvarea locală a eșuat · exportă o copie", true);
    }
  }

  function setSaveStatus(text, failed) {
    const element = document.getElementById("save-status");
    element.textContent = text;
    element.closest(".sidebar-bottom").classList.toggle("save-error", Boolean(failed));
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
  }

  function applyTheme(theme, persist) {
    const isDark = theme === "dark";
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    const button = document.getElementById("theme-toggle");
    const action = isDark ? "Activează tema luminoasă" : "Activează tema întunecată";
    button.setAttribute("aria-label", action);
    button.setAttribute("title", action);
    button.setAttribute("aria-pressed", String(isDark));
    button.querySelector(".theme-icon").textContent = isDark ? "☀" : "☾";

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = isDark ? "#171c18" : "#f5f5f0";
    if (!persist) return;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error("Theme preference could not be saved:", error);
      showToast("Tema s-a schimbat, dar preferința nu a putut fi salvată.");
    }
  }

  function initializeTheme() {
    const savedTheme = document.documentElement.dataset.theme;
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)");
    let followsSystem = savedTheme !== "light" && savedTheme !== "dark";
    const theme = savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : systemPrefersDark.matches ? "dark" : "light";
    applyTheme(theme, false);

    document.getElementById("theme-toggle").addEventListener("click", () => {
      followsSystem = false;
      applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true);
    });
    systemPrefersDark.addEventListener("change", (event) => {
      if (followsSystem) {
        applyTheme(event.matches ? "dark" : "light", false);
      }
    });
  }

  function optionalNumber(value) {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function formatNumber(value, digits = 2) {
    if (value === null || !Number.isFinite(value)) return "—";
    return new Intl.NumberFormat("ro-RO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits
    }).format(value);
  }

  function showStep(step) {
    if (!steps.includes(step)) return;
    if (step === "rules" && state.project.site.vertices.length < 3) {
      showToast("Definește mai întâi conturul terenului cu cel puțin 3 puncte.");
      return;
    }
    if (step === "rules") {
      const geometryErrors = domain.validatePolygon(state.project.site.vertices);
      if (geometryErrors.length) {
        showToast(geometryErrors[0]);
        return;
      }
      if (state.project.site.referenceAreaM2 !== null &&
          Number(state.project.site.referenceAreaM2) <= 0) {
        showToast("Suprafața de referință trebuie să fie mai mare decât zero.");
        return;
      }
    }
    if (step === "variants") {
      if (!state.project.name.trim()) {
        showToast("Completează numele proiectului înainte de a continua.");
        showStep("project");
        return;
      }
      const geometryErrors = domain.validatePolygon(state.project.site.vertices);
      if (geometryErrors.length) {
        showToast(geometryErrors[0]);
        showStep("site");
        return;
      }
      if (!state.project.variants.length) addVariant();
    }
    activeStep = step;
    document.querySelectorAll(".step-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.panel === step);
    });
    document.querySelectorAll(".step-link").forEach((button) => {
      button.classList.toggle("active", button.dataset.step === step);
      button.classList.toggle("complete", steps.indexOf(button.dataset.step) < steps.indexOf(step));
    });
    document.querySelector(".content-wrap").scrollIntoView({ behavior: "smooth", block: "start" });
    if (step === "site" && map) setTimeout(() => map.invalidateSize(), 80);
    render();
  }

  function addMapVertex(latitude, longitude) {
    if (!drawingEnabled) return;
    state.project.site.vertices.push({
      id: makeId("v"),
      latitude: Number(latitude.toFixed(7)),
      longitude: Number(longitude.toFixed(7))
    });
    state.project.site.geometryInputMethod = "map";
    state.project.site.digitization = {
      provider: "OpenStreetMap",
      capturedAt: new Date().toISOString(),
      note: "Digitizare orientativă."
    };
    saveProject();
    render();
  }

  function moveMapVertex(index, latitude, longitude) {
    const vertex = state.project.site.vertices[index];
    if (!vertex) return;
    vertex.latitude = Number(latitude.toFixed(7));
    vertex.longitude = Number(longitude.toFixed(7));
    saveProject();
    render();
  }

  function makeId(prefix) {
    return `${prefix}-${window.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;
  }

  function setInputValue(id, value) {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = value === null || value === undefined ? "" : String(value);
  }

  function syncInputs() {
    const project = state.project;
    setInputValue("project-name", project.name);
    setInputValue("project-description", project.description);
    setInputValue("site-area", project.site.referenceAreaM2);
    setInputValue("pot-max", project.regulations.potMaxPercent);
    setInputValue("cut-max", project.regulations.cutMax);
    setInputValue("height-max", project.regulations.maxHeightM);
    setInputValue("rule-source", project.regulations.source?.title || "");
    const alignmentSides = project.regulations.alignmentSides || [];
    document.querySelectorAll("[data-alignment-side]").forEach((input) => {
      input.checked = alignmentSides.includes(input.dataset.alignmentSide);
      input.disabled = alignmentSides.length >= 2 && !input.checked;
    });
    document.getElementById("alignment-count").textContent =
      `${alignmentSides.length} din 2 selectate`;
    document.getElementById("top-project-name").textContent = project.name || "Studiu nou";
    document.getElementById("reference-area-display").textContent =
      `${formatNumber(getReferenceArea(), 2)} m²`;
  }

  function getCalculatedArea() {
    return domain.polygonArea(domain.localPoints(state.project.site.vertices));
  }

  function getReferenceArea() {
    const entered = state.project.site.referenceAreaM2;
    return entered !== null && entered !== undefined ? Number(entered) : getCalculatedArea();
  }

  function renderCoordinateRows() {
    const tbody = document.getElementById("coordinate-rows");
    const vertices = state.project.site.vertices;
    tbody.innerHTML = "";
    vertices.forEach((vertex, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${index + 1}</td>
        <td><input aria-label="Latitudine punct ${index + 1}" inputmode="decimal" data-coordinate="latitude" data-index="${index}" value="${escapeAttribute(vertex.latitude)}"></td>
        <td><input aria-label="Longitudine punct ${index + 1}" inputmode="decimal" data-coordinate="longitude" data-index="${index}" value="${escapeAttribute(vertex.longitude)}"></td>
        <td><button class="delete-vertex" data-delete-vertex="${index}" aria-label="Șterge punctul ${index + 1}">×</button></td>`;
      tbody.appendChild(row);
    });
    document.getElementById("vertex-count").textContent = `${vertices.length} vârfuri · minimum 3`;
    const errors = domain.validatePolygon(vertices);
    const count = document.getElementById("vertex-count");
    count.classList.toggle("invalid-text", errors.length > 0 && vertices.length >= 3);
    document.getElementById("calculated-area").textContent =
      vertices.length >= 3 && !errors.length ? `${formatNumber(getCalculatedArea())} m²` : "— m²";
  }

  function escapeAttribute(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  function renderVariants() {
    const list = document.getElementById("variant-list");
    list.innerHTML = "";
    document.getElementById("variant-count").textContent =
      `${state.project.variants.length} ${state.project.variants.length === 1 ? "propunere" : "propuneri"}`;
    if (!state.project.variants.length) {
      list.innerHTML = '<div class="empty-list">Nicio variantă încă. Adaugă o propunere pentru a începe studiul.</div>';
    }
    state.project.variants.forEach((variant) => {
      const evaluation = domain.evaluateVariant(variant, state.project);
      const item = document.createElement("article");
      item.className = `variant-item ${variant.id === selectedVariantId ? "selected" : ""}`;
      item.dataset.variant = variant.id;
      item.innerHTML = `
        <div class="variant-main" data-select-variant="${escapeAttribute(variant.id)}">
          <strong>${escapeHtml(variant.name)}</strong>
          <small>${variant.upperFloors ? `P+${variant.upperFloors}` : "P"} · ${formatNumber(evaluation.height, 1)} m înălțime</small>
        </div>
        <button class="variant-delete" data-delete-variant="${escapeAttribute(variant.id)}" aria-label="Șterge ${escapeAttribute(variant.name)}">×</button>
        <div class="variant-controls">
          <div class="variant-field variant-field-wide">
            <label for="variant-${escapeAttribute(variant.id)}-name">Denumire variantă</label>
            <input id="variant-${escapeAttribute(variant.id)}-name" aria-label="Nume variantă" data-variant-field="name" data-id="${escapeAttribute(variant.id)}" value="${escapeAttribute(variant.name)}" placeholder="ex. Casa compactă">
          </div>
          <div class="variant-field">
            <label for="variant-${escapeAttribute(variant.id)}-floors">Regim de niveluri</label>
            <select id="variant-${escapeAttribute(variant.id)}-floors" aria-label="Regim de niveluri" data-variant-field="upperFloors" data-id="${escapeAttribute(variant.id)}">
              <option value="0" ${variant.upperFloors === 0 ? "selected" : ""}>P</option>
              <option value="1" ${variant.upperFloors === 1 ? "selected" : ""}>P+1</option>
              <option value="2" ${variant.upperFloors === 2 ? "selected" : ""}>P+2</option>
              <option value="3" ${variant.upperFloors === 3 ? "selected" : ""}>P+3</option>
              <option value="4" ${variant.upperFloors === 4 ? "selected" : ""}>P+4</option>
            </select>
          </div>
          <div class="variant-field">
            <label for="variant-${escapeAttribute(variant.id)}-width">Lățime amprentă (m)</label>
            <input id="variant-${escapeAttribute(variant.id)}-width" type="number" min="1" step="0.5" aria-label="Lățime amprentă în metri" data-variant-field="widthM" data-id="${escapeAttribute(variant.id)}" value="${escapeAttribute(variant.widthM)}" placeholder="ex. 12">
          </div>
          <div class="variant-field">
            <label for="variant-${escapeAttribute(variant.id)}-depth">Adâncime amprentă (m)</label>
            <input id="variant-${escapeAttribute(variant.id)}-depth" type="number" min="1" step="0.5" aria-label="Adâncime amprentă în metri" data-variant-field="depthM" data-id="${escapeAttribute(variant.id)}" value="${escapeAttribute(variant.depthM)}" placeholder="ex. 9">
          </div>
          <div class="variant-field">
            <label for="variant-${escapeAttribute(variant.id)}-ground-height">Înălțime parter (m)</label>
            <input id="variant-${escapeAttribute(variant.id)}-ground-height" type="number" min="0.1" step="0.1" aria-label="Înălțime parter în metri" data-variant-field="groundFloorHeightM" data-id="${escapeAttribute(variant.id)}" value="${escapeAttribute(variant.groundFloorHeightM)}" placeholder="ex. 3">
          </div>
          <div class="variant-field">
            <label for="variant-${escapeAttribute(variant.id)}-floor-height">Înălțime etaj tip (m)</label>
            <input id="variant-${escapeAttribute(variant.id)}-floor-height" type="number" min="0.1" step="0.1" aria-label="Înălțime etaj tip în metri" data-variant-field="typicalFloorHeightM" data-id="${escapeAttribute(variant.id)}" value="${escapeAttribute(variant.typicalFloorHeightM)}" placeholder="ex. 2,8">
          </div>
          <div class="variant-field variant-field-wide variant-setback-field">
            <span class="variant-field-label">Retrageri proprii variantei (m)</span>
            <div class="variant-setbacks">
              ${[
                ["north", "N"],
                ["south", "S"],
                ["east", "E"],
                ["west", "V"]
              ].map(([direction, label]) => `
                <div class="variant-field">
                  <label for="variant-${escapeAttribute(variant.id)}-setback-${direction}">${label}</label>
                  <input id="variant-${escapeAttribute(variant.id)}-setback-${direction}" type="number" min="0" step="0.1" aria-label="Retragere ${label} în metri" data-variant-field="setback${direction[0].toUpperCase()}${direction.slice(1)}" data-id="${escapeAttribute(variant.id)}" value="${escapeAttribute(variant.setbackDirections?.[direction] ?? "")}" placeholder="0">
                </div>`).join("")}
            </div>
          </div>
          <div class="variant-field variant-field-wide">
            <label for="variant-${escapeAttribute(variant.id)}-roof">Acoperiș</label>
            <div class="variant-roof-controls">
              <select id="variant-${escapeAttribute(variant.id)}-roof" aria-label="Tip acoperiș" data-variant-field="roofType" data-id="${escapeAttribute(variant.id)}">
                <option value="none" ${(variant.roofType || "flat") === "none" ? "selected" : ""}>Fără acoperiș</option>
                <option value="flat" ${(variant.roofType || "flat") === "flat" ? "selected" : ""}>Terasă · 0 ape</option>
                <option value="mono" ${variant.roofType === "mono" ? "selected" : ""}>O apă</option>
                <option value="gable" ${variant.roofType === "gable" ? "selected" : ""}>Două ape</option>
                <option value="hip" ${variant.roofType === "hip" ? "selected" : ""}>Patru ape</option>
              </select>
              <div class="variant-field ${["none", "flat"].includes(variant.roofType || "flat") ? "pitch-disabled" : ""}">
                <label for="variant-${escapeAttribute(variant.id)}-pitch">Pantă (°)</label>
                <input id="variant-${escapeAttribute(variant.id)}-pitch" type="number" min="5" max="60" step="1" aria-label="Panta acoperișului în grade" data-variant-field="roofPitchDeg" data-id="${escapeAttribute(variant.id)}" value="${escapeAttribute(variant.roofPitchDeg ?? 30)}" ${["none", "flat"].includes(variant.roofType || "flat") ? "disabled" : ""}>
              </div>
            </div>
          </div>
          </div>
        <div class="variant-status">${escapeHtml(evaluation.status)}</div>`;
      item.addEventListener("click", (event) => {
        if (event.target.closest("button,input,select,label")) return;
        selectedVariantId = variant.id;
        render();
      });
      list.appendChild(item);
    });
    renderVolume();
    renderMetrics();
  }

  function escapeHtml(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }

  function renderVolume() {
    const container = document.getElementById("volume-view");
    const variant = state.project.variants.find((item) => item.id === selectedVariantId);
    document.getElementById("view-2d").setAttribute("aria-pressed", String(viewerMode === "2d"));
    document.getElementById("view-3d").setAttribute("aria-pressed", String(viewerMode === "3d"));
    document.getElementById("viewer-badge").textContent = viewerMode === "2d"
      ? "PLAN · VEDERE DE SUS"
      : "3D · MODEL SCHEMATIC";
    if (!variant) {
      document.getElementById("viewer-title").textContent = "Selectează o variantă";
      document.getElementById("viewer-dimensions").textContent = "—";
      document.getElementById("viewer-placement").textContent = "Amplasare automată după retrageri";
      container.innerHTML = '<div class="empty-view">Adaugă o variantă pentru a vedea volumul.</div>';
      return;
    }
    const result = domain.evaluateVariant(variant, state.project);
    document.getElementById("viewer-title").textContent = variant.name;
    document.getElementById("viewer-dimensions").textContent =
      `${formatNumber(variant.widthM, 1)} × ${formatNumber(variant.depthM, 1)} m · rotire ${formatNumber(result.placement?.rotationDegrees ?? variant.rotationDegrees ?? 0, 1)}° · ${variant.upperFloors + 1} niveluri`;
    document.getElementById("viewer-placement").textContent = result.placement
      ? `${result.placementMessage} · centru ${formatNumber(result.placement.center.x, 1)}, ${formatNumber(result.placement.center.y, 1)} m față de reperul terenului`
      : result.placementMessage;
    container.innerHTML = viewerMode === "2d"
      ? renderSitePlan(variant, result)
      : renderSiteAxonometry(variant, result);
  }

  function renderSitePlan(variant, result) {
    const plot = domain.localPoints(state.project.site.vertices);
    if (plot.length < 3) {
      return '<div class="empty-view">Definește conturul terenului pentru a vedea amplasarea.</div>';
    }
    const minX = Math.min(...plot.map((point) => point.x));
    const maxX = Math.max(...plot.map((point) => point.x));
    const minY = Math.min(...plot.map((point) => point.y));
    const maxY = Math.max(...plot.map((point) => point.y));
    const scale = Math.min(520 / Math.max(maxX - minX, 1), 280 / Math.max(maxY - minY, 1));
    const projectPoint = (point) => [
      300 + (point.x - (minX + maxX) / 2) * scale,
      170 - (point.y - (minY + maxY) / 2) * scale
    ];
    const points = (items) => items.map((point) => projectPoint(point).join(",")).join(" ");
    const signedArea = plot.reduce((sum, point, index) => {
      const next = plot[(index + 1) % plot.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0);
    const guideMarkup = plot.map((start, index) => {
      const end = plot[(index + 1) % plot.length];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy) || 1;
      const direction = signedArea >= 0 ? { x: dy, y: -dx } : { x: -dy, y: dx };
      const side = Math.abs(direction.y) >= Math.abs(direction.x)
        ? direction.y >= 0 ? "north" : "south"
        : direction.x >= 0 ? "east" : "west";
      const distance = result.setbacks[side];
      if (!(distance > 0)) return "";
      const inward = { x: -direction.x / length * distance, y: -direction.y / length * distance };
      const a = projectPoint({ x: start.x + inward.x, y: start.y + inward.y });
      const b = projectPoint({ x: end.x + inward.x, y: end.y + inward.y });
      return `<line class="setback-guide" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" />`;
    }).join("");
    const footprint = result.placement?.footprint;
    const house = footprint
      ? `<polygon class="site-house" points="${points(footprint)}" />
         <text class="site-house-label" x="${projectPoint(result.placement.center)[0]}" y="${projectPoint(result.placement.center)[1]}" text-anchor="middle">CASĂ · ${escapeHtml(variant.name)}</text>`
      : "";
    return `<svg viewBox="0 0 600 340" role="img" aria-label="Plan 2D cu amplasarea variantei ${escapeAttribute(variant.name)} pe teren">
      <text class="north-indicator" x="550" y="35">N ↑</text>
      <polygon class="site-plot" points="${points(plot)}" />
      ${guideMarkup}${house}
      <text class="plan-caption" x="300" y="325" text-anchor="middle">${result.placement ? "Contur teren · retrageri · amprenta casei" : escapeHtml(result.placementMessage)}</text>
    </svg>`;
  }

  function renderSiteAxonometry(variant, result) {
    const plot = domain.localPoints(state.project.site.vertices);
    if (plot.length < 3) {
      return '<div class="empty-view">Definește conturul terenului pentru a vedea amplasarea.</div>';
    }
    const project = (point) => ({ x: point.x * .72 - point.y * .48, y: point.x * .32 + point.y * .32 });
    const projectedPlot = plot.map(project);
    const footprint = result.placement?.footprint || [];
    const projectedFootprint = footprint.map(project);
    const projected = projectedPlot.concat(projectedFootprint);
    const minX = Math.min(...projected.map((point) => point.x));
    const maxX = Math.max(...projected.map((point) => point.x));
    const minY = Math.min(...projected.map((point) => point.y));
    const maxY = Math.max(...projected.map((point) => point.y));
    const height = result.placement ? result.wallHeight : 0;
    const totalHeight = result.placement ? result.height : 0;
    const scale = Math.min(500 / Math.max(maxX - minX, 1), 240 / Math.max(maxY - minY + totalHeight * .9, 1));
    const screen = (point, z = 0) => [
      300 + (point.x - (minX + maxX) / 2) * scale,
      52 + (point.y - minY) * scale + height * .9 * scale - z * .9 * scale
    ];
    const points = (items, z = 0) => items.map((point) => screen(point, z).join(",")).join(" ");
    const roofType = variant.roofType || (variant.roof === "flat" ? "flat" : "none");
    const roofRise = result.roofRise || 0;
    const polygonPoints = (items) => items.map(({ point, z }) => screen(point, z).join(",")).join(" ");
    const building = result.placement ? `
      ${projectedFootprint.map((point, index) => {
        const next = projectedFootprint[(index + 1) % projectedFootprint.length];
        return `<polygon class="building-wall wall-${index % 2}" points="${screen(point)} ${screen(next)} ${screen(next, height)} ${screen(point, height)}" />`;
      }).join("")}
      ${roofType === "flat"
        ? `<polygon class="building-roof" points="${points(projectedFootprint, height)}" />`
        : roofType === "mono"
          ? `<polygon class="building-roof" points="${polygonPoints(projectedFootprint.map((point, index) => ({ point, z: height + (index >= 2 ? roofRise : 0) })))}" />`
          : roofType === "gable"
            ? (() => {
              const ridgeStart = {
                x: (projectedFootprint[0].x + projectedFootprint[1].x) / 2,
                y: (projectedFootprint[0].y + projectedFootprint[1].y) / 2
              };
              const ridgeEnd = {
                x: (projectedFootprint[2].x + projectedFootprint[3].x) / 2,
                y: (projectedFootprint[2].y + projectedFootprint[3].y) / 2
              };
              return `
                <polygon class="gable-end" points="${screen(projectedFootprint[0], height)} ${screen(ridgeStart, height + roofRise)} ${screen(projectedFootprint[3], height)}" />
                <polygon class="gable-end" points="${screen(projectedFootprint[1], height)} ${screen(ridgeStart, height + roofRise)} ${screen(projectedFootprint[2], height)}" />
                <polygon class="building-roof roof-slope-a" points="${screen(projectedFootprint[0], height)} ${screen(projectedFootprint[1], height)} ${screen(ridgeStart, height + roofRise)} ${screen(ridgeEnd, height + roofRise)}" />
                <polygon class="building-roof roof-slope-b" points="${screen(projectedFootprint[3], height)} ${screen(projectedFootprint[2], height)} ${screen(ridgeEnd, height + roofRise)} ${screen(ridgeStart, height + roofRise)}" />`;
            })()
            : roofType === "hip"
              ? (() => {
                const apex = {
                  x: projectedFootprint.reduce((sum, point) => sum + point.x, 0) / 4,
                  y: projectedFootprint.reduce((sum, point) => sum + point.y, 0) / 4
                };
                return projectedFootprint.map((point, index) => {
                  const next = projectedFootprint[(index + 1) % projectedFootprint.length];
                  return `<polygon class="building-roof roof-slope-${index % 2}" points="${screen(point, height)} ${screen(next, height)} ${screen(apex, height + roofRise)}" />`;
                }).join("");
              })()
              : ""}` : "";
    return `<svg viewBox="0 0 600 340" role="img" aria-label="Volumetrie 3D schematică ${escapeAttribute(variant.name)} amplasată pe teren">
      <text class="north-indicator" x="550" y="35">N ↑</text>
      <polygon class="site-plot-3d" points="${points(projectedPlot)}" />
      ${result.placement ? `<polygon class="site-footprint" points="${points(projectedFootprint)}" />${building}` : ""}
      <text class="plan-caption" x="300" y="325" text-anchor="middle">${result.placement ? "Teren și volumetrie · proiecție axonometrică schematică" : escapeHtml(result.placementMessage)}</text>
    </svg>`;
  }

  function renderMetrics() {
    const tbody = document.getElementById("metrics-rows");
    tbody.innerHTML = "";
    if (!state.project.variants.length) {
      tbody.innerHTML = '<tr><td colspan="7">Adaugă o variantă pentru a calcula indicatorii.</td></tr>';
      return;
    }
    state.project.variants.forEach((variant) => {
      const result = domain.evaluateVariant(variant, state.project);
      const row = document.createElement("tr");
      const stateClass = result.status === "Depășire" ? "over" :
        result.status === "Neverificat" ? "unknown" : "";
      row.innerHTML = `<td>${escapeHtml(variant.name)}</td>
        <td>${variant.upperFloors ? `P+${variant.upperFloors}` : "P"}</td>
        <td>${formatNumber(result.footprintArea)} m²</td>
        <td>${result.pot === null ? "—" : `${formatNumber(result.pot, 1)}%`}</td>
        <td>${result.cut === null ? "—" : formatNumber(result.cut, 2)}</td>
        <td>${formatNumber(result.height, 1)} m</td>
        <td><span class="state-pill ${stateClass}">${escapeHtml(result.status)}</span></td>`;
      row.addEventListener("click", () => {
        selectedVariantId = variant.id;
        renderVariants();
      });
      tbody.appendChild(row);
    });
  }

  function renderMap() {
    if (map) window.VolumetrieMap.updateMap(
      map,
      state.project.site.vertices,
      drawingEnabled,
      moveMapVertex
    );
  }

  function render() {
    syncInputs();
    renderCoordinateRows();
    renderVariants();
    renderMap();
  }

  function bindInputs() {
    const bindings = [
      ["project-name", (value) => { state.project.name = value; }],
      ["project-description", (value) => { state.project.description = value; }],
      ["site-area", (value) => {
        state.project.site.referenceAreaM2 = optionalNumber(value);
        state.project.site.areaSource = value ? "user" : "calculated";
      }],
      ["pot-max", (value) => { state.project.regulations.potMaxPercent = optionalNumber(value); }],
      ["cut-max", (value) => { state.project.regulations.cutMax = optionalNumber(value); }],
      ["height-max", (value) => { state.project.regulations.maxHeightM = optionalNumber(value); }],
      ["rule-source", (value) => { state.project.regulations.source.title = value; }]
    ];
    bindings.forEach(([id, update]) => {
      document.getElementById(id).addEventListener("input", (event) => {
        update(event.target.value);
        if (id === "project-name") document.getElementById("top-project-name").textContent = event.target.value || "Studiu nou";
        if (id === "site-area") document.getElementById("reference-area-display").textContent =
          `${formatNumber(getReferenceArea())} m²`;
        saveProject();
        if (["pot-max", "cut-max", "height-max"].includes(id)) {
          renderVariants();
        } else {
          renderMetrics();
          renderVolume();
        }
      });
    });
    document.getElementById("alignment-options").addEventListener("change", (event) => {
      const input = event.target.closest("[data-alignment-side]");
      if (!input) return;
      const selected = [...document.querySelectorAll("[data-alignment-side]:checked")]
        .map((checkbox) => checkbox.dataset.alignmentSide);
      if (selected.length > 2) {
        input.checked = false;
        showToast("Poți selecta maximum două laturi sau colțuri de aliniere.");
        return;
      }
      state.project.regulations.alignmentSides = selected;
      saveProject();
      renderVariants();
      syncInputs();
    });
    document.getElementById("view-2d").addEventListener("click", () => {
      viewerMode = "2d";
      renderVolume();
    });
    document.getElementById("view-3d").addEventListener("click", () => {
      viewerMode = "3d";
      renderVolume();
    });

    document.getElementById("coordinate-rows").addEventListener("change", (event) => {
      const input = event.target.closest("[data-coordinate]");
      if (!input) return;
      const vertex = state.project.site.vertices[Number(input.dataset.index)];
      if (!vertex) return;
      const value = Number(input.value);
      if (!Number.isFinite(value)) {
        showToast("Introdu o coordonată numerică validă.");
        renderCoordinateRows();
        return;
      }
      vertex[input.dataset.coordinate] = value;
      state.project.site.geometryInputMethod = "manual";
      saveProject();
      render();
    });

    document.getElementById("variant-list").addEventListener("change", (event) => {
      const input = event.target.closest("[data-variant-field]");
      if (!input) return;
      const variant = state.project.variants.find((item) => item.id === input.dataset.id);
      if (!variant) return;
      const field = input.dataset.variantField;
      const setbackMatch = field.match(/^setback(North|South|East|West)$/);
      if (field === "name") variant.name = input.value.trim() || "Variantă fără nume";
      else if (field === "roofType") variant.roofType = input.value;
      else {
        const value = Number(input.value);
        const isFloorCount = field === "upperFloors";
        const isPitch = field === "roofPitchDeg";
        if (!Number.isFinite(value) || (isFloorCount
          ? !Number.isInteger(value) || value < 0 || value > 4
          : setbackMatch ? value < 0
            : isPitch ? value < 5 || value > 60
              : value <= 0)) {
          showToast(isFloorCount
            ? "Numărul de etaje trebuie să fie între 0 și 4."
            : isPitch ? "Panta acoperișului trebuie să fie între 5° și 60°."
              : setbackMatch ? "Retragerea trebuie să fie un număr zero sau pozitiv."
                : "Dimensiunile și înălțimile trebuie să fie mai mari decât zero.");
          renderVariants();
          return;
        }
        if (setbackMatch) {
          const direction = setbackMatch[1].toLowerCase();
          variant.setbackDirections ||= { north: null, south: null, east: null, west: null };
          variant.setbackDirections[direction] = value;
        } else {
          variant[field] = value;
        }
      }
      selectedVariantId = variant.id;
      saveProject();
      renderVariants();
    });

    document.getElementById("variant-list").addEventListener("click", (event) => {
      const deleteButton = event.target.closest("[data-delete-variant]");
      if (deleteButton) {
        if (!confirm("Ștergi această variantă?")) return;
        state.project.variants = state.project.variants.filter((item) => item.id !== deleteButton.dataset.deleteVariant);
        if (selectedVariantId === deleteButton.dataset.deleteVariant) {
          selectedVariantId = state.project.variants[0]?.id || null;
        }
        saveProject();
        renderVariants();
      }
    });
  }

  function addVariant() {
    if (state.project.variants.length >= 20) {
      showToast("Prototipul permite maximum 20 de variante.");
      return;
    }
    const index = state.project.variants.length + 1;
    const variant = {
      id: makeId("variant"),
      name: `Varianta ${String(index).padStart(2, "0")}`,
      upperFloors: index === 1 ? 0 : 1,
      groundFloorHeightM: 3,
      typicalFloorHeightM: 2.8,
      roofType: "flat",
      roofPitchDeg: 30,
      rotationDegrees: 0,
      setbackDirections: { north: null, south: null, east: null, west: null },
      notes: ""
    };
    const site = state.project.site;
    const polygon = domain.localPoints(site.vertices);
    const regulations = state.project.regulations;
    const referenceArea = site.referenceAreaM2 ?? domain.polygonArea(polygon);
    const levels = variant.upperFloors + 1;
    let maxArea = Infinity;
    if (regulations.potMaxPercent !== null && regulations.potMaxPercent !== undefined) {
      maxArea = Math.min(maxArea, referenceArea * Number(regulations.potMaxPercent) / 100);
    }
    if (regulations.cutMax !== null && regulations.cutMax !== undefined) {
      maxArea = Math.min(maxArea, referenceArea * Number(regulations.cutMax) / levels);
    }
    const setbacks = Object.fromEntries(
      Object.entries(variant.setbackDirections).map(([direction, distance]) => [
        direction,
        distance ?? regulations.setbackDirections?.[direction] ??
          (Number(regulations.uniformSetbackM) || 0)
      ])
    );
    const maximum = domain.findMaximumRectangle(
      polygon, setbacks, maxArea, regulations.alignmentSides || []
    );
    if (maximum && maximum.area > 0.01) {
      variant.widthM = Math.floor(maximum.width * 10) / 10;
      variant.depthM = Math.floor(maximum.depth * 10) / 10;
      variant.rotationDegrees = maximum.rotationDegrees;
    } else {
      variant.widthM = 12;
      variant.depthM = 9;
      showToast("Nu s-a găsit o amprentă optimă; varianta pornește cu dimensiuni orientative.");
    }
    state.project.variants.push(variant);
    selectedVariantId = variant.id;
    saveProject();
    renderVariants();
  }

  function renderStepNavigation() {
    document.querySelectorAll(".step-link").forEach((button) => {
      button.addEventListener("click", () => showStep(button.dataset.step));
    });
    document.querySelectorAll(".next-step").forEach((button) => {
      button.addEventListener("click", () => showStep(button.dataset.next));
    });
    document.querySelectorAll(".previous-step").forEach((button) => {
      button.addEventListener("click", () => showStep(button.dataset.prev));
    });
  }

  function exportProject() {
    const vertexCount = state.project.site.vertices.length;
    if (vertexCount && !confirm("Fișierul va include coordonatele exacte ale terenului. Continui cu exportul?")) return;
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(state.project.name || "proiect-volumetrie").replace(/[^\p{L}\p{N}-]+/gu, "-")}.volumetrie.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Proiectul a fost exportat.");
  }

  function importProject(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("Fișierul depășește limita de 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => showToast("Fișierul nu a putut fi citit.");
    reader.onload = () => {
      try {
        const parsed = domain.validateProjectFile(JSON.parse(String(reader.result)));
        if (!confirm(`Încarci proiectul „${parsed.project.name}” și înlocuiești proiectul curent?`)) return;
        state = parsed;
        storageBlocked = false;
        startupError = null;
        selectedVariantId = state.project.variants[0]?.id || null;
        if (map) map._hasFittedBounds = false;
        saveProject();
        render();
        showStep("project");
        showToast("Proiect importat cu succes.");
      } catch (error) {
        console.error("Project import rejected:", error);
        showToast(error.message || "Fișier de proiect invalid.");
      }
    };
    reader.readAsText(file);
  }

  function initialize() {
    initializeTheme();
    map = window.VolumetrieMap.createMap(
      addMapVertex,
      moveMapVertex,
      (available, reason) => {
        if (!available) {
          const fallback = document.getElementById("map-fallback");
          fallback.hidden = false;
          if (reason === "tile-error") {
            fallback.textContent = "Tile-urile hărții au fost refuzate sau nu pot fi încărcate. Dacă apare HTTP 403, deschide aplicația prin http://localhost, nu direct din fișierul index.html. Poți introduce coordonatele manual.";
            showToast("Harta a refuzat încărcarea. Pornește aplicația prin localhost.");
          } else {
            fallback.textContent = "Harta nu s-a încărcat. Poți introduce coordonatele în tabelul de mai jos.";
            showToast("Harta nu este disponibilă. Introdu coordonatele manual.");
          }
        } else {
          document.getElementById("map-fallback").hidden = true;
        }
      }
    );
    if (startupError) {
      setSaveStatus(startupError, true);
      showToast(startupError);
    }
    renderStepNavigation();
    bindInputs();
    render();

    document.getElementById("draw-mode").addEventListener("click", (event) => {
      drawingEnabled = !drawingEnabled;
      event.currentTarget.classList.toggle("active", drawingEnabled);
      event.currentTarget.textContent = drawingEnabled ? "＋ Desenează contur" : "⏸ Desenare oprită";
      renderMap();
    });
    document.getElementById("finish-drawing").addEventListener("click", () => {
      drawingEnabled = false;
      document.getElementById("draw-mode").classList.remove("active");
      document.getElementById("draw-mode").textContent = "＋ Desenează contur";
      renderMap();
      const errors = domain.validatePolygon(state.project.site.vertices);
      showToast(errors.length ? errors[0] : "Contur finalizat. Verifică punctele și suprafața.");
    });
    document.getElementById("undo-point").addEventListener("click", () => {
      state.project.site.vertices.pop();
      saveProject();
      render();
    });
    document.getElementById("add-coordinate").addEventListener("click", () => {
      const center = map ? map.getCenter() : { lat: 44.435, lng: 26.102 };
      const index = state.project.site.vertices.length;
      const offset = index * 0.0001;
      state.project.site.vertices.push({
        id: makeId("v"),
        latitude: Number((center.lat + offset).toFixed(7)),
        longitude: Number((center.lng + offset).toFixed(7))
      });
      state.project.site.geometryInputMethod = "manual";
      saveProject();
      render();
    });
    document.getElementById("coordinate-rows").addEventListener("click", (event) => {
      const button = event.target.closest("[data-delete-vertex]");
      if (!button) return;
      state.project.site.vertices.splice(Number(button.dataset.deleteVertex), 1);
      saveProject();
      render();
    });
    document.getElementById("add-variant").addEventListener("click", addVariant);
    document.getElementById("export-project").addEventListener("click", exportProject);
    document.getElementById("import-project").addEventListener("click", () => document.getElementById("import-file").click());
    document.getElementById("import-file").addEventListener("change", (event) => {
      importProject(event.target.files[0]);
      event.target.value = "";
    });
    document.getElementById("new-project").addEventListener("click", () => {
      if (!confirm("Creezi un proiect nou? Exportă mai întâi proiectul curent dacă dorești să-l păstrezi.")) return;
      state = domain.createProject();
      storageBlocked = false;
      startupError = null;
      selectedVariantId = null;
      if (map) map._hasFittedBounds = false;
      saveProject();
      drawingEnabled = true;
      render();
      showStep("project");
    });
    document.getElementById("print-report").addEventListener("click", () => {
      showStep("variants");
      window.print();
    });
    window.addEventListener("resize", () => {
      if (map && activeStep === "site") map.invalidateSize();
    });
  }

  initialize();
})();
