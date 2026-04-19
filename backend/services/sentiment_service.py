import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from database.models import Call
from services.websocket_manager import manager
import logging
import copy

logger = logging.getLogger("uvicorn.error")

class SentimentService:
    """
    Service for incremental, rule-based sentiment tracking.
    """

    # --- Keyword banks ---
    POSITIVE = [
        "yes", "yeah", "yep", "sure", "okay", "ok",
        "sounds good", "tell me more", "how much",
        "what does it cover", "i'm interested"
    ]

    NEGATIVE = [
        "not interested", "stop calling", "don't call",
        "remove me", "hang up", "wrong number"
    ]

    NEUTRAL = ["maybe", "not sure", "uh", "uh huh", "hmm"]

    ENGAGEMENT_PATTERNS = [
        r"\?", r"\b(cost|price|rate)\b",
        r"\b(coverage|cover)\b",
        r"\b(benefit|benefits)\b"
    ]

    @staticmethod
    async def update_call_sentiment(
        call_id: str,
        completed_user_message: str,
    ) -> None:
        """
        Incrementally updates sentiment state for a call and broadcasts live sentiment.
        Triggered when a user turn is considered 'complete' (e.g. AI starts speaking).
        """
        from database.connection import engine
        from sqlmodel import Session

        try:
            # Create a NEW session for this background task
            with Session(engine) as db:
                # 1. Fetch Call
                call = db.get(Call, call_id)
                if not call:
                    logger.warning(f"[Sentiment] Call {call_id} not found.")
                    return

                # 2. Get previous state (last item in list) or initialize default
                current_history = call.sentiment_state if isinstance(call.sentiment_state, list) else []
                
                if current_history:
                    # Clone the last state to be cumulative
                    last_state = current_history[-1]
                    # Deep copy to ensure we don't mutate the previous record in memory before appending
                    new_state = copy.deepcopy(last_state)
                else:
                    # Initial State
                    new_state = {
                        "score": 0,
                        "sentiment": "Not Enuf Data",
                        "confidence": 0.0,
                        "user_message_count": 0,
                        "total_user_words": 0,
                        "signals": {
                            "positive_hits": [],
                            "negative_hits": [],
                            "neutral_hits": [],
                            "engagement_hits": []
                        }
                    }

                # 3. Apply Scoring Logic (User provided)
                updated_state = SentimentService._calculate_sentiment(new_state, completed_user_message)
                
                # NEW: Add Turn Number
                updated_state["turn"] = len(current_history) + 1
                
                # NEW: Add Completed User Message
                updated_state["completed_user_message"] = completed_user_message

                # 4. Update Call Model (Memory update for this session)
                current_history.append(updated_state)
                
                # Explicitly flag modification for SQLAlchemy JSON
                from sqlalchemy.orm.attributes import flag_modified
                
                # Re-assign to ensure mutation is tracked (though flag_modified is the robust way)
                call.sentiment_state = list(current_history)
                flag_modified(call, "sentiment_state")
                
                logger.info(f"[SentimentDebug] Saving sentiment_state: {len(call.sentiment_state)} items. Last: {updated_state}")
                
                # Also update the top-level sentiment convenience field
                call.sentiment = updated_state["sentiment"]
                
                # 5. Persist (ORM Method)
                db.add(call)
                db.commit()
                db.refresh(call)
                
                logger.info(f"[SentimentDebug] Saved. DB ID: {call.id}. Sentiment field: {call.sentiment}")

                # 6. Broadcast
                payload = {
                    "type": "sentiment-update",
                    "call_id": call.id,
                    "sentiment": updated_state["sentiment"],
                    "confidence": updated_state["confidence"],
                    "score": updated_state["score"],
                    "turn": updated_state["turn"],
                    "fullState": updated_state
                }
                
                # Broadcast specific sentiment event (if FE listens to it)
                await manager.broadcast_transcript(payload, call_id)

                logger.info(f"[Sentiment] Updated call {call_id} Turn #{updated_state['turn']}: {updated_state['sentiment']} (Score: {updated_state['score']})")

        except Exception as e:
            logger.exception(f"[Sentiment] Failed to update sentiment for call {call_id}: {e}")

    @classmethod
    def _calculate_sentiment(cls, state: Dict, new_user_message: str) -> Dict:
        """
        Pure logic to update state based on new message.
        """
        msg = new_user_message.strip().lower()
        word_count = len(msg.split())

        # Ensure defaults (redundant if initialized correctly, but safe)
        state.setdefault("score", 0)
        state.setdefault("user_message_count", 0)
        state.setdefault("total_user_words", 0)
        state.setdefault("signals", {})
        state["signals"].setdefault("positive_hits", [])
        state["signals"].setdefault("negative_hits", [])
        state["signals"].setdefault("neutral_hits", [])
        state["signals"].setdefault("engagement_hits", [])

        # --- Update counts ---
        state["user_message_count"] += 1
        state["total_user_words"] += word_count

        # --- Track positive hits ---
        for p in cls.POSITIVE:
            if p in msg:
                state["score"] += 2
                state["signals"]["positive_hits"].append(p)

        # --- Track negative hits ---
        for n in cls.NEGATIVE:
            if n in msg:
                state["score"] -= 4
                state["signals"]["negative_hits"].append(n)

        # --- Track neutral hits ---
        for n in cls.NEUTRAL:
            if n in msg:
                state["signals"]["neutral_hits"].append(n)

        # --- Track engagement hits ---
        for pattern in cls.ENGAGEMENT_PATTERNS:
            if re.search(pattern, msg):
                state["score"] += 1
                state["signals"]["engagement_hits"].append(pattern)

        # --- Determine sentiment ---
        if state["total_user_words"] < 5:
            sentiment = "Not Enuf Data"
        elif state["score"] >= 3:
            sentiment = "Positive"
        elif state["score"] <= -3:
            sentiment = "Negative"
        else:
            sentiment = "Neutral"

        # --- Compute confidence ---
        signal_strength = (
            len(state["signals"]["positive_hits"]) +
            len(state["signals"]["negative_hits"]) +
            len(state["signals"]["engagement_hits"])
        )
        # Avoid division by zero if logic changes, but here denominators are constants
        confidence = (
            min(abs(state["score"]) / 6, 1.0) * 0.6 +
            min(signal_strength / 4, 1.0) * 0.25 +
            min(state["user_message_count"] / 4, 1.0) * 0.15
        )

        # --- Update state ---
        state["sentiment"] = sentiment
        state["confidence"] = round(min(confidence, 1.0), 2)

        return state
