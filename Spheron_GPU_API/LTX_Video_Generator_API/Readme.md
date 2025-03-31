# LTX-Video Generation API

This project provides a FastAPI-based service for generating AI-generated videos using the LTX-Video model. The API runs on an RTX 4090 GPU rented via Spheron and serves videos through a static endpoint.

## Features

- Generates AI-driven videos from text prompts
- Uses the LTX-Video model for video generation
- Runs on an RTX 4090 GPU with PyTorch and CUDA support
- Serves generated videos via an HTTP endpoint

---

## Prerequisites

Before setting up the project, ensure you have:

1. A [Spheron](https://spheron.network/) account to rent a GPU.
2. Docker installed on your local machine.
3. Python 3.8+ installed.
4. `pip` installed for managing dependencies.

---

## Deployment Steps

### 1. Clone the Repository

```sh
git clone https://github.com/Lightricks/LTX-Video.git
cd LTX-Video
```

### 2. Set Up Environment

```sh
# Create and activate virtual environment
python -m venv env
source env/bin/activate

# Install dependencies
python -m pip install -e .\[inference-script\]
```

### 3. Download Model Checkpoint

```sh
from huggingface_hub import snapshot_download

model_path = 'PATH'   # The local directory to save downloaded checkpoint
snapshot_download("Lightricks/LTX-Video", local_dir=model_path, local_dir_use_symlinks=False, repo_type='model')
```

### 4. Install Additional Dependencies

```sh
pip install -U git+https://github.com/huggingface/diffusers
```

### 5. Set Up GPU on Spheron

To run the model efficiently, rent an RTX 4090 GPU on Spheron. Configure a deployment with:

- A container image that includes PyTorch with CUDA support.
- GPU allocation set to `1` with `RTX 4090` as the model.
- At least `8 CPU cores`, `32GB RAM`, and `120GB storage`.
- Ports `3000` (for API) and `8888` (for Jupyter, if needed) exposed.

After configuring the deployment, start the instance and ensure the GPU is available.

To deploy, navigate to the directory containing your YAML configuration and run:

```sh
spheronctl deploy -f deployment.yaml
```

### 6. Run the API

Execute the following command to start the FastAPI server:

```sh
python main.py
```

The API will be accessible at:

```
http://<provider-ip>:3000/generate-video
```

---

## API Usage

### Endpoint: Generate Video

- **URL:** `POST /generate-video`
- **Request Body:**
  ```json
  {
    "prompt": "A futuristic cityscape with neon lights",
    "width": 704,
    "height": 480,
    "num_frames": 161,
    "negative_prompt": "worst quality, inconsistent motion, blurry, jittery, distorted",
    "num_inference_steps": 50
  }
  ```
- **Response:**
  ```json
  {
    "video_url": "http://provider.gpufarm.xyz:31875/videos/output_<uuid>.mp4"
  }
  ```

---

## File Structure

```
ltx-video-api/
│── main.py               # FastAPI server script
│── videos/               # Directory to store generated videos
│── deployment.yaml       # Spheron deployment configuration
│── requirements.txt      # Python dependencies
│── README.md             # Documentation
``` 

---

## Notes

- Ensure that `torch.cuda.is_available()` returns `True` to confirm GPU access.
- If deployment fails, verify GPU availability and pricing on Spheron.

---

## License

MIT License

