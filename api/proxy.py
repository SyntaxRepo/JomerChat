# api/proxy.py

import os
from flask import Flask, request, Response, stream_with_context, jsonify
from cerebras.sdk.client import Cerebras # Import the Cerebras SDK
from cerebras.sdk.common import CerebrasError # Import the specific error type

# Vercel will automatically find this 'app' object.
app = Flask(__name__)

@app.route('/api/proxy', methods=['POST'])
def proxy_handler():
    # 1. Securely get the API key from Vercel's Environment Variables.
    #    NOTE: The variable name is now CEREBRAS_API_KEY.
    api_key = os.environ.get('CEREBRAS_API_KEY')

    if not api_key:
        print("CRITICAL ERROR: The CEREBRAS_API_KEY environment variable was not found on the server.")
        return jsonify({'error': 'Server is not configured correctly. Missing API key.'}), 500

    # 2. Initialize the Cerebras client.
    #    The SDK handles authentication and headers for you.
    try:
        client = Cerebras(api_key=api_key)
    except Exception as e:
        print(f"Error initializing Cerebras client: {e}")
        return jsonify({'error': 'Failed to initialize API client.'}), 500

    # 3. Get the JSON data sent from your script.js.
    client_data = request.get_json()
    if not client_data:
        return jsonify({'error': 'No JSON body received from the client.'}), 400
    
    # Extract model and messages for the SDK call
    model = client_data.get('model')
    messages = client_data.get('messages')

    if not model or not messages:
        return jsonify({'error': 'Request body must contain "model" and "messages".'}), 400

    # 4. This is the generator function that will stream the response.
    def generate():
        try:
            # 5. Make the streaming request to Cerebras using the SDK.
            stream = client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
                max_completion_tokens=4000, # Optional: Adjust as needed
                temperature=0.7,          # Optional: Adjust as needed
                top_p=0.8                 # Optional: Adjust as needed
            )

            # 6. Iterate over the stream from Cerebras.
            #    Each 'chunk' is an object that needs to be converted to JSON.
            for chunk in stream:
                # The frontend expects the data in the Server-Sent Events (SSE) format:
                # "data: { ...json... }\n\n"
                chunk_json = chunk.model_dump_json()
                yield f"data: {chunk_json}\n\n"
            
            # 7. Signal the end of the stream to the client.
            yield "data: [DONE]\n\n"

        except CerebrasError as e:
            # The SDK will raise CerebrasError for API issues (bad key, model not found, etc.)
            print(f"Cerebras API Error during stream: {e}")
            # Note: We can't send a JSON error response here because the stream has already started.
            # The frontend will detect the stream ending prematurely and handle it in its catch block.
            # We simply stop the generator.
            return
        except Exception as e:
            print(f"An unexpected error occurred during stream generation: {e}")
            return


    # 8. Return the streaming response to your script.js.
    #    Flask's `stream_with_context` is used to wrap the generator.
    return Response(stream_with_context(generate()), content_type='text/event-stream; charset=utf-8')
