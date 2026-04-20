"""Inverted index scaffold."""


class InvertedIndex:
    def __init__(self) -> None:
        self.index: dict[str, list[int]] = {}

    def add_document(self, doc_id: int, tokens: list[str]) -> None:
        # TODO: implement posting list insertion.
        pass
