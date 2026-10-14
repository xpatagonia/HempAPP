import asyncio
from typing import Dict, Set, List
from fastapi import WebSocket
from app.models.telemetry import ProcessedTelemetryRecord

class TelemetryStreamManager:
    def __init__(self):
        # WebSocket connections grouped by plot_id: { plot_id: set(WebSocket) }
        self.active_websockets: Dict[str, Set[WebSocket]] = {}
        # SSE queues grouped by plot_id: { plot_id: list(asyncio.Queue) }
        self.active_sse_queues: Dict[str, List[asyncio.Queue]] = {}
        # In-memory latest record cache by plot_id
        self.latest_cache: Dict[str, ProcessedTelemetryRecord] = {}

    async def connect_websocket(self, plot_id: str, websocket: WebSocket):
        await websocket.accept()
        if plot_id not in self.active_websockets:
            self.active_websockets[plot_id] = set()
        self.active_websockets[plot_id].add(websocket)

    def disconnect_websocket(self, plot_id: str, websocket: WebSocket):
        if plot_id in self.active_websockets:
            self.active_websockets[plot_id].discard(websocket)
            if not self.active_websockets[plot_id]:
                del self.active_websockets[plot_id]

    def register_sse_queue(self, plot_id: str) -> asyncio.Queue:
        queue = asyncio.Queue(maxsize=50)
        if plot_id not in self.active_sse_queues:
            self.active_sse_queues[plot_id] = []
        self.active_sse_queues[plot_id].append(queue)
        return queue

    def unregister_sse_queue(self, plot_id: str, queue: asyncio.Queue):
        if plot_id in self.active_sse_queues:
            if queue in self.active_sse_queues[plot_id]:
                self.active_sse_queues[plot_id].remove(queue)
            if not self.active_sse_queues[plot_id]:
                del self.active_sse_queues[plot_id]

    async def broadcast_telemetry(self, record: ProcessedTelemetryRecord):
        plot_id = record.plot_id
        self.latest_cache[plot_id] = record
        payload = record.model_dump_json()

        # 1. Broadcast to WebSockets
        if plot_id in self.active_websockets:
            dead_sockets = []
            for ws in list(self.active_websockets[plot_id]):
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead_sockets.append(ws)
            for dead in dead_sockets:
                self.disconnect_websocket(plot_id, dead)

        # 2. Broadcast to SSE Queues
        if plot_id in self.active_sse_queues:
            for queue in self.active_sse_queues[plot_id]:
                try:
                    queue.put_nowait(payload)
                except asyncio.QueueFull:
                    # Drop oldest if congested
                    try:
                        queue.get_nowait()
                        queue.put_nowait(payload)
                    except Exception:
                        pass

    def get_latest(self, plot_id: str) -> ProcessedTelemetryRecord | None:
        return self.latest_cache.get(plot_id)

stream_manager = TelemetryStreamManager()
