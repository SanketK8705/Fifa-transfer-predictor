from flask import Blueprint, render_template, jsonify
from app.ml.engine import engine

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    return render_template(
        'index.html',
        scores={
            'lr': engine.reg_scores['lr']['r2'],
            'rf': engine.reg_scores['rf']['r2'],
            'gb': engine.reg_scores['gb']['r2']
        },
        mae_scores={
            'lr': engine.reg_scores['lr']['mae'],
            'rf': engine.reg_scores['rf']['mae'],
            'gb': engine.reg_scores['gb']['mae']
        },
        pca_stats=engine.pca_stats,
        clf_scores=engine.clf_scores,
        famous_players=engine.famous_players,
        analysis_graphs=["","","","","","","",""]
    )

@main_bp.route('/api/analysis', methods=['GET'])
def analysis():
    return jsonify(engine.get_analysis_data())


@main_bp.route('/api/scores', methods=['GET'])
def scores():
    return jsonify({
        'reg_scores': engine.reg_scores,
        'positions':  engine.positions,
    })