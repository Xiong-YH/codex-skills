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
    style: Id = "style.modern-pixel.v1"
    seed: Annotated[int, Field(ge=0, le=2147483647)] = 7
    audioMode: Literal["sfx-only", "silent"] = "sfx-only"


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


class Shot(Model):
    id: Id
    durationFrames: PositiveFrames
    scene: Id
    actor: Id = "actor.lead02.v1"
    params: dict[str, Any] = Field(default_factory=dict)
    objects: list[SceneObject] = Field(default_factory=list)
    events: list[Event] = Field(default_factory=list)
    motions: list[Motion] = Field(default_factory=list)


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


class Audio(Model):
    cues: list[AudioCue] = Field(default_factory=list)


INPUT_MODELS = {
    "project.json": Project,
    "timeline.json": Timeline,
    "text.json": Text,
    "audio.json": Audio,
}
