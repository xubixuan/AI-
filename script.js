/* =========================================================
   StudyGroo — 프로토타입 스크립트
   ※ 모든 데이터는 메모리에만 저장됩니다 (새로고침 시 초기화).
   ※ AI 조수 응답은 예시 템플릿이며, 실제 서비스에서는
     백엔드(Node.js/Express)를 통해 OpenAI API와 연결됩니다.
   ========================================================= */

/* ---------------------------------------------------------
   0. 초기 상태 & 더미 데이터
   --------------------------------------------------------- */

const state = {
  currentUser: null,

  users: [
    { studentId: "20231234", name: "김민지", email: "minji@univ.ac.kr", password: "1234" }
  ],

  posts: [
    {
      id: "p1",
      subject: "자료구조",
      title: "자료구조 중간고사 대비 스터디",
      goal: "트리/그래프 알고리즘 문제풀이 위주로 매주 화요일 진행",
      capacity: 4,
      authorId: "20231234",
      author: "김민지",
      members: ["20231234"],
      applicants: []
    },
    {
      id: "p2",
      subject: "영어 회화",
      title: "비즈니스 영어 회화 스터디",
      goal: "주 2회 화상 모임으로 실전 회화 연습",
      capacity: 6,
      authorId: "20239999",
      author: "박현우",
      members: ["20239999", "20238888"],
      applicants: []
    },
    {
      id: "p3",
      subject: "알고리즘",
      title: "코딩테스트 알고리즘 스터디",
      goal: "백준 골드 난이도 문제를 매일 1개씩 풀고 리뷰",
      capacity: 5,
      authorId: "20237777",
      author: "이서연",
      members: ["20237777", "20236666", "20235555"],
      applicants: []
    }
  ],

  projects: [
    {
      id: "proj1",
      name: "AI 학습 그룹 매칭 플랫폼",
      subject: "캡스톤디자인",
      deadline: "2026-06-30",
      owner: "20231234",
      members: [
        { id: "20231234", name: "김민지", status: "active" },
        { id: "20239999", name: "박현우", status: "active" },
        { id: "20237777", name: "이서연", status: "pending" }
      ],
      tasks: [
        { id: "t1", title: "요구사항 정의서 작성", assignee: "김민지", due: "2026-06-10", status: "done" },
        { id: "t2", title: "와이어프레임 디자인", assignee: "박현우", due: "2026-06-18", status: "doing" },
        { id: "t3", title: "회원가입/로그인 기능 구현", assignee: "김민지", due: "2026-06-25", status: "doing" },
        { id: "t4", title: "AI 조수 프롬프트 설계", assignee: "이서연", due: "2026-06-20", status: "todo" },
        { id: "t5", title: "발표 자료 제작", assignee: "박현우", due: "2026-06-29", status: "todo" }
      ]
    },
    {
      id: "proj2",
      name: "마케팅 전략 팀 프로젝트",
      subject: "마케팅원론",
      deadline: "2026-06-22",
      owner: "20231234",
      members: [
        { id: "20231234", name: "김민지", status: "active" },
        { id: "20236666", name: "최도윤", status: "active" }
      ],
      tasks: [
        { id: "t6", title: "경쟁사 분석 리포트", assignee: "최도윤", due: "2026-06-16", status: "doing" },
        { id: "t7", title: "SNS 캠페인 기획안", assignee: "김민지", due: "2026-06-21", status: "todo" }
      ]
    }
  ]
};

let selectedProjectId = state.projects[0].id;
let aiMode = null; // 'plan' | 'task' | 'minutes' | null

const TASK_STATUS = {
  todo: "할 일",
  doing: "진행 중",
  done: "완료"
};

/* ---------------------------------------------------------
   1. 공용 유틸
   --------------------------------------------------------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => el.classList.remove("show"), 2200);
}

function uid(prefix) {
  return prefix + Math.random().toString(36).slice(2, 8);
}

function todayISO() {
  return "2026-06-15"; // 데모 기준 오늘 날짜
}

function daysUntil(dateStr) {
  const today = new Date(todayISO());
  const target = new Date(dateStr);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

/* ---------------------------------------------------------
   2. 페이지 내비게이션
   --------------------------------------------------------- */

