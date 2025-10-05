# api/proxy.py

import os
import requests
from flask import Flask, request, Response, stream_with_context

# Vercel looks for a Flask app instance named "app"
app = Flask(__name__)

@app.route('/api/proxy', methods=['POST'])
def proxy_handler():
    # 1. Get the API key securely from Vercel's Environment Variables
    api_key = os.environ.get('VITE_OPENROUTER_API_KEY')

    if not api_key:
        print("CRITICAL: VITE_OPENROUTER_API_KEY environment variable not found.")
        return Response('Server configuration error.', status=500)

    # 2. Prepare headers for the OpenRouter API call
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
        'HTTP-Referer': request.headers.get('Referer', ''),
        'X-Forwarded-For': request.headers.get('X-Forwarded-For', request.remote_addr),
        'X-Title': 'Jomer Chat'
    }

    # 3. Get the JSON body from the user's request
    client_data = request.get_json()

    try:
        # 4. Make a streaming request to OpenRouter
        response = requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers=headers,
            json=client_data,
            stream=True
        )
        
        # This function will stream the response chunk by chunk
        def generate():
            for chunk in response.iter_content(chunk_size=1024):
                yield chunk
        
        # 5. Return the streaming response to the user's browser
        return Response(stream_with_context(generate()), content_type=response.headers['Content-Type'])

    except Exception as e:
        print(f"An error occurred: {e}")
        return Response('An internal error occurred.', status=500)
