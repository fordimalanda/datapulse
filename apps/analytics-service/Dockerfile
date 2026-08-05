FROM python:3.11-slim

WORKDIR /app

COPY apps/analytics-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared/proto ./proto
RUN python -m grpc_tools.protoc -I./proto --python_out=. --grpc_python_out=. ./proto/analytics.proto

COPY apps/analytics-service/ .

EXPOSE 50051

CMD ["python", "main.py"]