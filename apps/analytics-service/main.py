import concurrent.futures
import time
import grpc
from google.protobuf import json_format
import numpy as np

# Note: Généré via `grpcio-tools` à partir du fichier analytics.proto
import analytics_pb2
import analytics_pb2_grpc

class AnalyticsServicer(analytics_pb2_grpc.AnalyticsServiceServicer):
    
    def ProcessData(self, request, context):
        data = np.array(request.raw_values)
        
        if len(data) == 0:
            return analytics_pb2.DataResponse(
                dataset_id=request.dataset_id,
                mean=0.0,
                min=0.0,
                max=0.0,
                processed_values=[],
                timestamp=int(time.time())
            )

        # Calculs statistiques simples avec NumPy
        mean_val = float(np.mean(data))
        min_val = float(np.min(data))
        max_val = float(np.max(data))
        normalized = (data - min_val) / (max_val - min_val + 1e-8)

        return analytics_pb2.DataResponse(
            dataset_id=request.dataset_id,
            mean=mean_val,
            min=min_val,
            max=max_val,
            processed_values=normalized.tolist(),
            timestamp=int(time.time())
        )

    def StreamMetrics(self, request, context):
        # Envoie des données en streaming temps réel
        while context.is_active():
            value = float(np.random.normal(50, 10))
            yield analytics_pb2.MetricPoint(
                metric_type=request.metric_type,
                value=value,
                timestamp=int(time.time())
            )
            time.sleep(request.interval_seconds or 1)

def serve():
    server = grpc.server(concurrent.futures.ThreadPoolExecutor(max_workers=10))
    analytics_pb2_grpc.add_AnalyticsServiceServicer_to_server(AnalyticsServicer(), server)
    server.add_insecure_port('[::]:50051')
    print("Moteur Python Analytics gRPC démarré sur le port 50051...")
    server.start()
    server.wait_for_termination()

if __name__ == '__main__':
    serve()