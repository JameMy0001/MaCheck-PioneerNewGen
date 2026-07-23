# Dockerfile for MaCheck NVIDIA RAPIDS Microservice on Google Cloud Run with GPU
FROM nvcr.io/nvidia/rapidsai/base:24.04-cuda12.2-py3.10

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY rapids_pipeline.py .
COPY main.py .

EXPOSE 8080

# Command to launch microservice on Cloud Run GPU container
CMD ["python3", "main.py"]
