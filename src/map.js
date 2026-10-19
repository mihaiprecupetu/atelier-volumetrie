(function () {
  "use strict";

  function createMap(onAddVertex, onMoveVertex, onMapStatus) {
    if (!window.L || !document.getElementById("map")) {
      document.getElementById("map-fallback").hidden = false;
      document.getElementById("map").hidden = true;
      onMapStatus(false);
      return null;
    }
    const map = window.L.map("map", { zoomControl: true }).setView([44.435, 26.102], 16);
    const tileLayer = window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'
    });
    let tileErrorReported = false;
    tileLayer.on("loading", () => {
      tileErrorReported = false;
    });
    tileLayer.on("tileerror", () => {
      if (tileErrorReported) return;
      tileErrorReported = true;
      onMapStatus(false, "tile-error");
    });
    tileLayer.on("load", () => {
      if (!tileErrorReported) onMapStatus(true);
    });
    tileLayer.addTo(map);
    map.on("click", (event) => onAddVertex(event.latlng.lat, event.latlng.lng));
    map.whenReady(() => onMapStatus(true));
    return map;
  }

  function updateMap(map, vertices, drawing, onMoveVertex) {
    if (!map) return;
    if (map._plotLayer) map.removeLayer(map._plotLayer);
    if (map._vertexLayers) map._vertexLayers.forEach((layer) => map.removeLayer(layer));
    map._vertexLayers = [];
    if (vertices.length) {
      const coordinatesValid = vertices.every((vertex) =>
        Number.isFinite(vertex.latitude) && Number.isFinite(vertex.longitude) &&
        vertex.latitude >= -90 && vertex.latitude <= 90 &&
        vertex.longitude >= -180 && vertex.longitude <= 180);
      if (!coordinatesValid) {
        map.getContainer().style.cursor = drawing ? "crosshair" : "";
        return;
      }
      const latlngs = vertices.map((vertex) => [vertex.latitude, vertex.longitude]);
      if (vertices.length >= 3) {
        map._plotLayer = window.L.polygon(latlngs, {
          color: "#507657",
          weight: 2,
          fillColor: "#7fa884",
          fillOpacity: 0.17
        }).addTo(map);
      } else {
        map._plotLayer = window.L.polyline(latlngs, { color: "#507657", weight: 2, dashArray: "5 5" }).addTo(map);
      }
      vertices.forEach((vertex, index) => {
        const marker = window.L.marker([vertex.latitude, vertex.longitude], {
          draggable: true,
          icon: window.L.divIcon({
            className: "vertex-marker",
            html: String(index + 1),
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(map);
        marker.on("dragend", (event) => {
          const position = event.target.getLatLng();
          onMoveVertex(index, position.lat, position.lng);
        });
        map._vertexLayers.push(marker);
      });
      if (vertices.length >= 3 && map._hasFittedBounds !== true) {
        map.fitBounds(map._plotLayer.getBounds(), { padding: [35, 35], maxZoom: 19 });
        map._hasFittedBounds = true;
      }
    } else {
      map._hasFittedBounds = false;
    }
    map.getContainer().style.cursor = drawing ? "crosshair" : "";
  }

  window.VolumetrieMap = { createMap, updateMap };
})();
