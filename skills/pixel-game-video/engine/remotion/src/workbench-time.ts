/** The workbench's TimeRemap has already applied inOffset + clipFrame * speed.
 * Keep that source clock stable through trims, splits, moves and speed changes.
 * A longer clip holds the last shot frame; it never renormalizes the action. */
export const shotSourceFrame = (sourceLocalFrame: number, sourceDuration: number, sourceStart = 0): number =>
  sourceStart + Math.max(0, Math.min(Math.max(0, sourceDuration - 1), sourceLocalFrame));

/** A transition uses its original source duration, independently of clip length.
 * After its last source frame it settles fully, allowing safe tail extension. */
export const transitionProgress = (sourceLocalFrame: number, sourceDuration: number): number =>
  Math.max(0, Math.min(1, sourceLocalFrame / Math.max(1, sourceDuration)));
