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
        "Activate silent mode to avoid drawing attention.",
        "Enable quick access to emergency contacts for easy outreach."
      ]
    },
    {
      risk: "high",
      actions: [
        "Alert the user immediately about the danger.",
        "Activate silent mode to ensure the user remains discreet.",
        "Call and send updates to emergency contacts with the user’s current location and status.",
        "Call emergency services directly with the user's location and situation details."
      ]
    }
  ];
  

  const actionByAI = JSON.stringify(actionByAIRough)

  const prompt = `I am a program which have duty to take actions for user(women). I have data of environment as -${currentDataString} and I recorded some part of user's voice and converted into text as- ${speechToText} . Firstly Identify wether the the user is in danger or not if yes so move forward or else simple response plain false. Now we know that user is in danger so categorize the risk level into low, medium, high. It is the tasks to do according to the risk level- ${actionByAI} . Give a plain array only where there will be actions AI will do. No MD`;

  console.log(prompt)
  const response = await openai.chat.completions.create({
    model: "chatgpt-4o-latest",
    messages: [{ role: "user", content: prompt }],
  });
  console.log(currentData, speechToText)
  console.log(response.choices[0].message.content)
  return NextResponse.json({ response: response.choices[0].message.content })
}