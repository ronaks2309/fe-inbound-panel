
from database.models import Call
from sqlmodel import SQLModel

print(f"Table name for Call: {Call.__tablename__}")
