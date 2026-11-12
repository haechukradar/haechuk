/*
 * 퀴즈·등급·이적 예측 개인 기록 (브라우저 localStorage에만 저장, 서버 전송 없음)
 * 설정은 Layout이 window.GAME_CONFIG 로 넣어준다 (config/game.mjs)
 */
(function () {
  var KEY = 'fr.game';
  var CFG = window.GAME_CONFIG;
  var DAY = 86400000;

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || '{}');
      return { quiz: s.quiz || {}, predictions: s.predictions || {}, career: s.career || {} };
    } catch (e) {
      return { quiz: {}, predictions: {}, career: {} };
    }
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('game-change'));
  }
  function track(name, params) {
    if (window.track) window.track(name, params);
  }

  // 이번 주(KST, 월요일 시작) 퀴즈 id — scripts/quiz.mjs 의 weekId 와 같은 계산
  function kstWeekId() {
    var k = new Date(Date.now() + 9 * 3600000);
    var dow = (k.getUTCDay() + 6) % 7;
    return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() - dow)).toISOString().slice(0, 10);
  }

  // 퀴즈 id(주 시작 월요일 날짜) → 주 번호
  function weekNo(id) { return Math.round(Date.parse(id) / (7 * DAY)); }

  /**
   * 점수·등급 계산. resolutions: { slug: { result: 'done'|'collapsed'|'expired', at } } (없으면 예측은 대기로 계산)
   */
  function compute(resolutions) {
    var s = load();
    var P = CFG.points;
    var ids = Object.keys(s.quiz).sort();
    var points = 0, quizPoints = 0, streakPoints = 0, predictPoints = 0;
    var run = 0, prevWeek = null, bestRun = 0;
    ids.forEach(function (id) {
      var q = s.quiz[id];
      quizPoints += q.correct * P.correct + (q.done ? P.complete : 0);
      var w = weekNo(id);
      run = prevWeek !== null && w === prevWeek + 1 ? run + 1 : 1;
      prevWeek = w;
      bestRun = Math.max(bestRun, run);
      if (q.done) streakPoints += Math.min(P.streakMax, P.streakStep * (run - 1));
    });
    // 현재 연속 참여: 마지막 참여가 이번 주 또는 지난주일 때만 유지
    var thisWeek = weekNo(kstWeekId());
    var streak = prevWeek !== null && thisWeek - prevWeek <= 1 ? run : 0;

    var pred = { hits: 0, misses: 0, pending: 0, void: 0, list: [] };
    Object.keys(s.predictions).forEach(function (slug) {
      var p = s.predictions[slug];
      var r = resolutions && resolutions[slug];
      var status = 'pending';
      if (r) {
        if (r.result === 'expired') status = 'void';
        else if (Date.parse(p.at) >= Date.parse(r.at)) status = 'void'; // 종료 이후 예측은 무효
        else status = p.pick === r.result ? 'hit' : 'miss';
      }
      if (status === 'hit') { pred.hits++; predictPoints += P.predictHit; }
      else if (status === 'miss') pred.misses++;
      else if (status === 'void') pred.void++;
      else pred.pending++;
      pred.list.push({ slug: slug, pick: p.pick, at: p.at, title: p.title, status: status, result: r && r.result, inferred: r && r.inferred });
    });
    pred.rate = pred.hits + pred.misses ? pred.hits / (pred.hits + pred.misses) : null;
    pred.list.sort(function (a, b) { return Date.parse(b.at) - Date.parse(a.at); });

    // 커리어 퀴즈: 힌트를 적게 쓰고 이름을 직접 입력해 맞힐수록 높은 점수
    var careerPoints = 0, career = { solved: 0, played: 0, list: [] };
    Object.keys(s.career).sort().forEach(function (id) {
      var c = s.career[id];
      if (!c.done) return;
      career.played++;
      var pts = c.correct ? careerScore(c.hints, c.mode) : 0;
      if (c.correct) career.solved++;
      careerPoints += pts;
      career.list.push({ id: id, answer: c.answer, correct: c.correct, hints: c.hints, mode: c.mode, points: pts });
    });
    career.list.reverse();

    points = quizPoints + streakPoints + predictPoints + careerPoints;
    // 최근 퀴즈 정답률 (등급 조건)
    var recent = ids.slice(-CFG.recentQuizzes);
    var rc = 0, rt = 0;
    recent.forEach(function (id) { rc += s.quiz[id].correct; rt += s.quiz[id].total; });
    var acc = rt ? rc / rt : 0;
    var grade = CFG.grades[0], next = null, blocked = null;
    for (var i = 0; i < CFG.grades.length; i++) {
      var g = CFG.grades[i];
      if (points < g.min) { next = g; break; }
      if (g.minAcc && acc < g.minAcc) { blocked = g; next = g; break; }
      grade = g;
    }
    return {
      points: points,
      breakdown: { quiz: quizPoints, streak: streakPoints, predict: predictPoints, career: careerPoints },
      career: career,
      grade: grade,
      next: next,
      blocked: blocked, // 점수는 넘었지만 정답률 기준에 막힌 등급
      accuracy: acc,
      quizzes: ids.map(function (id) { var q = s.quiz[id]; return { id: id, correct: q.correct, total: q.total, done: q.done, title: q.title }; }).reverse(),
      streak: streak,
      bestStreak: bestRun,
      predictions: pred,
    };
  }

  function careerScore(hints, mode) {
    var C = CFG.points.career;
    var p = Math.max(C.min, C.base - C.hintPenalty * (hints || 0));
    return mode === 'input' ? p * C.inputMultiplier : p;
  }

  var before = null;
  function checkGradeUp(resolutions) {
    var now = compute(resolutions).grade.key;
    if (before && before !== now) track('grade_up', { grade: now });
    before = now;
  }

  window.GAME = {
    cfg: CFG,
    state: load,
    compute: compute,
    /** 퀴즈 답 기록 (문제별 1회, 바꿀 수 없음) */
    answer: function (quizId, title, qIndex, choice, isCorrect, total) {
      var s = load();
      var q = s.quiz[quizId] || { title: title, answers: {}, correct: 0, total: total, done: false };
      if (q.answers[qIndex] !== undefined) return q;
      before = before || compute().grade.key;
      q.answers[qIndex] = choice;
      if (isCorrect) q.correct++;
      q.total = total;
      q.done = Object.keys(q.answers).length >= total;
      s.quiz[quizId] = q;
      save(s);
      if (q.done) track('quiz_complete', { quiz_id: quizId, score: q.correct, total: total });
      checkGradeUp();
      return q;
    },
    quizRecord: function (quizId) { return load().quiz[quizId] || null; },
    /** 이적 예측 (이슈당 1회, 종료 전만) */
    predict: function (slug, pick, title) {
      var s = load();
      if (s.predictions[slug]) return s.predictions[slug];
      s.predictions[slug] = { pick: pick, at: new Date().toISOString(), title: title };
      save(s);
      track('prediction_make', { issue_key: slug, pick: pick });
      return s.predictions[slug];
    },
    prediction: function (slug) { return load().predictions[slug] || null; },
    /** 커리어 퀴즈 진행 기록 (힌트 수·답 방식). 답을 낸 뒤(done)에는 바꿀 수 없음 */
    careerRecord: function (id) { return load().career[id] || null; },
    careerUpdate: function (id, patch) {
      var s = load();
      var c = s.career[id] || { hints: 0, mode: 'input', done: false };
      if (c.done) return c;
      if (patch.done) before = before || compute().grade.key;
      for (var k in patch) c[k] = patch[k];
      s.career[id] = c;
      save(s);
      if (c.done) {
        track('career_quiz_answer', { quiz_id: id, correct: !!c.correct, hints: c.hints, mode: c.mode });
        checkGradeUp();
      }
      return c;
    },
    careerScore: careerScore,
    reset: function () { save({ quiz: {}, predictions: {}, career: {} }); },
  };
})();
