import wave
import struct
import math
import random

SAMPLE_RATE = 44100
DURATION = 30 # seconds
NUM_SAMPLES = SAMPLE_RATE * DURATION

def generate_wav(filename, samples):
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        # Normalize to 16-bit integer range
        max_amp = max(abs(s) for s in samples) if samples else 1
        normalized = [int((s / max_amp) * 32767 * 0.9) for s in samples]
        # Pack into binary data
        data = struct.pack('<' + ('h' * len(normalized)), *normalized)
        wav_file.writeframes(data)

print("Generating Track 1: Deep Blockchain Drone...")
samples_drone = []
for i in range(NUM_SAMPLES):
    t = i / SAMPLE_RATE
    
    # Base frequencies (C2, G2, C3, Eb3)
    f1 = 65.41  # C2
    f2 = 98.00  # G2
    f3 = 130.81 # C3
    f4 = 155.56 # Eb3
    
    # LFOs for breathing effect
    lfo1 = (math.sin(2 * math.pi * 0.05 * t) + 1) / 2 # 20s cycle
    lfo2 = (math.sin(2 * math.pi * 0.07 * t + 1) + 1) / 2
    lfo3 = (math.sin(2 * math.pi * 0.1 * t + 2) + 1) / 2
    lfo4 = (math.sin(2 * math.pi * 0.03 * t + 3) + 1) / 2
    
    # Add subtle FM synthesis
    fm_mod = math.sin(2 * math.pi * 0.5 * t) * 0.5
    
    val = (
        0.4 * lfo1 * math.sin(2 * math.pi * f1 * t + fm_mod) +
        0.3 * lfo2 * math.sin(2 * math.pi * f2 * t) +
        0.2 * lfo3 * math.sin(2 * math.pi * f3 * t) +
        0.1 * lfo4 * math.sin(2 * math.pi * f4 * t)
    )
    
    # Soft clipping for warmth
    val = math.tanh(val * 1.5)
    samples_drone.append(val)

generate_wav('drone.wav', samples_drone)


print("Generating Track 2: Ethereal Data Stream...")
# For Track 2, we want a deep pad + random chimes
scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25] # C Pentatonic
samples_chimes = [0.0] * NUM_SAMPLES

# Base hum
for i in range(NUM_SAMPLES):
    t = i / SAMPLE_RATE
    hum = 0.15 * math.sin(2 * math.pi * 65.41 * t)
    hum += 0.1 * math.sin(2 * math.pi * 130.81 * t)
    samples_chimes[i] += hum * math.tanh(t) # Fade in

# Generate chimes
for chime in range(40): # 40 chimes over 30 seconds
    start_time = random.uniform(0, DURATION - 2)
    start_sample = int(start_time * SAMPLE_RATE)
    freq = random.choice(scale)
    
    # Attack and decay
    duration = 2.0
    chime_samples = int(duration * SAMPLE_RATE)
    
    for j in range(chime_samples):
        if start_sample + j >= NUM_SAMPLES:
            break
        t = j / SAMPLE_RATE
        
        # Exponential decay envelope
        env = math.exp(-3 * t)
        
        # Sine wave with high harmonics for bell sound
        val = (
            math.sin(2 * math.pi * freq * t) +
            0.5 * math.sin(2 * math.pi * freq * 2 * t) +
            0.2 * math.sin(2 * math.pi * freq * 4 * t)
        ) * env * 0.2
        
        samples_chimes[start_sample + j] += val

# Simple Delay/Echo effect
echo_delay = int(0.4 * SAMPLE_RATE) # 400ms delay
echo_decay = 0.4
for i in range(echo_delay, NUM_SAMPLES):
    samples_chimes[i] += samples_chimes[i - echo_delay] * echo_decay

generate_wav('chimes.wav', samples_chimes)

print("WAV files successfully generated.")
