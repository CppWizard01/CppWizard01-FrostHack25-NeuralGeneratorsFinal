# Stable Audio Generation API

This project provides a FastAPI-based service for generating AI-driven audio using Stability AI's Stable Audio model. The API runs on an RTX 4090 GPU and serves generated audio files through a static endpoint.

## Features

- Generates AI-driven audio from text prompts
- Uses the Stable Audio model for audio synthesis
- Runs on an RTX 4090 GPU with PyTorch and CUDA support
- Serves generated audio files via an HTTP endpoint

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
git clone https://github.com/stabilityai/stable-audio-open.git
cd stable-audio-open
```

### 2. Set Up Environment

```sh
# Create and activate virtual environment
python -m venv env
source env/bin/activate

# Install dependencies
pip install fastapi torch torchaudio diffusers soundfile numpy uvicorn
```

### 3. Download Model Checkpoint

```sh
from diffusers import StableAudioPipeline
import torch

# Load the model
model_path = "stabilityai/stable-audio-open-1.0"
pipeline = StableAudioPipeline.from_pretrained(model_path, torch_dtype=torch.float32)
pipeline.to("cuda")
```

### 4. Set Up GPU on Spheron

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

### 5. Run the API

Execute the following command to start the FastAPI server:

```sh
python main.py
```

The API will be accessible at:

```
http://<provider-ip>:3000/generate-audio
```

---

## API Usage

### Endpoint: Generate Audio

- **URL:** `POST /generate-audio`
- **Request Body:**
  ```json
  {
    "prompt": "Ambient electronic music with deep bass",
    "duration": 10,
    "negative": "distorted, low quality"
  }
  ```
- **Response:**
  ```json
  {
    "audio_url": "http://provider.ranchercompute.com:30889/audio/output_<uuid>.wav"
  }
  ```

---

## File Structure

```
stable-audio-api/
│── main.py               # FastAPI server script
│── audio/                # Directory to store generated audio files
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

