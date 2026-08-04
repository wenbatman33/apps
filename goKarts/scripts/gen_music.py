# 本機 MusicGen 生成三關 BGM loop（開源 facebook/musicgen-small，全程離線免費）
import os
import scipy.io.wavfile as wavfile
from transformers import AutoProcessor, MusicgenForConditionalGeneration

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio')
os.makedirs(OUT_DIR, exist_ok=True)

TRACKS = {
    'bgm-meadow': 'Upbeat cheerful chiptune pop racing game loop, bouncy melody, steady driving beat, '
                  'sunny happy mood, 128 bpm, seamless loop, instrumental',
    'bgm-canyon': 'Energetic desert rock racing game loop, twangy electric guitar riff, driving drums, '
                  'western canyon adventure mood, 140 bpm, seamless loop, instrumental',
    'bgm-neon':   'Synthwave night drive racing game loop, retro 80s analog synth arpeggios, punchy drum machine, '
                  'neon city night mood, 120 bpm, seamless loop, instrumental',
}

print('loading model (首次會下載約 2GB)...')
processor = AutoProcessor.from_pretrained('facebook/musicgen-small')
model = MusicgenForConditionalGeneration.from_pretrained('facebook/musicgen-small')
sr = model.config.audio_encoder.sampling_rate

for name, prompt in TRACKS.items():
    out = os.path.join(OUT_DIR, f'{name}.wav')
    if os.path.exists(out):
        print(f'[skip] {name}')
        continue
    print(f'[gen] {name} ...')
    inputs = processor(text=[prompt], padding=True, return_tensors='pt')
    # 約 30 秒（50 tokens/秒）
    audio = model.generate(**inputs, max_new_tokens=1500, do_sample=True, guidance_scale=3.0)
    wavfile.write(out, rate=sr, data=audio[0, 0].numpy())
    print(f'[done] {name}')

print('ALL DONE')
