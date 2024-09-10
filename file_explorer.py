import os
import json
from datetime import datetime
from flask import Flask, render_template, request, send_file, jsonify
from werkzeug.utils import secure_filename
from PIL import Image
import io

app = Flask(__name__)

# Configure this to your Stable Diffusion folder
STABLE_DIFFUSION_FOLDER = '/sd/'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/files')
def list_files():
    path = request.args.get('path', '')
    full_path = os.path.join(STABLE_DIFFUSION_FOLDER, path)
    items = []
    for item in os.listdir(full_path):
        item_path = os.path.join(full_path, item)
        is_dir = os.path.isdir(item_path)
        stat = os.stat(item_path)
        items.append({
            'name': item,
            'is_dir': is_dir,
            'type': 'folder' if is_dir else get_file_type(item),
            'size': get_size_str(stat.st_size) if not is_dir else '',
            'date': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
        })
    return jsonify(items)

@app.route('/upload', methods=['POST'])
def upload_files():
    if 'files' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    files = request.files.getlist('files')
    path = request.form.get('path', '')
    upload_dir = os.path.join(STABLE_DIFFUSION_FOLDER, path)
    
    for file in files:
        if file.filename:
            filename = secure_filename(file.filename)
            file.save(os.path.join(upload_dir, filename))
    
    return jsonify({'message': f'{len(files)} file(s) uploaded successfully'})

@app.route('/download')
def download_file():
    path = request.args.get('path', '')
    return send_file(os.path.join(STABLE_DIFFUSION_FOLDER, path), as_attachment=True)

@app.route('/delete', methods=['POST'])
def delete_files():
    path = request.form.get('path', '')
    files = json.loads(request.form.get('files', '[]'))
    deleted_count = 0
    
    for file in files:
        full_path = os.path.join(STABLE_DIFFUSION_FOLDER, path, file)
        if os.path.exists(full_path):
            if os.path.isdir(full_path):
                os.rmdir(full_path)
            else:
                os.remove(full_path)
            deleted_count += 1
    
    return jsonify({'message': f'{deleted_count} item(s) deleted successfully'})

@app.route('/thumbnail')
def get_thumbnail():
    path = request.args.get('path', '')
    full_path = os.path.join(STABLE_DIFFUSION_FOLDER, path)
    
    try:
        with Image.open(full_path) as img:
            img.thumbnail((100, 100))
            img_io = io.BytesIO()
            img.save(img_io, 'JPEG', quality=70)
            img_io.seek(0)
            return send_file(img_io, mimetype='image/jpeg')
    except:
        return send_file('path/to/default/icon.png', mimetype='image/png')

def get_file_type(filename):
    _, ext = os.path.splitext(filename)
    if ext.lower() in ['.jpg', '.jpeg', '.png', '.gif']:
        return 'image/' + ext.lower()[1:]
    elif ext.lower() in ['.mp4', '.avi', '.mov']:
        return 'video/' + ext.lower()[1:]
    elif ext.lower() == '.txt':
        return 'text/plain'
    else:
        return 'application/octet-stream'

def get_size_str(size_bytes):
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0

if __name__ == '__main__':
    app.run(debug=True, port=5000)

@app.route('/files')
def list_files():
    path = request.args.get('path', '')
    full_path = os.path.join(STABLE_DIFFUSION_FOLDER, path)
    items = []
    for item in os.listdir(full_path):
        item_path = os.path.join(full_path, item)
        is_dir = os.path.isdir(item_path)
        stat = os.stat(item_path)
        items.append({
            'name': item,
            'is_dir': is_dir,
            'type': 'folder' if is_dir else get_file_type(item),
            'size': get_size_str(stat.st_size) if not is_dir else '',
            'date': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
        })
    return jsonify(items)

def get_size_str(size_bytes):
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0