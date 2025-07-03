from app import db
from datetime import datetime, timedelta
import secrets
import string

class Transfer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(6), unique=True, nullable=False, index=True)
    encrypted_filename = db.Column(db.Text, nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    encryption_key = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    downloaded = db.Column(db.Boolean, default=False)
    download_attempts = db.Column(db.Integer, default=0)
    
    def __init__(self, **kwargs):
        super(Transfer, self).__init__(**kwargs)
        if not self.code:
            self.code = self.generate_code()
        if not self.expires_at:
            self.expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    @staticmethod
    def generate_code():
        """Generate a unique 6-digit code"""
        while True:
            code = ''.join(secrets.choice(string.digits) for _ in range(6))
            if not Transfer.query.filter_by(code=code).first():
                return code
    
    @property
    def is_expired(self):
        return datetime.utcnow() > self.expires_at
    
    @property
    def time_remaining(self):
        if self.is_expired:
            return 0
        return int((self.expires_at - datetime.utcnow()).total_seconds())
    
    def __repr__(self):
        return f'<Transfer {self.code}>'
