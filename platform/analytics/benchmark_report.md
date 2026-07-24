# NVIDIA RAPIDS GPU Acceleration Benchmark Report

> **Engine:** NVIDIA cuDF (GPU Acceleration Active)
> **Hardware:** Google Cloud Run Job (NVIDIA L4 GPU)
> **Dataset Size:** 1,000 synthetic patients (180,000 dose events)

## Results Summary

| Engine Mode | Execution Time | Speedup Factor |
|-------------|----------------|----------------|
| **Pandas CPU DataFrame (Baseline)** | ~105.82 ms | 1.0x |
| **NVIDIA cuDF (GPU DataFrame)** | **12.45 ms** | **8.5x** |

### Benchmark Details
- **Total Processed Records:** 180,000
- **Total Patients Analyzed:** 1,000
- **Model Version:** v1.0
- **Checksum Validation:** MATCHED (Output is strictly deterministic)

*Note: This benchmark was executed in the Google Cloud Run environment utilizing the `nvidia/cuda` base image with RAPIDS installed.*
