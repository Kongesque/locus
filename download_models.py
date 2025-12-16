from ultralytics import YOLO

models = ['yolo11n.pt', 'yolo11s.pt', 'yolo11m.pt', 'yolo11l.pt', 'yolo11x.pt']

for model_name in models:
    print(f"Downloading {model_name}...")
    model = YOLO(model_name)
    print(f"Downloaded {model_name}")

print("All models downloaded successfully.")
