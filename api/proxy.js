export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const userIp = request.headers['x-forwarded-for'] || '127.0.0.1';
  const siteUrl = request.headers['referer'] || 'https://jomer-chat-app.vercel.app'; // Fallback to your site
  // --- END OF FIX ---

  try {
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_OPENROUTER_API_KEY}`,
        // --- START OF FIX ---
        // Use the dynamic headers
        'HTTP-Referer': siteUrl,
        'X-Forwarded-For': userIp,
        // --- END OF FIX ---
        'X-Title': 'Jomer Chat'
      },
      body: JSON.stringify(request.body),
    });

    // Handle non-streaming errors from OpenRouter
    if (!openRouterResponse.ok) {
        const errorBody = await openRouterResponse.json();
        console.error("OpenRouter API Error:", errorBody);
        // Send a more informative error back to the client
        return response.status(openRouterResponse.status).json(errorBody);
    }

    return new Response(openRouterResponse.body, {
      headers: { 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error("Proxy function error:", error);
    return response.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
