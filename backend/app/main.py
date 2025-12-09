from fastapi import FastAPI
from app.routers.infra_router import router as infra_router

app = FastAPI()
print(fastapi.__version__)
app.include_router(infra_router)
