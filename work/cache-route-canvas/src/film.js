(() => {
  const { cues: cue } = globalThis.cacheRouteTimeline;
  const W = 1280;
  const H = 720;
  const mint = '#abebc9';
  const lime = '#ddf29a';
  const amber = '#f3bf79';
  const coral = '#f2a48d';
  const white = '#f4f2e7';
  const uiFont = '"Microsoft YaHei UI", "PingFang SC", "Noto Sans CJK SC", sans-serif';
  const clamp = p => Math.min(1, Math.max(0, p));
  const mix = (a, b, p) => a + (b - a) * p;
  const smooth = p => p * p * (3 - 2 * p);
  const out = p => 1 - (1 - p) ** 3;
  const span = (frame, a, b) => clamp((frame - a) / (b - a));
  const reader = [480, 394];
  const cache = [780, 394];
  const source = [1080, 394];
  const hatch = [969, 365];
  const proof = [1091, 388];
  const spritePoses = ['idle', 'runA', 'runB', 'brace', 'launch', 'air', 'land'];

  function rect(g, x, y, w, h, color) {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
  }

  function polygon(g, points, color) {
    g.beginPath();
    for (const [i, [x, y]] of points.entries()) i ? g.lineTo(x, y) : g.moveTo(x, y);
    g.closePath();
    if (color) { g.fillStyle = color; g.fill(); }
  }

  function bevel(g, x, y, w, h, cut, color) {
    polygon(g, [[x + cut, y], [x + w - cut, y], [x + w - cut, y + 3], [x + w, y + 3],
      [x + w, y + h - cut], [x + w - 3, y + h - cut], [x + w - 3, y + h], [x + cut, y + h],
      [x + cut, y + h - 3], [x, y + h - 3], [x, y + cut], [x + 3, y + cut], [x + 3, y]], color);
  }

  function line(g, points, color, width = 2) {
    g.beginPath();
    for (const [i, [x, y]] of points.entries()) i ? g.lineTo(x, y) : g.moveTo(x, y);
    g.strokeStyle = color;
    g.lineWidth = width;
    g.stroke();
  }

  function label(g, words, x, y, size, color, align = 'left', weight = 600) {
    g.textBaseline = 'middle';
    g.textAlign = align;
    g.font = `${weight} ${size}px ${uiFont}`;
    g.fillStyle = color;
    g.fillText(words, x, y);
    return g.measureText(words).width;
  }

  function halo(g, x, y, radius, color) {
    const light = g.createRadialGradient(x, y, 0, x, y, radius);
    light.addColorStop(0, color);
    light.addColorStop(1, 'transparent');
    rect(g, x - radius, y - radius, radius * 2, radius * 2, light);
  }

  function field(g, top, bottom) {
    const base = g.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, top);
    base.addColorStop(1, bottom);
    rect(g, 0, 0, W, H, base);
  }

  function spark(g, x, y, age, color, type) {
    if (age < 0 || age >= 24) return;
    const p = age / 24;
    const launch = out(p);
    const ground = type === 'ground';
    g.save();
    g.globalAlpha = (1 - p) ** 1.4;
    halo(g, x, y, ground ? 195 : 145, ground ? '#ffd48a79' : '#acffe24c');
    g.globalAlpha = (1 - p) ** 1.8;
    if (ground) {
      const reach = 43 + 204 * launch;
      const depth = 9 + 27 * launch;
      line(g, [[x - reach, y + 2], [x, y + depth], [x + reach, y + 2]], color, 6 - 3 * p);
      line(g, [[x - reach * .73, y + 5], [x, y + depth * 1.24], [x + reach * .73, y + 5]], '#fff2ba', 2);
    } else {
      const r = 42 + 91 * launch;
      for (const sign of [-1, 1]) {
        line(g, [[x + sign * (r - 18), y - 37], [x + sign * r, y - 37], [x + sign * r, y - 19]], color, 4);
        line(g, [[x + sign * (r - 18), y + 37], [x + sign * r, y + 37], [x + sign * r, y + 19]], color, 4);
      }
    }
    for (let i = 0; i < 19; i++) {
      const angle = ground ? Math.PI + (i + .5) / 19 * Math.PI : i * 2.39996;
      const reach = (44 + (i * 23) % 129) * (ground ? 1.22 : 1);
      const px = Math.round((x + Math.cos(angle) * reach * launch) / 3) * 3;
      const py = Math.round((y + Math.sin(angle) * reach * launch * (ground ? .60 : .74) + (ground ? 31 * p * p : 0)) / 3) * 3;
      const size = (i % 5 === 0 ? 12 : i % 2 === 0 ? 7 : 4) * (1 - .42 * p);
      rect(g, px, py, size, size, i % 3 === 0 ? '#fff4ce' : color);
    }
    g.restore();
  }

  function title(g, lead, emphasis = '', tail = '', color = mint, dark = false) {
    const ink = dark ? '#233a38' : white;
    let x = 86;
    if (lead) x += label(g, lead, x, 118, 62, ink, 'left', 750);
    if (emphasis) {
      const width = label(g, emphasis, x, 118, 62, color, 'left', 750);
      rect(g, x + 3, 160, width - 6, 4, color);
      x += width;
    }
    if (tail) label(g, tail, x, 118, 62, ink, 'left', 750);
  }

  function device(g, x, y, name, state) {
    const left = x - 104;
    const top = y - 74;
    bevel(g, left + 7, top + 9, 208, 148, 13, '#0c1a22');
    bevel(g, left, top, 208, 148, 13, state ? '#5b9387' : '#405d65');
    bevel(g, left + 4, top + 4, 200, 138, 10, '#2a454c');
    bevel(g, left + 12, top + 13, 184, 112, 7, state ? '#1b3838' : '#152d36');
    rect(g, left + 15, top + 6, 82, 2, state ? '#a1cfc0' : '#6b9091');
    rect(g, left + 17, top + 125, 173, 2, '#1d3037');
    rect(g, left + 18, top + 132, 24, 3, '#4a676c');
    rect(g, left + 171, top + 131, 14, 5, state ? mint : '#58717a');
    rect(g, left + 73, top + 146, 62, 5, '#182d33');
    label(g, name, x, y + 126, 44, '#dcebe2', 'center');
  }

  function packet(g, x, y, options = {}) {
    const { requested = false, scale = 1, flash = 0 } = options;
    const border = requested ? '#9e674c' : '#539681';
    const paper = requested ? '#f6deb1' : '#e2f1cf';
    const tab = requested ? '#edb374' : '#a1dabc';
    g.save();
    g.translate(x, y);
    g.scale(scale, scale);
    bevel(g, -64 + 5, -38 + 7, 128, 76, 8, '#12282b');
    bevel(g, -64, -38, 128, 76, 8, border);
    bevel(g, -61, -35, 122, 67, 6, paper);
    rect(g, -54, -28, 40, 50, tab);
    rect(g, -54, -28, 40, 3, '#f7f3d2');
    label(g, 'A', -34, -1, 42, '#1f3b39', 'center', 800);
    rect(g, -1, -16, 44, 5, '#5f8d79');
    rect(g, -1, -3, 34, 3, '#a3b894');
    rect(g, -1, 6, 42, 3, '#a3b894');
    rect(g, 42, 16, 8, 5, requested ? '#9e674c' : '#5f9b83');
    if (flash > 0 && flash < 1) {
      g.save();
      g.beginPath();
      g.rect(-60, -34, 120, 65);
      g.clip();
      const band = mix(-105, 102, flash);
      g.globalAlpha = .86;
      polygon(g, [[band - 23, 39], [band, -38], [band + 38, -38], [band + 12, 39]], '#fffde0');
      g.restore();
    }
    g.restore();
  }

  function travel(g, from, to, p, options, lift = 29) {
    const x = mix(from[0], to[0], p);
    const y = mix(from[1], to[1], p) - Math.sin(Math.PI * p) * lift;
    const trail = Math.sin(Math.PI * p);
    if (trail > .04) {
      const direction = Math.sign(to[0] - from[0]);
      g.save();
      g.globalAlpha = .6 * trail;
      const shade = options.requested ? amber : mint;
      for (let i = 0; i < 3; i++) {
        const length = 34 + i * 14;
        const start = x - direction * (70 + i * 12);
        rect(g, Math.min(start, start - direction * length), y - 17 + i * 17, length, i === 1 ? 5 : 2, shade);
      }
      g.restore();
    }
    packet(g, x, y, options);
  }

  function rail(g, a, b, y, active) {
    const color = active ? '#8cccb1' : '#3f5e66';
    line(g, [[a, y], [b, y]], color, active ? 4 : 2);
    for (let x = a + 17; x < b - 10; x += 22) rect(g, x, y - 4, 2, 8, color);
    line(g, [[b - 14, y - 8], [b - 2, y], [b - 14, y + 8]], color, 2);
  }

  function deskBackground(g) {
    field(g, '#152531', '#142a30');
    halo(g, 789, 376, 596, '#43665e44');
    rect(g, 0, 568, W, 152, '#13272e');
    for (let x = 86; x < W; x += 64) rect(g, x, 211, 1, 355, '#233b43');
    for (let y = 249; y <= 557; y += 44) rect(g, 86, y, 1108, 1, '#233b43');
    rect(g, 86, 568, 1108, 2, '#39535a');
    for (let x = 86; x < W - 85; x += 64) rect(g, x, 569, 1, 11, '#3a555a');
    bevel(g, 342, 290, 855, 207, 12, '#1c333c');
    rect(g, 351, 294, 834, 2, '#304b51');
    rect(g, 351, 491, 834, 1, '#2d444a');
    // A shallow dais under the presenter gives the two feet a fixed floor.
    polygon(g, [[128, 560], [299, 560], [324, 582], [105, 582]], '#223d42');
    rect(g, 105, 582, 219, 7, '#112128');
    rect(g, 127, 564, 175, 2, '#416065');
    halo(g, 217, 544, 157, '#89be8c27');
  }

  function modern(g, atlas, pose) {
    const x = 219;
    const foot = 571;
    g.fillStyle = '#0e2026b8';
    g.beginPath();
    g.ellipse(x, foot + 1, 67, 10, 0, 0, 2 * Math.PI);
    g.fill();
    if (!atlas?.naturalWidth) return;
    // Each atlas tile is 200×280 with the same centered foot anchor.
    const displayScale = 1.09;
    g.imageSmoothingEnabled = true;
    g.drawImage(atlas, pose === 'question' ? 200 : 0, 0, 200, 280,
      x - 100 * displayScale, foot - 276 * displayScale, 200 * displayScale, 280 * displayScale);
  }

  function deskTitle(g, frame) {
    if (frame < cue.miss) title(g, '为什么', '第二次', '读得更快？');
    else if (frame < cue.return) title(g, '第一次，缓存是', '空的', '。', coral);
    else if (frame < cue.again) title(g, '带回 A，', '留一份', '。');
    else title(g, '第二次，', '直接读缓存', '。', lime);
  }

  function desk(g, frame, atlas, transfer = '') {
    deskBackground(g);
    const returned = frame >= cue.return;
    const hasCopy = frame >= cue.copy;
    const second = frame >= cue.again;
    const complete = frame >= cue.complete;
    const answerAtReader = (returned && frame < cue.copyTravel) || complete;
    const departed = frame >= cue.toStation && !returned;
    const misses = frame >= cue.miss && !returned;
    modern(g, atlas, misses && !departed ? 'question' : 'neutral');

    rail(g, reader[0] + 108, cache[0] - 109, 394, second);
    rail(g, cache[0] + 108, source[0] - 109, 394, departed);
    device(g, ...reader, '读取端', answerAtReader);
    device(g, ...cache, '缓存', hasCopy);
    g.save();
    if (second) g.globalAlpha = .53;
    device(g, ...source, '源站', departed);
    g.restore();

    if (misses && !departed) {
      label(g, '未命中', cache[0], 269, 44, coral, 'center', 700);
      rect(g, cache[0] - 13, 308, 26, 3, coral);
      spark(g, cache[0], 394, frame - cue.miss, coral, 'card');
    } else if (hasCopy) {
      label(g, '本地副本', cache[0], 269, 44, mint, 'center', 700);
    }

    if (!transfer) {
      if (frame >= cue.request && frame < cue.miss) {
        travel(g, reader, cache, smooth(span(frame, cue.request, cue.miss)), { requested: true }, 19);
      } else if (misses && !departed) {
        const kick = Math.sin(Math.PI * span(frame, cue.miss, cue.miss + 11)) * 16;
        packet(g, cache[0] - kick, cache[1], { requested: true });
      }
      if (answerAtReader) packet(g, ...reader, { flash: span(frame, cue.complete, cue.complete + 14) });
      if (returned && frame >= cue.copyTravel && !hasCopy) {
        travel(g, reader, cache, smooth(span(frame, cue.copyTravel, cue.copy)), {}, 24);
      }
      if (hasCopy) packet(g, ...cache, { flash: span(frame, cue.copy, cue.copy + 13) });
      if (second && frame < cue.read) {
        travel(g, reader, cache, smooth(span(frame, cue.again, cue.read)), { requested: true, scale: .9 }, 38);
      }
      if (frame >= cue.read && !complete) {
        travel(g, cache, reader, smooth(span(frame, cue.read, cue.complete)), { scale: .9 }, 41);
      }
    } else if (transfer === 'result') {
      packet(g, ...reader);
    }

    spark(g, ...cache, frame - cue.copy, lime, 'card');
    spark(g, ...reader, frame - cue.complete, lime, 'card');
    if (!transfer) deskTitle(g, frame);
  }

  function actorAt(frame) {
    const running = span(frame, cue.run, cue.brace);
    const jumping = span(frame, cue.jump, cue.land);
    let x = mix(343, 508, smooth(running));
    let foot = 570;
    let pose = 'idle';
    if (frame >= cue.run && frame < cue.brace) pose = Math.floor((frame - cue.run) / 7) % 2 ? 'runB' : 'runA';
    if (frame >= cue.brace && frame < cue.jump) pose = 'brace';
    if (frame >= cue.jump && frame < cue.land) {
      x = mix(508, 649, jumping);
      foot = mix(570, 556, jumping) - 139 * 4 * jumping * (1 - jumping);
      pose = jumping < .16 ? 'launch' : 'air';
    }
    if (frame >= cue.land) {
      x = 649;
      foot = 556 + plateDrop(frame);
      pose = frame < cue.land + 11 ? 'land' : 'idle';
    }
    return { x, foot, pose };
  }

  function plateDrop(frame) {
    const age = frame - cue.land;
    if (age < 0) return 0;
    return age < 3 ? 12 * age / 3 : 12 * (1 - out(span(age, 3, 14))) + 5 * out(span(age, 3, 14));
  }

  function stationBackground(g) {
    field(g, '#1a2b31', '#182e2e');
    halo(g, 901, 414, 532, '#587f624f');
    rect(g, 0, 480, W, 240, '#203833');
    rect(g, 0, 480, W, 3, '#34554b');
    for (let y = 491; y <= 720; y += 37) rect(g, 0, y, W, 1, '#2f4941');
    for (let x = -184; x <= 1500; x += 119) line(g, [[660 + (x - 660) * .51, 481], [x, 720]], '#2f4941', 1);
    for (let col = 0; col < 4; col++) {
      const x = 77 + col * 104;
      bevel(g, x, 212, 89, 256, 8, '#203c3a');
      rect(g, x + 10, 221, 68, 2, '#38544b');
      for (let row = 0; row < 6; row++) {
        bevel(g, x + 10, 238 + row * 35, 69, 25, 4, '#182f30');
        rect(g, x + 17, 245 + row * 35, 25, 2, '#39564d');
        rect(g, x + 66, 247 + row * 35, 5, 4, '#668e70');
      }
    }
    rect(g, 183, 583, 938, 24, '#122725');
    polygon(g, [[221, 545], [1087, 545], [1121, 583], [183, 583]], '#314c44');
    rect(g, 189, 583, 925, 3, '#516a56');
    for (let x = 210; x < 1120; x += 41) rect(g, x, 590, 19, 2, '#2f4741');
  }

  function circuit(g, frame) {
    const path = [[655, 566], [678, 592], [926, 592], [969, 551], [969, 470]];
    line(g, path, '#152c2c', 15);
    line(g, path, '#577565', 4);
    if (frame < cue.land) return;
    const fraction = span(frame, cue.land, cue.open);
    const lengths = path.slice(1).map(([x, y], i) => Math.hypot(x - path[i][0], y - path[i][1]));
    let distance = fraction * lengths.reduce((sum, length) => sum + length, 0);
    const lit = [path[0]];
    for (let i = 0; i < lengths.length; i++) {
      const [ax, ay] = path[i];
      const [bx, by] = path[i + 1];
      const p = clamp(distance / lengths[i]);
      lit.push([mix(ax, bx, p), mix(ay, by, p)]);
      distance -= lengths[i];
      if (p < 1) break;
    }
    line(g, lit, '#77b67f', 12);
    line(g, lit, lime, 4);
    if (fraction < 1) {
      const [x, y] = lit.at(-1);
      halo(g, x, y, 52, '#dcf7a47a');
      rect(g, x - 9, y - 9, 18, 18, '#f6ffc5');
    }
  }

  function stationCamera(frame) {
    const approach = out(span(frame, cue.run, cue.land));
    const age = span(frame, cue.land, cue.land + 13);
    return { x: -15 * approach, y: 16 * Math.sin(Math.PI * age) * (1 - age), scale: 1 + .052 * approach };
  }

  function stationTitle(g) {
    title(g, '去', '源站', '取回 A。', amber);
  }

  function station(g, frame, sprite, handoff = false) {
    const camera = stationCamera(frame);
    g.save();
    g.translate(640 + camera.x, 440 + camera.y);
    g.scale(camera.scale, camera.scale);
    g.translate(-640, -440);
    stationBackground(g);
    circuit(g, frame);
    const drop = plateDrop(frame);
    bevel(g, 583, 553 + drop, 132, 35, 10, '#182c2c');
    polygon(g, [[601, 537 + drop], [698, 537 + drop], [716, 561 + drop], [582, 561 + drop]],
      frame >= cue.land ? '#c0de8b' : '#59735e');
    rect(g, 586, 561 + drop, 127, 5, frame >= cue.land ? '#7db77e' : '#415b52');
    for (let x = 601; x < 702; x += 17) rect(g, x, 553 + drop, 8, 3, frame >= cue.land ? '#739e65' : '#394f47');

    const open = frame >= cue.open;
    bevel(g, 837, 229, 273, 260, 18, '#112829');
    bevel(g, 828, 220, 272, 255, 17, open ? '#779985' : '#547265');
    bevel(g, 835, 226, 257, 238, 12, '#2f4c44');
    rect(g, 853, 233, 96, 2, '#88a18b');
    bevel(g, 850, 278, 238, 158, 9, '#172d30');
    rect(g, 859, 288, 220, 3, '#456056');
    rect(g, 850, 439, 236, 6, '#142c2d');
    rect(g, 855, 474, 21, 71, '#263e39');
    rect(g, 1054, 474, 21, 71, '#263e39');
    rect(g, 850, 540, 31, 7, '#192f30');
    rect(g, 1049, 540, 31, 7, '#192f30');
    label(g, '源站', 963, 255, 43, white, 'center');
    rect(g, 1054, 245, 13, 10, open ? lime : amber);

    if (open) halo(g, ...hatch, 150, '#c8ffbe36');
    if (!handoff) packet(g, ...hatch, { requested: !open, flash: span(frame, cue.open, cue.open + 13) });
    const slide = out(span(frame, cue.open, cue.open + 12));
    for (const side of [-1, 1]) {
      const x = 969 + side * (62 + 37 * slide);
      bevel(g, x - 14, 306, 28, 120, 6, '#406052');
      rect(g, x - 10, 313, 20, 3, '#708d77');
      for (let i = 0; i < 3; i++) rect(g, x - 7, 340 + i * 19, 14, 4, '#27433c');
      rect(g, x - 4, 409, 8, 6, open ? lime : amber);
    }
    spark(g, ...hatch, frame - cue.open, mint, 'card');

    const actor = actorAt(frame);
    g.fillStyle = '#142723b3';
    g.beginPath();
    const altitude = Math.max(0, 559 - actor.foot);
    g.ellipse(actor.x, mix(570, 561, span(actor.x, 508, 649)), 32 - altitude * .12, 7, 0, 0, 2 * Math.PI);
    g.fill();
    spark(g, 649, actor.foot, frame - cue.land, amber, 'ground');
    if (sprite?.naturalWidth) {
      const width = sprite.naturalWidth / spritePoses.length;
      const height = sprite.naturalHeight;
      const scale = 1.08;
      g.imageSmoothingEnabled = false;
      g.drawImage(sprite, spritePoses.indexOf(actor.pose) * width, 0, width, height,
        actor.x - 56 * scale, actor.foot - 119 * scale, width * scale, height * scale);
    }
    g.restore();
    if (!handoff) stationTitle(g);
  }

  function resultTitle(g) {
    title(g, '省下了', '往返源站', '。', '#487556', true);
  }

  function result(g, frame, handoff = false) {
    field(g, '#eef1da', '#dce8d4');
    for (let x = 88; x < 1196; x += 55) rect(g, x, 207, 1, 403, '#d0dfcc');
    for (let y = 230; y < 610; y += 47) rect(g, 87, y, 1108, 1, '#d0dfcc');
    if (!handoff) resultTitle(g);
    bevel(g, 88, 238, 865, 315, 12, '#bed0bf');
    bevel(g, 89, 235, 861, 310, 11, '#e9efdd');
    bevel(g, 90, 238, 859, 3, 2, '#f5f7e7');
    const positions = [323, 571, 819];
    const names = ['读取端', '缓存', '源站'];
    positions.forEach((x, i) => label(g, names[i], x, 283, 43, '#3b594e', 'center'));
    const fill = out(span(frame, cue.result - 9, cue.result + 13));
    const rows = [[365, '第一次', '#a3673e', 2], [471, '第二次', '#40765c', 1]];
    for (const [y, name, color, end] of rows) {
      label(g, name, 123, y + 12, 43, '#233a38');
      line(g, [[positions[0], y], [positions[2], y]], '#c5d4c1', 3);
      const tip = mix(positions[0], positions[end], out(clamp(fill * 1.25)));
      line(g, [[positions[0], y], [tip, y]], color, 6);
      if (fill > .06) line(g, [[tip - 15, y - 9], [tip, y], [tip - 15, y + 9]], color, 5);
      const reply = mix(positions[end], positions[0], smooth(span(fill, .44, 1)));
      if (fill > .45) {
        line(g, [[positions[end], y + 26], [reply, y + 26]], color, 3);
        line(g, [[reply + 13, y + 20], [reply, y + 26], [reply + 13, y + 32]], color, 3);
      }
      for (const [i, x] of positions.entries()) {
        const active = i <= end && x <= tip + 1;
        rect(g, x - 7, y - 7, 14, 14, active ? color : '#afc2b0');
      }
    }
    bevel(g, 991, 263, 201, 249, 12, '#c7dcc7');
    rect(g, 1000, 271, 182, 3, '#e2efda');
    label(g, '本地副本', proof[0], 314, 43, '#3b644f', 'center');
    if (!handoff) packet(g, ...proof);
    label(g, '副本仍有效时', 89, 603, 43, '#486257');
  }

  function reveal(g, mask, drawAfter, color, alpha) {
    g.save();
    polygon(g, mask);
    g.clip();
    drawAfter();
    g.restore();
    g.save();
    g.globalAlpha = alpha;
    polygon(g, mask);
    g.strokeStyle = color;
    g.lineWidth = 8;
    g.stroke();
    g.restore();
  }

  function swapTitle(g, p, before, after) {
    const showBefore = p < .32;
    g.save();
    g.globalAlpha = showBefore ? 1 - smooth(span(p, 0, .32)) : smooth(span(p, .60, 1));
    (showBefore ? before : after)();
    g.restore();
  }

  function enterStation(g, p, atlas, sprite) {
    desk(g, cue.toStation - 1, atlas, 'station');
    const u = smooth(p);
    const x = mix(cache[0], hatch[0], u);
    const y = mix(cache[1], hatch[1], u);
    const w = mix(75, 1280, smooth(span(p, 0, .95)));
    const h = mix(42, 500, smooth(span(p, .06, .95)));
    const c = mix(9, 92, u);
    const mask = [[x - w + c, y - h], [x + w - c, y - h], [x + w, y - h + c], [x + w, y + h - c],
      [x + w - c, y + h], [x - w + c, y + h], [x - w, y + h - c], [x - w, y - h + c]];
    if (p > 0) reveal(g, mask, () => station(g, cue.station, sprite, true), amber, .8 * Math.sin(Math.PI * p));
    swapTitle(g, p, () => deskTitle(g, cue.toStation - 1), () => stationTitle(g));
    travel(g, cache, hatch, u, { requested: true }, 25);
  }

  function returnToDesk(g, p, atlas, sprite) {
    station(g, cue.toCache - 1, sprite, true);
    const { x, y, scale } = stationCamera(cue.toCache - 1);
    const exit = [640 + x + (hatch[0] - 640) * scale, 440 + y + (hatch[1] - 440) * scale];
    const edge = mix(-116, W + 116, smooth(p));
    const mask = [[-215, 0], [edge + 92, 0], [edge - 92, H], [-215, H]];
    reveal(g, mask, () => desk(g, cue.return, atlas, 'return'), mint, .75 * Math.sin(Math.PI * p));
    swapTitle(g, p, () => stationTitle(g), () => deskTitle(g, cue.return));
    travel(g, exit, reader, smooth(p), { scale: mix(scale, 1, p) }, 46);
  }

  function unfoldResult(g, p, frame, atlas) {
    desk(g, cue.toResult - 1, atlas, 'result');
    const u = smooth(p);
    const y = mix(cache[1], proof[1], u) - 25 * Math.sin(Math.PI * u);
    const left = mix(cache[0] - 65, -40, out(span(p, .04, .8)));
    const right = mix(cache[0] + 65, W + 40, out(span(p, .04, .8)));
    const h = mix(3, 466, smooth(span(p, .14, .93)));
    const mask = [[left + 24, y - h], [right, y - h], [right - 24, y + h], [left, y + h]];
    reveal(g, mask, () => result(g, frame, true), mint, .75 * Math.sin(Math.PI * p));
    swapTitle(g, p, () => deskTitle(g, cue.toResult - 1), () => resultTitle(g));
    travel(g, cache, proof, u, {}, 25);
  }

  function render(g, frame, atlas, sprite) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    if (frame < cue.toStation) desk(g, frame, atlas);
    else if (frame < cue.station) {
      enterStation(g, span(frame, cue.toStation, cue.station), atlas, sprite);
    } else if (frame < cue.toCache) station(g, frame, sprite);
    else if (frame < cue.return) {
      returnToDesk(g, span(frame, cue.toCache, cue.return), atlas, sprite);
    } else if (frame < cue.toResult) desk(g, frame, atlas);
    else if (frame < cue.result) {
      unfoldResult(g, span(frame, cue.toResult, cue.result), frame, atlas);
    } else result(g, frame);
  }

  globalThis.cacheRouteFilm = { render, actorAt };
})();
