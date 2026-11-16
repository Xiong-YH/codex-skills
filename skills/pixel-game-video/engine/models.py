"""Single source for the four VideoSpec schemas and structural validation."""
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Id = Annotated[str, Field(pattern=r"^[A-Za-z][A-Za-z0-9_.-]*$", max_length=100)]
Unit = Annotated[float, Field(ge=0, le=1, allow_inf_nan=False)]
PositiveFrames = Annotated[int, Field(gt=0)]


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


class Project(Model):
    schemaVersion: Literal[1] = 1
    authoringMode: Literal["direct", "director"] = "direct"
    renderBackend: Literal["canvas", "remotion"] = "canvas"
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


class SpeechAnchor(Model):
    cueId: Id
    edge: Literal['start', 'end', 'word'] = 'word'
    word: str = ''
    occurrence: Annotated[int, Field(ge=0)] = 0
    offsetFrames: int = 0


class Rehearsal(Model):
    cueIds: Annotated[list[Id], Field(min_length=1)]
    startFrame: Annotated[int, Field(ge=0)] = 12
    unitsPerSecond: Annotated[float, Field(gt=0, le=30)] = 4.3
    commaSeconds: Annotated[float, Field(ge=0, le=5)] = 0.18
    stopSeconds: Annotated[float, Field(ge=0, le=5)] = 0.35
    gapSeconds: Annotated[float, Field(ge=0, le=5)] = 0.2


class Event(Model):
    id: Id
    frame: Annotated[int, Field(ge=0)] | None = None
    speech: SpeechAnchor | None = None

    @model_validator(mode='after')
    def one_clock(self):
        if (self.frame is None) == (self.speech is None):
            raise ValueError('event requires exactly one of frame or speech')
        return self


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
    visualStyle: Literal["plain", "mechanical", "energy", "paper"] = "mechanical"
    styleVariant: Literal["open", "inset", "relay"] = "inset"
    features: Annotated[list[Literal["stack"]], Field(max_length=1)] = Field(default_factory=list)
    entryFrom: Annotated[list[Unit], Field(min_length=2, max_length=2)] | None = None
    data: dict[str, Any]


class ActorPose(Model):
    pose: Literal['neutral', 'wave', 'talk', 'dazed-left', 'dazed-right', 'overwhelmed']
    start: FrameRef
    end: FrameRef


class AtlasPose(Model):
    pose: Id
    at: FrameRef
    sourceRect: Annotated[list[Annotated[int, Field(ge=0)]], Field(min_length=4, max_length=4)]
    offset: Annotated[list[int], Field(min_length=2, max_length=2)] = Field(default_factory=lambda: [0, 0])


class PoseAtlas(Model):
    file: Annotated[str, Field(min_length=1)]
    x: Unit
    y: Unit
    height: Annotated[float, Field(gt=0, le=1)]
    poses: Annotated[list[AtlasPose], Field(min_length=1, max_length=120)]


class ProgressNode(Model):
    label: Annotated[str, Field(min_length=1, max_length=12)]
    at: FrameRef


class NarrativeProgress(Model):
    nodes: Annotated[list[ProgressNode], Field(min_length=2, max_length=8)]


class Shot(Model):
    id: Id
    beatId: Id | None = None
    durationFrames: PositiveFrames
    scene: Id
    actor: Id | None = "actor.azong.v3"
    params: dict[str, Any] = Field(default_factory=dict)
    objects: list[SceneObject] = Field(default_factory=list)
    events: list[Event] = Field(default_factory=list)
    rehearsal: Rehearsal | None = None
    motions: list[Motion] = Field(default_factory=list)
    components: list[Component] = Field(default_factory=list)
    background: MediaSource | None = None
    replacement: MediaSource | None = None
    performance: list[ActorPose] = Field(default_factory=list)
    poseAtlas: PoseAtlas | None = None


class Timeline(Model):
    shots: Annotated[list[Shot], Field(min_length=1, max_length=500)]
    progress: NarrativeProgress | None = None


class TextEmphasis(Model):
    text: Annotated[str, Field(min_length=1)]
    color: Annotated[str, Field(pattern=r'^#[0-9A-Fa-f]{6}$')] | None = None
    treatment: Literal['underline'] | None = None


class RichText(Model):
    left: Unit
    right: Unit
    y: Unit
    size: Annotated[float, Field(ge=.02, le=.12)] | None = None
    emphasis: list[TextEmphasis] = Field(default_factory=list)
    color: Annotated[str, Field(pattern=r'^#[0-9A-Fa-f]{6}$')] | None = None

    @model_validator(mode='after')
    def ordered_bounds(self):
        if self.left >= self.right:
            raise ValueError('Rich text needs left < right')
        return self


class TextCue(Model):
    id: Id
    role: Literal["subtitle", "annotation", "title", "label"]
    text: Annotated[str, Field(min_length=1, max_length=240)]
    phrases: list[str] = Field(default_factory=list)
    start: FrameRef
    end: FrameRef
    accent: str | None = None
    richText: RichText | None = None
    x: Unit | None = None
    y: Unit | None = None


class Text(Model):
    cues: list[TextCue] = Field(default_factory=list)


class AudioCue(Model):
    id: Id
    sound: Id | None = None
    file: Annotated[str, Field(min_length=1)] | None = None
    at: FrameRef
    level: Unit = 0.5
    x: Unit = 0.5
    variant: Annotated[int, Field(ge=0)] = 0
    params: dict[str, bool | int | float | str | list[bool | int | float | str]] | None = None
    align: Literal["start", "peak", "end"] | None = None

    @model_validator(mode="after")
    def require_source(self):
        if (self.sound is None) == (self.file is None):
            raise ValueError("SFX cue requires exactly one of sound or file")
        return self


class NarrationCue(Model):
    id: Id
    file: Annotated[str, Field(min_length=1)]
    at: FrameRef
    gain: Unit = 0.9


class Bgm(Model):
    id: Id = "bgm"
    file: Annotated[str, Field(min_length=1)]
    at: FrameRef
    end: FrameRef
    gain: Unit = 0.18
    loop: bool = True
    trimStartSeconds: Annotated[float, Field(ge=0)] = 0.0
    fadeInFrames: Annotated[int, Field(ge=0)] = 60
    fadeOutFrames: Annotated[int, Field(ge=0)] = 90
    speechDuck: Unit = 0.25
    title: str = ""
    artist: str = ""
    sourceUrl: str = ""
    licenseUrl: str = ""
    changes: str = ""


class Audio(Model):
    cues: list[AudioCue] = Field(default_factory=list)
    narration: list[NarrationCue] = Field(default_factory=list)
    speechDuck: Unit = 0.28
    masterGain: Annotated[float, Field(gt=0, le=4, allow_inf_nan=False)] | None = None
    bgm: Bgm | None = None


INPUT_MODELS = {
    "project.json": Project,
    "timeline.json": Timeline,
    "text.json": Text,
    "audio.json": Audio,
}
