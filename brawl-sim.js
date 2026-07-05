(function (global) {
  const BALL_R = 18;
  const CENTER = 170;
  const BALL_SPEED = 165;
  const SHIELD_R = 13;
  const HAMMER_R = 15;
  const PROJECTILE_SPEED = 210;
  const HAMMER_SPEED = 220;
  const HAMMER_MIN_OUTBOUND_TIME = 0.42;
  const HAMMER_MAX_WALL_HITS = 3;
  const HAMMER_RETURN_GRAB_RELEASE_DIST = 78;
  const MAX_BATTLE_TIME = 120;
  const DT = 0.033;

  const HEROES = {
    ironman: {
      id: "ironman", name: "Iron Man", abbr: "IM", color: "#c41e2a", hp: 108,
      power: { type: "beam", name: "Unibeam", damage: 14, range: 160, interval: 2.95, windup: 0.4 }
    },
    cap: {
      id: "cap", name: "Captain America", abbr: "CA", color: "#1e4a8c", hp: 115,
      power: {
        type: "shield", name: "Shield Throw", interval: 4.1, windup: 0.35,
        shieldDamage: 8, shieldLife: 2.3, damageReduction: 0.5, buffTime: 5,
        holdDamage: 5, holdInterval: 2.4,
        trailDamage: 1.2, trailLife: 1.2, trailRadius: 18, trailSpacing: 28
      }
    },
    thor: {
      id: "thor", name: "Thor", abbr: "TH", color: "#6b4ce6", hp: 102,
      power: {
        type: "hammer", name: "Mjolnir", interval: 4.6,
        meleeDamage: 4, meleeInterval: 2.3,
        hammerDamage: 7, boomerangRange: 156,
        wallSlamDamage: 3, returnImpactDamage: 3
      }
    },
    hulk: {
      id: "hulk", name: "Hulk", abbr: "HK", color: "#3d8b37", hp: 135,
      power: { type: "touch", name: "Smash", damage: 21, interval: 3.18 }
    },
    spiderman: {
      id: "spiderman", name: "Spider-Man", abbr: "SM", color: "#c81e28", hp: 100, speedMult: 1.35,
      power: { type: "web", name: "Web Barrage", interval: 3.6, webs: 4, webSpeed: 205, webDmg: 5, webLife: 3.2, webR: 20, slow: 1.6 }
    },
    rocket: {
      id: "rocket", name: "Rocket", abbr: "RK", color: "#9a6a33", hp: 96, radius: 12,
      power: { type: "blaster", name: "Blaster & Groot", interval: 1.4, bulletDmg: 6, bulletSpeed: 275, bulletR: 5, bulletLife: 1.6, grootInterval: 8, grootHp: 55 }
    },
    cyclops: {
      id: "cyclops", name: "Cyclops", abbr: "CY", color: "#2166a8", hp: 112,
      power: { type: "spinbeam", name: "Optic Blast", interval: 1, rotSpeed: 1.25, width: 14, damage: 3, hitCd: 0.28 }
    },
    invisiblewoman: {
      id: "invisiblewoman", name: "Invisible Woman", abbr: "IW", color: "#39a4c4", hp: 108,
      power: { type: "force", name: "Force Field", interval: 2.6, range: 150, damage: 5, phaseInterval: 7.5, phaseDuration: 2.4 }
    },
    namor: {
      id: "namor", name: "Namor", abbr: "NM", color: "#2fa07a", hp: 112,
      power: { type: "trident", name: "Trident", interval: 2.8, dmg: 10, tridentSpeed: 245, tridentR: 7, stun: 0.75, maxActive: 8 }
    }
  };

  function regularPoly(cx, cy, radius, sides, rot) {
    const verts = [];
    for (let i = 0; i < sides; i++) {
      const a = rot + (i * 2 * Math.PI) / sides;
      verts.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius });
    }
    return verts;
  }

  function polyEdges(verts, cx, cy) {
    const edges = [];
    for (let i = 0; i < verts.length; i++) {
      const v1 = verts[i];
      const v2 = verts[(i + 1) % verts.length];
      let nx = -(v2.y - v1.y);
      let ny = v2.x - v1.x;
      const len = Math.hypot(nx, ny) || 1;
      nx /= len; ny /= len;
      const mx = (v1.x + v2.x) / 2;
      const my = (v1.y + v2.y) / 2;
      if ((cx - mx) * nx + (cy - my) * ny < 0) { nx = -nx; ny = -ny; }
      edges.push({ px: v1.x, py: v1.y, nx, ny });
    }
    return edges;
  }

  function closestOnSeg(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return { x: x1 + dx * t, y: y1 + dy * t };
  }

  const ARENAS = [
    {
      name: "The Coliseum", kind: "circle", cx: CENTER, cy: CENTER, radius: 150,
      spawn: [{ x: CENTER - 65, y: CENTER - 40 }, { x: CENTER + 65, y: CENTER + 40 }]
    },
    (function () {
      const verts = [{ x: 22, y: 58 }, { x: 318, y: 58 }, { x: 318, y: 282 }, { x: 22, y: 282 }];
      return {
        name: "The Grid", kind: "poly", verts, edges: polyEdges(verts, CENTER, CENTER),
        spawn: [{ x: 78, y: 110 }, { x: 262, y: 230 }]
      };
    })(),
    (function () {
      const verts = [{ x: 22, y: 48 }, { x: 318, y: 48 }, { x: 318, y: 292 }, { x: 22, y: 292 }];
      return {
        name: "The Divide", kind: "poly", verts, edges: polyEdges(verts, CENTER, CENTER),
        obstacles: [{ x1: CENTER, y1: 116, x2: CENTER, y2: 224, t: 7 }],
        spawn: [{ x: 86, y: 98 }, { x: 254, y: 242 }]
      };
    })(),
    (function () {
      const verts = regularPoly(CENTER, CENTER, 156, 6, -Math.PI / 2);
      return {
        name: "The Hive", kind: "poly", verts, edges: polyEdges(verts, CENTER, CENTER),
        spawn: [{ x: CENTER - 58, y: CENTER - 28 }, { x: CENTER + 58, y: CENTER + 28 }]
      };
    })(),
    (function () {
      const verts = regularPoly(CENTER, CENTER, 156, 8, Math.PI / 8);
      return {
        name: "The Octagon", kind: "poly", verts, edges: polyEdges(verts, CENTER, CENTER),
        spawn: [{ x: CENTER - 60, y: CENTER - 30 }, { x: CENTER + 60, y: CENTER + 30 }]
      };
    })()
  ];

  let S = null;

  function getHeroDef(id) { return HEROES[id]; }

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function isFrozen(fighter) {
    return fighter.windup || fighter.recover > 0;
  }

  function hasProjectile(owner, type) {
    return S.projectiles.some((p) => p.owner === owner && p.type === type);
  }

  function hasSummon(owner, type) {
    return S.summons.some((s) => s.owner === owner && s.type === type);
  }

  function getOpponentOf(fighter) {
    return S.fighters.find((f) => f.player !== fighter.player);
  }

  function capHasShield(fighter) {
    return fighter.heroId === "cap" && !hasProjectile(fighter, "shield");
  }

  function pickArena() {
    return ARENAS[Math.floor(Math.random() * ARENAS.length)];
  }

  function bounceOff(obj, nx, ny, speed) {
    const vdot = obj.vx * nx + obj.vy * ny;
    if (vdot < 0) {
      obj.vx -= 2 * vdot * nx;
      obj.vy -= 2 * vdot * ny;
    }
    if (speed != null) {
      const s = Math.hypot(obj.vx, obj.vy) || 1;
      obj.vx = (obj.vx / s) * speed;
      obj.vy = (obj.vy / s) * speed;
    }
  }

  function confineCircle(obj, r, speed) {
    const a = S.arena;
    if (!a) return false;
    let hit = false;

    if (a.kind === "circle") {
      const dx = obj.x - a.cx, dy = obj.y - a.cy;
      const d = Math.hypot(dx, dy);
      const maxD = a.radius - r;
      if (d > maxD && d > 0) {
        obj.x = a.cx + (dx / d) * maxD;
        obj.y = a.cy + (dy / d) * maxD;
        bounceOff(obj, -dx / d, -dy / d, speed);
        hit = true;
      }
    } else if (a.kind === "poly") {
      for (const e of a.edges) {
        const dsign = (obj.x - e.px) * e.nx + (obj.y - e.py) * e.ny;
        if (dsign < r) {
          obj.x += e.nx * (r - dsign);
          obj.y += e.ny * (r - dsign);
          bounceOff(obj, e.nx, e.ny, speed);
          hit = true;
        }
      }
    }

    if (a.obstacles) {
      for (const w of a.obstacles) {
        const c = closestOnSeg(obj.x, obj.y, w.x1, w.y1, w.x2, w.y2);
        const dx = obj.x - c.x, dy = obj.y - c.y;
        const d = Math.hypot(dx, dy);
        const minD = r + w.t;
        if (d < minD) {
          const ux = d > 0.0001 ? dx / d : 1;
          const uy = d > 0.0001 ? dy / d : 0;
          obj.x = c.x + ux * minD;
          obj.y = c.y + uy * minD;
          bounceOff(obj, ux, uy, speed);
          hit = true;
        }
      }
    }

    obj._wallHit = hit;
    return hit;
  }

  function rayToArenaBoundary(x, y, angle) {
    const a = S.arena;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    let best = 400;

    if (a.kind === "circle") {
      const ox = x - a.cx, oy = y - a.cy;
      const b = 2 * (ox * dx + oy * dy);
      const c = ox * ox + oy * oy - a.radius * a.radius;
      const disc = b * b - 4 * c;
      if (disc >= 0) {
        const t = (-b + Math.sqrt(disc)) / 2;
        if (t > 0.5) best = t;
      }
    } else {
      for (const e of a.edges) {
        const ex = e.px + (-e.ny) * 500, ey = e.py + e.nx * 500;
        const sx = e.px, sy = e.py;
        const denom = dx * (sy - ey) - dy * (sx - ex);
        if (Math.abs(denom) < 0.0001) continue;
        const t = ((sx - x) * (sy - ey) - (sy - y) * (sx - ex)) / denom;
        const u = ((sx - x) * dy - (sy - y) * dx) / denom;
        if (t > 0.5 && u >= 0 && u <= 1 && t < best) best = t;
      }
    }
    return { x: x + dx * best, y: y + dy * best, dist: best };
  }

  function fighterSpeed(f) {
    let s = f.speed || BALL_SPEED;
    if (f.slowUntil && f.slowUntil > S.elapsed) s *= 0.5;
    return s;
  }

  function randomVelocity(speed) {
    const s = speed || BALL_SPEED;
    const angle = Math.random() * Math.PI * 2;
    return { vx: Math.cos(angle) * s, vy: Math.sin(angle) * s };
  }

  function resolveCircleWall(ball) {
    confineCircle(ball, ball.radius || BALL_R, fighterSpeed(ball));
  }

  function finishBattle(winner) {
    S.winner = winner;
    S.running = false;
  }

  function dealDamage(attacker, defender, amount) {
    if (!S.running || defender.hp <= 0) return;
    if (defender.invulnUntil && defender.invulnUntil > S.elapsed) return;

    let damage = amount;

    if (defender.shieldBuff && defender.shieldBuff.until > S.elapsed) {
      damage = Math.round(damage * (1 - defender.shieldBuff.reduction));
    }

    if (defender.shield > 0) {
      const blocked = Math.min(defender.shield, damage);
      damage -= blocked;
      defender.shield -= blocked;
    }

    defender.hp = Math.max(0, defender.hp - damage);
    if (defender.hp <= 0) finishBattle(attacker);
  }

  function applySlow(f, dur) {
    f.slowUntil = S.elapsed + dur;
    const s = fighterSpeed(f);
    const cur = Math.hypot(f.vx, f.vy) || 1;
    f.vx = (f.vx / cur) * s;
    f.vy = (f.vy / cur) * s;
  }

  function stunFighter(f, dur) {
    if (f.invulnUntil && f.invulnUntil > S.elapsed) return;
    f.savedVx = f.vx;
    f.savedVy = f.vy;
    f.vx = 0;
    f.vy = 0;
    f.recover = Math.max(f.recover || 0, dur);
  }

  function projHitSummon(proj) {
    for (const s of S.summons) {
      if (s.owner === proj.owner || s.hp == null) continue;
      if (dist(proj, s) <= proj.r + s.radius) {
        s.hp -= proj.dmg || 0;
        return true;
      }
    }
    return false;
  }

  function spawnShieldTrail(owner, x, y) {
    const power = getHeroDef(owner.heroId).power;
    S.shieldTrails.push({
      x, y, r: power.trailRadius,
      until: S.elapsed + power.trailLife,
      owner, hits: {}
    });
  }

  function updateShieldTrails() {
    S.shieldTrails = S.shieldTrails.filter((trail) => trail.until > S.elapsed);
    S.shieldTrails.forEach((trail) => {
      const power = getHeroDef(trail.owner.heroId).power;
      S.fighters.forEach((f) => {
        if (f === trail.owner || f.hp <= 0) return;
        if (dist(trail, f) > trail.r + (f.radius || BALL_R)) return;
        const hitKey = f.player;
        const nextHit = trail.hits[hitKey] || 0;
        if (S.elapsed < nextHit) return;
        dealDamage(trail.owner, f, power.trailDamage);
        trail.hits[hitKey] = S.elapsed + 0.45;
      });
    });
  }

  function catchShield(fighter, proj) {
    const power = getHeroDef(fighter.heroId).power;
    fighter.shieldBuff = { reduction: power.damageReduction, until: S.elapsed + power.buffTime };
    fighter.powerTimer = 0;
    S.projectiles = S.projectiles.filter((p) => p !== proj);
  }

  function launchShield(fighter, target) {
    const dx = target.x - fighter.x;
    const dy = target.y - fighter.y;
    const d = Math.hypot(dx, dy) || 1;
    const power = getHeroDef(fighter.heroId).power;
    S.projectiles.push({
      type: "shield", owner: fighter,
      x: fighter.x, y: fighter.y,
      vx: (dx / d) * PROJECTILE_SPEED, vy: (dy / d) * PROJECTILE_SPEED,
      r: SHIELD_R, life: power.shieldLife, returning: false, hitCd: 0,
      lastTrailX: fighter.x, lastTrailY: fighter.y
    });
  }

  function launchHammer(fighter, target) {
    const dx = target.x - fighter.x;
    const dy = target.y - fighter.y;
    const d = Math.hypot(dx, dy) || 1;
    S.projectiles.push({
      type: "hammer", owner: fighter,
      x: fighter.x, y: fighter.y,
      vx: (dx / d) * HAMMER_SPEED, vy: (dy / d) * HAMMER_SPEED,
      r: HAMMER_R, phase: "outbound", life: 0, hitCd: 0, wallHitCd: 0,
      returnHitCd: 0, wallHits: 0, returnImpactDealt: false, grabbed: null
    });
    fighter.powerTimer = 0;
  }

  function catchHammer(fighter, proj) {
    if (proj.grabbed) proj.grabbed.grabbedBy = null;
    S.projectiles = S.projectiles.filter((p) => p !== proj);
  }

  function releaseHammerGrab(proj) {
    if (!proj.grabbed) return;
    proj.grabbed.grabbedBy = null;
    proj.grabbed = null;
  }

  function launchWebs(fighter) {
    const power = getHeroDef(fighter.heroId).power;
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < power.webs; i++) {
      const a = base + (i * Math.PI * 2) / power.webs;
      S.projectiles.push({
        type: "web", owner: fighter,
        x: fighter.x, y: fighter.y,
        vx: Math.cos(a) * power.webSpeed, vy: Math.sin(a) * power.webSpeed,
        r: power.webR, speed: power.webSpeed, dmg: power.webDmg, slow: power.slow,
        life: power.webLife
      });
    }
  }

  function fireBullet(fighter, opponent) {
    const power = getHeroDef(fighter.heroId).power;
    const dx = opponent.x - fighter.x, dy = opponent.y - fighter.y;
    const d = Math.hypot(dx, dy) || 1;
    S.projectiles.push({
      type: "bullet", owner: fighter,
      x: fighter.x, y: fighter.y,
      vx: (dx / d) * power.bulletSpeed, vy: (dy / d) * power.bulletSpeed,
      r: power.bulletR, speed: power.bulletSpeed, dmg: power.bulletDmg,
      life: power.bulletLife, wallHits: 0
    });
  }

  function spawnGroot(fighter) {
    const power = getHeroDef(fighter.heroId).power;
    S.summons.push({
      type: "groot", owner: fighter,
      x: fighter.x, y: fighter.y, radius: 28, speed: 150,
      hp: power.grootHp, maxHp: power.grootHp,
      until: S.elapsed + 12
    });
  }

  function spinBeamHit(f, opp, power) {
    if (!opp || opp.hp <= 0) return;
    const edge = rayToArenaBoundary(f.x, f.y, f.beamAngle);
    const c = closestOnSeg(opp.x, opp.y, f.x, f.y, edge.x, edge.y);
    const d = Math.hypot(opp.x - c.x, opp.y - c.y);
    if (d <= (opp.radius || BALL_R) + (power.width || 6) * 0.5 && f.beamCd <= 0) {
      dealDamage(f, opp, power.damage);
      f.beamCd = power.hitCd;
    }
  }

  function forceBlast(f, opp, power) {
    if (!opp || opp.hp <= 0) return false;
    const dx = opp.x - f.x, dy = opp.y - f.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > power.range) return false;
    dealDamage(f, opp, power.damage);
    const push = fighterSpeed(opp) * 2.1;
    opp.vx = (dx / d) * push;
    opp.vy = (dy / d) * push;
    return true;
  }

  function launchTrident(fighter, opponent) {
    const power = getHeroDef(fighter.heroId).power;
    const dx = opponent.x - fighter.x, dy = opponent.y - fighter.y;
    const d = Math.hypot(dx, dy) || 1;
    S.projectiles.push({
      type: "trident", owner: fighter,
      x: fighter.x, y: fighter.y,
      vx: (dx / d) * power.tridentSpeed, vy: (dy / d) * power.tridentSpeed,
      r: power.tridentR, speed: power.tridentSpeed, dmg: power.dmg, stun: power.stun
    });
  }

  function updateSummons(dt) {
    S.summons = S.summons.filter((s) => s.until > S.elapsed && (s.hp == null || s.hp > 0));
    S.summons.forEach((s) => {
      const owner = s.owner;
      if (!owner || owner.hp <= 0) { s.until = 0; return; }
      const enemy = getOpponentOf(owner);
      if (!enemy || enemy.hp <= 0) return;

      const ex = enemy.x - owner.x, ey = enemy.y - owner.y;
      const ed = Math.hypot(ex, ey) || 1;
      const gap = (owner.radius || BALL_R) + s.radius + 6;
      const tx = owner.x + (ex / ed) * gap;
      const ty = owner.y + (ey / ed) * gap;
      const dx = tx - s.x, dy = ty - s.y;
      const dd = Math.hypot(dx, dy) || 1;
      const step = Math.min(dd, s.speed * dt);
      s.x += (dx / dd) * step;
      s.y += (dy / dd) * step;
      confineCircle(s, s.radius, null);

      const bx = enemy.x - s.x, by = enemy.y - s.y;
      const bd = Math.hypot(bx, by);
      const minD = s.radius + (enemy.radius || BALL_R);
      if (bd < minD && bd > 0) {
        const nx = bx / bd, ny = by / bd;
        enemy.x = s.x + nx * minD;
        enemy.y = s.y + ny * minD;
        bounceOff(enemy, nx, ny, fighterSpeed(enemy));
      }
    });
  }

  function updateGrabbedFighter(proj, dt) {
    if (!proj.grabbed || proj.grabbed.hp <= 0) return;
    const f = proj.grabbed;
    const speed = Math.hypot(proj.vx, proj.vy) || 1;
    const nx = proj.vx / speed;
    const ny = proj.vy / speed;
    const anchorX = proj.x - nx * ((proj.owner.radius || BALL_R) + proj.r - 4);
    const anchorY = proj.y - ny * ((proj.owner.radius || BALL_R) + proj.r - 4);
    const pull = Math.min(1, 20 * dt);
    f.x += (anchorX - f.x) * pull;
    f.y += (anchorY - f.y) * pull;
    f.vx = proj.vx * 0.55;
    f.vy = proj.vy * 0.55;
    f.grabbedBy = proj;
    resolveCircleWall(f);
  }

  function updateProjectiles(dt) {
    S.projectiles.forEach((proj) => {
      if (proj.type === "shield") {
        proj.hitCd = Math.max(0, proj.hitCd - dt);
        if (proj.returning) {
          const owner = proj.owner;
          const dx = owner.x - proj.x, dy = owner.y - proj.y;
          const d = Math.hypot(dx, dy) || 1;
          proj.vx = (dx / d) * PROJECTILE_SPEED * 1.3;
          proj.vy = (dy / d) * PROJECTILE_SPEED * 1.3;
          if (d < (owner.radius || BALL_R) + SHIELD_R + 4) {
            catchShield(owner, proj);
            return;
          }
        } else {
          proj.life -= dt;
          if (proj.life <= 0) proj.returning = true;
        }
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        if (!proj.returning) confineCircle(proj, proj.r, PROJECTILE_SPEED);
        const power = getHeroDef(proj.owner.heroId).power;
        const trailDx = proj.x - proj.lastTrailX;
        const trailDy = proj.y - proj.lastTrailY;
        if (Math.hypot(trailDx, trailDy) >= power.trailSpacing) {
          spawnShieldTrail(proj.owner, proj.x, proj.y);
          proj.lastTrailX = proj.x;
          proj.lastTrailY = proj.y;
        }
        S.fighters.forEach((f) => {
          if (f === proj.owner || f.hp <= 0 || proj.hitCd > 0) return;
          if (dist(proj, f) <= proj.r + (f.radius || BALL_R)) {
            dealDamage(proj.owner, f, power.shieldDamage);
            proj.hitCd = 0.45;
          }
        });
      }

      if (proj.type === "hammer") {
        proj.hitCd = Math.max(0, proj.hitCd - dt);
        proj.wallHitCd = Math.max(0, proj.wallHitCd - dt);
        proj.returnHitCd = Math.max(0, proj.returnHitCd - dt);
        proj.life += dt;
        const owner = proj.owner;
        if (!owner || owner.hp <= 0) return;
        const power = getHeroDef(owner.heroId).power;

        if (proj.phase === "returning") {
          const dx = owner.x - proj.x, dy = owner.y - proj.y;
          const d = Math.hypot(dx, dy) || 1;
          proj.vx = (dx / d) * HAMMER_SPEED;
          proj.vy = (dy / d) * HAMMER_SPEED;
        }

        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;

        if (proj.phase === "outbound") {
          confineCircle(proj, proj.r, HAMMER_SPEED);
          if (dist(proj, owner) >= power.boomerangRange && proj.life >= HAMMER_MIN_OUTBOUND_TIME) {
            proj.phase = "returning";
          }
        }

        updateGrabbedFighter(proj, dt);

        if (proj.grabbed && proj.grabbed.hp > 0) {
          const g = proj.grabbed;
          const atWall = g._wallHit;
          const returnImpactRange = (owner.radius || BALL_R) + (g.radius || BALL_R) + 1;

          if (atWall && proj.wallHitCd <= 0) {
            dealDamage(owner, g, power.wallSlamDamage);
            proj.wallHitCd = 0.35;
            proj.wallHits += 1;
            if (proj.wallHits >= HAMMER_MAX_WALL_HITS) releaseHammerGrab(proj);
          }

          if (proj.grabbed && proj.phase === "returning" && dist(owner, g) <= returnImpactRange && proj.returnHitCd <= 0) {
            dealDamage(owner, g, power.returnImpactDamage);
            proj.returnHitCd = 0.45;
            proj.returnImpactDealt = true;
          }

          if (proj.grabbed && proj.phase === "returning" && !proj.returnImpactDealt) {
            if (dist(proj, owner) < HAMMER_RETURN_GRAB_RELEASE_DIST && dist(owner, g) > returnImpactRange) {
              releaseHammerGrab(proj);
            }
          }
        }

        if (proj.phase === "returning" && dist(proj, owner) < (owner.radius || BALL_R) + HAMMER_R + 6) {
          catchHammer(owner, proj);
          return;
        }

        S.fighters.forEach((f) => {
          if (f === owner || f.hp <= 0 || proj.hitCd > 0 || f.grabbedBy) return;
          if (dist(proj, f) <= proj.r + (f.radius || BALL_R)) {
            dealDamage(owner, f, power.hammerDamage);
            proj.grabbed = f;
            f.grabbedBy = proj;
            proj.hitCd = 0.35;
          }
        });
      }

      if (proj.type === "web") {
        proj.life -= dt;
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        confineCircle(proj, proj.r, proj.speed);
        if (projHitSummon(proj)) proj.dead = true;
        S.fighters.forEach((f) => {
          if (f === proj.owner || f.hp <= 0 || proj.dead) return;
          if (dist(proj, f) <= proj.r + (f.radius || BALL_R)) {
            dealDamage(proj.owner, f, proj.dmg);
            applySlow(f, proj.slow);
            proj.dead = true;
          }
        });
        if (proj.life <= 0) proj.dead = true;
      }

      if (proj.type === "bullet") {
        proj.life -= dt;
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        if (confineCircle(proj, proj.r, proj.speed)) proj.wallHits += 1;
        if (projHitSummon(proj)) proj.dead = true;
        S.fighters.forEach((f) => {
          if (f === proj.owner || f.hp <= 0 || proj.dead) return;
          if (dist(proj, f) <= proj.r + (f.radius || BALL_R)) {
            dealDamage(proj.owner, f, proj.dmg);
            proj.dead = true;
          }
        });
        if (proj.life <= 0 || proj.wallHits >= 2) proj.dead = true;
      }

      if (proj.type === "trident") {
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        confineCircle(proj, proj.r, proj.speed);
        if (projHitSummon(proj)) proj.dead = true;
        S.fighters.forEach((f) => {
          if (f === proj.owner || f.hp <= 0 || proj.dead) return;
          if (dist(proj, f) <= proj.r + (f.radius || BALL_R)) {
            dealDamage(proj.owner, f, proj.dmg);
            stunFighter(f, proj.stun);
            proj.dead = true;
          }
        });
      }
    });

    S.projectiles = S.projectiles.filter((p) => {
      if (p.dead) return false;
      if (p.type === "shield" && p.returning && p.owner.hp <= 0) return false;
      return true;
    });
  }

  function tryTouchPowers(a, b) {
    [[a, b], [b, a]].forEach(([attacker, defender]) => {
      if (isFrozen(attacker) || defender.hp <= 0) return;
      const power = getHeroDef(attacker.heroId).power;
      const holdingHammer = attacker.heroId !== "thor" || !hasProjectile(attacker, "hammer");

      if (power.type === "touch" && attacker.powerTimer >= power.interval) {
        dealDamage(attacker, defender, power.damage);
        attacker.powerTimer = 0;
        return;
      }

      if (power.type === "shield" && capHasShield(attacker) && attacker.shieldBashTimer >= power.holdInterval) {
        dealDamage(attacker, defender, power.holdDamage);
        attacker.shieldBashTimer = 0;
        return;
      }

      if (power.meleeDamage && holdingHammer && attacker.meleeTimer >= power.meleeInterval) {
        dealDamage(attacker, defender, power.meleeDamage);
        attacker.meleeTimer = 0;
      }
    });
  }

  function resolveBallCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    const minD = (a.radius || BALL_R) + (b.radius || BALL_R);
    let touched = false;

    if (d < minD && d > 0) {
      touched = true;
      const nx = dx / d;
      const ny = dy / d;
      const overlap = minD - d;
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;

      if (a.grabbedBy || b.grabbedBy) return;

      if (!isFrozen(a) && !isFrozen(b)) {
        const dvn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (dvn > 0) {
          a.vx -= dvn * nx;
          a.vy -= dvn * ny;
          b.vx += dvn * nx;
          b.vy += dvn * ny;
        }
        const sa = Math.hypot(a.vx, a.vy) || 1;
        const sb = Math.hypot(b.vx, b.vy) || 1;
        const spA = fighterSpeed(a);
        const spB = fighterSpeed(b);
        a.vx = (a.vx / sa) * spA;
        a.vy = (a.vy / sa) * spA;
        b.vx = (b.vx / sb) * spB;
        b.vy = (b.vy / sb) * spB;
      }
    }

    if (touched) tryTouchPowers(a, b);
  }

  function canStartBeam(attacker, defender) {
    const p = getHeroDef(attacker.heroId).power;
    return p.type === "beam" && dist(attacker, defender) <= p.range;
  }

  function canThrowShield(fighter) {
    if (hasProjectile(fighter, "shield")) return false;
    if (fighter.shieldBuff && fighter.shieldBuff.until > S.elapsed) return false;
    return true;
  }

  function startWindup(attacker, defender, kind) {
    attacker.savedVx = attacker.vx;
    attacker.savedVy = attacker.vy;
    attacker.vx = 0;
    attacker.vy = 0;
    const power = getHeroDef(attacker.heroId).power;
    attacker.windup = { kind: kind || power.type, defender, timeLeft: power.windup || 0.35 };
  }

  function fireBeam(attacker, defender) {
    dealDamage(attacker, defender, getHeroDef(attacker.heroId).power.damage);
    attacker.powerTimer = 0;
  }

  function updateFighterAction(fighter, dt) {
    if (fighter.windup) {
      fighter.windup.timeLeft -= dt;
      if (fighter.windup.timeLeft <= 0) {
        const target = fighter.windup.defender;
        const kind = fighter.windup.kind;
        fighter.windup = null;
        if (S.running && target && target.hp > 0) {
          if (kind === "beam") fireBeam(fighter, target);
          else if (kind === "shield") launchShield(fighter, target);
        }
        fighter.recover = 0.25;
      }
      return;
    }

    if (fighter.recover > 0) {
      fighter.recover -= dt;
      if (fighter.recover <= 0) {
        const sx = fighter.savedVx || 0;
        const sy = fighter.savedVy || 0;
        const speed = Math.hypot(sx, sy);
        const target = fighterSpeed(fighter);
        if (speed < 10) {
          const v = randomVelocity(target);
          fighter.vx = v.vx;
          fighter.vy = v.vy;
        } else {
          fighter.vx = (sx / speed) * target;
          fighter.vy = (sy / speed) * target;
        }
      }
    }
  }

  function battleStep(dt) {
    if (!S.running) return;

    S.elapsed += dt;
    const f1 = S.fighters[0];
    const f2 = S.fighters[1];

    [f1, f2].forEach((fighter) => updateFighterAction(fighter, dt));
    if (!S.running) return;

    [f1, f2].forEach((ball) => {
      if (isFrozen(ball) || ball.grabbedBy) return;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      resolveCircleWall(ball);
    });
    resolveBallCollision(f1, f2);
    if (!S.running) return;

    updateProjectiles(dt);
    if (!S.running) return;

    updateSummons(dt);
    if (!S.running) return;

    updateShieldTrails();
    if (!S.running) return;

    [f1, f2].forEach((fighter) => {
      if (isFrozen(fighter)) return;
      const opponent = fighter === f1 ? f2 : f1;
      const power = getHeroDef(fighter.heroId).power;
      fighter.powerTimer += dt;
      if (power.meleeInterval) fighter.meleeTimer += dt;
      if (power.holdInterval) fighter.shieldBashTimer += dt;

      if (power.type === "beam" && fighter.powerTimer >= power.interval && canStartBeam(fighter, opponent)) {
        startWindup(fighter, opponent, "beam");
      }

      if (power.type === "shield" && fighter.powerTimer >= power.interval && canThrowShield(fighter)) {
        startWindup(fighter, opponent, "shield");
      }

      if (power.type === "hammer" && fighter.powerTimer >= power.interval && !hasProjectile(fighter, "hammer")) {
        launchHammer(fighter, opponent);
      }

      if (power.type === "web" && fighter.powerTimer >= power.interval) {
        launchWebs(fighter);
        fighter.powerTimer = 0;
      }

      if (power.type === "blaster") {
        if (fighter.powerTimer >= power.interval) {
          fireBullet(fighter, opponent);
          fighter.powerTimer = 0;
        }
        fighter.grootTimer += dt;
        if (fighter.grootTimer >= power.grootInterval && !hasSummon(fighter, "groot")) {
          spawnGroot(fighter);
          fighter.grootTimer = 0;
        }
      }

      if (power.type === "spinbeam") {
        fighter.beamAngle += power.rotSpeed * dt;
        fighter.beamCd = Math.max(0, fighter.beamCd - dt);
        spinBeamHit(fighter, opponent, power);
      }

      if (power.type === "force") {
        if (fighter.powerTimer >= power.interval) {
          if (forceBlast(fighter, opponent, power)) fighter.powerTimer = 0;
        }
        fighter.phaseTimer += dt;
        if (fighter.phaseTimer >= power.phaseInterval) {
          fighter.invulnUntil = S.elapsed + power.phaseDuration;
          fighter.phaseTimer = 0;
        }
      }

      if (power.type === "trident" && fighter.powerTimer >= power.interval) {
        const mine = S.projectiles.filter((p) => p.type === "trident" && p.owner === fighter).length;
        if (mine < (power.maxActive || 8)) {
          launchTrident(fighter, opponent);
          fighter.powerTimer = 0;
        }
      }
    });
  }

  function makeFighter(player, heroId, arena) {
    const hero = getHeroDef(heroId);
    const speed = BALL_SPEED * (hero.speedMult || 1);
    const v = randomVelocity(speed);
    const sp = arena.spawn;
    const idx = player === 1 ? 0 : 1;
    return {
      player, heroId,
      hp: hero.hp, maxHp: hero.hp,
      x: sp[idx].x, y: sp[idx].y,
      vx: v.vx, vy: v.vy,
      speed, radius: hero.radius || BALL_R,
      powerTimer: hero.power.interval * 0.5,
      meleeTimer: 0, shieldBashTimer: 0, shield: 0, shieldBuff: null,
      grabbedBy: null, windup: null, recover: 0, savedVx: 0, savedVy: 0,
      slowUntil: 0, invulnUntil: 0, beamAngle: Math.random() * Math.PI * 2,
      beamCd: 0, grootTimer: 0, phaseTimer: 0
    };
  }

  function simBattle(p1HeroId, p2HeroId) {
    const arena = pickArena();
    S = {
      running: true,
      elapsed: 0,
      winner: null,
      arena,
      fighters: [makeFighter(1, p1HeroId, arena), makeFighter(2, p2HeroId, arena)],
      projectiles: [],
      shieldTrails: [],
      summons: []
    };

    while (S.running && S.elapsed < MAX_BATTLE_TIME) {
      battleStep(DT);
    }

    if (S.running) {
      const f1 = S.fighters[0];
      const f2 = S.fighters[1];
      if (f1.hp > f2.hp) S.winner = f1;
      else if (f2.hp > f1.hp) S.winner = f2;
    }

    const result = {
      winnerId: S.winner ? S.winner.heroId : null,
      p1HeroId,
      p2HeroId,
      elapsed: S.elapsed,
      timedOut: !S.winner
    };
    S = null;
    return result;
  }

  function emptyStats() {
    const wins = {};
    const fights = {};
    Object.keys(HEROES).forEach((id) => { wins[id] = 0; fights[id] = 0; });
    return { wins, fights };
  }

  function recordFight(stats, p1, p2, result) {
    stats.fights[p1] += 1;
    stats.fights[p2] += 1;
    if (result.winnerId) stats.wins[result.winnerId] += 1;
    else stats.timeouts = (stats.timeouts || 0) + 1;
  }

  function allMatchupPairs() {
    const ids = Object.keys(HEROES);
    const pairs = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        pairs.push([ids[i], ids[j]]);
      }
    }
    return pairs;
  }

  function buildFightQueue(perPair, count) {
    const queue = [];
    if (perPair) {
      const pairs = allMatchupPairs();
      pairs.forEach(([h1, h2]) => {
        for (let k = 0; k < count; k++) {
          queue.push(k % 2 === 0 ? [h1, h2] : [h2, h1]);
        }
      });
    } else {
      const ids = Object.keys(HEROES);
      for (let i = 0; i < count; i++) {
        let p1 = ids[Math.floor(Math.random() * ids.length)];
        let p2 = ids[Math.floor(Math.random() * ids.length)];
        while (p2 === p1) p2 = ids[Math.floor(Math.random() * ids.length)];
        queue.push([p1, p2]);
      }
    }
    return queue;
  }

  function runBatch(count, options) {
    const perPair = options && options.allMatchups;
    const queue = buildFightQueue(perPair, count);
    const stats = emptyStats();
    stats.timeouts = 0;
    const start = performance.now();

    queue.forEach(([p1, p2]) => {
      recordFight(stats, p1, p2, simBattle(p1, p2));
    });

    return {
      count: queue.length,
      perPair: perPair,
      perPairCount: perPair ? count : null,
      wins: stats.wins,
      fights: stats.fights,
      timeouts: stats.timeouts,
      elapsedMs: Math.round(performance.now() - start)
    };
  }

  function runBatchAsync(count, onProgress, options) {
    return new Promise(function (resolve) {
      const perPair = options && options.allMatchups;
      const queue = buildFightQueue(perPair, count);
      const stats = emptyStats();
      stats.timeouts = 0;
      let done = 0;
      const total = queue.length;
      const start = performance.now();
      const chunk = 30;

      function step() {
        const end = Math.min(done + chunk, total);
        while (done < end) {
          const [p1, p2] = queue[done];
          recordFight(stats, p1, p2, simBattle(p1, p2));
          done += 1;
        }

        if (onProgress) onProgress(done, total);

        if (done >= total) {
          resolve({
            count: total,
            perPair,
            perPairCount: perPair ? count : null,
            wins: stats.wins,
            fights: stats.fights,
            timeouts: stats.timeouts,
            elapsedMs: Math.round(performance.now() - start)
          });
          return;
        }

        setTimeout(step, 0);
      }

      step();
    });
  }

  global.BrawlSim = {
    HEROES,
    allMatchupPairs,
    simBattle,
    runBatch,
    runBatchAsync
  };
})(typeof window !== "undefined" ? window : globalThis);
