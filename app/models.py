from app import db
from datetime import datetime
import uuid

class Prediction(db.Model):
    __tablename__ = 'predictions'

    id          = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id  = db.Column(db.String(36), nullable=False, index=True)
    player_name = db.Column(db.String(100), nullable=False)
    position    = db.Column(db.String(10), nullable=False)
    age         = db.Column(db.Integer, nullable=False)
    overall     = db.Column(db.Integer, nullable=False)
    potential   = db.Column(db.Integer, nullable=False)
    wage        = db.Column(db.Float, nullable=False)
    predicted_value = db.Column(db.Float, nullable=False)
    category    = db.Column(db.String(20), nullable=False)
    model_used  = db.Column(db.String(30), default='gradient_boosting')
    source      = db.Column(db.String(20), default='predict')  # 'predict' | 'search' | 'compare'
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':              self.id,
            'session_id':      self.session_id,
            'player_name':     self.player_name,
            'position':        self.position,
            'age':             self.age,
            'overall':         self.overall,
            'potential':       self.potential,
            'wage':            self.wage,
            'predicted_value': round(self.predicted_value / 1e6, 2),
            'category':        self.category,
            'model_used':      self.model_used,
            'source':          self.source or 'predict',
            'created_at':      self.created_at.isoformat(),
        }