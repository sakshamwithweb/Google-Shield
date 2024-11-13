import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  const { currentData, speechToText } = await request.json()
  const currentDataString = JSON.stringify(currentData);
  const actionByAIRough = [
    {
      risk: "low",
      actions: [
        "Advise caution and continue monitoring the environment."
      ]
    },
    {
      risk: "medium",
      actions: [
        "Issue a warning to the user.",
        "Suggest nearby safe places.",
        "Enable quick access to emergency contacts for easy outreach."
      ]
    },
    {
      risk: "high",
      actions: [
        "Alert the user immediately about the danger.",
        "Call and send updates to emergency contacts with the user's current location and status.",
      ]
    }
  ];


  const actionByAI = JSON.stringify(actionByAIRough)

  const prompt = `I am a program designed to assess and respond to potential danger for the user (female). Using the available environmental data: "${currentDataString}" and the transcribed user voice data: "${speechToText}", determine if the user is in danger. If no danger is detected, respond with just "false".
If danger is detected, assess the risk level as "low", "medium", or "high" based on the data. 
Based on the assessed risk level, take the actions listed in: "${actionByAI}".
If risk is detected , Output only a plain array of actions to be taken by the AI, no additional text or Markdown format.But if no risk so output false only.`;

  console.log(prompt)
  const response = await openai.chat.completions.create({
    model: "chatgpt-4o-latest",
    messages: [{ role: "user", content: prompt }],
  });
  console.log(currentData, speechToText)
  console.log(response.choices[0].message.content)
  return NextResponse.json({ response: response.choices[0].message.content })
}