// DNR College Bus Routes & Fleet Master Data
// Destination: DNR College of Engineering & Technology / Association, Bhimavaram
// Aligned with Google Stitch 'Precision Slate Telemetry' Architecture

const DNR_COLLEGE_LOCATION = {
    name: "DNR College, Bhimavaram",
    shortName: "DNR Campus",
    coords: [16.5358, 81.5186],
    address: "Balusumoodi, Bhimavaram, Andhra Pradesh 534202"
};

const BUS_ROUTES = {
    "BUS-12": {
        id: "BUS-12",
        displayCode: "RT-12",
        name: "Route 12: Bhimavaram RTC ➔ DNR Main Campus",
        origin: "Bhimavaram RTC",
        destination: "DNR Main Campus",
        color: "#ffffff",
        accentColor: "#a1a1aa",
        plateNumber: "AP 37 TE 8821",
        busModel: "Eicher Starline 48-Seater (Diesel Euro-VI)",
        capacity: 48,
        occupancy: 36,
        fuelLevel: "82%",
        hvacTemp: "23.5°C",
        departureTime: "08:00 AM",
        scheduledArrival: "09:00 AM",
        driver: {
            name: "K. Satyanarayana",
            id: "DNR-DRV-042",
            phone: "+91 98480 23456",
            experience: "14 yrs",
            rating: "4.9",
            photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
        },
        stops: [
            { id: "s12_1", name: "Bhimavaram RTC Complex", coords: [16.5402, 81.5230], scheduledTime: "08:00 AM", status: "DEPARTED", kmFromOrigin: 0 },
            { id: "s12_2", name: "Underground Bus Stop", coords: [16.5435, 81.5222], scheduledTime: "08:12 AM", status: "CLEARED", kmFromOrigin: 1.8 },
            { id: "s12_3", name: "Somaram Junction", coords: [16.5449, 81.5212], scheduledTime: "08:28 AM", status: "BOARDED", kmFromOrigin: 3.5 },
            { id: "s12_4", name: "Balusumoodi Stop", coords: [16.5385, 81.5200], scheduledTime: "08:42 AM", status: "APPROACHING", kmFromOrigin: 5.2 },
            { id: "s12_5", name: "J.P. Road Junction", coords: [16.5368, 81.5192], scheduledTime: "08:49 AM", status: "SCHEDULED", kmFromOrigin: 6.1 },
            { id: "s12_6", name: "DNR Campus Main Gate", coords: [16.5358, 81.5186], scheduledTime: "09:00 AM", status: "TERMINAL", kmFromOrigin: 7.2 }
        ],
        waypoints: [
            [16.5402, 81.5230],
            [16.5418, 81.5228],
            [16.5435, 81.5222],
            [16.5442, 81.5218],
            [16.5449, 81.5212],
            [16.5430, 81.5208],
            [16.5405, 81.5204],
            [16.5385, 81.5200],
            [16.5375, 81.5196],
            [16.5368, 81.5192],
            [16.5358, 81.5186]
        ]
    },
    "BUS-01": {
        id: "BUS-01",
        displayCode: "RT-01",
        name: "Route 1: Kaikaluru ➔ DNR College",
        origin: "Kaikaluru",
        destination: "DNR College",
        color: "#ffffff",
        accentColor: "#a1a1aa",
        plateNumber: "AP 37 TC 1001",
        busModel: "Tata Starbus Ultra (52 Seater)",
        capacity: 52,
        occupancy: 42,
        fuelLevel: "78%",
        hvacTemp: "24.0°C",
        departureTime: "07:15 AM",
        scheduledArrival: "08:45 AM",
        driver: {
            name: "R. Satyanarayana",
            id: "DNR-DRV-031",
            phone: "+91 98480 12345",
            experience: "12 yrs",
            rating: "4.9",
            photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
        },
        stops: [
            { id: "s1_1", name: "Kaikaluru Bus Stand", coords: [16.5684, 81.2057], scheduledTime: "07:15 AM", status: "DEPARTED", kmFromOrigin: 0 },
            { id: "s1_2", name: "Mudinepalli Centre", coords: [16.5540, 81.2820], scheduledTime: "07:35 AM", status: "CLEARED", kmFromOrigin: 9.5 },
            { id: "s1_3", name: "Akividu Railway Gate", coords: [16.5925, 81.3814], scheduledTime: "08:00 AM", status: "CLEARED", kmFromOrigin: 22.0 },
            { id: "s1_4", name: "Cherukumilli Junction", coords: [16.5610, 81.4450], scheduledTime: "08:18 AM", status: "APPROACHING", kmFromOrigin: 30.5 },
            { id: "s1_5", name: "Undi Main Road", coords: [16.5492, 81.4720], scheduledTime: "08:30 AM", status: "SCHEDULED", kmFromOrigin: 34.2 },
            { id: "s1_6", name: "DNR College Campus", coords: [16.5358, 81.5186], scheduledTime: "08:45 AM", status: "TERMINAL", kmFromOrigin: 40.0 }
        ],
        waypoints: [
            [16.5684, 81.2057],
            [16.5650, 81.2320],
            [16.5590, 81.2580],
            [16.5540, 81.2820],
            [16.5620, 81.3150],
            [16.5740, 81.3480],
            [16.5925, 81.3814],
            [16.5810, 81.4120],
            [16.5610, 81.4450],
            [16.5492, 81.4720],
            [16.5410, 81.4950],
            [16.5375, 81.5080],
            [16.5358, 81.5186]
        ]
    },
    "BUS-02": {
        id: "BUS-02",
        displayCode: "RT-02",
        name: "Route 2: Ganapavaram ➔ DNR College",
        origin: "Ganapavaram",
        destination: "DNR College",
        color: "#ffffff",
        accentColor: "#a1a1aa",
        plateNumber: "AP 37 TC 1002",
        busModel: "Ashok Leyland Lynx (48 Seater)",
        capacity: 48,
        occupancy: 38,
        fuelLevel: "85%",
        hvacTemp: "23.0°C",
        departureTime: "07:35 AM",
        scheduledArrival: "08:40 AM",
        driver: {
            name: "M. Venkata Rao",
            id: "DNR-DRV-019",
            phone: "+91 94401 67890",
            experience: "9 yrs",
            rating: "4.8",
            photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
        },
        stops: [
            { id: "s2_1", name: "Ganapavaram Clock Tower", coords: [16.6575, 81.4422], scheduledTime: "07:35 AM", status: "DEPARTED", kmFromOrigin: 0 },
            { id: "s2_2", name: "Pippara Center", coords: [16.6210, 81.4580], scheduledTime: "07:55 AM", status: "CLEARED", kmFromOrigin: 6.2 },
            { id: "s2_3", name: "Kesavaram Gate", coords: [16.5850, 81.4700], scheduledTime: "08:12 AM", status: "CLEARED", kmFromOrigin: 11.5 },
            { id: "s2_4", name: "Undi Bypass", coords: [16.5520, 81.4880], scheduledTime: "08:26 AM", status: "APPROACHING", kmFromOrigin: 16.0 },
            { id: "s2_5", name: "DNR College Campus", coords: [16.5358, 81.5186], scheduledTime: "08:40 AM", status: "TERMINAL", kmFromOrigin: 21.0 }
        ],
        waypoints: [
            [16.6575, 81.4422],
            [16.6430, 81.4490],
            [16.6210, 81.4580],
            [16.6020, 81.4640],
            [16.5850, 81.4700],
            [16.5680, 81.4780],
            [16.5520, 81.4880],
            [16.5420, 81.5020],
            [16.5358, 81.5186]
        ]
    },
    "BUS-03": {
        id: "BUS-03",
        displayCode: "RT-03",
        name: "Route 3: Palakollu ➔ DNR College",
        origin: "Palakollu",
        destination: "DNR College",
        color: "#ffffff",
        accentColor: "#a1a1aa",
        plateNumber: "AP 37 TC 1003",
        busModel: "Eicher Skyline Pro (50 Seater)",
        capacity: 50,
        occupancy: 45,
        fuelLevel: "74%",
        hvacTemp: "23.8°C",
        departureTime: "07:30 AM",
        scheduledArrival: "08:45 AM",
        driver: {
            name: "K. Appala Naidu",
            id: "DNR-DRV-008",
            phone: "+91 97012 34567",
            experience: "15 yrs",
            rating: "5.0",
            photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"
        },
        stops: [
            { id: "s3_1", name: "Palakollu RTC Complex", coords: [16.5180, 81.7289], scheduledTime: "07:30 AM", status: "DEPARTED", kmFromOrigin: 0 },
            { id: "s3_2", name: "Poolapalli Junction", coords: [16.5210, 81.6750], scheduledTime: "07:50 AM", status: "CLEARED", kmFromOrigin: 6.8 },
            { id: "s3_3", name: "Veeravasaram Center", coords: [16.5270, 81.6210], scheduledTime: "08:08 AM", status: "CLEARED", kmFromOrigin: 13.5 },
            { id: "s3_4", name: "Srungavruksham Gate", coords: [16.5310, 81.5680], scheduledTime: "08:25 AM", status: "APPROACHING", kmFromOrigin: 20.0 },
            { id: "s3_5", name: "DNR College Campus", coords: [16.5358, 81.5186], scheduledTime: "08:45 AM", status: "TERMINAL", kmFromOrigin: 26.5 }
        ],
        waypoints: [
            [16.5180, 81.7289],
            [16.5195, 81.7010],
            [16.5210, 81.6750],
            [16.5240, 81.6480],
            [16.5270, 81.6210],
            [16.5290, 81.5930],
            [16.5310, 81.5680],
            [16.5335, 81.5420],
            [16.5358, 81.5186]
        ]
    }
};

