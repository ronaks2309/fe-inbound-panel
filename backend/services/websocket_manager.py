# websocket_manager.py
from typing import List
from fastapi import WebSocket

from collections import defaultdict
from typing import Dict, Set

class BroadcastManager:
    def __init__(self):
        # ws -> { "user_id": ..., "role": ..., "tenant_id": ... }
        self.dashboard_clients: Dict[WebSocket, dict] = {}
        # ws -> set of call_ids
        self.subscriptions: Dict[WebSocket, Set[str]] = defaultdict(set)

    async def register_dashboard(self, ws: WebSocket, user_id: str | None = None, role: str = "user", tenant_id: str | None = None):
        await ws.accept()
        self.dashboard_clients[ws] = {
            "user_id": user_id,
            "role": role,
            "tenant_id": tenant_id
        }

    async def unregister_dashboard(self, ws: WebSocket):
        if ws in self.dashboard_clients:
            del self.dashboard_clients[ws]
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
        for ws, meta in self.dashboard_clients.items():
            # Check subscription
            subs = self.subscriptions.get(ws, set())
            if call_id in subs:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
        
        for ws in dead:
            await self.unregister_dashboard(ws)

    async def broadcast_dashboard(self, message: dict, user_id: str | None = None):
        """
        Broadcasts to dashboard clients with security filtering.
        
        Filtering Logic:
        1. Tenant Check: Client's tenant_id must match the message's clientId (if present).
        2. User Check:
           - If user_id is None (Public/System event) -> Send to all in tenant.
           - If user_id is Provided:
             - If Client is Admin in that tenant -> Send.
             - If Client is the User -> Send.
             - Otherwise -> Skip.
        """
        # Extract tenant from message (usually clientId)
        msg_tenant_id = message.get("clientId")
        
        dead = []
        for ws, meta in self.dashboard_clients.items():
            client_user_id = meta.get("user_id")
            client_role = meta.get("role") or "user"
            client_tenant_id = meta.get("tenant_id")
            
            should_send = False
            
            # 1. Tenant Check (Strict isolation)
            # If message identifies a tenant, client must match it.
            # If client has no tenant_id set (e.g. legacy/dev), maybe allow or block? 
            # Safest is to block if ids differ.
            if msg_tenant_id and client_tenant_id and msg_tenant_id != client_tenant_id:
                should_send = False
            else:
                # Same tenant (or tenant not specified in msg/client - assume match/dev)
                
                if user_id is None:
                    # Global event for tenant (e.g. queue update?) -> Send to all
                    should_send = True
                else:
                    # User-specific event
                    if client_role == "admin":
                        # Admin sees all calls in their tenant
                        should_send = True
                    elif client_user_id == user_id:
                        # User sees their own calls
                        should_send = True
                    else:
                        # Other user -> Skip
                        should_send = False

            if should_send:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
        for ws in dead:
            await self.unregister_dashboard(ws)

manager = BroadcastManager()

