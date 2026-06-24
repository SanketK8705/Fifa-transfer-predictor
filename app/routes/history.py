from flask import Blueprint, request, jsonify
from app import db
from app.models import Prediction

history_bp = Blueprint('history', __name__)

@history_bp.route('/history', methods=['GET'])
def get_history():
    session_id = request.args.get('session_id')
    if not session_id:
        return jsonify({'history': []})

    records = (Prediction.query
               .filter_by(session_id=session_id)
               .order_by(Prediction.created_at.desc())
               .limit(20)
               .all())
    return jsonify({'history': [r.to_dict() for r in records]})


@history_bp.route('/history/<prediction_id>', methods=['DELETE'])
def delete_history_item(prediction_id):
    record = Prediction.query.get(prediction_id)
    if not record:
        return jsonify({'error': 'Not found'}), 404
    db.session.delete(record)
    db.session.commit()
    return jsonify({'success': True})


@history_bp.route('/history/clear', methods=['DELETE'])
def clear_history():
    session_id = request.args.get('session_id')
    if not session_id:
        return jsonify({'error': 'session_id required'}), 400
    Prediction.query.filter_by(session_id=session_id).delete()
    db.session.commit()
    return jsonify({'success': True})