# websocket_manager.py
from typing import List
from fastapi import WebSocket

class BroadcastManager:
    def __init__(self):
        self.dashboard_clients: List[WebSocket] = []

    async def register_dashboard(self, ws: WebSocket):
        await ws.accept()
        self.dashboard_clients.append(ws)

    async def unregister_dashboard(self, ws: WebSocket):
        if ws in self.dashboard_clients:
            self.dashboard_clients.remove(ws)

    async def broadcast_dashboard(self, message: dict):
        dead = []
        for ws in self.dashboard_clients:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.unregister_dashboard(ws)

manager = BroadcastManager()

