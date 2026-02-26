/* ══════════════════════════════════════════════════════
   GLOBAL STATE
══════════════════════════════════════════════════════ */
var CURRENT_USER             = null;
var ALL_COMPLAINTS           = [];
var TOAST_SHOWN_THIS_SESSION = false;

var DEPT_MAP = {
    cse:'Computer Science & Engg.', ece:'Electronics & Comm. Engg.',
    eee:'Electrical & Electronics', mech:'Mechanical Engineering',
    civil:'Civil Engineering', admin:'Administration',
    library:'Library', hostel:'Hostel', other:'Other'
};
var CAT_MAP = {
    academic:'Academic Issues', infrastructure:'Infrastructure & Facilities',
    library:'Library Services', hostel:'Hostel & Accommodation',
    transport:'Transportation', canteen:'Canteen & Food Services',
    harassment:'Harassment / Ragging', admin:'Administrative Issues', other:'Other'
};

/* ══════════════════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════════════════ */
function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function showErr(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg; el.style.display = 'block';
    setTimeout(function() { if (el) el.style.display = 'none'; }, 8000);
}

function showOk(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg; el.style.display = 'block';
    setTimeout(function() { if (el) el.style.display = 'none'; }, 10000);
}

function hideMsg(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

/* BUG FIX: clear individual field error when user starts typing */
function clearFieldErr(el) {
    if (el) el.classList.remove('err-field');
}

function markErr(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add('err-field');
    if (el.tagName === 'SELECT') {
        el.scrollIntoView({ behavior:'smooth', block:'nearest' });
    } else {
        el.focus();
    }
}

function clearErrors() {
    var els = document.querySelectorAll('.err-field');
    for (var i = 0; i < els.length; i++) els[i].classList.remove('err-field');
}

function badgeClass(status) {
    if (status === 'Resolved')    return 'badge b-resolved';
    if (status === 'In Progress') return 'badge b-progress';
    return 'badge b-pending';
}

/* ══════════════════════════════════════════════════════
   LOCAL STORAGE — safe wrappers
   BUG FIX: session only stores username, not full user object
══════════════════════════════════════════════════════ */
function getUsers()          { try { return JSON.parse(localStorage.getItem('asti_users')      || '[]');   } catch(e) { return []; } }
function setUsers(a)         { try { localStorage.setItem('asti_users',      JSON.stringify(a)); } catch(e) {} }
function getComplaints()     { try { return JSON.parse(localStorage.getItem('asti_complaints') || '[]');   } catch(e) { return []; } }
function setComplaints(a)    { try { localStorage.setItem('asti_complaints', JSON.stringify(a)); } catch(e) {} }
function getSession()        { try { return localStorage.getItem('asti_session') || ''; } catch(e) { return ''; } }
function setSession(u)       { try { localStorage.setItem('asti_session', u); } catch(e) {} }
function clearSession()      { try { localStorage.removeItem('asti_session'); } catch(e) {} }
function getRemembered()     { try { return localStorage.getItem('asti_remember') || ''; } catch(e) { return ''; } }
function setRemembered(u)    { try { localStorage.setItem('asti_remember', u); } catch(e) {} }
function clearRemembered()   { try { localStorage.removeItem('asti_remember'); } catch(e) {} }
function getSavedPassword()  { try { return localStorage.getItem('asti_saved_pass') || ''; } catch(e) { return ''; } }
function setSavedPassword(p) { try { localStorage.setItem('asti_saved_pass', p); } catch(e) {} }
function clearSavedPassword(){ try { localStorage.removeItem('asti_saved_pass'); } catch(e) {} }
function getNoToast()        { try { return localStorage.getItem('asti_no_toast') === '1'; } catch(e) { return false; } }
function setNoToast()        { try { localStorage.setItem('asti_no_toast', '1'); } catch(e) {} }

/* ══════════════════════════════════════════════════════
   SHOW / HIDE PASSWORD
══════════════════════════════════════════════════════ */
function toggleEye(inputId, iconId) {
    var inp  = document.getElementById(inputId);
    var icon = document.getElementById(iconId);
    if (!inp) return;
    inp.type = (inp.type === 'password') ? 'text' : 'password';
    if (icon) icon.textContent = (inp.type === 'password') ? '👁️' : '🙈';
    inp.focus();
}

function resetPassField(inputId, iconId) {
    var inp  = document.getElementById(inputId);
    var icon = document.getElementById(iconId);
    if (inp)  inp.type = 'password';
    if (icon) icon.textContent = '👁️';
}

/* ══════════════════════════════════════════════════════
   SAVE PASSWORD TOAST
══════════════════════════════════════════════════════ */
function showSaveToast() {
    if (getNoToast() || TOAST_SHOWN_THIS_SESSION) return;
    TOAST_SHOWN_THIS_SESSION = true;
    setTimeout(function() {
        var t = document.getElementById('saveToast');
        if (t) t.classList.add('show');
        setTimeout(function() { toastClose(false); }, 12000);
    }, 1400);
}

function toastAck() {
    if (CURRENT_USER && CURRENT_USER.password) {
        setSavedPassword(CURRENT_USER.password);
        setRemembered(CURRENT_USER.username);
        var cb = document.getElementById('l-remember');
        if (cb) cb.checked = true;
    }
    setNoToast();
    toastClose(false);
}

function toastClose(permanent) {
    if (permanent) setNoToast();
    var t = document.getElementById('saveToast');
    if (t) t.classList.remove('show');
}

/* ══════════════════════════════════════════════════════
   PAGE NAVIGATION
══════════════════════════════════════════════════════ */
function gotoPage(page) {
    document.getElementById('pg-login').classList.add('hidden');
    document.getElementById('pg-register').classList.add('hidden');
    document.getElementById('pg-dash').classList.add('hidden');
    clearErrors();
    var allMsgs = ['login-err','reg-err','reg-ok','c-err','c-ok','t-err'];
    for (var m = 0; m < allMsgs.length; m++) hideMsg(allMsgs[m]);

    if (page === 'login') {
        document.getElementById('pg-login').classList.remove('hidden');
        document.getElementById('userBar').classList.add('hidden');
    } else if (page === 'register') {
        document.getElementById('pg-register').classList.remove('hidden');
        document.getElementById('userBar').classList.add('hidden');
    } else if (page === 'dash') {
        document.getElementById('pg-dash').classList.remove('hidden');
        document.getElementById('userBar').classList.remove('hidden');
    }
}

/* ══════════════════════════════════════════════════════
   REGISTER
══════════════════════════════════════════════════════ */
function doRegister() {
    clearErrors();
    hideMsg('reg-err'); hideMsg('reg-ok');

    var username = document.getElementById('r-user').value.trim();
    var fullName = document.getElementById('r-name').value.trim();
    var email    = document.getElementById('r-email').value.trim();
    var phone    = document.getElementById('r-phone').value.trim();
    var password = document.getElementById('r-pass').value;
    var confirm  = document.getElementById('r-confirm').value;

    if (!username)            { markErr('r-user');    showErr('reg-err', '❌ Username is required.');                         return; }
    if (username.length < 4)  { markErr('r-user');    showErr('reg-err', '❌ Username must be at least 4 characters.');      return; }
    if (/\s/.test(username))  { markErr('r-user');    showErr('reg-err', '❌ Username cannot contain spaces.');               return; }
    if (!fullName)            { markErr('r-name');    showErr('reg-err', '❌ Full name is required.');                        return; }
    if (!email)               { markErr('r-email');   showErr('reg-err', '❌ Email address is required.');                    return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { markErr('r-email'); showErr('reg-err', '❌ Enter a valid email address.'); return; }
    if (!phone)               { markErr('r-phone');   showErr('reg-err', '❌ Phone number is required.');                     return; }
    var digits = phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) { markErr('r-phone'); showErr('reg-err', '❌ Enter a valid phone number (7–15 digits).'); return; }
    if (!password)            { markErr('r-pass');    showErr('reg-err', '❌ Password is required.');                         return; }
    if (password.length < 6)  { markErr('r-pass');    showErr('reg-err', '❌ Password must be at least 6 characters.');      return; }
    if (!confirm)             { markErr('r-confirm'); showErr('reg-err', '❌ Please confirm your password.');                  return; }
    if (password !== confirm)  { markErr('r-confirm'); showErr('reg-err', '❌ Passwords do not match.');                       return; }

    var users = getUsers();
    for (var i = 0; i < users.length; i++) {
        if (users[i].username.toLowerCase() === username.toLowerCase()) {
            markErr('r-user'); showErr('reg-err', '❌ Username "' + esc(username) + '" is already taken.'); return;
        }
        if (users[i].email.toLowerCase() === email.toLowerCase()) {
            markErr('r-email'); showErr('reg-err', '❌ Email "' + esc(email) + '" is already registered.'); return;
        }
    }

    users.push({ username:username, fullName:fullName, email:email, phone:phone, password:password, joinDate:new Date().toISOString() });
    setUsers(users);

    ['r-user','r-name','r-email','r-phone'].forEach(function(id) { document.getElementById(id).value = ''; });
    document.getElementById('r-pass').value    = '';
    document.getElementById('r-confirm').value = '';
    resetPassField('r-pass', 'eye-reg');
    resetPassField('r-confirm', 'eye-conf');

    showOk('reg-ok', '✅ Account created! Redirecting to login...');
    setTimeout(function() {
        hideMsg('reg-ok');
        gotoPage('login');
        document.getElementById('l-user').value = username;
        document.getElementById('l-pass').focus();
    }, 2000);
}

/* ══════════════════════════════════════════════════════
   LOGIN
══════════════════════════════════════════════════════ */
function doLogin() {
    clearErrors();
    hideMsg('login-err');

    var username = document.getElementById('l-user').value.trim();
    var password = document.getElementById('l-pass').value;
    var remember = document.getElementById('l-remember').checked;

    if (!username) { markErr('l-user'); showErr('login-err', '❌ Please enter your username.'); return; }
    if (!password) { markErr('l-pass'); showErr('login-err', '❌ Please enter your password.'); return; }

    var users = getUsers();
    var found  = null;
    for (var i = 0; i < users.length; i++) {
        if (users[i].username.toLowerCase() === username.toLowerCase()) { found = users[i]; break; }
    }

    if (!found) {
        markErr('l-user');
        showErr('login-err', '❌ No account found for "' + esc(username) + '". Please register first.');
        return;
    }
    if (found.password !== password) {
        markErr('l-pass');
        document.getElementById('l-pass').value = '';
        showErr('login-err', '❌ Incorrect password. Please try again.');
        return;
    }

    if (remember) { setRemembered(found.username); setSavedPassword(found.password); }
    else          { clearRemembered(); clearSavedPassword(); }

    resetPassField('l-pass', 'eye-login');
    CURRENT_USER = found;
    setSession(found.username); /* BUG FIX: store only username, not full object */
    document.getElementById('l-user').value = '';
    document.getElementById('l-pass').value = '';
    openDashboard(found);
}

/* ══════════════════════════════════════════════════════
   LOGOUT
══════════════════════════════════════════════════════ */
function doLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    CURRENT_USER             = null;
    ALL_COMPLAINTS           = [];
    TOAST_SHOWN_THIS_SESSION = false;
    clearSession();
    toastClose(false);
    gotoPage('login');
    var rem = getRemembered();
    if (rem) {
        document.getElementById('l-user').value       = rem;
        document.getElementById('l-remember').checked = true;
        var sp = getSavedPassword();
        if (sp) document.getElementById('l-pass').value = sp;
        else    document.getElementById('l-pass').focus();
    } else {
        document.getElementById('l-user').focus();
    }
}

