// Realistic Bus Route Simulator for DNR College Bus Tracking
// Allows seamless testing and demonstration on laptops, desktops, and presentations

const BusSimulator = {
    activeBusId: null,
    isRunning: false,
    timer: null,
    currentStep: 0,
    speedMultiplier: 1, // 1x, 2x, 4x
    interpolatedPoints: [],
    currentStopIndex: 0,
    passengerCount: 34,

    // Generate detailed dense interpolated points between route waypoints for smooth motion
    generateDensePoints(waypoints, samplesBetweenPoints = 15) {
        const dense = [];
        for (let i = 0; i < waypoints.length - 1; i++) {
            const p1 = waypoints[i];
            const p2 = waypoints[i + 1];
            for (let s = 0; s < samplesBetweenPoints; s++) {
                const ratio = s / samplesBetweenPoints;
                const lat = p1[0] + (p2[0] - p1[0]) * ratio;
                const lng = p1[1] + (p2[1] - p1[1]) * ratio;
                dense.push([lat, lng]);
            }
        }
        dense.push(waypoints[waypoints.length - 1]);
        return dense;
    },

    start(busId, onUpdateCallback) {
        this.stop();
        this.activeBusId = busId;
        const route = BUS_ROUTES[busId];
        if (!route) return;

        this.interpolatedPoints = this.generateDensePoints(route.waypoints, 12);
        this.currentStep = 0;
        this.isRunning = true;
        this.passengerCount = Math.floor(route.capacity * 0.7);

        // Notify Firebase immediately that bus is starting
        BusDbService.updateBusTelemetry(busId, {
            status: "RUNNING",
            lat: this.interpolatedPoints[0][0],
            lng: this.interpolatedPoints[0][1],
            speed: 38,
            heading: 90,
            isSimulated: true,
            passengers: this.passengerCount
        });

        const tickInterval = 1500; // ms

        this.timer = setInterval(() => {
            if (!this.isRunning) return;

            if (this.currentStep >= this.interpolatedPoints.length - 1) {
                // Arrived at DNR College!
                this.currentStep = this.interpolatedPoints.length - 1;
                const finalPoint = this.interpolatedPoints[this.currentStep];
                const telemetry = {
                    lat: finalPoint[0],
                    lng: finalPoint[1],
                    speed: 0,
                    heading: 0,
                    status: "ARRIVED",
                    currentStop: "DNR College Campus (Terminus)",
                    distanceToCollegeKm: 0,
                    etaCollegeMins: 0,
                    isSimulated: true,
                    passengers: 0
                };
                BusDbService.updateBusTelemetry(this.activeBusId, telemetry);
                if (onUpdateCallback) onUpdateCallback(telemetry);
                this.pause();
                return;
            }

            const currentPoint = this.interpolatedPoints[this.currentStep];
            const nextPoint = this.interpolatedPoints[this.currentStep + 1];

            // Calculate bearing angle for compass and SVG bus rotation
            const heading = Math.round(calculateBearing(
                currentPoint[0], currentPoint[1],
                nextPoint[0], nextPoint[1]
            ));

            // Calculate distance to DNR College
            const distToCollege = calculateDistance(
                currentPoint[0], currentPoint[1],
                DNR_COLLEGE_LOCATION.coords[0], DNR_COLLEGE_LOCATION.coords[1]
            );

            // Realistic cruising speed variation (34 - 48 km/h)
            const baseSpeed = 40 + Math.sin(this.currentStep / 3) * 6;
            const currentSpeed = Math.round(baseSpeed);

            // Calculate dynamic ETA (assuming avg 35 km/h in city/suburb roads)
            const etaMinutes = Math.max(1, Math.round((distToCollege / 35) * 60));

            // Determine nearest or upcoming stop
            const upcomingStop = this.findNextStop(route, currentPoint);

            const telemetry = {
                lat: Number(currentPoint[0].toFixed(6)),
                lng: Number(currentPoint[1].toFixed(6)),
                speed: currentSpeed,
                heading: heading,
                status: "RUNNING",
                currentStop: upcomingStop.name,
                distanceToCollegeKm: Number(distToCollege.toFixed(1)),
                etaCollegeMins: etaMinutes,
                isSimulated: true,
                passengers: this.passengerCount
            };

            // Push to Firebase RTDB
            BusDbService.updateBusTelemetry(this.activeBusId, telemetry);

            if (onUpdateCallback) {
                onUpdateCallback(telemetry);
            }

            // Advance step based on multiplier
            this.currentStep += this.speedMultiplier;
        }, tickInterval);
    },

    findNextStop(route, currentPoint) {
        for (let i = 0; i < route.stops.length; i++) {
            const stop = route.stops[i];
            const dist = calculateDistance(currentPoint[0], currentPoint[1], stop.coords[0], stop.coords[1]);
            if (dist > 0.4) {
                return stop;
            }
        }
        return route.stops[route.stops.length - 1];
    },

    pause() {
        this.isRunning = false;
    },

    resume() {
        if (this.interpolatedPoints.length > 0) {
            this.isRunning = true;
        }
    },

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.isRunning = false;
        this.currentStep = 0;
    },

    setMultiplier(factor) {
        this.speedMultiplier = factor;
    }
};