function showPage(pageId) {
  $$(".page").forEach(p => p.classList.toggle("active", p.id === `page-${pageId}`));
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.page === pageId));

  if (pageId === "board") renderBoard();
  if (pageId === "project") renderProjectPage();
  if (pageId === "mypage") renderMyPage();
}

$$(".tab").forEach(tab => {
  tab.addEventListener("click", () => showPage(tab.dataset.page));
});

$$("[data-goto]").forEach(btn => {
  btn.addEventListener("click", () => showPage(btn.dataset.goto));
});

/* ---------------------------------------------------------
   3. 모달 공용 함수
   --------------------------------------------------------- */

function openOverlay(id) {
  $(`#${id}`).classList.add("open");
}
function closeOverlay(id) {
  $(`#${id}`).classList.remove("open");
}

$$(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", e => {
    if (e.target === overlay) overlay.classList.remove("open");
  });
});

$$("[data-close]").forEach(btn => {
  btn.addEventListener("click", () => closeOverlay(btn.dataset.close));
});

function openGenericModal(html) {
  $("#genericModalContent").innerHTML = html;
  openOverlay("genericModal");
}
function closeGenericModal() {
  closeOverlay("genericModal");
}

/* ---------------------------------------------------------
   4. 인증 (회원가입 / 로그인)
   --------------------------------------------------------- */

const authModal = "authModal";

$("#loginBtn").addEventListener("click", () => {
  switchAuthTab("login");
  openOverlay(authModal);
});
$("#signupBtn").addEventListener("click", () => {
  switchAuthTab("signup");
  openOverlay(authModal);
});

$$(".auth-tab").forEach(tab => {
  tab.addEventListener("click", () => switchAuthTab(tab.dataset.auth));
});

function switchAuthTab(which) {
  $$(".auth-tab").forEach(t => t.classList.toggle("active", t.dataset.auth === which));
  $("#loginForm").hidden = which !== "login";
  $("#signupForm").hidden = which !== "signup";
}

function requireLogin() {
  if (!state.currentUser) {
    toast("로그인이 필요한 기능입니다");
    switchAuthTab("login");
    openOverlay(authModal);
    return false;
  }
  return true;
}

$("#loginForm").addEventListener("submit", e => {
  e.preventDefault();
  const id = $("#loginId").value.trim();
  const pw = $("#loginPw").value;
  const user = state.users.find(u => u.studentId === id && u.password === pw);
  if (!user) {
    toast("학번 또는 비밀번호가 올바르지 않습니다");
    return;
  }
  state.currentUser = user;
  closeOverlay(authModal);
  updateAuthArea();
  toast(`${user.name}님, 환영합니다!`);
  if ($("#page-mypage").classList.contains("active")) renderMyPage();
  if ($("#page-project").classList.contains("active")) renderProjectPage();
});

$("#signupForm").addEventListener("submit", e => {
  e.preventDefault();
  const studentId = $("#signupId").value.trim();
  const name = $("#signupName").value.trim();
  const email = $("#signupEmail").value.trim();
  const pw = $("#signupPw").value;
  const pw2 = $("#signupPw2").value;

  if (!studentId || !name || !email || !pw) {
    toast("모든 항목을 입력해 주세요");
    return;
  }
  if (pw !== pw2) {
    toast("비밀번호가 일치하지 않습니다");
    return;
  }
  if (state.users.some(u => u.studentId === studentId)) {
    toast("이미 가입된 학번입니다");
    return;
  }

  const newUser = { studentId, name, email, password: pw };
  state.users.push(newUser);
  state.currentUser = newUser;
  closeOverlay(authModal);
  updateAuthArea();
  toast("회원가입이 완료되었습니다");
  e.target.reset();
});

function logout() {
  state.currentUser = null;
  updateAuthArea();
  toast("로그아웃되었습니다");
  if ($("#page-mypage").classList.contains("active")) renderMyPage();
}

