// ==========================================================================
// DNR CAMPUS TRANSIT - REAL-TIME GPS & FIREBASE TELEMETRY CONTROLLER
// Real-world Live Tracking System for DNR College, Bhimavaram
// Dual-Theme: Campus Transit Clarity (Light) & Precision Slate (Dark)
// ==========================================================================

let currentPortalView = "hub";
let currentBusId = "BUS-01";         // Default active bus viewed by student
let driverBusId = "BUS-01";          // Default bus assigned to driver console
let currentThemeStyle = "clarity";   // "clarity" or "slate"
let isAudioMuted = false;
let isDriverRideActive = false;      // True when driver is actively broadcasting real device GPS
let sosHoldTimer = null;
let sosHoldCounter = 3;
let cachedFirebaseBuses = {};        // Cached fleet snapshot from Firebase

// ==========================================================================
// INITIALIZATION
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Check saved theme style
    const savedTheme = localStorage.getItem("dnr_theme_style");
    if (savedTheme === "slate") {
        applyStyleTheme("slate");
    } else {
        applyStyleTheme("clarity");
    }

    // 2. Start live clock
    initLiveClock();

    // 3. Render Student Portal initial view
    renderStudentPortalData(currentBusId);

    // 4. Render Driver Console initial view
    updateDriverConsoleView(driverBusId);

    // 5. Connect Realtime Firebase Listeners
    initFirebaseRealtimeStreams();

    // 6. Check URL query parameters (e.g. ?view=student)
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

    if (icon) {
        icon.classList.remove("theme-spin");
        void icon.offsetWidth;
        icon.classList.add("theme-spin");
        setTimeout(() => icon.classList.remove("theme-spin"), 600);
    }

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

    // Hide all views and reveal active view with cascading animation
    document.querySelectorAll(".clarity-view").forEach(view => view.classList.remove("active-view"));
    const targetView = document.getElementById(
        portalKey === "hub" ? "portalHubView" :
        portalKey === "student" ? "studentPortalView" :
        portalKey === "driver" ? "driverPortalView" : "managementPortalView"
    );
    if (targetView) {
        targetView.classList.remove("active-view");
        void targetView.offsetWidth; // force reflow to replay entrance animation
        targetView.classList.add("active-view");
    }

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
            // Resync current telemetry on enter
            if (cachedFirebaseBuses[currentBusId]) {
                handleStudentBusTelemetryUpdate(cachedFirebaseBuses[currentBusId]);
            }
        }, 150);
    } else if (portalKey === "management") {
        setTimeout(() => {
            if (!MapService.managementMap) {
                MapService.initManagementMap("managementMap");
            }
            MapService.managementMap.invalidateSize();
            const roster = buildFleetRosterFromFirebase(cachedFirebaseBuses);
            MapService.populateManagementFleet(roster);
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
// 3. LIVE CLOCK
// ==========================================================================

function initLiveClock() {
    function tick() {
        const driverClock = document.getElementById("driverTimeDisplay");
        const now = new Date();
        const timeStr = now.toLocaleTimeString("en-US", {
            hour12: true,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
        if (driverClock) driverClock.innerText = timeStr;
    }
    tick();
    setInterval(tick, 1000);
}

// ==========================================================================
// 4. FIREBASE REALTIME STREAMS INITIALIZATION
// ==========================================================================

function initFirebaseRealtimeStreams() {
    if (typeof BusDbService === "undefined") return;

    // Monitor Firebase Connection Health
    BusDbService.onConnectionChange((isConnected) => {
        const statusEl = document.getElementById("mgmtSyncStatus");
        const hubStatusEl = document.getElementById("hubGpsStatus");
        if (statusEl) {
            statusEl.innerText = isConnected ? "ONLINE" : "OFFLINE";
            statusEl.style.color = isConnected ? "var(--brand-emerald)" : "var(--brand-crimson)";
        }
        if (hubStatusEl) {
            hubStatusEl.innerHTML = isConnected
                ? `<span class="pulsing-dot"></span> Live Sync`
                : `<span style="color:var(--brand-crimson); font-size:12px;">&#9888; Reconnecting...</span>`;
        }
    });

    // Listen to Full Fleet stream
    BusDbService.listenToFleet((busesData) => {
        cachedFirebaseBuses = busesData || {};
        updateFleetCommandFromFirebase(cachedFirebaseBuses);

        // Also update student view if active bus data changed
        if (cachedFirebaseBuses[currentBusId]) {
            handleStudentBusTelemetryUpdate(cachedFirebaseBuses[currentBusId]);
        }
    });

    // Listen to Announcements
    BusDbService.listenToAnnouncements((announcements) => {
        renderLiveAnnouncementsFeed(announcements);
    });
}

// ==========================================================================
// 5. DRIVER CONSOLE: REAL DEVICE GPS BROADCASTING
// ==========================================================================

function changeDriverBus(busId) {
    if (!BUS_ROUTES[busId]) return;

    // If ride was currently active on previous bus, stop it first
    if (isDriverRideActive) {
        toggleDriverRideState();
    }

    driverBusId = busId;
    updateDriverConsoleView(busId);
    showToast("Vehicle Selected", `Driver console switched to ${BUS_ROUTES[busId].name}`);
}

function updateDriverConsoleView(busId) {
    const route = BUS_ROUTES[busId];
    if (!route) return;

    const selectEl = document.getElementById("driverBusSelect");
    if (selectEl && selectEl.value !== busId) selectEl.value = busId;

    const subEl = document.getElementById("driverRouteSubText");
    if (subEl) {
        subEl.innerText = `Route: ${route.name}. Tap 'Start Ride' below to broadcast your device's live GPS to students.`;
    }
}

// Driver clicks "Start Ride" / "End Ride"
function toggleDriverRideState() {
    isDriverRideActive = !isDriverRideActive;

    const btn = document.getElementById("btnDriverRideToggle");
    const title = document.getElementById("rideBtnTitle");
    const sub = document.getElementById("rideBtnSub");
    const icon = document.getElementById("rideBtnIcon");
    const gpsIndicator = document.getElementById("driverGpsIndicator");
    const gpsDot = document.getElementById("driverGpsDot");
    const gpsStatusText = document.getElementById("driverGpsStatusText");

    if (isDriverRideActive) {
        // Start Real Device Geolocation Tracking
        const started = BusDbService.startDriverGpsTracking(
            driverBusId,
            handleDriverGpsSuccess,
            handleDriverGpsError
        );

        if (!started) {
            isDriverRideActive = false;
            showToast("GPS Error", "Geolocation is not supported or permission was denied.");
            return;
        }

        if (btn) {
            btn.classList.add("active-green");
            btn.style.borderColor = "var(--brand-emerald)";
        }
        if (title) title.innerText = "End Ride";
        if (sub) sub.innerText = "Stop Broadcasting GPS";
        if (icon) {
            icon.innerHTML = `<rect x="6" y="6" width="12" height="12" fill="currentColor"/>`;
            icon.style.color = "var(--brand-crimson)";
        }

        if (gpsIndicator) {
            gpsIndicator.style.background = "var(--brand-emerald-subtle)";
            gpsIndicator.style.color = "var(--brand-emerald-text)";
            gpsIndicator.style.borderColor = "rgba(16, 185, 129, 0.4)";
        }
        if (gpsDot) {
            gpsDot.style.background = "var(--brand-emerald)";
            gpsDot.className = "pulsing-dot";
        }
        if (gpsStatusText) gpsStatusText.innerText = "BROADCASTING REAL GPS";

        if (typeof AudioService !== "undefined" && !isAudioMuted) {
            AudioService.playClick();
        }

        showToast("Ride Started", `Broadcasting device GPS for ${driverBusId} directly to students & parents!`);
    } else {
        // Stop Real Device Geolocation Tracking & Set Bus Offline in Firebase
        BusDbService.stopDriverGpsTracking(driverBusId);

        if (btn) {
            btn.classList.remove("active-green");
            btn.style.borderColor = "var(--border-default)";
        }
        if (title) title.innerText = "Start Ride";
        if (sub) sub.innerText = "Broadcast Device GPS";
        if (icon) {
            icon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"/>`;
            icon.style.color = "var(--brand-emerald)";
        }

        if (gpsIndicator) {
            gpsIndicator.style.background = "var(--canvas-group)";
            gpsIndicator.style.color = "var(--text-muted)";
            gpsIndicator.style.borderColor = "var(--border-default)";
        }
        if (gpsDot) {
            gpsDot.style.background = "var(--text-muted)";
            gpsDot.className = "";
        }
        if (gpsStatusText) gpsStatusText.innerText = "GPS Ready (Standby)";

        updateDriverSpeedometer(0);

        if (typeof AudioService !== "undefined" && !isAudioMuted) {
            AudioService.playClick();
        }

        showToast("Ride Ended", `${driverBusId} marked as Offline in Depot.`);
    }
}

// Callback when real driver device GPS updates
function handleDriverGpsSuccess(telemetry) {
    // 1. Update speedometer with actual speed
    updateDriverSpeedometer(telemetry.speed);

    // 2. Update accuracy badge
    const speedStatusPill = document.querySelector(".speed-headline-row .status-pill-live");
    if (speedStatusPill) {
        speedStatusPill.innerText = `GPS Accuracy: ±${telemetry.accuracy || 10}m`;
    }

    // 3. If student portal is viewing this bus, immediately update their view too
    if (currentBusId === driverBusId) {
        handleStudentBusTelemetryUpdate(telemetry);
    }
}

function handleDriverGpsError(err) {
    console.warn("Driver GPS Error:", err.message);
    showToast("GPS Permission Required", "Please allow Location Access in your browser so students can track the bus.");
}

function updateDriverSpeedometer(speed) {
    const numEl = document.getElementById("cockpitSpeedNumber");
    if (numEl) {
        numEl.innerHTML = `${speed} <span>km/h</span>`;
        numEl.classList.remove("num-pop");
        void numEl.offsetWidth;
        numEl.classList.add("num-pop");
        setTimeout(() => numEl.classList.remove("num-pop"), 350);
    }

    const studentSpeed = document.getElementById("studentSpeedText");
    if (studentSpeed) {
        studentSpeed.innerText = `${speed} km/h`;
        studentSpeed.classList.remove("num-pop");
        void studentSpeed.offsetWidth;
        studentSpeed.classList.add("num-pop");
        setTimeout(() => studentSpeed.classList.remove("num-pop"), 350);
    }
}

function triggerDelayNotice() {
    if (typeof AudioService !== "undefined" && !isAudioMuted) {
        AudioService.playBeep();
    }
    if (typeof BusDbService !== "undefined") {
        BusDbService.publishAnnouncement({
            title: `${driverBusId}: Traffic Delay Notice`,
            message: "Driver reported slow road conditions. Expected arrival extended by 5-7 minutes.",
            category: "Delay",
            author: `Driver (${driverBusId})`
        });
    }
    showToast("Delay Alert Queued", "Notified Campus Dispatch & parents: +5 min traffic delay.");
}

function triggerCabinChime() {
    if (typeof AudioService !== "undefined") {
        AudioService.playChime();
    }
    showToast("Audio Chime", "In-cabin passenger chime activated.");
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
    if (typeof BusDbService !== "undefined") {
        BusDbService.triggerEmergency(driverBusId, {
            message: `CRITICAL EMERGENCY SOS activated by driver of ${driverBusId}!`
        });
    }
    showToast("CRITICAL SOS TRANSMITTED", "Emergency distress beacon locked to Campus Marshal & Police Desk!");
}

// ==========================================================================
// 6. STUDENT & PARENT PORTAL CONTROLLER
// ==========================================================================

function changeActiveBus(busId) {
    if (!BUS_ROUTES[busId]) return;
    currentBusId = busId;

    renderStudentPortalData(busId);

    if (MapService.map) {
        MapService.displayRoute(busId);
    }

    // Connect listener to Firebase for this bus
    if (typeof BusDbService !== "undefined") {
        BusDbService.listenToBus(busId, (telemetry) => {
            if (currentBusId === busId) {
                handleStudentBusTelemetryUpdate(telemetry);
            }
        });
    }

    showToast("Route Synced", `Now tracking ${BUS_ROUTES[busId].name}`);
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
    if (subEl) subEl.innerText = `Official Route &bull; Destination: DNR Campus Terminal (${route.departureTime} - ${route.scheduledArrival})`;

    // Select dropdown synchronization
    const selectEl = document.getElementById("studentBusSelect");
    if (selectEl && selectEl.value !== busId) selectEl.value = busId;

    // Occupancy & Comfort
    const occEl = document.getElementById("cleanOccupancyVal");
    if (occEl) occEl.innerText = `${route.capacity} Seater`;

    const comfEl = document.getElementById("cleanComfortVal");
    if (comfEl) comfEl.innerText = "GPS Synchronized";

    // Update Scheduled Arrival Time
    const schedTimeEl = document.getElementById("cleanScheduledTime");
    if (schedTimeEl) schedTimeEl.innerText = route.scheduledArrival;

    // Update Driver Profile
    if (route.driver) {
        const initialsEl = document.getElementById("cleanDriverInitials");
        if (initialsEl) {
            const parts = route.driver.name.trim().split(/\s+/);
            const initials = parts.length > 1
                ? (parts[0][0] + parts[1][0]).toUpperCase()
                : route.driver.name.substring(0, 2).toUpperCase();
            initialsEl.innerText = initials;
        }

        const driverNameEl = document.getElementById("cleanDriverName");
        if (driverNameEl) driverNameEl.innerHTML = `${route.driver.name} &#10003;`;

        const driverExpEl = document.getElementById("cleanDriverExp");
        if (driverExpEl) {
            driverExpEl.innerHTML = `Certified Senior Driver &bull; ${route.driver.experience} exp &bull; ${route.driver.phone}`;
        }
    }

    // Bus Model and Plate Number
    const busModelEl = document.getElementById("cleanBusModel");
    if (busModelEl) busModelEl.innerText = route.busModel;

    const busRegEl = document.getElementById("cleanBusReg");
    if (busRegEl) busRegEl.innerText = route.plateNumber;

    // Timeline Header
    const timelineTitleEl = document.getElementById("studentTimelineTitle");
    if (timelineTitleEl) {
        timelineTitleEl.innerText = `Route ${route.id.replace("BUS-", "")} Timeline`;
    }

    const timelineCountEl = document.getElementById("studentTimelineStopsCount");
    if (timelineCountEl) {
        timelineCountEl.innerText = `${route.stops.length} Stops`;
    }

    // Initial check against cached Firebase data
    if (cachedFirebaseBuses[busId]) {
        handleStudentBusTelemetryUpdate(cachedFirebaseBuses[busId]);
    } else {
        handleStudentBusTelemetryUpdate(null);
    }

    // Timeline Stops Stepper
    renderTimelineStops(route.stops);
}

// Updates student UI with live driver telemetry
function handleStudentBusTelemetryUpdate(telemetry) {
    const statusPill = document.getElementById("studentBusStatusPill");
    const noticeText = document.getElementById("studentLiveNoticeText");
    const syncTimeEl = document.getElementById("studentGpsSyncTime");
    const speedText = document.getElementById("studentSpeedText");
    const arrivalHuge = document.querySelector(".arrival-huge-text");
    const arrivalStop = document.querySelector(".arrival-stop-desc");
    const distEl = document.getElementById("cleanDistRemaining");
    const route = BUS_ROUTES[currentBusId];

    const isActive = telemetry && (telemetry.status === "ACTIVE" || telemetry.status === "RUNNING");

    if (isActive && telemetry.lat && telemetry.lng) {
        // Status badge
        if (statusPill) {
            statusPill.innerText = "Live On Route";
            statusPill.className = "status-pill-live";
            statusPill.style.background = "var(--brand-emerald-subtle)";
            statusPill.style.color = "var(--brand-emerald-text)";
        }

        // Speed
        const speedKmh = Math.round(telemetry.speed || 0);
        if (speedText) speedText.innerText = `${speedKmh} km/h`;

        // Calculate real distance to DNR College Campus
        const distKm = calculateDistance(
            telemetry.lat,
            telemetry.lng,
            DNR_COLLEGE_LOCATION.coords[0],
            DNR_COLLEGE_LOCATION.coords[1]
        );

        // Estimate ETA (assume avg 35 km/h in town)
        const effectiveSpeed = Math.max(speedKmh, 25);
        const etaMins = Math.max(1, Math.round((distKm / effectiveSpeed) * 60));

        if (arrivalHuge) {
            arrivalHuge.innerHTML = `${etaMins} <span>mins away</span>`;
            arrivalHuge.classList.remove("num-pop");
            void arrivalHuge.offsetWidth;
            arrivalHuge.classList.add("num-pop");
            setTimeout(() => arrivalHuge.classList.remove("num-pop"), 350);
        }
        if (arrivalStop) {
            arrivalStop.innerHTML = `Distance to Campus: <strong>${distKm.toFixed(1)} km</strong> &bull; Speed: <strong>${speedKmh} km/h</strong>`;
        }
        if (distEl) {
            distEl.innerText = `${distKm.toFixed(1)} km`;
        }

        if (noticeText) {
            noticeText.innerHTML = `Driver is actively transmitting live GPS! Current coordinates: <strong>${telemetry.lat.toFixed(4)}, ${telemetry.lng.toFixed(4)}</strong>`;
        }

        // Update Map Marker directly on driver's real location
        if (MapService.map) {
            MapService.updateBusMarker(currentBusId, {
                lat: telemetry.lat,
                lng: telemetry.lng,
                heading: telemetry.heading || 0,
                speed: speedKmh,
                status: "ACTIVE"
            });
        }
    } else {
        // Bus is Offline in Depot
        if (statusPill) {
            statusPill.innerText = "In Depot / Standby";
            statusPill.className = "status-pill-live";
            statusPill.style.background = "var(--canvas-group)";
            statusPill.style.color = "var(--text-muted)";
            statusPill.style.borderColor = "var(--border-default)";
        }

        if (speedText) speedText.innerText = "0 km/h";

        if (arrivalHuge) {
            arrivalHuge.innerHTML = `Depot <span>Standby</span>`;
        }
        if (arrivalStop) {
            arrivalStop.innerText = "This bus is currently stationed at the depot. Waiting for driver to click 'Start Ride'.";
        }
        if (distEl) {
            distEl.innerText = "In Depot";
        }

        if (noticeText) {
            noticeText.innerHTML = `Driver has not started this trip yet. Once the driver clicks <strong>'Start Ride'</strong> on their console, live GPS coordinates will appear here automatically.`;
        }

        // Place marker at route start point
        if (MapService.map && route && route.stops.length > 0) {
            MapService.updateBusMarker(currentBusId, {
                lat: route.stops[0].coords[0],
                lng: route.stops[0].coords[1],
                heading: 0,
                speed: 0,
                status: "OFFLINE"
            });
        }
    }

    if (syncTimeEl && telemetry && telemetry.updatedAt) {
        const timeAgoSecs = Math.max(0, Math.round((Date.now() - telemetry.updatedAt) / 1000));
        syncTimeEl.innerText = `• Synced ${timeAgoSecs}s ago via Firebase`;
    }
}

function renderTimelineStops(stops) {
    const container = document.getElementById("waypointTimelineList");
    if (!container) return;

    container.innerHTML = "";

    stops.forEach((stop) => {
        const item = document.createElement("div");
        item.className = "timeline-stop-item";

        item.innerHTML = `
            <div class="stop-marker-dot"></div>
            <div class="stop-info-text">
                <h4>${stop.name}</h4>
                <p>Corridor Stop Point</p>
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
    const driver = route.driver || { name: "Assigned Driver", phone: "+91 98480 12345" };
    const phoneClean = driver.phone.replace(/[^0-9+]/g, "");
    if (window.confirm(`Call ${driver.name} (${driver.phone})?`)) {
        window.location.href = `tel:${phoneClean}`;
    }
}

// ==========================================================================
// 7. MANAGEMENT & FLEET COMMAND CONTROLLER
// ==========================================================================

function updateFleetCommandFromFirebase(busesData) {
    const roster = buildFleetRosterFromFirebase(busesData);

    // 1. Render Table
    renderFleetRosterTable(roster);

    // 2. Calculate Real Dynamic KPIs
    const totalCount = Object.keys(BUS_ROUTES).length;
    let activeCount = 0;

    Object.keys(BUS_ROUTES).forEach(busId => {
        const b = busesData[busId];
        if (b && (b.status === "ACTIVE" || b.status === "RUNNING")) {
            activeCount++;
        }
    });

    const depotCount = Math.max(0, totalCount - activeCount);

    // Update Management View KPIs
    const mgmtTotal = document.getElementById("mgmtTotalBuses");
    const mgmtActive = document.getElementById("mgmtActiveBuses");
    const mgmtDepot = document.getElementById("mgmtDepotBuses");
    const mgmtActiveSub = document.getElementById("mgmtActiveSub");

    if (mgmtTotal) mgmtTotal.innerText = totalCount;
    if (mgmtActive) mgmtActive.innerText = activeCount;
    if (mgmtDepot) mgmtDepot.innerText = depotCount;
    if (mgmtActiveSub) mgmtActiveSub.innerText = activeCount > 0 ? `• ${activeCount} transmitting live GPS` : "• Waiting for driver GPS";

    // Update Hub View Quick Stats Strip
    const hubTotal = document.getElementById("hubTotalBusesCount");
    const hubActive = document.getElementById("hubActiveBusesCount");
    const hubDepot = document.getElementById("hubDepotBusesCount");

    if (hubTotal) hubTotal.innerText = totalCount;
    if (hubActive) hubActive.innerText = activeCount;
    if (hubDepot) hubDepot.innerText = depotCount;

    // 3. Update Management GIS Map with real bus markers
    if (MapService.managementMap) {
        MapService.populateManagementFleet(roster);
    }
}

function renderFleetRosterTable(roster) {
    const tbody = document.getElementById("rosterTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    roster.forEach(item => {
        const tr = document.createElement("tr");

        const statusBadge = item.statusType === "active" ?
            `<span class="status-capsule on-time"><span class="pulsing-dot" style="width:5px;height:5px;"></span>ON ROUTE (${item.speed})</span>` :
            `<span class="status-capsule depot">IN DEPOT</span>`;

        tr.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 800; color: var(--text-primary); font-size: 13px;">${item.busId}</span>
                </div>
            </td>
            <td>
                <strong style="color: var(--text-primary); font-size: 13px;">${item.routeId}</strong>
                <div style="font-size: 11px; color: var(--text-muted);">${item.sector}</div>
            </td>
            <td>
                <div style="font-weight: 600; color: var(--text-primary); font-size: 13px;">${item.driver}</div>
                <div style="font-size: 11px; color: var(--text-muted);">ID: ${item.driverId}</div>
            </td>
            <td>${statusBadge}</td>
            <td>
                <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-primary);">${item.coords}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${item.locationDesc}</div>
            </td>
            <td>
                <span style="font-weight: 600; color: var(--text-primary); font-size: 12px;">${item.eta}</span>
            </td>
            <td>
                <button class="filter-pill-btn" onclick="trackSingleBus('${item.busId}')" style="padding: 4px 10px; font-size: 11px; background: var(--canvas-group); border-color: var(--border-default);">
                    View Map &rarr;
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function filterFleetRoster(query) {
    const q = query.toLowerCase();
    const allRoster = buildFleetRosterFromFirebase(cachedFirebaseBuses);
    const filtered = allRoster.filter(bus =>
        bus.busId.toLowerCase().includes(q) ||
        bus.driver.toLowerCase().includes(q) ||
        bus.routeId.toLowerCase().includes(q)
    );
    renderFleetRosterTable(filtered);
}

function filterRosterTab(type, btn) {
    document.querySelectorAll(".filter-pill-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const allRoster = buildFleetRosterFromFirebase(cachedFirebaseBuses);
    if (type === "ALL") {
        renderFleetRosterTable(allRoster);
    } else {
        const filtered = allRoster.filter(b => b.statusType === type);
        renderFleetRosterTable(filtered);
    }
}

function exportFleetCsv() {
    const allRoster = buildFleetRosterFromFirebase(cachedFirebaseBuses);
    let csv = "Bus ID,Route ID,Destination,Driver,Status,Coordinates,Speed\n";
    allRoster.forEach(b => {
        csv += `"${b.busId}","${b.routeId}","${b.sector}","${b.driver}","${b.status}","${b.coords}","${b.speed}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DNR_Fleet_Roster_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast("CSV Exported", "Downloaded real-time fleet roster CSV.");
}

function trackSingleBus(busId) {
    if (BUS_ROUTES[busId]) {
        changeActiveBus(busId);
    }
    switchPortalView("student");
}

function renderLiveAnnouncementsFeed(announcements) {
    const feed = document.querySelector(".alerts-feed-clean");
    if (!feed) return;

    if (!announcements || announcements.length === 0) {
        feed.innerHTML = `
            <div class="alert-item-box normal">
                <div class="alert-title">Normal Operations</div>
                <div class="alert-text">All campus feeder routes report nominal conditions. Zero incident alerts active.</div>
            </div>
        `;
        return;
    }

    feed.innerHTML = "";
    announcements.slice(0, 4).forEach(item => {
        const box = document.createElement("div");
        box.className = `alert-item-box ${item.category === 'Delay' ? '' : 'normal'}`;
        const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now";

        box.innerHTML = `
            <span class="alert-time">${timeStr}</span>
            <div class="alert-title">${item.title}</div>
            <div class="alert-text">${item.message}</div>
        `;
        feed.appendChild(box);
    });
}

function openScheduleModal() {
    showToast("Safety Broadcast", "Dispatching safety confirmation notice to active units.");
}

function openNewRouteModal() {
    showToast("Fleet Announcement", "Composer ready to broadcast updates to parents & students.");
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
// 8. TOAST NOTIFICATION UTILITY
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