/* ══════════════════════════════════════════════════════
   OPEN DASHBOARD
══════════════════════════════════════════════════════ */
function openDashboard(user) {
    CURRENT_USER = user;
    document.getElementById('userName').textContent  = user.fullName;
    document.getElementById('c-name').value  = user.fullName || '';
    document.getElementById('c-email').value = user.email    || '';
    gotoPage('dash');
    refreshAll();
    showSaveToast();
    showPwTip();
}

/* ══════════════════════════════════════════════════════
   SUBMIT COMPLAINT
   BUG FIX: unique ticket ID check; clear track box on new submission
══════════════════════════════════════════════════════ */
function generateTicketId() {
    var list = getComplaints();
    var existing = {};
    for (var i = 0; i < list.length; i++) existing[list[i].ticketId] = true;
    var tid;
    do {
        tid = 'CMP' + new Date().getFullYear() + String(Math.floor(Math.random() * 900000) + 100000);
    } while (existing[tid]);
    return tid;
}

function doSubmitComplaint() {
    clearErrors();
    hideMsg('c-err'); hideMsg('c-ok');

    if (!CURRENT_USER) { showErr('c-err', '❌ Session expired. Please login again.'); return; }

    var name  = document.getElementById('c-name').value.trim();
    var email = document.getElementById('c-email').value.trim();
    var roll  = document.getElementById('c-roll').value.trim();
    var dept  = document.getElementById('c-dept').value;
    var cat   = document.getElementById('c-cat').value;
    var desc  = document.getElementById('c-desc').value.trim();

    if (!name)  { markErr('c-name');  showErr('c-err', '❌ Full name is required.');             return; }
    if (!email) { markErr('c-email'); showErr('c-err', '❌ Email address is required.');          return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { markErr('c-email'); showErr('c-err', '❌ Enter a valid email address.'); return; }
    if (!roll)  { markErr('c-roll');  showErr('c-err', '❌ Roll No. / Employee ID is required.'); return; }
    if (!dept)  { markErr('c-dept');  showErr('c-err', '❌ Please select a department.');         return; }
    if (!cat)   { markErr('c-cat');   showErr('c-err', '❌ Please select a complaint category.'); return; }
    if (!desc)  { markErr('c-desc');  showErr('c-err', '❌ Please describe your complaint.');     return; }
    if (desc.length < 10) { markErr('c-desc'); showErr('c-err', '❌ Description too short (min. 10 characters).'); return; }

    var now      = new Date();
    var dateStr  = now.toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' });
    var ticketId = generateTicketId();

    var complaint = {
        ticketId: ticketId, username: CURRENT_USER.username,
        name: name, email: email, rollNo: roll,
        department: dept, category: cat, description: desc,
        status: 'Pending', dateStr: dateStr, timestamp: now.toISOString(),
        statusHistory: [{ status:'Pending', date:dateStr }]
    };

    var list = getComplaints();
    list.push(complaint);
    setComplaints(list);

    showOk('c-ok', '✅ Submitted! Ticket ID: ' + ticketId + '  ← Save this to track your complaint.');

    /* Reset only the variable fields; keep name & email from profile */
    document.getElementById('c-roll').value = '';
    document.getElementById('c-dept').value = '';
    document.getElementById('c-cat').value  = '';
    document.getElementById('c-desc').value = '';
    /* Hide any previous track result */
    document.getElementById('trackBox').classList.add('hidden');

    refreshAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════════════════════════════════════════
   TRACK COMPLAINT
   BUG FIX: use .hidden class instead of inline style
══════════════════════════════════════════════════════ */
function doTrack() {
    clearErrors();
    hideMsg('t-err');
    document.getElementById('trackBox').classList.add('hidden');

    var tid = document.getElementById('t-id').value.trim().toUpperCase();
    if (!tid) { markErr('t-id'); showErr('t-err', '❌ Please enter a Ticket ID.'); return; }

    var list  = getComplaints();
    var found = null;
    for (var i = 0; i < list.length; i++) {
        if (list[i].ticketId === tid) { found = list[i]; break; }
    }

    if (!found) {
        markErr('t-id');
        showErr('t-err', '❌ No complaint found for "' + esc(tid) + '". Please check the ID and try again.');
        return;
    }

    var badge = badgeClass(found.status);
    document.getElementById('tr-tid').textContent = found.ticketId;
    document.getElementById('tr-sts').innerHTML   = '<span class="' + badge + '">' + esc(found.status) + '</span>';
    document.getElementById('tr-cat').textContent = CAT_MAP[found.category]    || found.category;
    document.getElementById('tr-dep').textContent = DEPT_MAP[found.department] || found.department;
    document.getElementById('tr-dte').textContent = found.dateStr || found.date || '—';
    document.getElementById('tr-dsc').textContent = found.description;

    document.getElementById('trackBox').classList.remove('hidden');
    document.getElementById('trackBox').scrollIntoView({ behavior:'smooth', block:'nearest' });
}

/* ══════════════════════════════════════════════════════
   DASHBOARD REFRESH
══════════════════════════════════════════════════════ */
function refreshAll() {
    if (!CURRENT_USER) return;
    ALL_COMPLAINTS = getComplaints()
        .filter(function(c) { return c.username === CURRENT_USER.username; })
        .sort(function(a,b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    updateStats();
    renderRecentList();
    renderHistoryTable(ALL_COMPLAINTS);
}

function updateStats() {
    document.getElementById('s-total').textContent = ALL_COMPLAINTS.length;
    document.getElementById('s-pend').textContent  = ALL_COMPLAINTS.filter(function(c){ return c.status === 'Pending'; }).length;
    document.getElementById('s-prog').textContent  = ALL_COMPLAINTS.filter(function(c){ return c.status === 'In Progress'; }).length;
    document.getElementById('s-resv').textContent  = ALL_COMPLAINTS.filter(function(c){ return c.status === 'Resolved'; }).length;
}

function renderRecentList() {
    var div  = document.getElementById('recentList');
    var show = ALL_COMPLAINTS.slice(0, 5);
    if (!show.length) { div.innerHTML = '<div class="empty-msg">No complaints filed yet.</div>'; return; }
    var html = '';
    for (var i = 0; i < show.length; i++) {
        var c       = show[i];
        var preview = esc(c.description.substring(0, 60)) + (c.description.length > 60 ? '…' : '');
        var badge   = badgeClass(c.status);
        html += '<div class="complaint-item">' +
                    '<h4>' + preview + '</h4>' +
                    '<p><strong>Ticket:</strong> ' + esc(c.ticketId) + '</p>' +
                    '<p><strong>Dept:</strong> '   + esc(DEPT_MAP[c.department] || c.department) + '</p>' +
                    '<p><strong>Date:</strong> '   + esc(c.dateStr || c.date) + '</p>' +
                    '<span class="' + badge + '">' + esc(c.status) + '</span>' +
                '</div>';
    }
    div.innerHTML = html;
}

function renderHistoryTable(list) {
    var tbody = document.getElementById('historyBody');
    var empty = document.getElementById('historyEmpty');
    if (!list.length) { tbody.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    var html = '';
    for (var i = 0; i < list.length; i++) {
        var c    = list[i];
        var hist = (c.statusHistory && c.statusHistory.length)
            ? c.statusHistory.slice()
            : [{ status:'Pending', date: c.dateStr || c.date }];
        if (hist[hist.length - 1].status !== c.status) {
            hist.push({ status: c.status, date: c.dateStr || c.date });
        }
        var tl = '';
        for (var j = 0; j < hist.length; j++) {
            var hb = badgeClass(hist[j].status);
            if (j > 0) tl += '<span class="arr">→</span>';
            tl += '<span class="' + hb + '" style="font-size:0.73em;padding:3px 8px;" title="' + esc(hist[j].date) + '">' + esc(hist[j].status) + '</span>';
        }
        var cb = badgeClass(c.status);
        html += '<tr>' +
            '<td style="color:#9191b8;font-size:0.82em;">' + (i+1) + '</td>' +
            '<td class="tid">' + esc(c.ticketId) + '</td>' +
            '<td>' + esc(CAT_MAP[c.category]    || c.category)   + '</td>' +
            '<td>' + esc(DEPT_MAP[c.department] || c.department) + '</td>' +
            '<td style="white-space:nowrap;font-size:0.85em;">' + esc(c.dateStr || c.date) + '</td>' +
            '<td><div class="timeline">' + tl + '</div></td>' +
            '<td><span class="' + cb + '">' + esc(c.status) + '</span></td>' +
        '</tr>';
    }
    tbody.innerHTML = html;
}

function filterComplaints(filter, btn) {
    var btns = document.querySelectorAll('.btn-filter');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
    btn.classList.add('active');
    var filtered = (filter === 'all')
        ? ALL_COMPLAINTS
        : ALL_COMPLAINTS.filter(function(c) { return c.status === filter; });
    renderHistoryTable(filtered);
}

/* ══════════════════════════════════════════════════════
   STARTUP
   BUG FIX: session stores only username; lookup fresh user record
══════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════
   FORGOT PASSWORD
══════════════════════════════════════════════════════ */
function openForgot() {
    document.getElementById('fp-user').value = document.getElementById('l-user').value || '';
    hideMsg('fp-err');
    document.getElementById('fp-result').style.display = 'none';
    document.getElementById('forgotModal').classList.add('show');
    setTimeout(function() { document.getElementById('fp-user').focus(); }, 100);
}

function closeForgot() {
    document.getElementById('forgotModal').classList.remove('show');
    document.getElementById('fp-user').value = '';
    document.getElementById('fp-pw').textContent = '—';
    document.getElementById('fp-result').style.display = 'none';
    hideMsg('fp-err');
}

function closeForgotOutside(e) {
    if (e.target === document.getElementById('forgotModal')) closeForgot();
}

function doForgot() {
    hideMsg('fp-err');
    var username = document.getElementById('fp-user').value.trim();
    if (!username) { markErr('fp-user'); showErr('fp-err', '❌ Please enter your username.'); return; }

    var users = getUsers();
    var found = null;
    for (var i = 0; i < users.length; i++) {
        if (users[i].username.toLowerCase() === username.toLowerCase()) { found = users[i]; break; }
    }

    if (!found) {
        markErr('fp-user');
        showErr('fp-err', '❌ No account found for "' + esc(username) + '". Check the username or register.');
        return;
    }

    document.getElementById('fp-pw').textContent = found.password;
    document.getElementById('fp-result').style.display = 'block';
    document.getElementById('fp-result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function copyPassword() {
    var pw = document.getElementById('fp-pw').textContent;
    if (!pw || pw === '—') return;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(pw).then(function() {
            var btn = document.querySelector('.modal-copy');
            if (btn) { btn.textContent = '✅ Copied!'; setTimeout(function() { btn.textContent = '📋 Copy Password'; }, 2000); }
        });
    } else {
        /* Fallback for older browsers */
        var ta = document.createElement('textarea');
        ta.value = pw; document.body.appendChild(ta);
        ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        var btn = document.querySelector('.modal-copy');
        if (btn) { btn.textContent = '✅ Copied!'; setTimeout(function() { btn.textContent = '📋 Copy Password'; }, 2000); }
    }
}

/* ══════════════════════════════════════════════════════
   PASSWORD TIP BANNER
══════════════════════════════════════════════════════ */
function showPwTip() {
    /* Show once per session, only if user hasn't permanently dismissed */
    try {
        if (localStorage.getItem('asti_tip_dismissed') === '1') return;
    } catch(e) {}
    var banner = document.getElementById('pwTipBanner');
    if (banner) banner.classList.add('show');
}

function dismissTip() {
    var banner = document.getElementById('pwTipBanner');
    if (banner) banner.classList.remove('show');
    try { localStorage.setItem('asti_tip_dismissed', '1'); } catch(e) {}
}

(function init() {
    var savedUsername = getSession();
    if (savedUsername) {
        var users = getUsers();
        for (var i = 0; i < users.length; i++) {
            if (users[i].username === savedUsername) {
                openDashboard(users[i]);
                return;
            }
        }
        clearSession();
    }
    var rem = getRemembered();
    if (rem) {
        document.getElementById('l-user').value       = rem;
        document.getElementById('l-remember').checked = true;
        var sp = getSavedPassword();
        if (sp) document.getElementById('l-pass').value = sp;
        else    document.getElementById('l-pass').focus();
    } else {
        document.getElementById('l-user').focus();
    }
})();
