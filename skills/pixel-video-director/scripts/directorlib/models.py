"""Versioned authoring contracts. JSON schemas are generated from these models."""
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


class Brief(Contract):
    schemaVersion: Literal[1] = 1
    id: str = Field(min_length=1)
    idea: str = Field(min_length=1)
    audience: str = Field(min_length=1)
    takeaway: str = Field(min_length=1)
    durationRangeSeconds: list[float] = Field(min_length=2, max_length=2)
    constraints: list[str] = []


class Cue(Contract):
    id: str = Field(pattern=r"^[a-zA-Z][a-zA-Z0-9_-]*$")
    text: str = Field(min_length=1)
    phrases: list[str] = []
    meaning: str = Field(min_length=1)


class Script(Contract):
    schemaVersion: Literal[1] = 1
    cues: list[Cue] = Field(min_length=1)
    labels: list["Label"] = []


class Label(Contract):
    id: str = Field(pattern=r"^[a-zA-Z][a-zA-Z0-9_-]*$")
    text: str = Field(min_length=1)


class Ref(Contract):
    event: str = Field(pattern=r"^[a-zA-Z][a-zA-Z0-9_-]*\.[a-zA-Z][a-zA-Z0-9_-]*$")
    offsetFrames: int = 0


class Event(Contract):
    id: str = Field(pattern=r"^[a-zA-Z][a-zA-Z0-9_-]*$")
    frame: int = Field(ge=0)


class ObjectPlacement(Contract):
    id: str = Field(pattern=r"^[a-zA-Z][a-zA-Z0-9_-]*$")
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)


class CuePlacement(Contract):
    cueId: str
    start: Ref
    end: Ref


class VisualIntent(Contract):
    question: str = Field(min_length=1)
    form: Literal["scene", "process", "identity", "metric", "comparison", "annotation", "chapter",
                  "flow", "timeline", "checklist", "hierarchy", "bars", "code", "takeaway"]
    subject: str = Field(min_length=1)
    action: str = Field(min_length=1)
    result: str = Field(min_length=1)
    continuity: str = Field(min_length=1)


class MediaSource(Contract):
    file: str = Field(min_length=1)
    kind: Literal["image", "video"] = "image"
    fit: Literal["cover", "contain"] = "cover"
    anchorX: float = Field(default=0.5, ge=0, le=1)
    anchorY: float = Field(default=0.5, ge=0, le=1)
    dim: float = Field(default=0, ge=0, le=0.85)
    trimStartSeconds: float = Field(default=0, ge=0)
    shortage: Literal["error", "hold"] = "error"


class Shot(Contract):
    id: str = Field(pattern=r"^[a-zA-Z][a-zA-Z0-9_-]*$")
    durationFrames: int = Field(gt=0)
    intent: str = Field(min_length=1)
    visual: VisualIntent | None = None
    scene: str
    params: dict[str, Any] = {}
    events: list[Event] = []
    objects: list[ObjectPlacement] = []
    cues: list[CuePlacement] = []
    components: list[dict[str, Any]] = []
    performance: list[dict[str, Any]] = []


class Storyboard(Contract):
    schemaVersion: Literal[1] = 1
    shots: list[Shot] = Field(min_length=1)
    progress: dict[str, Any] | None = None


class Output(Contract):
    fps: Literal[60] = 60
    width: Literal[1920] = 1920
    height: Literal[1080] = 1080
    nativeWidth: Literal[320] = 320
    nativeHeight: Literal[180] = 180


class AssetChoice(Contract):
    id: str
    asset: str


class Motion(Contract):
    id: str
    recipe: str
    target: str
    start: Ref
    durationFrames: int = Field(gt=0)
    params: dict[str, Any] = {}


class ShotPlan(Contract):
    id: str
    actor: str | None
    objects: list[AssetChoice] = []
    motions: list[Motion] = []
    background: MediaSource | None = None
    replacement: MediaSource | None = None


class TextPlan(Contract):
    cueId: str
    role: Literal["subtitle", "annotation", "title", "label"]
    accent: str | None = None
    x: float | None = Field(default=None, ge=0, le=1)
    y: float | None = Field(default=None, ge=0, le=1)


class Sound(Contract):
    id: str
    sound: str
    at: Ref
    level: float = Field(ge=0, le=1)
    x: float = Field(default=0.5, ge=0, le=1)
    variant: int = Field(default=0, ge=0)


class Narration(Contract):
    id: str
    file: str = Field(min_length=1)
    at: Ref
    gain: float = Field(default=0.9, ge=0, le=1)


class Plan(Contract):
    schemaVersion: Literal[1] = 1
    renderBackend: Literal["canvas", "remotion"] = "canvas"
    id: str
    title: str = Field(min_length=1)
    output: Output
    style: str
    seed: int
    audioMode: Literal["sfx-only", "narration+sfx", "silent"]
    shots: list[ShotPlan] = Field(min_length=1)
    text: list[TextPlan] = Field(min_length=1)
    audio: list[Sound] = []
    narration: list[Narration] = []
    speechDuck: float = Field(default=0.28, ge=0, le=1)


class Evidence(Contract):
    kind: Literal["frame", "playback", "audio", "metadata", "source"]
    path: str = Field(min_length=1)
    description: str = Field(min_length=1)
    checked: bool = False


Status = Literal["passed", "failed", "not_reviewed"]
Category = Literal["content", "visual", "motion", "text", "audio", "technical"]


class ReviewCheck(Contract):
    category: Category
    status: Status = "not_reviewed"
    evidence: list[Evidence] = []
    notes: str = ""


class SourceRef(Contract):
    file: Literal["brief.json", "script.json", "storyboard.json", "production-plan.json"]
    stableId: str
    field: str


class TimeRange(Contract):
    startFrame: int = Field(ge=0)
    endFrame: int = Field(gt=0)


class Issue(Contract):
    issueId: str
    category: Category
    severity: Literal["blocker", "major", "minor"]
    shotId: str
    timeRange: TimeRange
    evidence: list[Evidence] = Field(min_length=1)
    expected: str = Field(min_length=1)
    ownerModule: Literal["director", "style", "library", "text", "motion", "audio", "scenes", "components", "engine"]
    sourceRef: SourceRef
    status: Status = "failed"


class Binding(Contract):
    inputHash: str = Field(pattern=r"^[0-9a-f]{64}$")
    videoSha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    video: str
    renderManifest: str
    sourceHashes: dict[str, str]


class Review(Contract):
    schemaVersion: Literal[1] = 1
    binding: Binding
    checks: list[ReviewCheck]
    issues: list[Issue] = []


MODELS = {"brief": Brief, "script": Script, "storyboard": Storyboard,
          "production-plan": Plan, "review": Review}