function updateAuthArea() {
  const area = $("#authArea");
  if (state.currentUser) {
    const initial = state.currentUser.name.charAt(0);
    area.innerHTML = `
      <div class="user-chip">
        <span class="user-chip__avatar">${initial}</span>
        ${state.currentUser.name}님
      </div>
      <button class="btn btn-ghost" id="logoutBtn">로그아웃</button>
    `;
    $("#logoutBtn").addEventListener("click", logout);
  } else {
    area.innerHTML = `
      <button id="loginBtn" class="btn btn-ghost">로그인</button>
      <button id="signupBtn" class="btn btn-primary">회원가입</button>
    `;
    $("#loginBtn").addEventListener("click", () => { switchAuthTab("login"); openOverlay(authModal); });
    $("#signupBtn").addEventListener("click", () => { switchAuthTab("signup"); openOverlay(authModal); });
  }
}

/* ---------------------------------------------------------
   5. 학습 게시판
   --------------------------------------------------------- */

$("#boardSearch").addEventListener("input", renderBoard);

$("#newPostBtn").addEventListener("click", () => {
  if (!requireLogin()) return;
  openGenericModal(`
    <button class="modal__close" data-close="genericModal" aria-label="닫기">×</button>
    <h2>스터디 모집 글 작성</h2>
    <form id="postForm">
      <div class="form-field"><label>과목명</label><input type="text" id="postSubject" required placeholder="예: 자료구조" /></div>
      <div class="form-field"><label>모집 글 제목</label><input type="text" id="postTitle" required placeholder="예: 자료구조 중간고사 대비 스터디" /></div>
      <div class="form-field"><label>모집 인원</label><input type="number" id="postCapacity" min="2" max="20" value="4" required /></div>
      <div class="form-field"><label>학습 목표</label><textarea id="postGoal" rows="3" required placeholder="어떤 내용을, 어떻게 공부할지 적어주세요"></textarea></div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" data-close="genericModal">취소</button>
        <button type="submit" class="btn btn-primary">등록하기</button>
      </div>
    </form>
  `);
  $$('[data-close="genericModal"]').forEach(b => b.addEventListener("click", closeGenericModal));

  $("#postForm").addEventListener("submit", e => {
    e.preventDefault();
    const post = {
      id: uid("p"),
      subject: $("#postSubject").value.trim(),
      title: $("#postTitle").value.trim(),
      goal: $("#postGoal").value.trim(),
      capacity: Number($("#postCapacity").value),
      authorId: state.currentUser.studentId,
      author: state.currentUser.name,
      members: [state.currentUser.studentId],
      applicants: []
    };
    state.posts.unshift(post);
    closeGenericModal();
    renderBoard();
    toast("모집 글이 등록되었습니다");
  });
});

function renderBoard() {
  const query = $("#boardSearch").value.trim().toLowerCase();
  const filtered = state.posts.filter(p =>
    p.subject.toLowerCase().includes(query) || p.title.toLowerCase().includes(query)
  );

  $("#boardCount").textContent = `총 ${filtered.length}개의 스터디`;

  if (filtered.length === 0) {
    $("#boardList").innerHTML = `<div class="empty-state">검색 결과가 없습니다. 다른 과목명으로 검색해 보세요.</div>`;
    return;
  }

  $("#boardList").innerHTML = filtered.map(post => {
    const isFull = post.members.length >= post.capacity;
    const isAuthor = state.currentUser && state.currentUser.studentId === post.authorId;
    const isMember = state.currentUser && post.members.includes(state.currentUser.studentId);
    const hasApplied = state.currentUser && post.applicants.some(a => a.id === state.currentUser.studentId);

    let actionBtn;
    if (isAuthor) {
      actionBtn = `<button class="btn btn-sm btn-outline" data-action="manage" data-id="${post.id}">신청자 관리 (${post.applicants.length})</button>`;
    } else if (isMember) {
      actionBtn = `<button class="btn btn-sm" disabled>참여 중</button>`;
    } else if (hasApplied) {
      actionBtn = `<button class="btn btn-sm" disabled>신청 완료</button>`;
    } else if (isFull) {
      actionBtn = `<button class="btn btn-sm" disabled>모집 마감</button>`;
    } else {
      actionBtn = `<button class="btn btn-sm btn-primary" data-action="apply" data-id="${post.id}">가입 신청</button>`;
    }

    return `
      <article class="study-card">
        <span class="study-card__subject">${escapeHtml(post.subject)}</span>
        <h3>${escapeHtml(post.title)}</h3>
        <p class="study-card__goal">${escapeHtml(post.goal)}</p>
        <div class="study-card__meta">
          <span>모집 ${post.members.length} / ${post.capacity}명</span>
          <span>작성자 ${escapeHtml(post.author)}</span>
        </div>
        <div class="study-card__actions">${actionBtn}</div>
      </article>
    `;
  }).join("");

  $$('[data-action="apply"]', $("#boardList")).forEach(btn => {
    btn.addEventListener("click", () => applyToPost(btn.dataset.id));
  });
  $$('[data-action="manage"]', $("#boardList")).forEach(btn => {
    btn.addEventListener("click", () => openApplicantManager(btn.dataset.id));
  });
}

