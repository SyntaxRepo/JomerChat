# api/proxy.py

import os
import requests
from flask import Flask, request, Response, stream_with_context, jsonify

app = Flask(__name__)

@app.route('/api/proxy', methods=['POST'])
def proxy_handler():
    # 1. Get the GitHub Token securely from Vercel's Environment Variables
    # IMPORTANT: Ensure your Vercel variable is named 'GITHUB_TOKEN'
    api_key = os.environ.get('GITHUB_TOKEN')

    if not api_key:
        print("CRITICAL ERROR: GITHUB_TOKEN environment variable not found.")
        return jsonify({'error': 'Server is not configured correctly. Missing API key.'}), 500

    # 2. Prepare headers for the GitHub Models API call
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    }

    # 3. Get the JSON body from the frontend's request
    client_data = request.get_json()
    if not client_data:
        return jsonify({'error': 'No JSON body received from the client.'}), 400
        
    # 4. Re-format the payload for the GitHub API, which expects a 'prompt'
    try:
        # Get the most recent user message from the conversation history
        user_message = client_data['messages'][-1]['content']
        payload = {
            "model": client_data.get("model"), # Get the model name from the frontend
            "prompt": user_message,
            "stream": client_data.get("stream", True) # Ensure stream is enabled
        }
    except (KeyError, IndexError):
        return jsonify({'error': 'Invalid message format received from client.'}), 400

    try:
        # 5. Make the streaming request to GitHub's endpoint
        response = requests.post(
            'https://models.github.ai/inference', # New GitHub API Endpoint
            headers=headers,
            json=payload,
            stream=True,
            timeout=300
        )
        
        # Check for errors from the GitHub API (like 401, 404, etc.)
        response.raise_for_status() 

        def generate():
            for chunk in response.iter_content(chunk_size=1024):
                yield chunk
        
        # Return the streaming response to the frontend
        return Response(stream_with_context(generate()), content_type='text/event-stream; charset=utf-8')

    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error from GitHub Models API: {e.response.status_code} - {e.response.text}")
        return jsonify({'error': f'API Error: {e.response.status_code}', 'details': e.response.text}), e.response.status_code
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return jsonify({'error': 'An internal server error occurred.'}), 500
