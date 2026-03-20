FROM python:3.10-slim

WORKDIR /app

# Install LibreOffice for PPTX → PDF preview conversion
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-impress \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --timeout=300 --retries=5 -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]