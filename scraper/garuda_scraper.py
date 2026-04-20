"""Garuda discovery and metadata harvesting scaffold."""

from typing import Any


def run(limit: int = 1000) -> list[dict[str, Any]]:
    """Collect up to `limit` metadata records from configured sources."""
    # TODO: implement Garuda discovery and OAI harvesting.
    return []


if __name__ == "__main__":
    records = run()
    print(f"Collected records: {len(records)}")
