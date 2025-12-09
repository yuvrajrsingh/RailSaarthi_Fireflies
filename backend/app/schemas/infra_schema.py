from pydantic import BaseModel

class BlockSchema(BaseModel):
    id: int
    station_from: str
    station_to: str
    distance_km: float

    class Config:
        orm_mode = True
