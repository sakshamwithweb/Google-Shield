import { NextResponse } from "next/server";

function getCurrentTimeIn24HourFormat() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export async function GET() {
    const time = getCurrentTimeIn24HourFormat();
    return NextResponse.json({ time });
}
