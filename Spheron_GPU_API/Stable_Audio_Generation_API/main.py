from fastapi import FastAPI
from pydantic import BaseModel
from diffusers import StableAudioPipeline
import torch
import torchaudio
import uuid
import soundfile as sf
import numpy as np
# Initialize FastAPI
app = FastAPI()
from fastapi.staticfiles import StaticFiles

app.mount("/audio", StaticFiles(directory="audio"), name="audio")

# Load the model on RTX 4090
device = "cuda" if torch.cuda.is_available() else "cpu"
pipeline = StableAudioPipeline.from_pretrained("stabilityai/stable-audio-open-1.0", torch_dtype=torch.float32).to(device)

# Define input request structure
class AudioRequest(BaseModel):
    prompt: str
    duration: int = 10  # Duration in seconds
    negative: str

@app.post("/generate-audio")
async def generate_audio(request: AudioRequest):
    prompt = request.prompt
    duration = request.duration
    negative=request.negative
    # Generate audio
    generator = torch.Generator("cuda").manual_seed(0)
    audio_output = pipeline(prompt,negative_prompt=negative, num_inference_steps=200, guidance_scale=2.5,audio_end_in_s=duration, generator=generator)
    audio = audio_output.audios[0]  

    # Ensure audio is on CPU, detached, and converted to a NumPy array
    audio = audio.detach().cpu().numpy()

    # Normalize audio to prevent NaN values
    audio = np.nan_to_num(audio)

    # Ensure audio is in the correct shape (1D for mono, 2D for stereo)
    if len(audio.shape) > 1:
        audio = audio.squeeze()  # Remove extra dimensions if needed

    # Verify audio dtype and convert if necessary
    if not np.issubdtype(audio.dtype, np.floating):
        audio = audio.astype(np.float32)  # Convert to float32
    print(f"Audio shape: {audio.shape}, dtype: {audio.dtype}, min: {audio.min()}, max: {audio.max()}")
    audio = audio.T  # Swap shape to (samples, channels)
    # Save the audio file
    file_name = f"output_{uuid.uuid4().hex}.wav"
    file_path = f"./audio/{file_name}"
    sf.write(file_path, audio, samplerate=16000)
    return {"audio_url": f"<provider>/audio/{file_name}"}

# Run the API
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)