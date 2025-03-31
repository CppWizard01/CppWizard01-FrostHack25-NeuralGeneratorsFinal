from fastapi import FastAPI
from pydantic import BaseModel
import torch
from diffusers import LTXPipeline
from diffusers.utils import export_to_video
import uuid

# Initialize FastAPI
app = FastAPI()
from fastapi.staticfiles import StaticFiles
app.mount("/videos", StaticFiles(directory="videos"), name="videos")

# Load the LTX-Video model on RTX 4090
device = "cuda" if torch.cuda.is_available() else "cpu"
pipe = LTXPipeline.from_pretrained("Lightricks/LTX-Video", torch_dtype=torch.bfloat16).to(device)

# Define input request structure
class VideoRequest(BaseModel):
    prompt: str
    width: int = 704
    height: int = 480
    num_frames: int = 161
    negative_prompt: str = "worst quality, inconsistent motion, blurry, jittery, distorted"
    num_inference_steps: int = 50

@app.post("/generate-video")
async def generate_video(request: VideoRequest):
    prompt = request.prompt
    width = request.width
    height = request.height
    num_frames = request.num_frames
    negative_prompt = request.negative_prompt
    num_inference_steps = request.num_inference_steps

    # Generate video
    video_frames = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        width=width,
        height=height,
        num_frames=num_frames,
        num_inference_steps=num_inference_steps,
    ).frames[0]

    # Save the video file
    file_name = f"output_{uuid.uuid4().hex}.mp4"
    file_path = f"./videos/{file_name}"
    export_to_video(video_frames, file_path, fps=24)
    
    return {"video_url": f"<provider>/videos/{file_name}"}

# Run the API
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)

