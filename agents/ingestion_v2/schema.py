"""v2 block schema — the single shape that flows end to end.

The vision model emits `PageStructure`; Firestore stores `blocks` flat; the
reader rebuilds the tree in one O(n) pass over `parent`.
"""
from __future__ import annotations

from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class BlockType(str, Enum):
    heading = "heading"        # level
    paragraph = "paragraph"    # text
    definition = "definition"  # term + text
    list = "list"              # ordered + items[]
    table = "table"            # rows[][]
    equation = "equation"      # latex  (NEVER translated)
    code = "code"              # text + lang
    figure = "figure"          # caption + ref  (NO image src — alt only)
    question = "question"      # prompt + options[] + answer
    callout = "callout"        # variant + label  (container)
    example = "example"        # label             (container)
    step = "step"              # text


class FlatBlock(BaseModel):
    """One typed block. All fields beyond id/parent/type are optional and
    type-specific — keeping the schema flat and non-recursive so Gemini can
    emit it reliably with temperature=0."""

    id: str = Field(description="Unique within the page, e.g. 'p42-b3'.")
    parent: str = Field(default="", description="id of the containing block, or '' if top-level.")
    type: BlockType

    # type-specific (all optional)
    level: Optional[int] = Field(default=None, description="heading depth, 1 = chapter title")
    text: Optional[str] = Field(default=None, description="paragraph / heading / code / step body")
    term: Optional[str] = Field(default=None, description="definition headword")
    ordered: Optional[bool] = Field(default=None, description="list: numbered vs bulleted")
    items: Optional[List[str]] = Field(default=None, description="list entries")
    rows: Optional[List[List[str]]] = Field(default=None, description="table rows of cells")
    latex: Optional[str] = Field(default=None, description="equation in KaTeX-renderable LaTeX")
    lang: Optional[str] = Field(default=None, description="code language hint")
    caption: Optional[str] = Field(default=None, description="figure: rich alt-text so an AI/blind student can 'see' it")
    ref: Optional[str] = Field(default=None, description="figure number/label as printed, e.g. 'Fig 1.8'")
    variant: Optional[str] = Field(default=None, description="callout: note | warning | tip")
    label: Optional[str] = Field(default=None, description="callout/example printed banner label, e.g. 'CHECKPOINT', 'TRY IT'")
    title: Optional[str] = Field(default=None, description="callout/example secondary topic line under the banner, e.g. 'Python history', 'Whose birthday'")
    prompt: Optional[str] = Field(default=None, description="question stem")
    options: Optional[List[str]] = Field(default=None, description="MCQ choices")
    answer: Optional[str] = Field(default=None, description="correct answer, if shown on the page")
    dir: Optional[str] = Field(default=None, description="Block-level direction: 'rtl' or 'ltr'. Falls back to page dir.")



class PageStructure(BaseModel):
    """The vision model's per-page response. This IS the response_schema."""

    dir: str = Field(description="Dominant reading direction of the page: 'rtl' or 'ltr'.")
    blocks: List[FlatBlock]


# ----- read-time tree rebuild (reader / chunker share this) -----------------

class TreeNode(BaseModel):
    block: FlatBlock
    children: List["TreeNode"] = Field(default_factory=list)


def rebuild_tree(blocks: List[FlatBlock]) -> List[TreeNode]:
    """O(n) reconstruction of the nesting from the flat `parent` chain.

    Orphan parents (a parent id that isn't present) are treated as top-level,
    so a malformed page degrades gracefully instead of dropping content.
    """
    nodes: Dict[str, TreeNode] = {b.id: TreeNode(block=b) for b in blocks}
    roots: List[TreeNode] = []
    for b in blocks:
        node = nodes[b.id]
        parent = nodes.get(b.parent) if b.parent else None
        if parent is not None and parent is not node:
            parent.children.append(node)
        else:
            roots.append(node)
    return roots


TreeNode.model_rebuild()


class TranslatedBlock(BaseModel):
    id: str
    text: Optional[str] = None
    term: Optional[str] = None
    items: Optional[List[str]] = None
    caption: Optional[str] = None
    prompt: Optional[str] = None
    options: Optional[List[str]] = None
    answer: Optional[str] = None
    label: Optional[str] = None
    title: Optional[str] = None


class Translation(BaseModel):
    blocks: List[TranslatedBlock]

