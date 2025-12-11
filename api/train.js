// api/trains.js
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

// Node 18+ has a built-in fetch, so we don't need to install 'node-fetch'
// If you use an older Node version on Vercel, change settings to Node 18 or 20.

module.exports = async (req, res) => {
  // 1. Set CORS Headers (Crucial for mobile apps!)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow ANY app to connect
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle the "Preflight" check (Browsers ask this before fetching)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 2. Fetch the Binary Data from Malaysia Gov
    const govUrl = 'https://api.data.gov.my/gtfs-realtime/vehicle-position/ktmb';
    const response = await fetch(govUrl);

    if (!response.ok) {
      throw new Error(`Gov API Error: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const uint8View = new Uint8Array(buffer);

    // 3. Decode the Protobuf
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(uint8View);

    // 4. Simplify the Data (Send only what your app needs)
    const simplifiedTrains = feed.entity.map(entity => {
      if (!entity.vehicle) return null;
      return {
        id: entity.vehicle.vehicle.id,
        tripId: entity.vehicle.trip ? entity.vehicle.trip.tripId : "Unknown"
        lat: entity.vehicle.position.latitude,
        lng: entity.vehicle.position.longitude,
        speed: entity.vehicle.position.speed || 0,
        // timestamp: entity.vehicle.timestamp // Optional
      };
    }).filter(train => train !== null); // Remove empty entries

    // 5. Send clean JSON to your app
    res.status(200).json({ 
      source: "KTMB Realtime",
      count: simplifiedTrains.length,
      trains: simplifiedTrains 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch train data' });
  }
};
