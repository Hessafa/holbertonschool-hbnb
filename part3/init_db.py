from app import create_app
from app.persistence.repository import db

app = create_app()

with app.app_context():
    db.create_all()
    print("Database tables created.")