// Dynamic Campus Fleet Roster Builder (Powered strictly by Firebase Realtime Database)
function buildFleetRosterFromFirebase(firebaseBuses = {}) {
    const busKeys = Object.keys(BUS_ROUTES);
    return busKeys.map(busId => {
        const route = BUS_ROUTES[busId];
        const fbData = firebaseBuses[busId] || {};
        const isActive = fbData.status === "ACTIVE" || fbData.status === "RUNNING";
        const hasCoords = fbData.lat && fbData.lng;

        const coordsStr = hasCoords
            ? `${fbData.lat.toFixed(4)}° N, ${fbData.lng.toFixed(4)}° E`
            : "Campus Depot Base";

        const speedStr = isActive && fbData.speed !== undefined
            ? `${fbData.speed} km/h`
            : "0 km/h";

        const statusLabel = isActive ? "ON ROUTE" : "IN DEPOT";
        const statusType = isActive ? "active" : "depot";

        return {
            busId: busId,
            routeId: route.name,
            sector: route.destination,
            driver: route.driver ? route.driver.name : "Assigned Driver",
            driverId: route.driver ? route.driver.id : busId,
            status: statusLabel,
            coords: coordsStr,
            lat: fbData.lat || route.stops[0].coords[0],
            lng: fbData.lng || route.stops[0].coords[1],
            locationDesc: isActive ? "Broadcasting Real-time GPS" : "Depot Standby",
            nextStop: route.stops[route.stops.length - 1].name,
            eta: isActive ? "In Transit" : "Standby",
            speed: speedStr,
            fuel: "Normal",
            statusType: statusType,
            updatedAt: fbData.updatedAt || null
        };
    });
}

// Fallback baseline for initial render before Firebase responds
const FLEET_ROSTER = buildFleetRosterFromFirebase({});

// Distance calculation using Haversine formula (km)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

// Calculate bearing/heading between two points
function calculateBearing(lat1, lon1, lat2, lon2) {
    const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
        Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
    const brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
}
