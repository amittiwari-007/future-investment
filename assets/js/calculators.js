/* Future Investment — Financial calculators
   All figures are illustrative estimates. */
(function () {
  "use strict";

  var GOLD = "#DDBB5E", BLUE = "#7EA6E8", GREEN = "#3CC489", AMBER = "#F2B544", RED = "#E8665A";

  /* ---------- Formatting ---------- */
  function inr(n) {
    if (!isFinite(n)) return "—";
    return "₹" + Math.round(n).toLocaleString("en-IN");
  }
  function words(n) {
    var a = Math.abs(n);
    if (a >= 1e7) return "₹" + (n / 1e7).toFixed(2).replace(/\.00$/, "") + " Crore";
    if (a >= 1e5) return "₹" + (n / 1e5).toFixed(2).replace(/\.00$/, "") + " Lakh";
    return inr(n);
  }
  function num(n, d) { return Number(n).toLocaleString("en-IN", { maximumFractionDigits: d == null ? 1 : d }); }
  function pow(a, b) { return Math.pow(a, b); }

  /* ---------- Finance helpers ---------- */
  // Present value of a growing annuity paid at the START of each year
  function growingAnnuityDue(first, r, g, n) {
    if (n <= 0) return 0;
    if (Math.abs(r - g) < 1e-9) return first * n;
    return first * (1 - pow((1 + g) / (1 + r), n)) / (r - g) * (1 + r);
  }
  // Present value of a growing annuity paid at the END of each year
  function growingAnnuity(first, r, g, n) {
    if (n <= 0) return 0;
    if (Math.abs(r - g) < 1e-9) return first * n / (1 + r);
    return first * (1 - pow((1 + g) / (1 + r), n)) / (r - g);
  }
  // Monthly SIP needed to reach a future value
  function sipNeeded(fv, annualRate, years) {
    var i = annualRate / 12, N = Math.round(years * 12);
    if (fv <= 0 || N <= 0) return 0;
    if (i === 0) return fv / N;
    return fv * i / ((pow(1 + i, N) - 1) * (1 + i));
  }

  /* ---------- Field shorthands ---------- */
  function money(id, label, value, min, max, step) { return { id: id, label: label, type: "range", unit: "rs", value: value, min: min, max: max, step: step }; }
  function pct(id, label, value, min, max, step) { return { id: id, label: label, type: "range", unit: "pct", value: value, min: min, max: max, step: step || 0.5 }; }
  function yrs(id, label, value, min, max, unit) { return { id: id, label: label, type: "range", unit: unit || "yr", value: value, min: min, max: max, step: 1 }; }

  /* ---------- Calculator definitions ---------- */
  var CALCS = [
    {
      id: "hlv", title: "HLV Calculator", icon: "shield", short: "Human Life Value — the true economic worth of your income to your family.",
      desc: "Human Life Value (income-replacement method) estimates the present value of the income your family would lose — the ideal minimum life cover.",
      fields: [
        yrs("age", "Your current age", 35, 18, 60, "age"),
        yrs("retire", "Planned retirement age", 60, 40, 75, "age"),
        money("income", "Annual income", 1200000, 100000, 10000000, 50000),
        pct("self", "Spent on your own expenses", 25, 0, 60, 1),
        pct("growth", "Expected yearly income growth", 6, 0, 15),
        pct("rate", "Discount rate (return on corpus)", 8, 3, 14),
        money("cover", "Existing life cover", 2500000, 0, 50000000, 100000),
        money("loans", "Outstanding loans", 1000000, 0, 20000000, 50000)
      ],
      compute: function (v) {
        var n = v.retire - v.age;
        if (n <= 0) return { error: "Retirement age must be greater than your current age." };
        var contrib = v.income * (1 - v.self / 100);
        var hlv = growingAnnuity(contrib, v.rate / 100, v.growth / 100, n);
        var need = hlv + v.loans;
        var gap = Math.max(0, need - v.cover);
        return {
          primary: { label: "Your Human Life Value", value: inr(hlv), sub: words(hlv) },
          rows: [
            ["Earning years left", n + " years"],
            ["Yearly income for family", inr(contrib)],
            ["Add: outstanding loans", inr(v.loans)],
            ["Total protection needed", inr(need)],
            ["Existing cover", inr(v.cover), BLUE],
            ["Additional cover required", inr(gap), GOLD]
          ],
          chart: { type: "donut", parts: [{ label: "Existing cover", value: Math.min(v.cover, need), color: BLUE }, { label: "Cover gap", value: gap, color: GOLD }], center: gap > 0 ? "Gap" : "Covered" },
          note: "Rule of thumb: life cover should be at least 10–15× your annual income."
        };
      }
    },
    {
      id: "sip", title: "SIP Calculator", icon: "trending", short: "See how small monthly investments grow into a big corpus.",
      desc: "Estimate the future value of a monthly Systematic Investment Plan (SIP), with an optional yearly step-up.",
      fields: [
        money("amt", "Monthly investment", 10000, 500, 500000, 500),
        pct("rate", "Expected return (p.a.)", 12, 1, 30),
        yrs("years", "Time period", 15, 1, 40),
        pct("step", "Annual step-up", 0, 0, 25, 1)
      ],
      compute: function (v) {
        var bal = 0, inv = 0, p = v.amt, i = v.rate / 1200;
        for (var y = 0; y < v.years; y++) {
          for (var m = 0; m < 12; m++) { bal = (bal + p) * (1 + i); inv += p; }
          p *= 1 + v.step / 100;
        }
        var gain = bal - inv;
        return {
          primary: { label: "Estimated maturity value", value: inr(bal), sub: words(bal) },
          rows: [["Total invested", inr(inv), BLUE], ["Estimated returns", inr(gain), GOLD], ["Wealth gained", num(bal / inv, 2) + "× your money"]],
          chart: { type: "donut", parts: [{ label: "Invested", value: inv, color: BLUE }, { label: "Returns", value: gain, color: GOLD }], center: "Returns" },
          note: "Mutual fund returns are market-linked and not guaranteed."
        };
      }
    },
    {
      id: "lumpsum", title: "Lumpsum Calculator", icon: "coins", short: "Project the growth of a one-time investment.",
      desc: "Find out what a one-time investment could grow to with the power of compounding.",
      fields: [
        money("amt", "Investment amount", 500000, 10000, 50000000, 10000),
        pct("rate", "Expected return (p.a.)", 12, 1, 30),
        yrs("years", "Time period", 10, 1, 40)
      ],
      compute: function (v) {
        var fv = v.amt * pow(1 + v.rate / 100, v.years), gain = fv - v.amt;
        return {
          primary: { label: "Estimated value", value: inr(fv), sub: words(fv) },
          rows: [["Amount invested", inr(v.amt), BLUE], ["Estimated returns", inr(gain), GOLD], ["Money multiplies", num(fv / v.amt, 2) + "×"]],
          chart: { type: "donut", parts: [{ label: "Invested", value: v.amt, color: BLUE }, { label: "Returns", value: gain, color: GOLD }], center: "Returns" }
        };
      }
    },
    {
      id: "emi", title: "EMI Calculator", icon: "home", short: "Plan home, car or personal loan EMIs.",
      desc: "Calculate your monthly EMI, total interest and total payment for any loan.",
      fields: [
        money("loan", "Loan amount", 3000000, 50000, 50000000, 50000),
        pct("rate", "Interest rate (p.a.)", 8.5, 1, 24, 0.1),
        yrs("years", "Loan tenure", 20, 1, 30)
      ],
      compute: function (v) {
        var n = v.years * 12, i = v.rate / 1200;
        var emi = i === 0 ? v.loan / n : v.loan * i * pow(1 + i, n) / (pow(1 + i, n) - 1);
        var total = emi * n, interest = total - v.loan;
        return {
          primary: { label: "Monthly EMI", value: inr(emi), sub: "for " + n + " months" },
          rows: [["Principal amount", inr(v.loan), BLUE], ["Total interest", inr(interest), GOLD], ["Total payment", inr(total)]],
          chart: { type: "donut", parts: [{ label: "Principal", value: v.loan, color: BLUE }, { label: "Interest", value: interest, color: GOLD }], center: "Interest" },
          note: "Tip: Protect your family from this loan with an adequate term plan."
        };
      }
    },
    {
      id: "inflation", title: "Inflation Calculator", icon: "percent", short: "Know what today's expenses will cost tomorrow.",
      desc: "See how inflation increases future costs and erodes the value of money over time.",
      fields: [
        money("cost", "Current cost / amount", 100000, 1000, 10000000, 1000),
        pct("inf", "Expected inflation (p.a.)", 6, 1, 15),
        yrs("years", "Number of years", 10, 1, 40)
      ],
      compute: function (v) {
        var f = pow(1 + v.inf / 100, v.years), future = v.cost * f, worth = v.cost / f;
        return {
          primary: { label: "Future cost", value: inr(future), sub: "after " + v.years + " years" },
          rows: [["Cost today", inr(v.cost), BLUE], ["Increase due to inflation", inr(future - v.cost), GOLD], ["Today's " + inr(v.cost) + " will be worth", inr(worth)]],
          chart: { type: "donut", parts: [{ label: "Cost today", value: v.cost, color: BLUE }, { label: "Inflation impact", value: future - v.cost, color: GOLD }], center: "Increase" }
        };
      }
    },
    {
      id: "retirement", title: "Retirement Calculator", icon: "sunset", short: "Find the corpus you need for a worry-free retirement.",
      desc: "Estimate your retirement corpus and the monthly SIP needed to build it.",
      fields: [
        yrs("age", "Current age", 30, 18, 60, "age"),
        yrs("retire", "Retirement age", 60, 40, 75, "age"),
        yrs("life", "Life expectancy", 85, 60, 100, "age"),
        money("exp", "Current monthly expenses", 40000, 5000, 500000, 1000),
        pct("inf", "Expected inflation", 6, 2, 12),
        pct("pre", "Return before retirement", 12, 4, 18),
        pct("post", "Return after retirement", 7, 3, 12),
        money("saved", "Current retirement savings", 500000, 0, 50000000, 50000)
      ],
      compute: function (v) {
        var y = v.retire - v.age, m = v.life - v.retire;
        if (y <= 0) return { error: "Retirement age must be greater than your current age." };
        if (m <= 0) return { error: "Life expectancy must be greater than retirement age." };
        var monthly = v.exp * pow(1 + v.inf / 100, y);
        var corpus = growingAnnuityDue(monthly * 12, v.post / 100, v.inf / 100, m);
        var fvSaved = v.saved * pow(1 + v.pre / 100, y);
        var gap = Math.max(0, corpus - fvSaved);
        var sip = sipNeeded(gap, v.pre / 100, y);
        return {
          primary: { label: "Retirement corpus needed", value: inr(corpus), sub: words(corpus) },
          rows: [
            ["Monthly expense at retirement", inr(monthly)],
            ["Years to retire / in retirement", y + " / " + m + " yrs"],
            ["Current savings will grow to", inr(fvSaved), BLUE],
            ["Shortfall to build", inr(gap), GOLD],
            ["Monthly SIP needed", inr(sip)]
          ],
          chart: { type: "donut", parts: [{ label: "From savings", value: Math.min(fvSaved, corpus), color: BLUE }, { label: "Shortfall", value: gap, color: GOLD }], center: gap > 0 ? "Shortfall" : "On track" },
          waExtra: "Monthly SIP needed: " + inr(sip)
        };
      }
    },
    {
      id: "child", title: "Child Education Calculator", icon: "book", short: "Plan for your child's higher education fees.",
      desc: "Education costs rise faster than general inflation. Find out how much to invest for your child's dream course.",
      fields: [
        yrs("cage", "Child's current age", 5, 0, 17, "age"),
        yrs("eage", "Age at higher education", 18, 15, 25, "age"),
        money("cost", "Course cost today", 1500000, 100000, 20000000, 50000),
        pct("inf", "Education inflation", 10, 4, 15),
        pct("rate", "Expected return", 12, 4, 18),
        money("saved", "Already saved for this goal", 100000, 0, 10000000, 10000)
      ],
      compute: function (v) { return goalMath(v.eage - v.cage, v.cost, v.inf, v.rate, v.saved, "Child's age at education must be greater than current age.", "Future education cost"); }
    },
    {
      id: "goal", title: "Goal Calculator", icon: "target", short: "House, car, wedding or travel — plan any life goal.",
      desc: "Plan any financial goal — a home, car, wedding or dream vacation — and see what to invest monthly.",
      fields: [
        money("cost", "Goal cost today", 1000000, 10000, 50000000, 10000),
        yrs("years", "Years to goal", 7, 1, 40),
        pct("inf", "Expected inflation", 6, 0, 15),
        pct("rate", "Expected return", 12, 4, 18),
        money("saved", "Already saved", 0, 0, 10000000, 10000)
      ],
      compute: function (v) { return goalMath(v.years, v.cost, v.inf, v.rate, v.saved, "Years to goal must be at least 1.", "Future goal value"); }
    },
    {
      id: "insurance", title: "Insurance Need Calculator", icon: "umbrella", short: "How much life cover does your family really need?",
      desc: "A needs-based estimate of the life cover your family requires to maintain their lifestyle, clear loans and fund goals.",
      fields: [
        money("exp", "Monthly household expenses", 50000, 5000, 1000000, 1000),
        yrs("years", "Years family needs support", 20, 1, 40),
        pct("inf", "Expected inflation", 6, 2, 12),
        pct("rate", "Return on insurance payout", 7, 3, 12),
        money("loans", "Outstanding loans", 1500000, 0, 50000000, 50000),
        money("goals", "Future goals (education, marriage)", 2500000, 0, 50000000, 50000),
        money("cover", "Existing life cover", 5000000, 0, 100000000, 100000),
        money("savings", "Existing savings & investments", 1000000, 0, 50000000, 50000)
      ],
      compute: function (v) {
        var living = growingAnnuityDue(v.exp * 12, v.rate / 100, v.inf / 100, v.years);
        var need = living + v.loans + v.goals;
        var have = v.cover + v.savings;
        var gap = Math.max(0, need - have);
        return {
          primary: { label: "Additional life cover needed", value: inr(gap), sub: gap > 0 ? words(gap) : "You are adequately covered" },
          rows: [
            ["Family living expenses fund", inr(living)],
            ["Loans + future goals", inr(v.loans + v.goals)],
            ["Total requirement", inr(need)],
            ["Existing cover + savings", inr(have), BLUE],
            ["Protection gap", inr(gap), GOLD]
          ],
          chart: { type: "donut", parts: [{ label: "Already arranged", value: Math.min(have, need), color: BLUE }, { label: "Gap", value: gap, color: GOLD }], center: gap > 0 ? "Gap" : "Covered" }
        };
      }
    },
    {
      id: "bmi", title: "BMI Calculator", icon: "activity", short: "Check your Body Mass Index in seconds.",
      desc: "Body Mass Index is a quick health indicator used by insurers while underwriting health and life policies.",
      fields: [
        { id: "weight", label: "Weight", type: "range", unit: "kg", value: 70, min: 20, max: 200, step: 0.5 },
        { id: "height", label: "Height", type: "range", unit: "cm", value: 170, min: 100, max: 220, step: 1 }
      ],
      compute: function (v) {
        var h = v.height / 100;
        if (h <= 0) return { error: "Please enter a valid height." };
        var bmi = v.weight / (h * h);
        var cat = bmi < 18.5 ? ["Underweight", BLUE] : bmi < 25 ? ["Healthy weight", GREEN] : bmi < 30 ? ["Overweight", AMBER] : ["Obese", RED];
        return {
          primary: { label: "Your BMI", value: num(bmi, 1), sub: "kg/m²" },
          status: { text: cat[0], color: cat[1] },
          rows: [["Healthy weight for your height", num(18.5 * h * h, 1) + " – " + num(24.9 * h * h, 1) + " kg"], ["Category", cat[0], cat[1]]],
          chart: { type: "gauge", min: 12, max: 40, value: bmi, bands: [[18.5, BLUE], [25, GREEN], [30, AMBER], [40, RED]], legend: ["12", "18.5", "25", "30", "40"] },
          note: "WHO adult categories. For Asian Indians, health risks may start at a BMI of 23."
        };
      }
    },
    {
      id: "height", title: "Height & Weight Calculator", icon: "ruler", short: "Find your ideal weight range for your height.",
      desc: "Find your ideal body weight and healthy weight range based on your height and gender.",
      fields: [
        { id: "gender", label: "Gender", type: "seg", options: [["male", "Male"], ["female", "Female"]], value: "male" },
        { id: "height", label: "Height", type: "range", unit: "cm", value: 170, min: 120, max: 220, step: 1 },
        { id: "weight", label: "Current weight", type: "range", unit: "kg", value: 72, min: 25, max: 200, step: 0.5 }
      ],
      compute: function (v) {
        var h = v.height / 100;
        var ideal = (v.gender === "female" ? 45.5 : 50) + 0.91 * (v.height - 152.4);
        var lo = 18.5 * h * h, hi = 24.9 * h * h;
        var diff = v.weight < lo ? v.weight - lo : v.weight > hi ? v.weight - hi : 0;
        var status = diff === 0 ? ["Within healthy range", GREEN] : diff > 0 ? ["Above healthy range by " + num(diff, 1) + " kg", AMBER] : ["Below healthy range by " + num(-diff, 1) + " kg", BLUE];
        var gMin = Math.floor(lo * 0.7), gMax = Math.ceil(hi * 1.35);
        return {
          primary: { label: "Ideal body weight", value: num(Math.max(ideal, lo), 1) + " kg", sub: "Devine formula" },
          status: { text: status[0], color: status[1] },
          rows: [["Healthy weight range", num(lo, 1) + " – " + num(hi, 1) + " kg"], ["Your current weight", num(v.weight, 1) + " kg"], ["Your height", v.height + " cm (" + Math.floor(v.height / 30.48) + "′ " + Math.round((v.height / 2.54) % 12) + "″)"]],
          chart: { type: "gauge", min: gMin, max: gMax, value: v.weight, bands: [[lo, BLUE], [hi, GREEN], [gMax, AMBER]], legend: [gMin + " kg", num(lo, 0), num(hi, 0), gMax + " kg"] }
        };
      }
    },
    {
      id: "age", title: "Age Calculator", icon: "calendar", short: "Exact age in years, months and days.",
      desc: "Calculate exact age in years, months and days — useful for insurance entry age and policy maturity planning.",
      fields: [
        { id: "dob", label: "Date of birth", type: "date", value: "1990-01-15" },
        { id: "asof", label: "Age as on", type: "date", value: "today" }
      ],
      compute: function (v) {
        var from = parseDate(v.dob), to = parseDate(v.asof);
        if (!from || !to) return { error: "Please choose valid dates." };
        if (from > to) return { error: "Date of birth must be before the 'as on' date." };
        var y = to.getUTCFullYear() - from.getUTCFullYear();
        var m = to.getUTCMonth() - from.getUTCMonth();
        var d = to.getUTCDate() - from.getUTCDate();
        if (d < 0) { m--; d += new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 0)).getUTCDate(); }
        if (m < 0) { y--; m += 12; }
        var days = Math.round((to - from) / 864e5);
        var next = new Date(Date.UTC(to.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
        if (next < to) next = new Date(Date.UTC(to.getUTCFullYear() + 1, from.getUTCMonth(), from.getUTCDate()));
        var toNext = Math.round((next - to) / 864e5);
        var weekday = from.toLocaleDateString("en-IN", { weekday: "long", timeZone: "UTC" });
        // Insurance age = age nearer birthday
        var insAge = y + (m > 6 || (m === 6 && d > 0) ? 1 : 0);
        return {
          primary: { label: "Your age", value: y + " yrs", sub: m + " months, " + d + " days" },
          rows: [
            ["Total months", num(y * 12 + m, 0)],
            ["Total weeks", num(Math.floor(days / 7), 0)],
            ["Total days", num(days, 0)],
            ["Born on a", weekday],
            ["Next birthday", toNext === 0 ? "Today! Happy Birthday 🎉" : "in " + toNext + " days"],
            ["Insurance age (nearer birthday)", insAge + " yrs"]
          ],
          note: "Most insurers use ‘age nearer birthday’ — premiums can rise once you cross the half-year mark."
        };
      }
    }
  ];

  function goalMath(n, cost, inf, rate, saved, errMsg, futureLabel) {
    if (n <= 0) return { error: errMsg };
    var future = cost * pow(1 + inf / 100, n);
    var fvSaved = saved * pow(1 + rate / 100, n);
    var gap = Math.max(0, future - fvSaved);
    var sip = sipNeeded(gap, rate / 100, n);
    var lump = gap / pow(1 + rate / 100, n);
    return {
      primary: { label: "Monthly SIP needed", value: inr(sip), sub: "for " + n + " years" },
      rows: [
        [futureLabel, inr(future)],
        ["Existing savings will grow to", inr(fvSaved), BLUE],
        ["Amount still to build", inr(gap), GOLD],
        ["OR one-time investment today", inr(lump)]
      ],
      chart: { type: "donut", parts: [{ label: "From savings", value: Math.min(fvSaved, future), color: BLUE }, { label: "To build", value: gap, color: GOLD }], center: gap > 0 ? "To build" : "Achieved" },
      waExtra: futureLabel + ": " + inr(future)
    };
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function parseDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return null;
    var p = s.split("-");
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return isNaN(d) ? null : d;
  }

  /* ---------- Rendering ---------- */
  var UNIT = {
    rs: { pre: "₹" }, pct: { post: "%" }, yr: { post: "Yrs" }, age: { post: "Yrs" }, kg: { post: "kg" }, cm: { post: "cm" }
  };
  function icon(name) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var grid = document.getElementById("calc-grid");
  var workspace = document.getElementById("calc-workspace");
  if (!grid || !workspace) return;

  grid.innerHTML = CALCS.map(function (c) {
    return '<button type="button" class="calc-card" data-calc="' + c.id + '" aria-controls="calc-workspace">' +
      '<span class="card-icon">' + icon(c.icon) + "</span>" +
      '<span><span class="calc-name">' + c.title + '</span><span class="calc-short">' + c.short + "</span></span>" +
      '<svg class="icon chev" aria-hidden="true"><use href="#i-arrow"/></svg></button>';
  }).join("");

  var current = null, state = {};

  function fieldHTML(f) {
    var fid = "f-" + f.id;
    if (f.type === "seg") {
      return '<div class="field"><div class="field-top"><label>' + f.label + '</label></div><div class="seg" role="group" aria-label="' + f.label + '">' +
        f.options.map(function (o) { return '<button type="button" data-seg="' + f.id + '" data-val="' + o[0] + '" class="' + (state[f.id] === o[0] ? "on" : "") + '" aria-pressed="' + (state[f.id] === o[0]) + '">' + o[1] + "</button>"; }).join("") +
        "</div></div>";
    }
    if (f.type === "date") {
      return '<div class="field form-field"><label for="' + fid + '">' + f.label + '</label><input type="date" id="' + fid + '" data-field="' + f.id + '" value="' + state[f.id] + '" max="2100-12-31"></div>';
    }
    var u = UNIT[f.unit] || {};
    return '<div class="field"><div class="field-top"><label for="' + fid + '">' + f.label + "</label>" +
      '<div class="field-num">' + (u.pre ? "<span>" + u.pre + "</span>" : "") +
      '<input type="number" inputmode="decimal" id="' + fid + '" data-field="' + f.id + '" value="' + state[f.id] + '" min="0" step="' + f.step + '">' +
      (u.post ? "<span>" + u.post + "</span>" : "") + "</div></div>" +
      '<input type="range" data-range="' + f.id + '" min="' + f.min + '" max="' + f.max + '" step="' + f.step + '" value="' + state[f.id] + '" aria-label="' + f.label + '">' +
      "</div>";
  }

  function load(id, scroll) {
    var calc = CALCS.find(function (c) { return c.id === id; }) || CALCS[1];
    current = calc;
    state = {};
    calc.fields.forEach(function (f) { state[f.id] = f.value === "today" ? todayISO() : f.value; });

    grid.querySelectorAll(".calc-card").forEach(function (b) {
      var on = b.getAttribute("data-calc") === calc.id;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    });

    workspace.innerHTML =
      '<div class="calc-panel">' +
        '<div class="calc-inputs">' +
          '<div class="calc-title"><span class="card-icon">' + icon(calc.icon) + "</span><h2>" + calc.title + "</h2></div>" +
          '<p class="calc-desc">' + calc.desc + "</p>" +
          calc.fields.map(fieldHTML).join("") +
          '<button type="button" class="btn btn-outline btn-sm" data-reset>' + icon("refresh") + "Reset values</button>" +
        "</div>" +
        '<div class="calc-results" aria-live="polite"></div>' +
      "</div>";

    workspace.querySelectorAll("input[type=range]").forEach(paintRange);
    render();

    if (history.replaceState) history.replaceState(null, "", "#" + calc.id);
    if (scroll) workspace.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function paintRange(r) {
    var min = +r.min, max = +r.max, val = Math.min(Math.max(+r.value, min), max);
    r.style.setProperty("--p", ((val - min) / (max - min)) * 100 + "%");
  }

  function donut(parts, center) {
    var total = parts.reduce(function (s, p) { return s + Math.max(0, p.value); }, 0) || 1;
    var R = 70, C = 2 * Math.PI * R, offset = 0;
    var arcs = parts.map(function (p) {
      var len = Math.max(0, p.value) / total * C;
      var s = '<circle cx="90" cy="90" r="' + R + '" fill="none" stroke="' + p.color + '" stroke-width="22" stroke-dasharray="' + len + " " + (C - len) + '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 90 90)"/>';
      offset += len;
      return s;
    }).join("");
    var share = Math.round(Math.max(0, parts[parts.length - 1].value) / total * 100);
    if (share === 0) share = 100; // nothing left to build → fully covered
    return '<div class="chart-wrap"><svg class="donut" viewBox="0 0 180 180" role="img" aria-label="' + esc(parts.map(function (p) { return p.label; }).join(" vs ")) + '">' +
      '<circle cx="90" cy="90" r="' + R + '" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="22"/>' + arcs +
      '<text x="90" y="88" text-anchor="middle" fill="#fff" font-size="26" font-family="DM Serif Display, Georgia, serif">' + share + '%</text>' +
      '<text x="90" y="110" text-anchor="middle" fill="#A9B7D0" font-size="12" font-weight="700">' + esc(center || "") + "</text></svg></div>";
  }

  function gauge(g) {
    var span = g.max - g.min, prev = g.min;
    var bands = g.bands.map(function (b) {
      var w = (Math.min(b[0], g.max) - prev) / span * 100; prev = b[0];
      return '<span style="width:' + Math.max(0, w) + "%;background:" + b[1] + '"></span>';
    }).join("");
    var pos = Math.min(Math.max((g.value - g.min) / span, 0), 1) * 100;
    return '<div class="gauge"><div class="gauge-bar">' + bands + '</div><div class="gauge-marker"><i style="left:' + pos + '%"></i></div>' +
      '<div class="gauge-legend">' + g.legend.map(function (l) { return "<span>" + l + "</span>"; }).join("") + "</div></div>";
  }

  function render() {
    var out = workspace.querySelector(".calc-results");
    if (!out || !current) return;
    var res;
    try { res = current.compute(state); } catch (e) { res = { error: "Please check the values entered." }; }

    if (res.error) {
      out.innerHTML = '<div class="result-primary"><div class="label">Check your inputs</div><p style="color:#fff;margin:12px 0 0">' + esc(res.error) + "</p></div>";
      return;
    }

    var html = '<div class="result-primary"><div class="label">' + res.primary.label + '</div><div class="value">' + res.primary.value + '</div><div class="sub">' + (res.primary.sub || "") + "</div>" +
      (res.status ? '<span class="result-status" style="background:' + res.status.color + '22;color:' + res.status.color + '">' + esc(res.status.text) + "</span>" : "") + "</div>";
    if (res.chart && res.chart.type === "donut") html += donut(res.chart.parts, res.chart.center);
    if (res.chart && res.chart.type === "gauge") html += gauge(res.chart);
    html += '<div class="result-rows">' + res.rows.map(function (r) {
      return '<div class="result-row"><span>' + (r[2] ? '<i class="dot" style="background:' + r[2] + '"></i>' : "") + esc(r[0]) + "</span><span>" + esc(r[1]) + "</span></div>";
    }).join("") + "</div>";
    if (res.note) html += '<p class="result-note">' + esc(res.note) + "</p>";

    var summary = "Hi Akhilesh ji, I used the " + current.title + " on your website.\n" +
      res.primary.label + ": " + res.primary.value + "\n" +
      res.rows.slice(0, 4).map(function (r) { return r[0] + ": " + r[1]; }).join("\n") +
      "\n\nI would like to discuss a plan with you.";
    html += '<div class="btn-row">' +
      '<a class="btn btn-gold btn-sm" target="_blank" rel="noopener" href="' + window.FI_waLink(summary) + '">' + icon("whatsapp") + "Discuss this plan</a>" +
      '<button type="button" class="btn btn-outline-light btn-sm" data-book="' + esc(current.title) + ' consultation">' + icon("calendar") + "Book a call</button></div>";
    out.innerHTML = html;
  }

  /* ---------- Events ---------- */
  grid.addEventListener("click", function (e) {
    var b = e.target.closest("[data-calc]");
    if (b) load(b.getAttribute("data-calc"), true);
  });

  var raf = 0;
  function schedule() { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); }

  workspace.addEventListener("input", function (e) {
    var t = e.target;
    if (t.hasAttribute("data-range")) {
      var id = t.getAttribute("data-range");
      state[id] = parseFloat(t.value);
      var numInput = workspace.querySelector('[data-field="' + id + '"]');
      if (numInput) numInput.value = t.value;
      paintRange(t);
      schedule();
    } else if (t.hasAttribute("data-field")) {
      var fid = t.getAttribute("data-field");
      if (t.type === "date") { state[fid] = t.value; schedule(); return; }
      var v = parseFloat(t.value);
      if (isNaN(v) || v < 0) return;
      state[fid] = v;
      var range = workspace.querySelector('[data-range="' + fid + '"]');
      if (range) { range.value = v; paintRange(range); }
      schedule();
    }
  });
  workspace.addEventListener("click", function (e) {
    var seg = e.target.closest("[data-seg]");
    if (seg) {
      state[seg.getAttribute("data-seg")] = seg.getAttribute("data-val");
      seg.parentNode.querySelectorAll("button").forEach(function (b) {
        var on = b === seg; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on));
      });
      render();
    }
    if (e.target.closest("[data-reset]")) load(current.id, false);
  });

  window.addEventListener("hashchange", function () {
    var id = location.hash.slice(1);
    if (id && (!current || id !== current.id) && CALCS.some(function (c) { return c.id === id; })) load(id, true);
  });

  var initial = location.hash.slice(1);
  var known = CALCS.some(function (c) { return c.id === initial; });
  load(known ? initial : "sip", false);
  if (known) setTimeout(function () { workspace.scrollIntoView({ block: "start" }); }, 50);

  // Exposed for testing
  window.FI_CALCS = CALCS;
})();
