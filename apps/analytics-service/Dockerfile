FROM python:3.11-slim

WORKDIR /app

# Installation des dépendances Python
COPY apps/analytics-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Création et compilation du dossier proto
COPY shared/proto ./proto
RUN python -m grpc_tools.protoc -I./proto --python_out=./proto --grpc_python_out=./proto ./proto/analytics.proto

# Copie du reste de l'application
COPY apps/analytics-service/ .

EXPOSE 50051

CMD ["python", "main.py"]