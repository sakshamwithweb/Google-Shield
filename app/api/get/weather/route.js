import { NextResponse } from "next/server";

const getWeather = async (lat, lon, apiKey) => {
    const url = `http://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const weatherData = await response.json();
        const weatherDescription = weatherData.weather[0].description;
        const temperature = weatherData.main.temp;

        return {
            description: weatherDescription,
            temperature: temperature,
            status: "success"
        };
    } catch (error) {
        return {
            status: "error",
            message: error
        };
    }
};
export async function POST(payload) {
    const data = await payload.json();
    const { latitude, longitude } = data
    const a = await getWeather(latitude, longitude, process.env.OPENWEATHERMAP_API_KEY)
    console.log(a)
    return NextResponse.json({ data: a })
}