function applyToPost(postId) {
  if (!requireLogin()) return;
  const post = state.posts.find(p => p.id === postId);
  post.applicants.push({ id: state.currentUser.studentId, name: state.currentUser.name });
  toast("가입 신청을 보냈습니다");
  renderBoard();
}

function openApplicantManager(postId) {
  const post = state.posts.find(p => p.id === postId);
  const rows = post.applicants.length
    ? post.applicants.map(a => `
        <div class="applicant-row" data-applicant="${a.id}">
          <span>${escapeHtml(a.name)} (${escapeHtml(a.id)})</span>
          <div class="applicant-row__actions">
            <button class="btn btn-sm btn-primary" data-decision="accept" data-applicant="${a.id}">수락</button>
            <button class="btn btn-sm btn-danger" data-decision="reject" data-applicant="${a.id}">거절</button>
          </div>
        </div>
      `).join("")
    : `<p class="form-hint">아직 신청자가 없습니다.</p>`;

  openGenericModal(`
    <button class="modal__close" data-close="genericModal" aria-label="닫기">×</button>
    <h2>신청자 관리 · ${escapeHtml(post.title)}</h2>
    <div id="applicantList">${rows}</div>
  `);
  $$('[data-close="genericModal"]').forEach(b => b.addEventListener("click", closeGenericModal));

  $$('[data-decision]', $("#applicantList")).forEach(btn => {
    btn.addEventListener("click", () => {
      const applicantId = btn.dataset.applicant;
      const decision = btn.dataset.decision;
      const applicant = post.applicants.find(a => a.id === applicantId);

      if (decision === "accept" && post.members.length < post.capacity) {
        post.members.push(applicantId);
        toast(`${applicant.name}님을 스터디에 합류시켰습니다`);
      } else if (decision === "accept") {
        toast("모집 인원이 가득 차 합류시킬 수 없습니다");
        return;
      } else {
        toast(`${applicant.name}님의 신청을 거절했습니다`);
      }
      post.applicants = post.applicants.filter(a => a.id !== applicantId);
      openApplicantManager(postId);
      renderBoard();
    });
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* ---------------------------------------------------------
   6. 팀프로젝트 관리
   --------------------------------------------------------- */

$("#newProjectBtn").addEventListener("click", () => {
  if (!requireLogin()) return;
  openGenericModal(`
    <button class="modal__close" data-close="genericModal" aria-label="닫기">×</button>
    <h2>새 프로젝트 만들기</h2>
    <form id="projectForm">
      <div class="form-field"><label>프로젝트명</label><input type="text" id="projName" required placeholder="예: 졸업 작품 - AI 매칭 플랫폼" /></div>
      <div class="form-field"><label>과목명</label><input type="text" id="projSubject" required placeholder="예: 캡스톤디자인" /></div>
      <div class="form-field"><label>마감일</label><input type="date" id="projDeadline" required value="2026-07-15" /></div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" data-close="genericModal">취소</button>
        <button type="submit" class="btn btn-primary">만들기</button>
      </div>
    </form>
  `);
  $$('[data-close="genericModal"]').forEach(b => b.addEventListener("click", closeGenericModal));

  $("#projectForm").addEventListener("submit", e => {
    e.preventDefault();
    const project = {
      id: uid("proj"),
      name: $("#projName").value.trim(),
      subject: $("#projSubject").value.trim(),
      deadline: $("#projDeadline").value,
      owner: state.currentUser.studentId,
      members: [{ id: state.currentUser.studentId, name: state.currentUser.name, status: "active" }],
      tasks: []
    };
    state.projects.unshift(project);
    selectedProjectId = project.id;
    closeGenericModal();
    renderProjectPage();
    toast("프로젝트가 생성되었습니다");
  });
});

$("#projectSelect").addEventListener("change", e => {
  selectedProjectId = e.target.value;
  renderProjectDetail();
});

function renderProjectPage() {
  renderProjectSelect();
  renderProjectDetail();
}

function renderProjectSelect() {
  const select = $("#projectSelect");
  if (state.projects.length === 0) {
    select.innerHTML = `<option>프로젝트 없음</option>`;
    return;
  }
  select.innerHTML = state.projects.map(p =>
    `<option value="${p.id}" ${p.id === selectedProjectId ? "selected" : ""}>${escapeHtml(p.name)}</option>`
  ).join("");
}

function renderProjectDetail() {
  const container = $("#projectDetail");
  const project = state.projects.find(p => p.id === selectedProjectId);

  if (!project) {
    container.innerHTML = `<div class="empty-state">아직 프로젝트가 없습니다. '새 프로젝트'를 만들어 보세요.</div>`;
    return;
  }

  const total = project.tasks.length;
  const done = project.tasks.filter(t => t.status === "done").length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const dday = daysUntil(project.deadline);
  const ddayLabel = dday > 0 ? `D-${dday}` : dday === 0 ? "오늘 마감" : `D+${Math.abs(dday)} (마감 지남)`;

  container.innerHTML = `
    <div class="project-card">
      <div class="project-card__top">
        <div>
          <h2>${escapeHtml(project.name)}</h2>
          <p class="project-card__meta">${escapeHtml(project.subject)} · 마감일 ${project.deadline} (${ddayLabel})</p>
        </div>
        <button class="btn btn-sm btn-outline" id="inviteBtn">+ 팀원 초대</button>
      </div>

      <div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div>
      <p class="progress-label">전체 진행률 ${percent}% (${done} / ${total} 완료)</p>

      <div class="members-row" id="membersRow"></div>

      <div class="kanban">
        ${["todo", "doing", "done"].map(status => `
          <div class="kanban-col" data-status="${status}">
            <div class="kanban-col__head">
              <span class="kanban-col__title">${TASK_STATUS[status]}</span>
              <span class="kanban-col__count">${project.tasks.filter(t => t.status === status).length}</span>
            </div>
            <div class="kanban-col__body" data-status="${status}"></div>
            ${status === "todo" ? `<button class="btn btn-sm btn-primary btn-block" id="addTaskBtn">+ 업무 추가</button>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  `;

  renderMembers(project);
  renderTasks(project);

  $("#inviteBtn").addEventListener("click", () => openInviteModal(project));
  $("#addTaskBtn").addEventListener("click", () => openTaskModal(project));
}

function renderMembers(project) {
  $("#membersRow").innerHTML = project.members.map(m => `
    <div class="member-chip ${m.status === "pending" ? "is-pending" : ""}">
      <span class="member-chip__avatar">${m.name.charAt(0)}</span>
      ${escapeHtml(m.name)}
      <span class="member-chip__status">${m.status === "pending" ? "초대 대기" : "활동 중"}</span>
      ${m.id !== project.owner ? `<button class="member-chip__remove" data-member="${m.id}" title="팀원 삭제">×</button>` : ""}
    </div>
  `).join("");

  $$('[data-member]', $("#membersRow")).forEach(btn => {
    btn.addEventListener("click", () => {
      project.members = project.members.filter(m => m.id !== btn.dataset.member);
      renderProjectDetail();
      toast("팀원을 삭제했습니다");
    });
  });
}

function renderTasks(project) {
  ["todo", "doing", "done"].forEach(status => {
    const body = $(`.kanban-col__body[data-status="${status}"]`);
    const tasks = project.tasks.filter(t => t.status === status);

    if (tasks.length === 0) {
      body.innerHTML = `<p class="form-hint">업무가 없습니다</p>`;
      return;
    }

    body.innerHTML = tasks.map(t => {
      const dday = daysUntil(t.due);
      const overdue = dday < 0 && status !== "done";
      return `
        <div class="task-card">
          <div class="task-card__title">${escapeHtml(t.title)}</div>
          <div class="task-card__meta">
            <span>담당 ${escapeHtml(t.assignee)}</span>
            <span class="${overdue ? "task-card__due--overdue" : ""}">${t.due}${overdue ? " (지연)" : ""}</span>
          </div>
          <div class="task-card__actions">
            ${status !== "todo" ? `<button class="btn btn-sm" data-move="${t.id}" data-to="${prevStatus(status)}">◀ 이전</button>` : ""}
            ${status !== "done" ? `<button class="btn btn-sm btn-primary" data-move="${t.id}" data-to="${nextStatus(status)}">다음 ▶</button>` : ""}
            <button class="btn btn-sm btn-danger" data-delete="${t.id}">삭제</button>
          </div>
        </div>
      `;
    }).join("");
  });

  $$("[data-move]").forEach(btn => {
    btn.addEventListener("click", () => {
      const task = project.tasks.find(t => t.id === btn.dataset.move);
      task.status = btn.dataset.to;
      renderProjectDetail();
    });
  });
  $$("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => {
      project.tasks = project.tasks.filter(t => t.id !== btn.dataset.delete);
      renderProjectDetail();
      toast("업무를 삭제했습니다");
    });
  });
}

function nextStatus(status) {
  return status === "todo" ? "doing" : "done";
}
function prevStatus(status) {
  return status === "done" ? "doing" : "todo";
}

function openTaskModal(project) {
  const memberOptions = project.members.map(m => `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)}</option>`).join("");
  openGenericModal(`
    <button class="modal__close" data-close="genericModal" aria-label="닫기">×</button>
    <h2>업무 추가</h2>
    <form id="taskForm">
      <div class="form-field"><label>업무 내용</label><input type="text" id="taskTitle" required placeholder="예: 발표 자료 제작" /></div>
      <div class="form-field"><label>담당자</label><select id="taskAssignee">${memberOptions}</select></div>
      <div class="form-field"><label>마감일</label><input type="date" id="taskDue" required value="${project.deadline}" /></div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" data-close="genericModal">취소</button>
        <button type="submit" class="btn btn-primary">추가하기</button>
      </div>
    </form>
  `);
  $$('[data-close="genericModal"]').forEach(b => b.addEventListener("click", closeGenericModal));

  $("#taskForm").addEventListener("submit", e => {
    e.preventDefault();
    project.tasks.push({
      id: uid("t"),
      title: $("#taskTitle").value.trim(),
      assignee: $("#taskAssignee").value,
      due: $("#taskDue").value,
      status: "todo"
    });
    closeGenericModal();
    renderProjectDetail();
    toast("업무가 추가되었습니다");
  });
}

function openInviteModal(project) {
  openGenericModal(`
    <button class="modal__close" data-close="genericModal" aria-label="닫기">×</button>
    <h2>팀원 초대</h2>
    <form id="inviteForm">
      <div class="form-field"><label>초대할 팀원 이름</label><input type="text" id="inviteName" required placeholder="이름을 입력하세요" /></div>
      <p class="form-hint">초대된 팀원은 '초대 대기' 상태로 표시되며, 추후 수락 시 활동 중으로 전환됩니다.</p>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" data-close="genericModal">취소</button>
        <button type="submit" class="btn btn-primary">초대하기</button>
      </div>
    </form>
  `);
  $$('[data-close="genericModal"]').forEach(b => b.addEventListener("click", closeGenericModal));

  $("#inviteForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("#inviteName").value.trim();
    project.members.push({ id: uid("u"), name, status: "pending" });
    closeGenericModal();
    renderProjectDetail();
    toast(`${name}님을 초대했습니다`);
  });
}

