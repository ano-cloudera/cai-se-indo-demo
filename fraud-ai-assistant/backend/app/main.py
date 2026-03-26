import logging

from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.connection import (
    ImpalaConnectionError,
    ImpalaQueryError,
    check_impala_health,
    run_query,
)
from app.schemas.sql import (
    ChatAnswerResponse,
    ChatQueryRequest,
    ChatQueryResponse,
    SQLExecuteRequest,
    SQLExecutionResponse,
    SQLGenerateRequest,
    SQLGenerationResponse,
)
from app.services.memory_store import SessionMemoryStore
from app.services.answer_generator import AnswerGeneratorService
from app.services.chat_router import (
    build_processing_fallback_answer,
    is_greeting_or_smalltalk,
    looks_like_data_request,
    is_acknowledgement,
    is_farewell,
)
from app.services.conversation_generator import ConversationGeneratorService
from app.services.session_store import InMemorySessionStore
from app.services.sql_executor import SQLExecutionError, SQLExecutorService
from app.services.sql_generator import SQLGeneratorService
from app.services.sql_guardrails import SQLValidationError

settings = get_settings()
logger = logging.getLogger(__name__)
session_store = InMemorySessionStore(settings)
memory_store = SessionMemoryStore(session_store=session_store, settings=settings)
sql_generator = SQLGeneratorService(memory_store=memory_store, settings=settings)
sql_executor = SQLExecutorService(settings=settings)
answer_generator = AnswerGeneratorService(settings=settings)
conversation_generator = ConversationGeneratorService(settings=settings)

app = FastAPI(
    title="BNI Demo Backend",
    debug=settings.app_debug,
)

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=False,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


@app.on_event("startup")
def on_startup() -> None:
    logger.info("BNI Demo backend startup complete")


@app.get("/")
def read_root() -> dict[str, object]:
    return {
        "message": "BNI demo backend is running.",
        "environment": settings.app_env,
        "database": settings.impala_db,
        "docs": "/docs",
    }


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "service": "bni-demo-backend",
        "environment": settings.app_env,
        "debug": settings.app_debug,
    }


@app.get("/health/db")
def health_db() -> dict[str, object]:
    try:
        return check_impala_health()
    except ImpalaConnectionError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except ImpalaQueryError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/tables")
def list_tables() -> dict[str, object]:
    try:
        rows = run_query(f"SHOW TABLES IN {settings.impala_db}")
    except ImpalaConnectionError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except ImpalaQueryError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    tables = []
    for row in rows:
        if row:
            tables.append(next(iter(row.values())))

    return {
        "status": "ok",
        "database": settings.impala_db,
        "count": len(tables),
        "tables": tables,
    }


def _store_result_preview(session_id: str | None, execution_result: dict[str, object]) -> None:
    if not session_id:
        return

    memory_store.set_last_result_preview(
        session_id=session_id,
        columns=execution_result["columns"],
        rows=execution_result["rows"],
        row_count=execution_result["row_count"],
        truncated=execution_result["truncated"],
    )


