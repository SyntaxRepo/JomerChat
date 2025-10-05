# api/proxy.py
import os
from flask import Flask, request, Response, stream_with_context, jsonify
from cerebras.cloud.sdk import Cerebras  # <-- Import the Cerebras SDK

# Initialize the Cerebras client once
# It securely reads the API key from your Vercel Environment Variables
client = Cerebras(
    api_key=os.environ.get("CEREBRAS_API_KEY")
)

app = Flask(__name__)

@app.route('/api/proxy', methods=['POST'])
def proxy_handler():
    # Get the JSON data sent from your frontend
    client_data = request.get_json()
    if not client_data:
        return jsonify({'error': 'No JSON body received from the client.'}), 400

    try:
        # Use the SDK to create the chat completion stream
        # The **client_data unpacks the dictionary from the frontend
        # into the arguments the function needs (model, messages, etc.)
        stream = client.chat.completions.create(**client_data)

        # This generator function streams the SDK response back to your frontend
        def generate():
            for chunk in stream:
                # Extract the text content from each chunk
                content = chunk.choices[0].delta.content or ""
                yield content
        
        return Response(stream_with_context(generate()), content_type='text/event-stream; charset=utf-8')

    except Exception as e:
        # This will catch errors from the SDK or other issues
        print(f"An unexpected error occurred: {e}")
        return jsonify({'error': 'An internal server error occurred.', 'details': str(e)}), 500