/* ---------------------------------------------------------
   7. AI 프로젝트 조수 (예시 응답 생성)
   --------------------------------------------------------- */

$$(".ai-action").forEach(btn => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    aiMode = aiMode === mode ? null : mode;
    $$(".ai-action").forEach(b => b.classList.toggle("active", b.dataset.mode === aiMode));

    const placeholders = {
      plan: "예: 캡스톤디자인 졸업작품으로 'AI 학습 매칭 플랫폼'을 만들고 있어요. 6주 일정으로 계획을 세워줘",
      task: "예: 회원 관리, 학습 게시판, 프로젝트 관리, AI 조수 기능이 있는 웹 서비스예요. 4명 팀원에게 업무를 나눠줘",
      minutes: "오늘 회의에서 나온 이야기를 그대로 붙여넣어 주세요. (예: 디자인은 다음 주까지, 발표는 현우가 맡기로 함...)"
    };
    $("#aiInput").placeholder = aiMode ? placeholders[aiMode] : "메시지를 입력하세요";
    $("#aiInput").focus();
  });
});

$("#aiForm").addEventListener("submit", e => {
  e.preventDefault();
  const input = $("#aiInput").value.trim();
  if (!input) return;

  appendAiMessage(input, "user");
  $("#aiInput").value = "";

  setTimeout(() => {
    let response;
    if (aiMode === "plan") response = generatePlan(input);
    else if (aiMode === "task") response = generateTaskSplit(input);
    else if (aiMode === "minutes") response = summarizeMinutes(input);
    else response = generateChatReply(input);

    appendAiMessage(response, "bot");
  }, 250);
});

