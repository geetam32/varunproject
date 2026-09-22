// DNR Fleet Telemetry & Transit Clarity - Map Service
// Leaflet GIS Engine supporting both Campus Transit Clarity (Light) & Precision Slate (Dark)

const MapService = {
    map: null,
    managementMap: null,
    busMarkers: {},
    mgmtBusMarkers: {},
    stopMarkers: [],
    routePolylines: {},
    geofencePolygon: null,
    isAutoCenter: true,
    currentTileLayer: null,
    currentTheme: "clarity", // "clarity" (light) or "slate" (dark)

    init(containerId = "studentMap") {
        if (this.map) {
            this.map.remove();
            this.map = null;
            this.busMarkers = {};
            this.stopMarkers = [];
            this.routePolylines = {};
        }

        const container = document.getElementById(containerId);
        if (!container) return;

        this.map = L.map(containerId, {
            center: [16.5385, 81.5200],
            zoom: 14,
            zoomControl: true
        });

        // Set tile layer based on current active theme
        this.applyTileTheme(this.map);

        // Add DNR Campus Geofence Boundary Polygon
        this.addCampusGeofence(this.map);

        // Add DNR Campus Landmark Pin
        this.addCampusLandmarkPin(this.map);

        setTimeout(() => {
            if (this.map) this.map.invalidateSize();
        }, 200);

        return this.map;
    },

    initManagementMap(containerId = "managementMap") {
        if (this.managementMap) {
            this.managementMap.remove();
            this.managementMap = null;
            this.mgmtBusMarkers = {};
        }

        const container = document.getElementById(containerId);
        if (!container) return;

        this.managementMap = L.map(containerId, {
            center: [16.5500, 81.5300],
            zoom: 12,
            zoomControl: true
        });

        this.applyTileTheme(this.managementMap);
        this.addCampusGeofence(this.managementMap);
        this.populateManagementFleet();

        setTimeout(() => {
            if (this.managementMap) this.managementMap.invalidateSize();
        }, 200);

        return this.managementMap;
    },

    setTheme(theme) {
        this.currentTheme = theme;
        if (this.map) {
            this.applyTileTheme(this.map);
            if (typeof currentBusId !== "undefined") {
                this.displayRoute(currentBusId);
            }
        }
        if (this.managementMap) {
            this.applyTileTheme(this.managementMap);
            this.populateManagementFleet();
        }
    },

    applyTileTheme(targetMap) {
        if (!targetMap) return;

        // Clean up previous tile layers to prevent layer stacking
        if (targetMap._currentBaseTileLayer) {
            targetMap.removeLayer(targetMap._currentBaseTileLayer);
            targetMap._currentBaseTileLayer = null;
        }
        if (targetMap._currentRefTileLayer) {
            targetMap.removeLayer(targetMap._currentRefTileLayer);
            targetMap._currentRefTileLayer = null;
        }

        if (this.currentTheme === "slate") {
            // Precision Slate Dark: Esri Dark Gray Telemetry Base (100% Free, No API Key, No Watermark)
            targetMap._currentBaseTileLayer = L.tileLayer(
                "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
                {
                    maxZoom: 19,
                    maxNativeZoom: 16,
                    attribution: '&copy; Esri, HERE, Garmin &bull; DNR Slate Telemetry'
                }
            ).addTo(targetMap);

            // Esri Dark Gray Reference Overlay (Crisp road labels and city names)
            targetMap._currentRefTileLayer = L.tileLayer(
                "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
                {
                    maxZoom: 19,
                    maxNativeZoom: 16,
                    attribution: ''
                }
            ).addTo(targetMap);
        } else {
            // Campus Transit Clarity Light: OpenStreetMap HOT (100% Free, No API Key, No Watermark)
            targetMap._currentBaseTileLayer = L.tileLayer(
                "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
                {
                    maxZoom: 19,
                    maxNativeZoom: 19,
                    subdomains: ['a', 'b', 'c'],
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &bull; DNR Transit Clarity'
                }
            ).addTo(targetMap);
        }
    },

    addCampusGeofence(targetMap) {
        if (!targetMap) return;
        const campusCoords = [
            [16.5380, 81.5160],
            [16.5385, 81.5210],
            [16.5335, 81.5215],
            [16.5330, 81.5165]
        ];

        const isSlate = this.currentTheme === "slate";
        L.polygon(campusCoords, {
            color: isSlate ? "rgba(255, 255, 255, 0.4)" : "#059669",
            weight: 1.5,
            dashArray: "4, 4",
            fillColor: isSlate ? "rgba(255, 255, 255, 0.05)" : "rgba(5, 150, 105, 0.08)",
            fillOpacity: 0.25
        }).addTo(targetMap).bindTooltip("DNR COLLEGE CAMPUS (MAIN TERMINAL)", {
            permanent: true,
            direction: "center",
            className: "campus-geofence-tooltip"
        });
    },

    addCampusLandmarkPin(targetMap) {
        if (!targetMap) return;
        const isSlate = this.currentTheme === "slate";
        const iconHtml = `
            <div style="background: ${isSlate ? '#ffffff' : '#006c4a'}; color: ${isSlate ? '#09090b' : '#ffffff'}; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 11px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); white-space: nowrap;">
                DNR Main Terminal
            </div>
        `;

        const icon = L.divIcon({
            html: iconHtml,
            className: "campus-terminal-icon",
            iconAnchor: [55, 16]
        });

        L.marker(DNR_COLLEGE_LOCATION.coords, { icon: icon }).addTo(targetMap);
    },

    displayRoute(busId) {
        if (!this.map) return;
        this.clearStops();
        this.clearPolylines();

        const route = BUS_ROUTES[busId];
        if (!route) return;

        const isSlate = this.currentTheme === "slate";
        const lineColor = isSlate ? "#ffffff" : "#3b82f6";

        // Draw Route Polyline
        const polyline = L.polyline(route.waypoints, {
            color: lineColor,
            weight: 4,
            opacity: 0.9,
            smoothFactor: 1,
            lineJoin: "round"
        }).addTo(this.map);

        this.routePolylines[busId] = polyline;

        // Add Stop Pins
        route.stops.forEach((stop, index) => {
            const isOrigin = index === 0;
            const isDestination = index === route.stops.length - 1;

            const stopHtml = `
                <div style="width: 14px; height: 14px; border-radius: 50%; background: #ffffff; border: 3px solid ${isSlate ? '#ffffff' : '#3b82f6'}; box-shadow: 0 1px 4px rgba(0,0,0,0.3);"></div>
            `;

            const icon = L.divIcon({
                html: stopHtml,
                className: "stop-node-icon",
                iconSize: [14, 14],
                iconAnchor: [7, 7]
            });

            const marker = L.marker(stop.coords, { icon: icon }).addTo(this.map);
            marker.bindPopup(`
                <div style="font-size: 12px; padding: 4px;">
                    <strong style="color: #0f172a;">${stop.name}</strong><br>
                    <span style="color: #71717a;">ETA: ${stop.scheduledTime} &bull; Status: ${stop.status}</span>
                </div>
            `);
            this.stopMarkers.push(marker);
        });

        this.map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
    },

    updateBusMarker(busId, data) {
        if (!this.map || !data || !data.lat || !data.lng) return;

        const speed = Math.round(data.speed || 0);
        const heading = data.heading || 0;
        const code = (BUS_ROUTES[busId] && BUS_ROUTES[busId].displayCode) || busId;
        const isSlate = this.currentTheme === "slate";
        const isLive = data.status === "ACTIVE" || data.status === "RUNNING";

        const markerHtml = `
            <div style="position: relative; width: 140px; transform: translate(-50%, -50%); text-align: center;">
                <div class="bus-radar-halo ${isLive ? 'active-broadcasting' : ''}"></div>
                <div style="position: relative; z-index: 2; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: ${isSlate ? '#09090b' : '#3b82f6'}; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 0 14px ${isSlate ? 'rgba(255,255,255,0.8)' : 'rgba(59,130,246,0.6)'}; transform: rotate(${heading}deg); transition: transform 0.3s ease;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff"><polygon points="12 2 19 21 12 17 5 21 12 2"/></svg>
                </div>
                <div style="position: relative; z-index: 2; margin-top: 4px; background: ${isSlate ? '#131315' : '#ffffff'}; border: 1px solid ${isSlate ? 'rgba(255,255,255,0.3)' : '#e4e4e7'}; border-radius: 4px; padding: 2px 8px; font-size: 11px; font-weight: 700; color: ${isSlate ? '#ffffff' : '#0f172a'}; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.15); transition: all 0.2s ease;">
                    ${code} &bull; ${speed} km/h
                </div>
            </div>
        `;

        const icon = L.divIcon({
            html: markerHtml,
            className: "bus-telemetry-div-icon",
            iconSize: [140, 60],
            iconAnchor: [70, 30]
        });

        const latLng = [data.lat, data.lng];

        if (this.busMarkers[busId]) {
            this.busMarkers[busId].setLatLng(latLng);
            this.busMarkers[busId].setIcon(icon);
        } else {
            const marker = L.marker(latLng, { icon: icon, zIndexOffset: 1000 }).addTo(this.map);
            this.busMarkers[busId] = marker;
        }

        if (this.isAutoCenter) {
            this.map.panTo(latLng);
        }
    },

    populateManagementFleet(rosterList = null) {
        if (!this.managementMap) return;

        // Clear existing markers
        Object.values(this.mgmtBusMarkers).forEach(m => this.managementMap && this.managementMap.removeLayer(m));
        this.mgmtBusMarkers = {};

        const isSlate = this.currentTheme === "slate";
        const list = rosterList || FLEET_ROSTER;

        list.forEach(bus => {
            let lat = bus.lat;
            let lon = bus.lng;

            if (!lat || !lon) {
                if (typeof bus.coords === "string") {
                    const parts = bus.coords.split(",");
                    if (parts.length >= 2) {
                        lat = parseFloat(parts[0]);
                        lon = parseFloat(parts[1]);
                    }
                }
            }

            if (isNaN(lat) || isNaN(lon) || !lat || !lon) return;

            const isLive = bus.statusType === 'active';
            const markerHtml = `
                <div style="position: relative; width: 26px; height: 26px;">
                    <div class="mgmt-radar-halo ${isLive ? 'active' : ''}"></div>
                    <div style="position: relative; z-index: 2; background: ${isLive ? '#10b981' : (isSlate ? '#3f3f46' : '#94a3b8')}; color: #ffffff; width: 26px; height: 26px; border-radius: 50%; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 2px solid #ffffff;">
                        ${bus.busId.replace('BUS-', '')}
                    </div>
                </div>
            `;

            const icon = L.divIcon({
                html: markerHtml,
                className: "fleet-bus-icon",
                iconSize: [26, 26],
                iconAnchor: [13, 13]
            });

            const marker = L.marker([lat, lon], { icon: icon }).addTo(this.managementMap);
            marker.bindPopup(`
                <div style="font-size: 12px; padding: 4px; min-width: 200px;">
                    <strong style="color: #0f172a;">${bus.busId} // ${bus.routeId}</strong>
                    <div style="color: #71717a; font-size: 11px; margin: 3px 0;">
                        Status: <strong style="color: ${bus.statusType === 'active' ? '#059669' : '#64748b'}">${bus.status}</strong> &bull; Speed: ${bus.speed}
                    </div>
                    <div style="color: #006c4a; font-size: 11px; font-weight: 600;">
                        GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}
                    </div>
                </div>
            `);

            this.mgmtBusMarkers[bus.busId] = marker;
        });
    },

    clearStops() {
        this.stopMarkers.forEach(m => this.map && this.map.removeLayer(m));
        this.stopMarkers = [];
    },

    clearPolylines() {
        Object.values(this.routePolylines).forEach(p => this.map && this.map.removeLayer(p));
        this.routePolylines = {};
    }
};
