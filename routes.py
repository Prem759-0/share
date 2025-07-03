import os
import qrcode
from io import BytesIO
import base64
from flask import render_template, request, jsonify, send_file, abort, url_for, flash, redirect
from werkzeug.utils import secure_filename
from app import app, db, limiter
from models import Transfer
from utils import encrypt_file, decrypt_file, sanitize_filename
import logging

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
@limiter.limit("10 per minute")
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file selected'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if file:
            # Sanitize filename
            original_filename = sanitize_filename(file.filename)
            file_size = 0
            
            # Save temporary file to get size
            temp_path = os.path.join(app.config['UPLOAD_FOLDER'], f"temp_{original_filename}")
            file.save(temp_path)
            file_size = os.path.getsize(temp_path)
            
            # Check file size limit (2GB)
            if file_size > app.config['MAX_CONTENT_LENGTH']:
                os.remove(temp_path)
                return jsonify({'error': 'File size exceeds 2GB limit'}), 413
            
            # Encrypt file and get encryption key
            encrypted_path, encryption_key = encrypt_file(temp_path, original_filename)
            
            # Remove temporary file
            os.remove(temp_path)
            
            # Create transfer record
            transfer = Transfer(
                original_filename=original_filename,
                encrypted_filename=os.path.basename(encrypted_path),
                file_size=file_size,
                file_path=encrypted_path,
                encryption_key=encryption_key
            )
            
            db.session.add(transfer)
            db.session.commit()
            
            # Generate QR code
            download_url = url_for('download_page', code=transfer.code, _external=True)
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(download_url)
            qr.make(fit=True)
            
            qr_img = qr.make_image(fill_color="black", back_color="white")
            qr_buffer = BytesIO()
            qr_img.save(qr_buffer, format='PNG')
            qr_buffer.seek(0)
            qr_code_base64 = base64.b64encode(qr_buffer.getvalue()).decode()
            
            return jsonify({
                'success': True,
                'code': transfer.code,
                'filename': original_filename,
                'file_size': file_size,
                'expires_in': transfer.time_remaining,
                'qr_code': qr_code_base64,
                'download_url': download_url
            })
            
    except Exception as e:
        logging.error(f"Upload error: {str(e)}")
        return jsonify({'error': 'Upload failed. Please try again.'}), 500

@app.route('/download/<code>')
@limiter.limit("3 per minute")
def download_page(code):
    transfer = Transfer.query.filter_by(code=code).first()
    
    if not transfer:
        return render_template('index.html', error='Invalid or expired code'), 404
    
    if transfer.is_expired:
        return render_template('index.html', error='Code has expired'), 410
    
    if transfer.downloaded:
        return render_template('index.html', error='File has already been downloaded'), 410
    
    # Increment download attempts
    transfer.download_attempts += 1
    
    if transfer.download_attempts > 3:
        db.session.commit()
        return render_template('index.html', error='Too many download attempts'), 429
    
    db.session.commit()
    
    return render_template('index.html', 
                         download_info={
                             'filename': transfer.original_filename,
                             'file_size': transfer.file_size,
                             'code': code
                         })

@app.route('/download_file/<code>')
@limiter.limit("3 per minute")
def download_file(code):
    transfer = Transfer.query.filter_by(code=code).first()
    
    if not transfer or transfer.is_expired or transfer.downloaded:
        abort(404)
    
    try:
        # Decrypt file
        decrypted_path = decrypt_file(transfer.file_path, transfer.encryption_key, transfer.original_filename)
        
        # Mark as downloaded
        transfer.downloaded = True
        db.session.commit()
        
        # Send file and clean up
        def remove_file(response):
            try:
                os.remove(decrypted_path)
                os.remove(transfer.file_path)  # Remove encrypted file too
            except:
                pass
            return response
        
        return send_file(
            decrypted_path,
            as_attachment=True,
            download_name=transfer.original_filename,
            mimetype='application/octet-stream'
        )
        
    except Exception as e:
        logging.error(f"Download error: {str(e)}")
        abort(500)

@app.route('/check_code', methods=['POST'])
@limiter.limit("10 per minute")
def check_code():
    code = request.json.get('code', '').strip()
    
    if len(code) != 6 or not code.isdigit():
        return jsonify({'valid': False, 'error': 'Invalid code format'})
    
    transfer = Transfer.query.filter_by(code=code).first()
    
    if not transfer:
        return jsonify({'valid': False, 'error': 'Invalid code'})
    
    if transfer.is_expired:
        return jsonify({'valid': False, 'error': 'Code has expired'})
    
    if transfer.downloaded:
        return jsonify({'valid': False, 'error': 'File has already been downloaded'})
    
    return jsonify({
        'valid': True,
        'filename': transfer.original_filename,
        'file_size': transfer.file_size,
        'time_remaining': transfer.time_remaining
    })

@app.route('/cleanup')
def cleanup():
    """Manual cleanup endpoint for testing"""
    from utils import cleanup_expired_transfers
    count = cleanup_expired_transfers()
    return jsonify({'cleaned_files': count})

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large. Maximum size is 2GB.'}), 413

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({'error': 'Rate limit exceeded. Please try again later.'}), 429
