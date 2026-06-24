from flask import Blueprint, request, jsonify
from app.ml.engine import engine

players_bp = Blueprint('players', __name__)

@players_bp.route('/players/famous', methods=['GET'])
def famous_players():
    return jsonify({'players': engine.famous_players})


@players_bp.route('/players/search', methods=['GET'])
def search_players():
    query = request.args.get('q', '')
    if len(query.strip()) < 2:
        return jsonify({'players': []})
    results = engine.search_players(query, limit=10)
    return jsonify({'players': results})


@players_bp.route('/players/positions', methods=['GET'])
def positions():
    return jsonify({'positions': engine.positions})