import json
import sqlite3
import os
from contextlib import contextmanager
from typing import Any, Iterator, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "emails.db")


@contextmanager
def _get_connection() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _init_db() -> None:
    with _get_connection() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS search_cache (
                query TEXT PRIMARY KEY,
                results TEXT NOT NULL,
                fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()


_init_db()


def get_search_cache(query: str) -> Optional[list[str]]:
    with _get_connection() as conn:
        row = conn.execute("SELECT results FROM search_cache WHERE query = ?", (query,)).fetchone()
        if not row:
            return None
        return json.loads(row["results"])


def set_search_cache(query: str, results: list[str]) -> None:
    with _get_connection() as conn:
        conn.execute(
            """
            INSERT INTO search_cache (query, results, fetched_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(query) DO UPDATE SET results = excluded.results, fetched_at = CURRENT_TIMESTAMP
            """,
            (query, json.dumps(results)),
        )
        conn.commit()
