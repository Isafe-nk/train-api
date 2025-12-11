const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

module.exports = async (req, res) => {
  // 1. Set CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const govUrl = 'https://api.data.gov.my/gtfs-realtime/vehicle-position/ktmb';
    const response = await fetch(govUrl);

    if (!response.ok) {
      throw new Error(`Gov API Error: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const uint8View = new Uint8Array(buffer);
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(uint8View);

    const simplifiedTrains = feed.entity.map(entity => {
      // Safety Check 1: Does this entity have vehicle data?
      if (!entity.vehicle) return null;
      
      // Safety Check 2: Does it have position data?
      if (!entity.vehicle.position) return null;

      const v = entity.vehicle;
      
      // SAFE extraction of data
      return {
        id: v.vehicle ? v.vehicle.id : "Unknown",
        
        // This is the new part (with extra safety)
        tripId: (v.trip && v.trip.tripId) ? v.trip.tripId : "No Schedule",
        
        lat: v.position.latitude,
        lng: v.position.longitude,
        speed: v.position.speed || 0
      };
    }).filter(train => train !== null);

    res.status(200).json({ 
      source: "KTMB Realtime",
      count: simplifiedTrains.length,
      trains: simplifiedTrains 
    });

  } catch (error) {
    console.error("Crash Error:", error);
    res.status(500).json({ error: 'Server crashed: ' + error.message });
  }
};
