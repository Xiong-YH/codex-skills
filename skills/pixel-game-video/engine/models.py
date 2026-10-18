"""Single source for the four VideoSpec schemas and structural validation."""
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field

Id = Annotated[str, Field(pattern=r"^[A-Za-z][A-Za-z0-9_.-]*$", max_length=100)]
Unit = Annotated[float, Field(ge=0, le=1, allow_inf_nan=False)]
PositiveFrames = Annotated[int, Field(gt=0)]


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


class Project(Model):
    schemaVersion: Literal[1] = 1
    authoringMode: Literal["direct", "director"] = "direct"
    title: Annotated[str, Field(min_length=1, max_length=120)]
    fps: Literal[30, 60] = 60
    width: Literal[1920] = 1920
    height: Literal[1080] = 1080
    nativeWidth: Literal[320] = 320
    nativeHeight: Literal[180] = 180
    style: Id = "style.cyberpunk.v1"
    seed: Annotated[int, Field(ge=0, le=2147483647)] = 7
    audioMode: Literal["sfx-only", "narration+sfx", "silent"] = "sfx-only"


class FrameRef(Model):
    event: Id
    offsetFrames: int = 0


class Event(Model):
    id: Id
    frame: Annotated[int, Field(ge=0)]


class SceneObject(Model):
    id: Id
    asset: Id
    x: Unit = 0.65
    y: Unit = 0.5


class Motion(Model):
    id: Id
    recipe: Id
    target: Id = "scene"
    start: FrameRef
    durationFrames: PositiveFrames
    params: dict[str, Any] = Field(default_factory=dict)


class MediaSource(Model):
    file: Annotated[str, Field(min_length=1)]
    kind: Literal["image", "video"] = "image"
    fit: Literal["cover", "contain"] = "cover"
    anchorX: Unit = 0.5
    anchorY: Unit = 0.5
    dim: Annotated[float, Field(ge=0, le=0.85)] = 0.0
    trimStartSeconds: Annotated[float, Field(ge=0)] = 0.0
    shortage: Literal["error", "hold"] = "error"


class Component(Model):
    id: Id
    kind: Literal["identity", "metric", "comparison", "annotation", "chapter",
                  "flow", "timeline", "checklist", "hierarchy", "bars", "code", "takeaway"]
    x: Unit
    y: Unit
    width: Annotated[float, Field(gt=0, le=1)]
    height: Annotated[float, Field(gt=0, le=1)]
    showEvent: Id = "enter"
    focusEvent: Id | None = None
    tone: Literal["accent", "gold", "danger", "secondary"] = "gold"
    data: dict[str, Any]


class Shot(Model):
    id: Id
    durationFrames: PositiveFrames
    scene: Id
    actor: Id | None = "actor.azong.v3"
    params: dict[str, Any] = Field(default_factory=dict)
    objects: list[SceneObject] = Field(default_factory=list)
    events: list[Event] = Field(default_factory=list)
    motions: list[Motion] = Field(default_factory=list)
    components: list[Component] = Field(default_factory=list)
    background: MediaSource | None = None
    replacement: MediaSource | None = None


class Timeline(Model):
    shots: Annotated[list[Shot], Field(min_length=1, max_length=500)]


class TextCue(Model):
    id: Id
    role: Literal["subtitle", "annotation", "title", "label"]
    text: Annotated[str, Field(min_length=1, max_length=240)]
    phrases: list[str] = Field(default_factory=list)
    start: FrameRef
    end: FrameRef
    accent: str | None = None
    x: Unit | None = None
    y: Unit | None = None


class Text(Model):
    cues: list[TextCue] = Field(default_factory=list)


class AudioCue(Model):
    id: Id
    sound: Id
    at: FrameRef
    level: Unit = 0.5
    x: Unit = 0.5
    variant: Annotated[int, Field(ge=0)] = 0


class NarrationCue(Model):
    id: Id
    file: Annotated[str, Field(min_length=1)]
    at: FrameRef
    gain: Unit = 0.9


class Audio(Model):
    cues: list[AudioCue] = Field(default_factory=list)
    narration: list[NarrationCue] = Field(default_factory=list)
    speechDuck: Unit = 0.28


INPUT_MODELS = {
    "project.json": Project,
    "timeline.json": Timeline,
    "text.json": Text,
    "audio.json": Audio,
}
