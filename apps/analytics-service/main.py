import sys
import os
import concurrent.futures
import time
import math
import random
import grpc

# Ajout dynamique du dossier /app et du sous-dossier proto au PYTHONPATH
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(CURRENT_DIR)
sys.path.append(os.path.join(CURRENT_DIR, "proto"))

# Importation sécurisée des fichiers Protobuf générés
try:
    import proto.analytics_pb2 as analytics_pb2
    import proto.analytics_pb2_grpc as analytics_pb2_grpc
except ModuleNotFoundError:
    import analytics_pb2
    import analytics_pb2_grpc


class AnalyticsServiceServicer(analytics_pb2_grpc.AnalyticsServiceServicer):
    """
    Implémentation des RPCs définies dans analytics.proto
    """

    def ProcessData(self, request, context):
        """
        RPC unaire : Traite un jeu de données brut et retourne des agrégats (moyenne, min, max)
        """
        raw_values = list(request.raw_values)
        
        if not raw_values:
            mean_val, min_val, max_val = 0.0, 0.0, 0.0
        else:
            mean_val = float(sum(raw_values) / len(raw_values))
            min_val = float(min(raw_values))
            max_val = float(max(raw_values))

        # Simulation de transformation des valeurs
        processed = [round(v * 1.05, 2) for v in raw_values]

        return analytics_pb2.AnalyticsResponse(
            dataset_id=request.dataset_id,
            mean=mean_val,
            min=min_val,
            max=max_val,
            processed_values=processed,
            timestamp=int(time.time())
        )

    def StreamMetrics(self, request, context):
        """
        RPC de Streaming Serveur : Génère et diffuse un flux temps réel de métriques
        """
        metric_type = request.metric_type or "cpu_usage"
        interval = max(request.interval_seconds, 1)

        print(f"[Python Service] Nouveau stream démarré pour : {metric_type} (intervalle: {interval}s)")

        step = 0
        try:
            while context.is_active():
                # Génération d'une courbe sinusoïdale réaliste avec du bruit
                base_val = 45 + 25 * math.sin(step * 0.2)
                noise = random.uniform(-5.0, 5.0)
                current_value = round(max(0.0, min(100.0, base_val + noise)), 2)

                metric_point = analytics_pb2.MetricPoint(
                    metric_type=metric_type,
                    value=current_value,
                    timestamp=int(time.time())
                )

                yield metric_point
                step += 1
                time.sleep(interval)

        except Exception as e:
            print(f"[Python Service] Erreur dans le stream {metric_type}: {e}")
        finally:
            print(f"[Python Service] Stream fermé pour : {metric_type}")


def serve():
    """
    Initialisation et démarrage du serveur gRPC Python sur le port 50051
    """
    server = grpc.server(concurrent.futures.ThreadPoolExecutor(max_workers=10))
    analytics_pb2_grpc.add_AnalyticsServiceServicer_to_server(
        AnalyticsServiceServicer(), server
    )
    
    bind_address = "[::]:50051"
    server.add_insecure_port(bind_address)
    print(f"[Python Service] Serveur gRPC à l'écoute sur {bind_address}")
    
    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    serve()