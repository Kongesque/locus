from flask import Flask, render_template, request, session, jsonify, redirect, url_for, send_from_directory, Response
import csv
import io
import json
from flask_wtf import FlaskForm
from wtforms import FileField, SubmitField
from wtforms.validators import InputRequired
import os
from utils.processor import run_processing_pipeline
from utils.file_handler import handle_upload, safe_remove_file
from utils.db import init_db, get_job, update_job, get_all_jobs, delete_job
from utils.coco_classes import COCO_CLASSES

init_db()

app = Flask(__name__)  
app.config['SECRET_KEY'] = 'kongesque'
app.config['UPLOAD_FOLDER'] = 'uploads/videos'  

DEFAULT_TARGET_CLASS = 19
DEFAULT_CONFIDENCE = 40  

# Ensure directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs('uploads/frames', exist_ok=True)
os.makedirs('uploads/outputs', exist_ok=True)

class UploadFileForm(FlaskForm):
    file = FileField("File", validators=[InputRequired()])
    submit = SubmitField("Run")

# Context Processor to inject history into all templates
@app.context_processor
def inject_history():
    jobs = get_all_jobs(status='completed')
    active_taskID = None
    # Only highlight active task on result or zone pages
    if request.endpoint in ['result', 'zone']:
        active_taskID = session.get('taskID')
    return dict(history_jobs=jobs, current_taskID=active_taskID)

# Routes
@app.route('/media/<path:filename>')
def media_file(filename):
    return send_from_directory('uploads', filename)

@app.route('/', methods=['GET', 'POST'])
def main():
    form = UploadFileForm()
    if request.method == 'POST' and form.validate_on_submit():
        taskID = handle_upload(form.file.data, app.config['UPLOAD_FOLDER'])
        return redirect(url_for('zone', taskID=taskID))
    return render_template('main.html', form=form)
    
@app.route('/zone', methods=['GET', 'POST'])
def zone():
    req_taskID = request.args.get('taskID')
    if req_taskID:
        job = get_job(req_taskID)
        if job:
            session['taskID'] = req_taskID

    taskID = session.get('taskID')
    if not taskID:
        return redirect(url_for('main'))

    job = get_job(taskID)
    if not job:
         return redirect(url_for('main'))
         
    if job.get('frame_path'):
         return render_template('zone.html', taskID=taskID, coco_classes=COCO_CLASSES)
    return redirect(url_for('main'))

@app.route('/submit', methods=['POST'])
def submit():
    taskID = session.get('taskID')
    if not taskID:
        return redirect(url_for('main'))
        
    job = get_job(taskID)
    if not job:
        return redirect(url_for('main'))
    
    # Get target class and confidence from form
    target_class = request.form.get('target_class', DEFAULT_TARGET_CLASS, type=int)
    confidence = request.form.get('confidence', DEFAULT_CONFIDENCE, type=int)

    update_job(taskID, target_class=target_class, confidence=confidence)
    
    # Process the video
    run_processing_pipeline(taskID, job, target_class, confidence)

    return redirect(url_for('result', taskID=taskID))

@app.route('/result', methods=['GET', 'POST']) 
def result():
    # Helper to check if taskID is provided in args, else use session
    req_taskID = request.args.get('taskID')
    
    if req_taskID:
        # Switch session to this taskID if valid
        job = get_job(req_taskID)
        if job:
            session['taskID'] = req_taskID
        else:
            return redirect(url_for('main'))
            
    taskID = session.get('taskID')
    if not taskID:
        return redirect(url_for('main'))
        
    form = UploadFileForm()
    if request.method == 'POST' and form.validate_on_submit():
        taskID = handle_upload(form.file.data, app.config['UPLOAD_FOLDER'])
        return redirect(url_for('zone', taskID=taskID))
        
    job = get_job(taskID)
    if not job:
        return redirect(url_for('main'))
        
    width = job.get('frame_width')
    height = job.get('frame_height')
    process_time = job.get('process_time', 0)
    detection_data = job.get('detection_data', [])
    
    return render_template('result.html', form=form, taskID=taskID, width=width, height=height, process_time=process_time, detection_data=detection_data)

@app.route('/get_coordinates', methods=['POST'])
def get_coordinates():
    data = request.get_json()
    taskID =  session.get('taskID')
    job = get_job(taskID)
    if not job:
        return jsonify({"message": "Job not found"}), 404

    x, y = data.get('x'), data.get('y')
    points = job['points']
    points.append((x, y))
    update_job(taskID, points=points)
    return jsonify({"message": "Coordinates received successfully"})

@app.route('/color_setting', methods=['POST'])
def color_setting():
    data = request.json
    taskID =  session.get('taskID')
    color = (int(data['b']), int(data['g']), int(data['r']))
    update_job(taskID, color=color)
    return jsonify({"message": "Color settings updated successfully"})

@app.route('/clear', methods=['POST'])
def clear_coordinates():
    taskID = session.get('taskID')
    update_job(taskID, points=[])
    return jsonify({"message": "Coordinates cleared successfully"})

# History API
@app.route('/api/history/<task_id>', methods=['DELETE'])
def delete_history(task_id):
    job = get_job(task_id)
    if job:
        # Delete video file
        safe_remove_file(job.get('video_path'))

        # Delete frame file
        safe_remove_file(job.get('frame_path'))

        # Delete output video
        output_path = os.path.join('uploads/outputs', f'output_{task_id}.mp4')
        safe_remove_file(output_path)

    delete_job(task_id)
    
    if session.get('taskID') == task_id:
        session.pop('taskID', None)
        
    return jsonify({"success": True})

@app.route('/api/history/<task_id>/rename', methods=['POST'])
def rename_history(task_id):
    data = request.json
    new_name = data.get('name')
    if new_name:
        update_job(task_id, name=new_name)
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "No name provided"}), 400

@app.route('/api/progress/<task_id>')
def get_progress(task_id):
    job = get_job(task_id)
    if job:
        return jsonify({
            "progress": job.get('progress', 0),
            "status": job.get('status', 'pending')
        })
    return jsonify({"progress": 0, "status": "not_found"})
    
@app.route('/api/export/<task_id>/csv')
def export_csv(task_id):
    job = get_job(task_id)
    if not job:
        return "Job not found", 404
        
    detection_data = job.get('detection_data', [])
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Timestamp (s)', 'Count'])
    
    for event in detection_data:
        writer.writerow([event['time'], event['count']])
        
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-disposition": f"attachment; filename=zonenet_data_{task_id}.csv"}
    )

if __name__ == "__main__":
    app.run(debug=True)