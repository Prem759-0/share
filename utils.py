import os
import secrets
import hashlib
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Protocol.KDF import PBKDF2
import base64
import logging
from datetime import datetime
from app import app, db
from models import Transfer

def sanitize_filename(filename):
    """Sanitize filename to prevent path traversal attacks"""
    import re
    # Remove path separators and dangerous characters
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    # Remove leading/trailing dots and spaces
    filename = filename.strip('. ')
    # Limit length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:250] + ext
    return filename or 'untitled'

def encrypt_file(file_path, original_filename):
    """Encrypt a file using AES-256 encryption"""
    try:
        # Generate a random salt and key
        salt = get_random_bytes(16)
        password = secrets.token_hex(32)
        key = PBKDF2(password, salt, 32, count=100000)
        
        # Read the original file
        with open(file_path, 'rb') as infile:
            data = infile.read()
        
        # Create cipher and encrypt
        cipher = AES.new(key, AES.MODE_CBC)
        iv = cipher.iv
        
        # Pad data to be multiple of 16 bytes
        pad_len = 16 - (len(data) % 16)
        data += bytes([pad_len]) * pad_len
        
        encrypted_data = cipher.encrypt(data)
        
        # Create encrypted filename
        encrypted_filename = secrets.token_hex(16) + '.enc'
        encrypted_path = os.path.join(app.config['UPLOAD_FOLDER'], encrypted_filename)
        
        # Write encrypted file with salt and iv prepended
        with open(encrypted_path, 'wb') as outfile:
            outfile.write(salt + iv + encrypted_data)
        
        # Store encryption parameters
        encryption_key = base64.b64encode(password.encode()).decode()
        
        return encrypted_path, encryption_key
        
    except Exception as e:
        logging.error(f"Encryption error: {str(e)}")
        raise

def decrypt_file(encrypted_path, encryption_key_b64, original_filename):
    """Decrypt a file using stored encryption key"""
    try:
        # Decode the key
        password = base64.b64decode(encryption_key_b64).decode()
        
        # Read encrypted file
        with open(encrypted_path, 'rb') as infile:
            salt = infile.read(16)
            iv = infile.read(16)
            encrypted_data = infile.read()
        
        # Recreate key
        key = PBKDF2(password, salt, 32, count=100000)
        
        # Decrypt
        cipher = AES.new(key, AES.MODE_CBC, iv)
        decrypted_data = cipher.decrypt(encrypted_data)
        
        # Remove padding
        pad_len = decrypted_data[-1]
        decrypted_data = decrypted_data[:-pad_len]
        
        # Write decrypted file
        decrypted_path = os.path.join(app.config['UPLOAD_FOLDER'], f"temp_decrypted_{original_filename}")
        with open(decrypted_path, 'wb') as outfile:
            outfile.write(decrypted_data)
        
        return decrypted_path
        
    except Exception as e:
        logging.error(f"Decryption error: {str(e)}")
        raise

def cleanup_expired_transfers():
    """Clean up expired transfers and their files"""
    count = 0
    try:
        expired_transfers = Transfer.query.filter(
            (Transfer.expires_at < datetime.utcnow()) | (Transfer.downloaded == True)
        ).all()
        
        for transfer in expired_transfers:
            try:
                # Remove encrypted file
                if os.path.exists(transfer.file_path):
                    os.remove(transfer.file_path)
                    count += 1
                
                # Remove from database
                db.session.delete(transfer)
                
            except Exception as e:
                logging.error(f"Error cleaning up transfer {transfer.id}: {str(e)}")
        
        db.session.commit()
        logging.info(f"Cleaned up {count} expired transfers")
        
    except Exception as e:
        logging.error(f"Cleanup error: {str(e)}")
        db.session.rollback()
    
    return count

def format_file_size(size_bytes):
    """Format file size in human readable format"""
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB"]
    import math
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    
    return f"{s} {size_names[i]}"
