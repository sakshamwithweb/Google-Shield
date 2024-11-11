import { NextResponse } from 'next/server';

export async function POST(request) {
    // Extract latitude and longitude from the request body
    const { latitude, longitude } = await request.json();
    console.log(latitude, longitude);
    const findNearbyPlaces = async (location, type) => {
        const apiKey = process.env.GOMAPS_API_KEY;
        const radius = 1000;
        const url = `https://maps.gomaps.pro/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${type}&key=${apiKey}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response}`);
            }

            const data = await response.json();
            return data.results;
        } catch (error) {
            console.error('Error fetching places:', error.message);
            return [];
        }
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of the Earth in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };

    const getSafeLocations = async (latitude, longitude) => {
        const location = `${latitude},${longitude}`;

        const placeTypes = [
            'police',
            'hospital',
            'transit_station',
            'fire_station',
            'emergency',
            'library',
            'community_center',
            'pharmacy',
            'ambulance',
            'park'
        ];

        const safePlacesPromises = placeTypes.map(type => findNearbyPlaces(location, type));
        const results = await Promise.all(safePlacesPromises);

        const safePlaces = [].concat(...results);
        const uniquePlacesMap = new Map();

        const placesWithDistance = safePlaces.map(place => {
            const placeLat = place.geometry.location.lat;
            const placeLon = place.geometry.location.lng;
            const distance = calculateDistance(latitude, longitude, placeLat, placeLon);
            
            if (!uniquePlacesMap.has(place.name)) {
                uniquePlacesMap.set(place.name, { ...place, distance });
            }

            return uniquePlacesMap.get(place.name);
        });

        const uniquePlacesArray = Array.from(uniquePlacesMap.values());
        uniquePlacesArray.sort((a, b) => a.distance - b.distance);

        return uniquePlacesArray.slice(0, 3); // Return top 3 closest places
    };

    try {
        const safePlaces = await getSafeLocations(latitude, longitude);
        return NextResponse.json({data:safePlaces});
    } catch (error) {
        console.error('Error getting safe locations:', error);
        return NextResponse.error();
    }
}
