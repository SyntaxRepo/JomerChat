# api/proxy.py
import os
import requests
from flask import Flask, request, Response, stream_with_context, jsonify

# Vercel will automatically find this 'app' object.
app = Flask(__name__)

@app.route('/api/proxy', methods=['POST'])
def proxy_handler():
    # 1. Securely get the Cerebras API key from Vercel's Environment Variables.
    # IMPORTANT: Make sure you set this variable in your Vercel project settings.
    api_key = os.environ.get('CEREBRAS_API_KEY')

    if not api_key:
        print("CRITICAL ERROR: The CEREBRAS_API_KEY environment variable was not found on the server.")
        return jsonify({'error': 'Server is not configured correctly. Missing API key.'}), 500

    # 2. Prepare the headers for the Cerebras API.
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    }

    # 3. Get the JSON data sent from your frontend (script.js).
    client_data = request.get_json()
    if not client_data:
        return jsonify({'error': 'No JSON body received from the client.'}), 400

    try:
        # 4. Make the streaming request to the Cerebras API endpoint.
        response = requests.post(
            'https://api.cerebras.com/v1/chat/completions', # <-- Cerebras API URL
            headers=headers,
            json=client_data,
            stream=True,
            timeout=300
        )
        
        # Check if Cerebras returned an error (like a bad API key or invalid model)
        response.raise_for_status() 

        # 5. This generator function streams the response back to your frontend.
        def generate():
            for chunk in response.iter_content(chunk_size=1024):
                yield chunk
        
        # 6. Return the streaming response.
        return Response(stream_with_context(generate()), content_type='text/event-stream; charset=utf-8')

    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error from Cerebras API: {e.response.status_code} - {e.response.text}")
        return jsonify({'error': f'API Error: {e.response.status_code}', 'details': e.response.text}), e.response.status_code
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return jsonify({'error': 'An internal server error occurred.'}), 500
