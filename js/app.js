// ==========================================================================
// DNR FLEET TRANSIT - DUAL ENGINE CONTROLLER
// Campus Transit Clarity (Clean Light) & Precision Slate Telemetry (Dark)
// ==========================================================================

let currentPortalView = "hub";
let currentBusId = "BUS-12";
let currentThemeStyle = "clarity"; // "clarity" or "slate"
let isAudioMuted = false;
let isTripRunning = true;
let sosHoldTimer = null;
let sosHoldCounter = 3;
let telemetryInterval = null;

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    // Check saved theme style
    const savedTheme = localStorage.getItem("dnr_theme_style");
    if (savedTheme === "slate") {
        applyStyleTheme("slate");
    } else {
        applyStyleTheme("clarity");
    }

    // Start live clock
    initLiveClock();

    // Render Student Portal initial data
    renderStudentPortalData(currentBusId);

    // Render Management Fleet Roster table
    renderFleetRosterTable(FLEET_ROSTER);

    // Start Telemetry simulation loop
    startContinuousTelemetryLoop();

    // Query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get("view");
    if (viewParam && ["hub", "student", "driver", "management"].includes(viewParam)) {
        switchPortalView(viewParam);
    }
});

// ==========================================================================
// 1. THEME STYLE SWITCHER (CLARITY LIGHT vs SLATE DARK)
// ==========================================================================

function toggleStyleTheme() {
    const newTheme = currentThemeStyle === "clarity" ? "slate" : "clarity";
    applyStyleTheme(newTheme);
    localStorage.setItem("dnr_theme_style", newTheme);

    if (typeof AudioService !== "undefined" && !isAudioMuted) {
        AudioService.playClick();
    }

    showToast("Style Updated", `Switched design style to ${newTheme === "slate" ? "Precision Slate Telemetry (Dark)" : "Campus Transit Clarity (Light)"}`);
}

function applyStyleTheme(theme) {
    currentThemeStyle = theme;
    const body = document.body;
    const icon = document.getElementById("themeToggleIcon");
    const label = document.getElementById("themeToggleText");

    if (theme === "slate") {
        body.classList.add("theme-slate");
        if (icon) icon.innerText = "☀️";
        if (label) label.innerText = "Clarity Light";
    } else {
        body.classList.remove("theme-slate");
        if (icon) icon.innerText = "🌙";
        if (label) label.innerText = "Slate Dark";
    }

    if (typeof MapService !== "undefined") {
        MapService.setTheme(theme);
    }
}

// ==========================================================================
// 2. NAVIGATION & PORTAL VIEW ROUTER
// ==========================================================================

