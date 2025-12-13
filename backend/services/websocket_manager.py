# websocket_manager.py
from typing import List
from fastapi import WebSocket

from collections import defaultdict
from typing import Dict, Set

class BroadcastManager:
    def __init__(self):
        self.dashboard_clients: List[WebSocket] = []
        # ws -> set of call_ids
        self.subscriptions: Dict[WebSocket, Set[str]] = defaultdict(set)

    async def register_dashboard(self, ws: WebSocket):
        await ws.accept()
        self.dashboard_clients.append(ws)

    async def unregister_dashboard(self, ws: WebSocket):
        if ws in self.dashboard_clients:
            self.dashboard_clients.remove(ws)
        if ws in self.subscriptions:
            del self.subscriptions[ws]

    async def subscribe(self, ws: WebSocket, call_id: str):
        self.subscriptions[ws].add(call_id)
        
    async def unsubscribe(self, ws: WebSocket, call_id: str):
        if ws in self.subscriptions:
            self.subscriptions[ws].discard(call_id)

    async def broadcast_transcript(self, message: dict, call_id: str):
        """
        Only broadcast to clients subscribed to this call_id.
        """
        dead = []
        for ws in self.dashboard_clients:
            # Check subscription
            subs = self.subscriptions.get(ws, set())
            if call_id in subs:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
        
        for ws in dead:
            await self.unregister_dashboard(ws)

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

