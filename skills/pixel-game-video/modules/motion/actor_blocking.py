"""Contract for grounded movement in ordinary Canvas shots."""

RECIPE = "motion.actor-blocking.v1"


def validate_params(params):
    action = params.get("action")
    required = {"action", "from", "to", "height"}
    if action == "reach":
        required |= {"hand", "contact"}
    if action not in ("walk", "reach") or params.keys() - (required | {"facing"}) or required - params.keys():
        raise ValueError("actor-blocking requires action=walk or reach, from, to, height; reach also needs hand and contact")
    for name in ("from", "to", "hand"):
        if name not in params:
            continue
        point = params[name]
        if not isinstance(point, list) or len(point) != 2 or any(
                type(value) not in (int, float) or not 0 <= value <= 1 for value in point):
            raise ValueError(f"actor-blocking.{name} must be a normalized [x,y] point")
    height = params["height"]
    if type(height) not in (int, float) or not .12 <= height <= .5:
        raise ValueError("actor-blocking.height must be within .12–.5 of the frame height")
    if params.get("facing", "right") not in ("left", "right"):
        raise ValueError("actor-blocking.facing must be left or right")
    a, b = params["from"], params["to"]
    if action == "walk" and (a[1] != b[1] or a[0] == b[0]):
        raise ValueError("actor-blocking walk needs distinct points on the same floor")
    if action == "reach" and (a != b or not isinstance(params["contact"], str) or not params["contact"]):
        raise ValueError("actor-blocking reach keeps the feet in place and names a local contact event")


def resolve_track(shot, project):
    track = sorted((m for m in shot["motions"] if m["recipe"] == RECIPE), key=lambda m: m["startFrame"])
    if not track:
        return
    if (project["renderBackend"] != "canvas" or shot["actor"] != "actor.azong.v3" or
            shot.get("replacement") or shot.get("performance") or
            shot["scene"] in ("scenes.cache-adventure.v1", "scenes.competition-routes.v1", "scenes.presenter-board.v1")):
        raise ValueError("actor-blocking supports the compact Azong sprite in ordinary Canvas shots without replacement or pose tracks")
    events = {event["id"]: event["frame"] for event in shot["events"]}
    previous = None
    for motion in track:
        params = motion["params"]
        height = params["height"]
        if motion["endFrame"] - motion["startFrame"] < 4:
            raise ValueError("actor-blocking needs frames for anticipation and settling")
        margin = height * .34 * project["height"] / project["width"]
        for x, foot in (params["from"], params["to"]):
            if not margin <= x <= 1 - margin or foot < height:
                raise ValueError("actor-blocking body must fit inside the frame at both endpoints")
        if previous and (previous["to"] != params["from"] or previous["height"] != height):
            raise ValueError("adjacent actor-blocking actions must share their planted endpoint and height")
        if params["action"] == "reach":
            contact = events.get(params["contact"])
            if contact is None or not motion["startFrame"] < contact < motion["endFrame"]:
                raise ValueError("actor-blocking contact must be a local event strictly inside the reach")
            x, foot = params["from"]
            hand_x, hand_y = params["hand"]
            unit = project["height"] * height / 36
            facing = -1 if params.get("facing") == "left" else 1
            local_x = (hand_x - x) * project["width"] / unit * facing
            local_y = (hand_y - foot) * project["height"] / unit
            if not 6 <= local_x <= 17 or not -25 <= local_y <= -8:
                raise ValueError("actor-blocking hand target must be in the compact sprite's reach")
            motion["contactFrame"] = contact
        previous = params