function switchPortalView(portalKey) {
    currentPortalView = portalKey;

    // Update active tab buttons
    document.querySelectorAll(".clarity-nav-tab").forEach(btn => btn.classList.remove("active"));
    const activeTab = document.getElementById(
        portalKey === "hub" ? "tabBtnHub" :
        portalKey === "student" ? "tabBtnStudent" :
        portalKey === "driver" ? "tabBtnDriver" : "tabBtnManagement"
    );
    if (activeTab) {
        activeTab.classList.add("active");
        if (typeof activeTab.scrollIntoView === "function") {
            activeTab.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
    }

    // Hide all views and reveal active view
    document.querySelectorAll(".clarity-view").forEach(view => view.classList.remove("active-view"));
    const targetView = document.getElementById(
        portalKey === "hub" ? "portalHubView" :
        portalKey === "student" ? "studentPortalView" :
        portalKey === "driver" ? "driverPortalView" : "managementPortalView"
    );
    if (targetView) targetView.classList.add("active-view");

    // Audio click feedback
    if (typeof AudioService !== "undefined" && !isAudioMuted) {
        AudioService.playClick();
    }

    // Initialize or resize maps on view entry
    if (portalKey === "student") {
        setTimeout(() => {
            if (!MapService.map) {
                MapService.init("studentMap");
            }
            MapService.displayRoute(currentBusId);
            MapService.map.invalidateSize();
        }, 150);
    } else if (portalKey === "management") {
        setTimeout(() => {
            if (!MapService.managementMap) {
                MapService.initManagementMap("managementMap");
            }
            MapService.managementMap.invalidateSize();
        }, 150);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Mobile window resize & orientation change handler
window.addEventListener("resize", () => {
    if (typeof MapService !== "undefined") {
        if (MapService.map) MapService.map.invalidateSize();
        if (MapService.managementMap) MapService.managementMap.invalidateSize();
    }
});

window.addEventListener("orientationchange", () => {
    setTimeout(() => {
        if (typeof MapService !== "undefined") {
            if (MapService.map) MapService.map.invalidateSize();
            if (MapService.managementMap) MapService.managementMap.invalidateSize();
        }
    }, 200);
});

// ==========================================================================
// 3. LIVE CLOCK & TICKER
// ==========================================================================

function initLiveClock() {
    function tick() {
        const driverClock = document.getElementById("driverTimeDisplay");
        const now = new Date();
        const timeStr = now.toLocaleTimeString("en-US", {
            hour12: true,
            hour: "2-digit",
            minute: "2-digit"
        });
        if (driverClock) driverClock.innerText = timeStr;
    }
    tick();
    setInterval(tick, 1000);
}

// ==========================================================================
// 4. STUDENT & PARENT PORTAL CONTROLLER
// ==========================================================================

function changeActiveBus(busId) {
    if (!BUS_ROUTES[busId]) return;
    currentBusId = busId;

    renderStudentPortalData(busId);

    if (MapService.map) {
        MapService.displayRoute(busId);
    }

    showToast("Route Synced", `Switched tracking line to ${BUS_ROUTES[busId].name}`);
}

function renderStudentPortalData(busId) {
    const route = BUS_ROUTES[busId];
    if (!route) return;

    // Header title and square
    const numSquare = document.getElementById("studentRouteSquare");
    if (numSquare) numSquare.innerText = route.id.replace("BUS-", "");

    const headingEl = document.getElementById("studentRouteHeading");
    if (headingEl) headingEl.innerHTML = `Bus ${route.id.replace("BUS-", "")} &bull; ${route.origin} &rarr; ${route.destination}`;

    const subEl = document.getElementById("studentRouteSub");
    if (subEl) subEl.innerText = `Morning Session &bull; Destination: DNR Campus Terminal (${route.departureTime} - ${route.scheduledArrival})`;

    // Vehicle details
    const modelEl = document.getElementById("cleanBusModel");
    if (modelEl) modelEl.innerText = route.busModel;

    const regEl = document.getElementById("cleanBusReg");
    if (regEl) regEl.innerText = route.plateNumber;

    // Driver info
    const driverNameEl = document.getElementById("cleanDriverName");
    if (driverNameEl) driverNameEl.innerHTML = `${route.driver.name} &#10003;`;

    const driverExpEl = document.getElementById("cleanDriverExp");
    if (driverExpEl) driverExpEl.innerText = `Certified Senior Driver &bull; ${route.driver.experience} exp`;

    const initialsEl = document.getElementById("cleanDriverInitials");
    if (initialsEl) {
        const parts = route.driver.name.split(" ");
        initialsEl.innerText = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : "DR";
    }

    // Occupancy & Comfort
    const occEl = document.getElementById("cleanOccupancyVal");
    if (occEl) occEl.innerText = `${route.occupancy} / ${route.capacity} Seats`;

    const comfEl = document.getElementById("cleanComfortVal");
    if (comfEl) comfEl.innerText = `${route.hvacTemp} Ambient`;

    // Timeline Stops Stepper
    renderTimelineStops(route.stops);
}

function renderTimelineStops(stops) {
    const container = document.getElementById("waypointTimelineList");
    if (!container) return;

    container.innerHTML = "";

    stops.forEach((stop, index) => {
        const item = document.createElement("div");
        const isCleared = stop.status === "DEPARTED" || stop.status === "CLEARED";
        const isActive = stop.status === "APPROACHING" || stop.status === "BOARDED";

        item.className = `timeline-stop-item ${isCleared ? 'cleared' : (isActive ? 'active' : '')}`;

        item.innerHTML = `
            <div class="stop-marker-dot"></div>
            <div class="stop-info-text">
                <h4>${stop.name} ${isActive ? '<span class="status-pill-live" style="font-size:10px;padding:1px 6px;margin-left:4px;">Your Stop</span>' : ''}</h4>
                <p>${isCleared ? 'Cleared on schedule' : (isActive ? 'Approaching in 8 mins' : 'Upcoming stop')}</p>
            </div>
            <div class="stop-time-text">${stop.scheduledTime}</div>
        `;

        container.appendChild(item);
    });
}

function triggerCallDriver() {
    const route = BUS_ROUTES[currentBusId];
    if (!route) return;
    if (typeof AudioService !== "undefined" && !isAudioMuted) {
        AudioService.playChime();
    }
    showToast("Calling Driver", `Connecting voice dispatch call to ${route.driver.name} (${route.driver.phone})...`);
}

function contactControlOffice() {
    if (typeof AudioService !== "undefined" && !isAudioMuted) {
        AudioService.playClick();
    }
    showToast("Transit Desk Help", "Calling DNR College Transit Helpdesk (+91 8816 221234 Ext 104)...");
}

// ==========================================================================
// 5. DRIVER CONSOLE CONTROLLER
// ==========================================================================

function updateDriverSpeedometer(speed) {
    const numEl = document.getElementById("cockpitSpeedNumber");
    if (numEl) numEl.innerHTML = `${speed} <span>km/h</span>`;

    const studentSpeed = document.getElementById("studentSpeedText");
    if (studentSpeed) studentSpeed.innerText = `${speed} km/h`;
}

function toggleTripActiveState() {
    isTripRunning = !isTripRunning;
    const btn = document.getElementById("btnTripRunning");
    const title = document.getElementById("tripRunningTitle");
    const sub = document.getElementById("tripRunningSub");

    if (isTripRunning) {
        btn.classList.add("active-green");
        title.innerText = "Trip Active";
        sub.innerText = "Tap to Resume / Refresh";
        showToast("Trip Status", "Real-time navigation & route tracking active");
    } else {
        btn.classList.remove("active-green");
        title.innerText = "Trip Paused";
        sub.innerText = "Tap to Resume";
        showToast("Trip Paused", "GPS broadcasting paused temporarily");
    }
}

function triggerDelayNotice() {
    if (typeof AudioService !== "undefined" && !isAudioMuted) {
        AudioService.playBeep();
    }
    showToast("Delay Alert Queued", "Notified Campus Dispatch & parents: +5 min traffic delay.");
}

function triggerCabinChime() {
    if (typeof AudioService !== "undefined") {
        AudioService.playChime();
    }
    showToast("PA Chime Broadcast", "In-cabin arrival chime played to passengers.");
}

// SOS Distress 3-Second Hold Safety Mechanism
function startSosHold() {
    sosHoldCounter = 3;
    const btnText = document.getElementById("sosButtonText");

    sosHoldTimer = setInterval(() => {
        sosHoldCounter--;
        if (sosHoldCounter > 0) {
            btnText.innerText = `HOLD ${sosHoldCounter}s...`;
        } else {
            clearInterval(sosHoldTimer);
            sosHoldTimer = null;
            btnText.innerText = "SOS SENT!";
            triggerSosDistressBeacon();
        }
    }, 1000);
}

function cancelSosHold() {
    if (sosHoldTimer) {
        clearInterval(sosHoldTimer);
        sosHoldTimer = null;
        document.getElementById("sosButtonText").innerHTML = "&#9888; Emergency SOS";
    }
}

function triggerSosDistressBeacon() {
    if (typeof AudioService !== "undefined") {
        AudioService.playEmergencyAlert();
    }
    showToast("CRITICAL SOS TRANSMITTED", "Emergency distress beacon locked to Campus Marshal & Police Desk!");
}

// ==========================================================================
// 6. MANAGEMENT & FLEET COMMAND CONTROLLER
// ==========================================================================

function renderFleetRosterTable(roster) {
    const tbody = document.getElementById("rosterTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    roster.forEach(item => {
        const tr = document.createElement("tr");

        const statusBadge = item.statusType === "active" ?
            `<span class="status-capsule on-time"><span class="pulsing-dot" style="width:5px;height:5px;"></span>On Time</span>` :
            (item.statusType === "delayed" ?
            `<span class="status-capsule delayed">&#9888; Delayed (+7m)</span>` :
            `<span class="status-capsule depot">Yard Standby</span>`);

        tr.innerHTML = `
            <td><strong style="color: var(--text-primary); font-size: 14px;">${item.busId}</strong></td>
            <td>
                <div style="font-weight: 700; color: var(--text-primary);">${item.routeId}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${item.sector}</div>
            </td>
            <td>
                <div style="font-weight: 600; color: var(--text-primary);">${item.driver}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${item.driverId}</div>
            </td>
            <td>${statusBadge}</td>
            <td>
                <strong style="color: var(--text-primary);">${item.nextStop}</strong>
                <div style="font-size: 11px; color: var(--text-muted);">${item.speed} &bull; ${item.fuel}</div>
            </td>
            <td>
                <strong style="color: var(--brand-emerald-text);">${item.eta}</strong>
            </td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-pill-action" style="padding: 4px 10px; font-size: 11px;" onclick="callFleetDriver('${item.driver}')" title="Call Driver">
                        📞 Call
                    </button>
                    <button class="btn-pill-action" style="padding: 4px 10px; font-size: 11px;" onclick="trackSingleBus('${item.busId}')" title="Track Live">
                        📍 Track
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function filterFleetRoster(query) {
    const q = query.toLowerCase();
    const filtered = FLEET_ROSTER.filter(bus =>
        bus.busId.toLowerCase().includes(q) ||
        bus.driver.toLowerCase().includes(q) ||
        bus.routeId.toLowerCase().includes(q) ||
        bus.nextStop.toLowerCase().includes(q)
    );
    renderFleetRosterTable(filtered);
}

function filterRosterTab(type, btn) {
    document.querySelectorAll(".filter-pill-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    if (type === "ALL") {
        renderFleetRosterTable(FLEET_ROSTER);
    } else {
        const filtered = FLEET_ROSTER.filter(b => b.statusType === type);
        renderFleetRosterTable(filtered);
    }
}

function exportFleetCsv() {
    let csv = "Bus ID,Route ID,Sector,Driver,Driver ID,Status,Coordinates,Next Stop,ETA,Speed,Fuel\n";
    FLEET_ROSTER.forEach(b => {
        csv += `"${b.busId}","${b.routeId}","${b.sector}","${b.driver}","${b.driverId}","${b.status}","${b.coords}","${b.nextStop}","${b.eta}","${b.speed}","${b.fuel}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DNR_Fleet_Roster_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast("CSV Exported", "Downloaded complete 24-vehicle fleet roster CSV.");
}

function callFleetDriver(name) {
    showToast("Connecting Dispatch", `Calling ${name} on campus driver radio line...`);
}

function trackSingleBus(busId) {
    if (BUS_ROUTES[busId]) {
        changeActiveBus(busId);
    }
    switchPortalView("student");
}

function openScheduleModal() {
    showToast("Safety Drill", "Campus safety drill simulation broadcast dispatched to 18 active units.");
}

function openNewRouteModal() {
    showToast("Fleet Broadcast", "Opening campus-wide transit announcement composer...");
}

function callCampusSecurity() {
    showToast("Security Desk", "Calling Campus Marshal Hotline (+91 8816 221234 Ext 400)...");
}

function toggleGeofenceLayer(btn) {
    btn.classList.toggle("active");
    showToast("GIS Layer", btn.classList.contains("active") ? "Campus Hub geofence overlay visible" : "Campus Hub geofence hidden");
}

function toggleLiveTraffic(btn) {
    btn.classList.toggle("active");
    showToast("GIS Traffic", btn.classList.contains("active") ? "Live feeder traffic vectors enabled" : "Traffic vectors disabled");
}

// ==========================================================================
// 7. CONTINUOUS REAL-TIME TELEMETRY LOOP
// ==========================================================================

function startContinuousTelemetryLoop() {
    let waypointIndex = 0;

    telemetryInterval = setInterval(() => {
        if (!isTripRunning) return;

        const activeRoute = BUS_ROUTES[currentBusId] || BUS_ROUTES["BUS-12"];
        const waypoints = activeRoute.waypoints;

        if (waypoints.length > 0) {
            waypointIndex = (waypointIndex + 1) % waypoints.length;
            const pt = waypoints[waypointIndex];
            const nextPt = waypoints[(waypointIndex + 1) % waypoints.length];
            const heading = calculateBearing(pt[0], pt[1], nextPt[0], nextPt[1]);

            // Realistic speed variation
            const simulatedSpeed = Math.floor(36 + Math.sin(Date.now() / 3000) * 8);

            // Update Map Marker
            if (MapService.map) {
                MapService.updateBusMarker(currentBusId, {
                    lat: pt[0],
                    lng: pt[1],
                    heading: heading,
                    speed: simulatedSpeed,
                    status: "RUNNING"
                });
            }

            // Update Cockpit Speedometer
            updateDriverSpeedometer(simulatedSpeed);
        }
    }, 1200);
}

// ==========================================================================
// 8. UTILITIES: TOASTS
// ==========================================================================

function showToast(title, message) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.style.cssText = `
        background: var(--canvas-card);
        border: 1px solid var(--border-default);
        border-radius: 8px;
        padding: 10px 16px;
        color: var(--text-primary);
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: var(--shadow-float);
        animation: toastIn 0.2s ease;
    `;
    toast.innerHTML = `
        <span class="pulsing-dot" style="width: 7px; height: 7px;"></span>
        <div>
            <strong>${title}</strong> &bull; <span style="color: var(--text-secondary);">${message}</span>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(20px)";
        toast.style.transition = "all 0.25s ease";
        setTimeout(() => toast.remove(), 250);
    }, 3800);
}
