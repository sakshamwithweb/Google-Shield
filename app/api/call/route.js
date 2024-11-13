import { NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new twilio(accountSid, authToken);

export async function POST(req) {
    try {
        const { phoneNumber , message } = await req.json();

        await client.calls.create({
            to: phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER,
            twiml: `<Response><Say>${message}</Say></Response>`,
        });

        return NextResponse.json({ message: 'Call initiated successfully!' });
    } catch (error) {
        console.error("Error making the call:", error);
        return NextResponse.json({ message: 'Failed to initiate the call.' }, { status: 500 });
    }
}
