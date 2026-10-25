from dataclasses import dataclass

from pydantic import BaseModel

MAX_PAGE_SIZE = 100


@dataclass(frozen=True)
class PageParams:
    page: int
    page_size: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class Page[T](BaseModel):
    items: list[T]
    page: int
    page_size: int
    total: int


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict


class ErrorResponse(BaseModel):
    error: ErrorDetail
