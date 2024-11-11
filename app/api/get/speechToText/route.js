import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('file');  // Retrieve 'file' key

    // Check if the audio file is valid
    if (!audioFile || (audioFile.type !== 'audio/wav' && audioFile.type !== 'audio/mpeg')) {
      console.error('Invalid or missing audio file');
      return NextResponse.json({ error: 'Invalid or missing audio file' }, { status: 400 });
    }

    // Use audioFile directly, assuming it is in a compatible format
    const response = await openai.audio.transcriptions.create({
      file: audioFile,  // Use the File object as is
      model: 'whisper-1',
      response_format: 'text',
    });
    
    return NextResponse.json({ transcription: response });
  } catch (error) {
    console.error('Error transcribing audio:', error.message || error);
    return NextResponse.json({ error: 'Failed to process audio file' }, { status: 500 });
  }
}
