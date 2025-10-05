# api/proxy.py

import os
import requests
from flask import Flask, request, Response, stream_with_context, jsonify

# Vercel will automatically find this 'app' object.
app = Flask(__name__)

@app.route('/api/proxy', methods=['POST'])
def proxy_handler():
    # 1. Securely get the API key from Vercel's Environment Variables.
    api_key = os.environ.get('VITE_OPENROUTER_API_KEY')

    if not api_key:
        print("CRITICAL ERROR: The VITE_OPENROUTER_API_KEY environment variable was not found on the server.")
        # Return a JSON error, which is better for debugging on the frontend.
        return jsonify({'error': 'Server is not configured correctly. Missing API key.'}), 500

    # 2. Prepare the headers to be sent to the OpenRouter API.
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
        'HTTP-Referer': request.headers.get('Referer', ''),
        'X-Forwarded-For': request.headers.get('X-Forwarded-For', request.remote_addr),
        'X-Title': 'Jomer Chat'
    }

    # 3. Get the JSON data sent from your script.js.
    client_data = request.get_json()
    if not client_data:
        return jsonify({'error': 'No JSON body received from the client.'}), 400

    try:
        # 4. Make the streaming request to OpenRouter.
        # This opens a connection but doesn't download the whole response yet.
        response = requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers=headers,
            json=client_data,
            stream=True,
            timeout=300  # Set a timeout for the request itself
        )
        
        # Check if OpenRouter returned an error (like a bad API key or invalid model)
        response.raise_for_status() 

        # 5. This is the generator function that will stream the response.
        # It reads chunks from OpenRouter and immediately sends them to your browser.
        def generate():
            for chunk in response.iter_content(chunk_size=1024):
                yield chunk
        
        # 6. Return the streaming response to your script.js.
        # The Content-Type is explicitly set to what the frontend expects.
        return Response(stream_with_context(generate()), content_type='text/event-stream; charset=utf-8')

    except requests.exceptions.HTTPError as e:
        # This catches errors returned by the OpenRouter API (e.g., 401, 429)
        print(f"HTTP Error from OpenRouter: {e.response.status_code} - {e.response.text}")
        return jsonify({'error': f'API Error: {e.response.status_code}', 'details': e.response.text}), e.response.status_code
    except Exception as e:
        # This catches other errors, like network issues.
        print(f"An unexpected error occurred: {e}")
        return jsonify({'error': 'An internal server error occurred.'}), 500
