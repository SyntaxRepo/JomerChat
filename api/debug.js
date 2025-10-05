// api/debug.js

export default function handler(request, response) {
  // This function reads the environment variable and sends it back as a JSON response.
  const apiKey = process.env.VITE_OPENROUTER_API_KEY;

  console.log("Debug function was called.");
  console.log("API Key read by Vercel:", apiKey);

  if (apiKey) {
    // For security, we only send back the first few characters and the length.
    // NEVER send the full key back to the browser.
    response.status(200).json({
      message: "Environment variable was found.",
      keyStart: apiKey.substring(0, 8), // e.g., "sk-or-v1"
      keyLength: apiKey.length
    });
  } else {
    // If the key is not found, send an error message.
    response.status(404).json({
      message: "Environment variable VITE_OPENROUTER_API_KEY was NOT FOUND."
    });
  }
}
