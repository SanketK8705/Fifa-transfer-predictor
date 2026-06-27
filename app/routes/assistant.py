from flask import Blueprint, request, jsonify
from app.ml.assistant import assistant_service

assistant_bp = Blueprint('assistant', __name__)

@assistant_bp.route('/assistant', methods=['POST'])
def ask_assistant():
    try:
        data = request.json or {}
        message = data.get('message', '')
        if not message.strip():
            return jsonify({'error': 'Message cannot be empty'}), 400
            
        response = assistant_service.analyze(message)
        return jsonify({'response': response})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({'error': str(e)}), 500
