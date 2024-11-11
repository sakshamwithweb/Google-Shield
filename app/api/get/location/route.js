import { NextResponse } from "next/server";

const Geolocation = async (apiKey) => {
    const url = `https://www.gomaps.pro/geolocation/v1/geolocate?key=${apiKey}`;

    const requestBody = {
        considerIp: "true",
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Geolocation data:", data.location);
        return data.location;
    } catch (error) {
        console.error('Error fetching geolocation from API:', error);
        throw error; // Rethrow to handle it in the API route
    }
};

export async function POST() {
    const apiKey = process.env.GOMAPS_API_KEY; // Ensure you have this in your .env file
    try {
        const location = await Geolocation(apiKey);
        return NextResponse.json({ data: location });
    } catch (error) {
        return NextResponse.error();
    }
}
