from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config

db = SQLAlchemy()

def create_app():
    app = Flask(__name__, template_folder='../templates', static_folder='../static')
    app.config.from_object(Config)

    db.init_app(app)

    from app.routes.main import main_bp
    from app.routes.predict import predict_bp
    from app.routes.players import players_bp
    from app.routes.history import history_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(predict_bp, url_prefix='/api')
    app.register_blueprint(players_bp, url_prefix='/api')
    app.register_blueprint(history_bp, url_prefix='/api')

    with app.app_context():
        db.create_all()

    return app