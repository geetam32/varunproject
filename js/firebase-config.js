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

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();

// Active database references
const BusDbService = {
    activeBusListenerRef: null,
    fleetListenerRef: null,
    announcementsListenerRef: null,
    emergenciesListenerRef: null,

    // Monitor Firebase Connection Health
    onConnectionChange(callback) {
        db.ref(".info/connected").on("value", (snap) => {
            callback(snap.val() === true);
        });
    },

    // Update Bus Telemetry (called by Driver GPS or Simulator)
    updateBusTelemetry(busId, telemetryData) {
        const payload = {
            ...telemetryData,
            updatedAt: Date.now()
        };
        return db.ref(`buses/${busId}`).update(payload);
    },

    // Set Bus Offline
    setBusOffline(busId) {
        return db.ref(`buses/${busId}`).update({
            status: "OFFLINE",
            speed: 0,
            updatedAt: Date.now()
        });
    },

    // Listen to a single bus's live stream
    listenToBus(busId, callback) {
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
        const newRef = db.ref("announcements").push();
        return newRef.set({
            id: newRef.key,
            title: announcement.title,
            message: announcement.message,
            category: announcement.category || "General", // General, Delay, Weather, Emergency
            timestamp: Date.now(),
            author: announcement.author || "DNR Transport Cell"
        });
    },

    // Listen to Announcements
    listenToAnnouncements(callback) {
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
        const newRef = db.ref("emergencies").push();
        const emergencyData = {
            id: newRef.key,
            busId: busId,
            route: BUS_ROUTES[busId] ? BUS_ROUTES[busId].name : busId,
            driverName: BUS_ROUTES[busId] ? BUS_ROUTES[busId].driver.name : "Driver",
            driverPhone: BUS_ROUTES[busId] ? BUS_ROUTES[busId].driver.phone : "",
            lat: info.lat || null,
            lng: info.lng || null,
            timestamp: Date.now(),
            status: "ACTIVE", // ACTIVE or RESOLVED
            message: info.message || `Emergency SOS beacon activated for ${busId}!`
        };

        // Also mark the bus status as EMERGENCY
        db.ref(`buses/${busId}`).update({
            status: "EMERGENCY",
            updatedAt: Date.now()
        });

        return newRef.set(emergencyData);
    },

    // Resolve Emergency Alert
    resolveEmergency(emergencyId, busId) {
        if (busId) {
            db.ref(`buses/${busId}`).update({
                status: "RUNNING",
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
