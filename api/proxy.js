// api/proxy.js

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use the environment variable here. Vercel automatically provides it.
        'Authorization': `Bearer ${process.env.VITE_OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost', // You can change this later
        'X-Title': 'Jomer Chat'
      },
      // Pass the user's message body directly to OpenRouter
      body: JSON.stringify(request.body),
    });

    // This part streams the response back to your front-end
    return new Response(openRouterResponse.body, {
      headers: { 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    return response.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}