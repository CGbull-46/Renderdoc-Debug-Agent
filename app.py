"""
RenderDoc Debug Agent - Main Application
This application allows users to upload .rdc files and uses AI to analyze rendering issues.
"""

import os
import json
import base64
from io import BytesIO
from flask import Flask, request, render_template, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

from renderdoc_analyzer import RenderDocAnalyzer
from ai_analyzer import AIAnalyzer

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_CONTENT_LENGTH', 104857600))  # 100MB

# Allowed file extensions
ALLOWED_EXTENSIONS = {'rdc'}

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)


def allowed_file(filename):
    """Check if the file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def index():
    """Render the main upload page."""
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle file upload and analysis."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Only .rdc files are allowed.'}), 400
    
    try:
        # Save the uploaded file
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Initialize analyzers
        renderdoc_analyzer = RenderDocAnalyzer()
        ai_analyzer = AIAnalyzer()
        
        # Analyze the RenderDoc capture
        analysis_data = renderdoc_analyzer.analyze(filepath)
        
        # Use AI to provide insights
        ai_insights = ai_analyzer.analyze(analysis_data)
        
        # Combine results
        result = {
            'filename': filename,
            'renderdoc_analysis': analysis_data,
            'ai_insights': ai_insights,
            'success': True
        }
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({
            'error': f'Analysis failed: {str(e)}',
            'success': False
        }), 500


@app.route('/health')
def health():
    """Health check endpoint."""
    return jsonify({'status': 'healthy'})


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
