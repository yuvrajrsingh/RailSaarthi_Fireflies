from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.infra import Block
from app.schemas.infra_schema import BlockSchema

router = APIRouter(prefix="/infra", tags=["Infra"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --------------------------------------------------------
# 1. GET Infra from Postgres
# --------------------------------------------------------
@router.get("/get", response_model=list[BlockSchema])
def get_infra(db: Session = Depends(get_db)):
    blocks = db.query(Block).all()
    return blocks


# --------------------------------------------------------
# 2. GET Infra formatted for SymPy solver
# --------------------------------------------------------
@router.get("/sympy-input")
def get_infra_for_sympy(db: Session = Depends(get_db)):
    blocks = db.query(Block).all()

    # Convert to solver form
    sympy_input = {
        "BLOCKS": [
            {
                "id": b.id,
                "from": b.station_from,
                "to": b.station_to,
                "distance": b.distance_km,
            }
            for b in blocks
        ],
        "num_blocks": len(blocks)
    }

    return sympy_input