def _run_chat_flow(payload: ChatQueryRequest) -> dict[str, object]:
    session_memory = None
    if payload.session_id:
        session_memory = memory_store.get_or_create_session(payload.session_id)

    if (
        is_greeting_or_smalltalk(payload.question)
        or is_farewell(payload.question)
        or is_acknowledgement(payload.question)
        or not looks_like_data_request(payload.question)
    ):
        answer = conversation_generator.generate_response(
            question=payload.question,
            memory=session_memory,
        )
        if payload.session_id:
            memory_store.append_user_message(payload.session_id, payload.question)
            memory_store.append_assistant_message(payload.session_id, answer)
            memory_store.set_last_answer(payload.session_id, answer)
            memory_store.set_last_intent(payload.session_id, "conversation")

        return {
            "session_id": payload.session_id,
            "original_question": payload.question,
            "answer": answer,
            "generated_sql": "",
            "executed_sql": "",
            "columns": [],
            "rows": [],
            "row_count": 0,
            "truncated": False,
            "limit_applied": False,
            "metadata": {},
        }

    try:
        generated = sql_generator.generate_sql(
            question=payload.question,
            memory=session_memory,
        )
        execution_result = sql_executor.execute(generated["cleaned_generated_sql"])
    except SQLValidationError:
        answer = conversation_generator.generate_response(
            question=payload.question,
            memory=session_memory,
        )
        if payload.session_id:
            memory_store.append_user_message(payload.session_id, payload.question)
            memory_store.append_assistant_message(payload.session_id, answer)
            memory_store.set_last_answer(payload.session_id, answer)
            memory_store.set_last_intent(payload.session_id, "conversation")

        return {
            "session_id": payload.session_id,
            "original_question": payload.question,
            "answer": answer,
            "generated_sql": "",
            "executed_sql": "",
            "columns": [],
            "rows": [],
            "row_count": 0,
            "truncated": False,
            "limit_applied": False,
            "metadata": {},
        }

    answer = answer_generator.generate_answer(
        original_question=payload.question,
        executed_sql=execution_result["executed_sql"],
        columns=execution_result["columns"],
        rows=execution_result["rows"],
        row_count=execution_result["row_count"],
        truncated=execution_result["truncated"],
        limit_applied=execution_result["limit_applied"],
    )
    _store_result_preview(payload.session_id, execution_result)
    if payload.session_id:
        memory_store.append_user_message(payload.session_id, payload.question)
        memory_store.append_assistant_message(payload.session_id, answer)
        memory_store.set_last_generated_sql(
            payload.session_id,
            generated["cleaned_generated_sql"],
        )
        memory_store.set_last_answer(payload.session_id, answer)
        memory_store.set_last_intent(payload.session_id, "chat-query")

    return {
        "session_id": payload.session_id,
        "original_question": payload.question,
        "answer": answer,
        "generated_sql": generated["cleaned_generated_sql"],
        "executed_sql": execution_result["executed_sql"],
        "columns": execution_result["columns"],
        "rows": execution_result["rows"],
        "row_count": execution_result["row_count"],
        "truncated": execution_result["truncated"],
        "limit_applied": execution_result["limit_applied"],
        "metadata": {
            "model": generated["model"],
            "deployment": generated["deployment"],
        },
    }


@app.post("/sql/generate", response_model=SQLGenerationResponse)
def generate_sql(payload: SQLGenerateRequest) -> SQLGenerationResponse:
    try:
        generated = sql_generator.generate_sql(
            question=payload.question,
            session_id=payload.session_id,
        )
        return SQLGenerationResponse(**generated)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/sql/execute", response_model=SQLExecutionResponse)
def execute_sql(payload: SQLExecuteRequest) -> SQLExecutionResponse:
    try:
        execution_result = sql_executor.execute(payload.sql)
        _store_result_preview(payload.session_id, execution_result)
        return SQLExecutionResponse(**execution_result)
    except SQLValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SQLExecutionError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/chat/query", response_model=ChatQueryResponse)
def chat_query(payload: ChatQueryRequest) -> ChatQueryResponse:
    try:
        response_payload = _run_chat_flow(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SQLValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SQLExecutionError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return ChatQueryResponse(**response_payload)


@app.post("/chat/answer", response_model=ChatAnswerResponse)
def chat_answer(payload: ChatQueryRequest) -> ChatAnswerResponse:
    try:
        response_payload = _run_chat_flow(payload)
    except (ValueError, SQLValidationError, SQLExecutionError):
        fallback_answer = build_processing_fallback_answer(payload.question)
        if payload.session_id:
            memory_store.append_user_message(payload.session_id, payload.question)
            memory_store.append_assistant_message(payload.session_id, fallback_answer)
            memory_store.set_last_answer(payload.session_id, fallback_answer)
            memory_store.set_last_intent(payload.session_id, "fallback")

        response_payload = {
            "session_id": payload.session_id,
            "original_question": payload.question,
            "answer": fallback_answer,
        }
    except Exception:
        fallback_answer = build_processing_fallback_answer(payload.question)
        if payload.session_id:
            memory_store.append_user_message(payload.session_id, payload.question)
            memory_store.append_assistant_message(payload.session_id, fallback_answer)
            memory_store.set_last_answer(payload.session_id, fallback_answer)
            memory_store.set_last_intent(payload.session_id, "fallback")

        response_payload = {
            "session_id": payload.session_id,
            "original_question": payload.question,
            "answer": fallback_answer,
        }

    return ChatAnswerResponse(
        session_id=response_payload["session_id"],
        original_question=response_payload["original_question"],
        answer=response_payload["answer"],
    )
