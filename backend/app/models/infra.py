from sqlalchemy import Column, Integer, String, Float
from app.db import Base

class Block(Base):
    __tablename__ = "blocks"

    id = Column(Integer, primary_key=True, index=True)
    station_from = Column(String, nullable=False)
    station_to = Column(String, nullable=False)
    distance_km = Column(Float, nullable=False)