function appendAiMessage(text, who) {
  const log = $("#aiLog");
  const div = document.createElement("div");
  div.className = `ai-msg ai-msg--${who}`;
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function generatePlan(topic) {
  return [
    `"${topic}" 프로젝트 계획 (예시 6주 일정)`,
    "",
    "1주차 — 기획: 목표와 요구사항 정리, 팀 역할 분담",
    "2주차 — 설계: 화면 구성(와이어프레임), 데이터 구조 설계",
    "3~4주차 — 개발: 핵심 기능 구현 (회원, 매칭/관리, 알림 등)",
    "5주차 — 통합 및 테스트: 기능 연동, 오류 수정, 사용성 점검",
    "6주차 — 마무리: 발표 자료 제작, 시연 준비, 최종 점검",
    "",
    "프로젝트 페이지에서 위 일정을 업무로 등록하고 담당자를 지정해 보세요."
  ].join("\n");
}

function generateTaskSplit(topic) {
  return [
    `"${topic}" 업무 분배 추천`,
    "",
    "기획/문서 담당 — 요구사항 정리, 회의록 관리, 발표 자료 구성",
    "디자인 담당 — 화면 와이어프레임, UI 디자인, 사용자 흐름 정리",
    "개발(프론트) 담당 — 화면 구현, 사용자 입력/출력 처리",
    "개발(백엔드/AI) 담당 — 데이터 저장, API 연동, AI 기능 구현",
    "",
    "각 항목을 프로젝트 페이지의 '업무 추가'로 등록하고, 팀원에게 담당자를 지정해 분업을 명확히 하세요."
  ].join("\n");
}

function summarizeMinutes(text) {
  const lines = text.split(/[\n.!?]/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return "요약할 내용을 입력해 주세요.";

  const actionWords = ["까지", "담당", "맡기로", "해야", "예정", "공유", "준비"];
  const actions = lines.filter(l => actionWords.some(w => l.includes(w)));
  const summary = lines.slice(0, Math.min(3, lines.length));

  let result = "회의록 요약\n\n핵심 내용:\n" + summary.map(l => `· ${l}`).join("\n");
  if (actions.length) {
    result += "\n\n실행 항목 (To-do로 등록 추천):\n" + actions.map(l => `· ${l}`).join("\n");
  }
  return result;
}

function generateChatReply(input) {
  const lower = input.toLowerCase();
  if (input.includes("안녕")) return "안녕하세요! 프로젝트 진행에 도움이 필요하시면 왼쪽의 빠른 작업을 사용해 보세요.";
  if (input.includes("마감") || input.includes("일정")) return "마감일과 업무 현황은 '프로젝트' 페이지의 칸반 보드와 '마이페이지'의 알림에서 확인할 수 있어요.";
  if (input.includes("스터디") || input.includes("매칭")) return "학습 동료를 찾고 있다면 '학습 게시판'에서 과목명으로 검색하거나 모집 글을 직접 올려보세요.";
  if (lower.includes("고마") || lower.includes("감사")) return "도움이 되었다니 다행이에요. 다른 작업이 필요하면 언제든 빠른 작업을 선택해 주세요.";
  return "왼쪽의 '프로젝트 계획 수립', '업무 추천', '회의록 요약' 중 하나를 선택한 뒤 내용을 입력하면 더 정확한 도움을 드릴 수 있어요.";
}

/* ---------------------------------------------------------
   8. 마이페이지
   --------------------------------------------------------- */

function renderMyPage() {
  const container = $("#mypageContent");
  const user = state.currentUser;

  if (!user) {
    container.innerHTML = `
      <div class="empty-state">
        로그인하면 내 정보, 참여 프로젝트, 활동 통계를 확인할 수 있어요.<br/><br/>
        <button class="btn btn-primary" id="mypageLoginBtn">로그인 / 회원가입</button>
      </div>
    `;
    $("#mypageLoginBtn").addEventListener("click", () => {
      switchAuthTab("login");
      openOverlay(authModal);
    });
    return;
  }

  const myProjects = state.projects.filter(p => p.members.some(m => m.name === user.name || m.id === user.studentId));

  // 활동 통계: 프로젝트 전체 업무 중 담당자별 완료/전체 비율
  const contributionMap = {};
  state.projects.forEach(p => p.tasks.forEach(t => {
    if (!contributionMap[t.assignee]) contributionMap[t.assignee] = { total: 0, done: 0 };
    contributionMap[t.assignee].total += 1;
    if (t.status === "done") contributionMap[t.assignee].done += 1;
  }));

  // 알림: 마감 임박(3일 이내) 또는 지연된 업무
  const notifications = [];
  state.projects.forEach(p => p.tasks.forEach(t => {
    if (t.status === "done") return;
    const d = daysUntil(t.due);
    if (d < 0) notifications.push({ urgent: true, text: `[${p.name}] "${t.title}" 마감일이 지났습니다 (담당: ${t.assignee})` });
    else if (d <= 3) notifications.push({ urgent: d <= 1, text: `[${p.name}] "${t.title}" 마감 ${d === 0 ? "오늘" : `D-${d}`} (담당: ${t.assignee})` });
  }));

  container.innerHTML = `
    <div class="mypage-grid">
      <div class="profile-card">
        <div class="profile-card__avatar">${user.name.charAt(0)}</div>
        <h3>${escapeHtml(user.name)}</h3>
        <p class="profile-card__meta">학번 ${escapeHtml(user.studentId)}</p>
        <p class="profile-card__meta">${escapeHtml(user.email)}</p>
      </div>

      <div>
        <div class="mypage-section">
          <h3>참여 프로젝트</h3>
          ${myProjects.length ? `
            <ul class="my-projects-list">
              ${myProjects.map(p => {
                const total = p.tasks.length;
                const done = p.tasks.filter(t => t.status === "done").length;
                return `<li>
                  <div><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.subject)} · 마감 ${p.deadline}</span></div>
                  <span>${total ? Math.round((done / total) * 100) : 0}% 완료</span>
                </li>`;
              }).join("")}
            </ul>
          ` : `<p class="form-hint">아직 참여 중인 프로젝트가 없습니다.</p>`}
        </div>

        <div class="mypage-section">
          <h3>팀원 기여도 (전체 프로젝트 업무 기준)</h3>
          ${Object.keys(contributionMap).length ? Object.entries(contributionMap).map(([name, v]) => {
            const pct = v.total ? Math.round((v.done / v.total) * 100) : 0;
            return `
              <div class="bar-row">
                <span>${escapeHtml(name)}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
                <span class="bar-value">${pct}%</span>
              </div>
            `;
          }).join("") : `<p class="form-hint">등록된 업무가 없습니다.</p>`}
        </div>

        <div class="mypage-section">
          <h3>알림</h3>
          ${notifications.length ? `
            <ul class="notif-list">
              ${notifications.map(n => `<li class="${n.urgent ? "is-urgent" : ""}"><span class="notif-dot"></span>${escapeHtml(n.text)}</li>`).join("")}
            </ul>
          ` : `<p class="form-hint">현재 마감 임박 또는 지연된 업무가 없습니다.</p>`}
        </div>
      </div>
    </div>
  `;
}

/* ---------------------------------------------------------
   9. 초기화
   --------------------------------------------------------- */

renderBoard();
renderProjectPage();
