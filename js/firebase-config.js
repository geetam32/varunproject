// Firebase Configuration & Realtime Database Service for DNR College Bus Tracking

const firebaseConfig = {
    apiKey: "AIzaSyCsiL4nML9FD4skd_v0850zsdQTCeqYg8M",
    authDomain: "college-bus-tracking-sys-a4bf7.firebaseapp.com",
    databaseURL: "https://college-bus-tracking-sys-a4bf7-default-rtdb.firebaseio.com",
    projectId: "college-bus-tracking-sys-a4bf7",
    storageBucket: "college-bus-tracking-sys-a4bf7.firebasestorage.app",
    messagingSenderId: "724758160522",
    appId: "1:724758160522:web:107eac371f0286dc8a7973"
};

// Initialize Firebase safely
let db = null;
try {
    if (typeof firebase !== "undefined") {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.database();
    }
} catch (e) {
    console.warn("Firebase initialization warning:", e);
}

// Active database references & real-time telemetry service
const BusDbService = {
    activeBusListenerRef: null,
    fleetListenerRef: null,
    announcementsListenerRef: null,
    emergenciesListenerRef: null,
    driverWatchId: null,

    // Monitor Firebase Connection Health
    onConnectionChange(callback) {
        if (!db) {
            callback(false);
            return;
        }
        db.ref(".info/connected").on("value", (snap) => {
            callback(snap.val() === true);
        });
    },

    // Real Device GPS Driver Tracking (HTML5 Geolocation API)
    startDriverGpsTracking(busId, onUpdate, onError) {
        if (!navigator.geolocation) {
            if (onError) onError(new Error("Geolocation is not supported by your browser or device."));
            return false;
        }

        this.stopDriverGpsTracking(busId);

        const options = {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 15000
        };

        const handlePositionSuccess = (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const speedKmh = (position.coords.speed !== null && !isNaN(position.coords.speed) && position.coords.speed >= 0)
                ? Math.round(position.coords.speed * 3.6)
                : 0;
            const heading = position.coords.heading || 0;
            const accuracy = Math.round(position.coords.accuracy || 0);

            const telemetry = {
                lat: lat,
                lng: lng,
                speed: speedKmh,
                heading: heading,
                accuracy: accuracy,
                status: "ACTIVE",
                isSimulated: false,
                updatedAt: Date.now()
            };

            // Broadcast directly to Firebase Realtime Database
            if (db) {
                db.ref(`buses/${busId}`).update(telemetry);
            }

            if (onUpdate) {
                onUpdate(telemetry);
            }
        };

        const handlePositionError = (error) => {
            console.warn("Driver GPS geolocation warning:", error.message);
            if (onError) onError(error);
        };

        // 1. Get instantaneous initial fix immediately
        navigator.geolocation.getCurrentPosition(handlePositionSuccess, handlePositionError, options);

        // 2. Stream continuous position updates as driver moves
        this.driverWatchId = navigator.geolocation.watchPosition(
            handlePositionSuccess,
            handlePositionError,
            options
        );

        // Immediately flag as ACTIVE in Firebase
        if (db) {
            db.ref(`buses/${busId}`).update({
                status: "ACTIVE",
                updatedAt: Date.now()
            });
        }

        return true;
    },

    // Stop Real Device GPS Driver Tracking
    stopDriverGpsTracking(busId) {
        if (this.driverWatchId !== null) {
            navigator.geolocation.clearWatch(this.driverWatchId);
            this.driverWatchId = null;
        }

        if (busId && db) {
            db.ref(`buses/${busId}`).update({
                status: "OFFLINE",
                speed: 0,
                updatedAt: Date.now()
            });
        }
    },

    // Update Bus Telemetry directly
    updateBusTelemetry(busId, telemetryData) {
        if (!db) return Promise.resolve();
        const payload = {
            ...telemetryData,
            updatedAt: Date.now()
        };
        return db.ref(`buses/${busId}`).update(payload);
    },

    // Set Bus Offline
    setBusOffline(busId) {
        if (!db) return Promise.resolve();
        return db.ref(`buses/${busId}`).update({
            status: "OFFLINE",
            speed: 0,
            updatedAt: Date.now()
        });
    },

    // Listen to a single bus's live stream from Firebase
    listenToBus(busId, callback) {
        if (!db) return;
        if (this.activeBusListenerRef) {
            this.activeBusListenerRef.off();
        }
        this.activeBusListenerRef = db.ref(`buses/${busId}`);
        this.activeBusListenerRef.on("value", (snapshot) => {
            callback(snapshot.val());
        });
    },

    stopListeningToCurrentBus() {
        if (this.activeBusListenerRef) {
            this.activeBusListenerRef.off();
            this.activeBusListenerRef = null;
        }
    },

    // Listen to all buses for Fleet Command View (Management)
    listenToFleet(callback) {
        if (!db) {
            callback({});
            return;
        }
        if (this.fleetListenerRef) {
            this.fleetListenerRef.off();
        }
        this.fleetListenerRef = db.ref("buses");
        this.fleetListenerRef.on("value", (snapshot) => {
            callback(snapshot.val() || {});
        });
    },

    stopListeningToFleet() {
        if (this.fleetListenerRef) {
            this.fleetListenerRef.off();
            this.fleetListenerRef = null;
        }
    },

    // Publish Announcement to Firebase
    publishAnnouncement(announcement) {
        if (!db) return Promise.resolve();
        const newRef = db.ref("announcements").push();
        return newRef.set({
            id: newRef.key,
            title: announcement.title,
            message: announcement.message,
            category: announcement.category || "General",
            timestamp: Date.now(),
            author: announcement.author || "DNR Transport Cell"
        });
    },

    // Listen to Announcements
    listenToAnnouncements(callback) {
        if (!db) {
            callback([]);
            return;
        }
        if (this.announcementsListenerRef) {
            this.announcementsListenerRef.off();
        }
        this.announcementsListenerRef = db.ref("announcements").limitToLast(20);
        this.announcementsListenerRef.on("value", (snapshot) => {
            const data = snapshot.val() || {};
            const list = Object.keys(data).map(k => data[k]).reverse();
            callback(list);
        });
    },

    // Broadcast Emergency SOS
    triggerEmergency(busId, info = {}) {
        if (!db) return Promise.resolve();
        const newRef = db.ref("emergencies").push();
        const emergencyData = {
            id: newRef.key,
            busId: busId,
            route: BUS_ROUTES[busId] ? BUS_ROUTES[busId].name : busId,
            driverName: (BUS_ROUTES[busId] && BUS_ROUTES[busId].driver) ? BUS_ROUTES[busId].driver.name : "Driver",
            driverPhone: (BUS_ROUTES[busId] && BUS_ROUTES[busId].driver) ? BUS_ROUTES[busId].driver.phone : "",
            lat: info.lat || null,
            lng: info.lng || null,
            timestamp: Date.now(),
            status: "ACTIVE",
            message: info.message || `Emergency SOS beacon activated for ${busId}!`
        };

        db.ref(`buses/${busId}`).update({
            status: "EMERGENCY",
            updatedAt: Date.now()
        });

        return newRef.set(emergencyData);
    },

    // Resolve Emergency Alert
    resolveEmergency(emergencyId, busId) {
        if (!db) return Promise.resolve();
        if (busId) {
            db.ref(`buses/${busId}`).update({
                status: "ACTIVE",
                updatedAt: Date.now()
            });
        }
        return db.ref(`emergencies/${emergencyId}`).update({
            status: "RESOLVED",
            resolvedAt: Date.now()
        });
    },

    // Listen to Emergency Alerts
    listenToEmergencies(callback) {
        if (!db) {
            callback([]);
            return;
        }
        if (this.emergenciesListenerRef) {
            this.emergenciesListenerRef.off();
        }
        this.emergenciesListenerRef = db.ref("emergencies").limitToLast(10);
        this.emergenciesListenerRef.on("value", (snapshot) => {
            const data = snapshot.val() || {};
            const list = Object.keys(data).map(k => data[k]).reverse();
            callback(list);
        });
    }
};
