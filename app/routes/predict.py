from flask import Blueprint, request, jsonify, session
from app import db
from app.models import Prediction
from app.ml.engine import engine
import uuid

predict_bp = Blueprint('predict', __name__)

REQUIRED_FIELDS = [
    'age','overall','potential','wage','position','reputation',
    'weakfoot','skillmoves','crossing','finishing','heading','passing',
    'dribbling','ballcontrol','acceleration','sprintspeed','reactions',
    'shotpower','stamina','strength','vision'
]

@predict_bp.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        session_id = data.get('session_id') or str(uuid.uuid4())

        missing = [f for f in REQUIRED_FIELDS if f not in data]
        if missing:
            return jsonify({'error': f'Missing fields: {", ".join(missing)}'}), 400

        position_text = str(data.get('position','')).strip().upper()
        if position_text not in engine.le.classes_:
            return jsonify({'error': f'Invalid position. Valid: {", ".join(engine.le.classes_)}'}), 400

        player_name = data.get('player_name', 'Player')

        inp = {
            'Age':                      float(data['age']),
            'Overall':                  float(data['overall']),
            'Potential':                float(data['potential']),
            'Wage':                     float(data['wage']),
            'International Reputation': float(data['reputation']),
            'Weak Foot':                float(data['weakfoot']),
            'Skill Moves':              float(data['skillmoves']),
            'Position':                 float(engine.le.transform([position_text])[0]),
            'Crossing':                 float(data['crossing']),
            'Finishing':                float(data['finishing']),
            'HeadingAccuracy':          float(data['heading']),
            'ShortPassing':             float(data['passing']),
            'Dribbling':                float(data['dribbling']),
            'BallControl':              float(data['ballcontrol']),
            'Acceleration':             float(data['acceleration']),
            'SprintSpeed':              float(data['sprintspeed']),
            'Reactions':                float(data['reactions']),
            'ShotPower':                float(data['shotpower']),
            'Stamina':                  float(data['stamina']),
            'Strength':                 float(data['strength']),
            'Vision':                   float(data['vision']),
            '_position_label':          position_text,
        }

        result    = engine.predict(inp)
        predicted = result['gb']
        value_m   = predicted / 1e6
        charts    = engine.get_chart_data(inp, predicted, player_name)

        # save to DB — scoped to this user's session
        record = Prediction(
            session_id=session_id,
            player_name=player_name,
            position=position_text,
            age=int(inp['Age']),
            overall=int(inp['Overall']),
            potential=int(inp['Potential']),
            wage=inp['Wage'],
            predicted_value=predicted,
            category=result['category'],
        )
        db.session.add(record)
        db.session.commit()

        return jsonify({
            'session_id': session_id,
            'display':    f'€{value_m:.1f}M' if value_m >= 1 else f'€{predicted:,.0f}',
            'value_m':    round(value_m, 1),
            'category':   result['category'],
            'model_predictions': {
                'lr': round(result['lr']/1e6, 1),
                'rf': round(result['rf']/1e6, 1),
                'gb': round(result['gb']/1e6, 1),
            },
            'charts': charts,
        })

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({'error': str(e)}), 500