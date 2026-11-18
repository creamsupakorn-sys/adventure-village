// ========================================================
// ระบบนิติบุคคล / แอดมิน - Adventure Village (MongoDB API)
// ========================================================

const ADMIN_API_BASE_URL = "/api";
const DEFAULT_PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27400%27%20height=%27250%27%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20fill=%27%23e2e8f0%27/%3E%3Ctext%20x=%2750%25%27%20y=%2750%25%27%20dominant-baseline=%27middle%27%20text-anchor=%27middle%27%20fill=%27%2364748b%27%20font-family=%27sans-serif%27%20font-size=%2720%27%20font-weight=%27bold%27%3EADVENTURE%20VILLAGE%3C/text%3E%3C/svg%3E";

let cachedIssues = [];
let cachedNews = [];
let cachedUsers = [];

let currentFilter = "all";
let currentUserRoleFilter = "all";
let selectedIssueId = null;

// ========================================================
// 1. ฟังก์ชันดึงข้อมูลจาก MongoDB API
// ========================================================

async function fetchIssuesFromDB() {
    try {
        const res = await fetch(`${ADMIN_API_BASE_URL}/issues`);
        if (res.ok) cachedIssues = await res.json();
    } catch (err) {
        console.error("โหลดข้อมูลปัญหาล้มเหลว:", err);
    }
    return cachedIssues;
}

async function fetchNewsFromDB() {
    try {
        const res = await fetch(`${ADMIN_API_BASE_URL}/news`);
        if (res.ok) cachedNews = await res.json();
    } catch (err) {
        console.error("โหลดข้อมูลข่าวล้มเหลว:", err);
    }
    return cachedNews;
}

async function fetchUsersFromDB() {
    try {
        const res = await fetch(`${ADMIN_API_BASE_URL}/users`);
        if (res.ok) cachedUsers = await res.json();
    } catch (err) {
        console.error("โหลดข้อมูลสมาชิกไม่สำเร็จ:", err);
    }
    return cachedUsers;
}

function getStatusThai(status) {
    const map = {
        pending: "รอตรวจสอบ",
        assigned: "มอบหมายแล้ว",
        in_progress: "กำลังซ่อมแซม",
        completed: "แก้ไขเสร็จสิ้น"
    };
    return map[status] || status;
}

function getDefaultReporter() {
    const fn = localStorage.getItem("fullname");
    return fn ? `คุณ ${fn}` : "ลูกบ้าน";
}

function getAdminDisplayName() {
    return localStorage.getItem("adminName") || localStorage.getItem("fullname") || "ปรียา มงคล";
}

// ========================================================
// 2. หน้า ADMIN DASHBOARD (admin-dashboard.html)
// ========================================================

function updateDashboardCounters() {
    const pendingEl = document.getElementById("countPending");
    if (!pendingEl) return;

    const total = cachedIssues.length;
    const pending = cachedIssues.filter(i => i.status === "pending").length;
    const assigned = cachedIssues.filter(i => i.status === "assigned").length;
    const inProgress = cachedIssues.filter(i => i.status === "in_progress").length;
    const completed = cachedIssues.filter(i => i.status === "completed").length;

    pendingEl.textContent = pending;
    document.getElementById("countAssigned").textContent = assigned;
    document.getElementById("countInProgress").textContent = inProgress;
    document.getElementById("countCompleted").textContent = completed;

    document.getElementById("badgeAll").textContent = total;
    document.getElementById("badgePending").textContent = pending;
    document.getElementById("badgeAssigned").textContent = assigned;
    document.getElementById("badgeInProgress").textContent = inProgress;
    document.getElementById("badgeCompleted").textContent = completed;
}

function renderIssuesTable() {
    const tbody = document.getElementById("adminIssuesTbody");
    if (!tbody) return;

    const searchKw = (document.getElementById("adminSearchInput")?.value || "").toLowerCase().trim();
    const catFilter = document.getElementById("adminCategoryFilter")?.value || "all";

    let issues = [...cachedIssues];

    if (currentFilter !== "all") {
        issues = issues.filter(item => item.status === currentFilter);
    }
    if (catFilter !== "all") {
        issues = issues.filter(item => item.category && item.category.includes(catFilter));
    }
    if (searchKw) {
        issues = issues.filter(item =>
            (item.id && item.id.toLowerCase().includes(searchKw)) ||
            (item.description && item.description.toLowerCase().includes(searchKw)) ||
            (item.location && item.location.toLowerCase().includes(searchKw)) ||
            (item.reporterName && item.reporterName.toLowerCase().includes(searchKw))
        );
    }

    if (issues.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="padding:24px; color:#64748b;">ไม่พบรายการปัญหาตามเงื่อนไขที่เลือก</td></tr>`;
        return;
    }

    tbody.innerHTML = issues.map(issue => {
        const reporter = issue.reporterName || getDefaultReporter();
        const techBadge = issue.assignedTech ? ` • 🔧 ${issue.assignedTech}` : "";
        return `
            <tr onclick="openIssueDetailModal('${issue.id}')" title="คลิกเพื่อตรวจสอบและมอบหมายงาน">
                <td>
                    ${issue.description}
                    <span class="issue-time-sub">${issue.createdAt}${techBadge}</span>
                    <span class="mini-status-tag tag-${issue.status}">${getStatusThai(issue.status)}</span>
                </td>
                <td>${issue.category}</td>
                <td>${issue.location || "ไม่ระบุพิกัด"}</td>
                <td>${reporter}</td>
            </tr>
        `;
    }).join("");
}

function filterAdminIssues(status) {
    currentFilter = status;
    document.querySelectorAll("#issuesTabSection .status-pill-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-status") === status);
    });
    renderIssuesTable();
}

async function switchAdminTab(tabName) {
    const isIssues = tabName === "issues";
    const tabIssuesBtn = document.getElementById("tabIssuesBtn");
    const tabNewsBtn = document.getElementById("tabNewsBtn");
    if (!tabIssuesBtn || !tabNewsBtn) return;

    tabIssuesBtn.classList.toggle("active", isIssues);
    tabNewsBtn.classList.toggle("active", !isIssues);
    document.getElementById("issuesTabSection").style.display = isIssues ? "flex" : "none";
    document.getElementById("newsTabSection").style.display = isIssues ? "none" : "flex";
    if (!isIssues) {
        await fetchNewsFromDB();
        renderNewsTable();
    }
}

// ========================================================
// 3. MODAL ตรวจสอบปัญหาและมอบหมายช่าง
// ========================================================

function populateTechnicianDropdown(selectedTech) {
    const select = document.getElementById("modalTechSelect");
    if (!select) return;

    const techs = cachedUsers.filter(u => u.role === "technician");
    select.innerHTML = `<option value="">-- เลือกช่างซ่อมบำรุง --</option>` +
        techs.map(t => {
            const label = `${t.fullname} (${t.houseNo})`;
            const isSelected = selectedTech === label || selectedTech === t.fullname ? "selected" : "";
            return `<option value="${label}" ${isSelected}>${label}</option>`;
        }).join("");
}

function openIssueDetailModal(issueId) {
    const issue = cachedIssues.find(i => i.id === issueId);
    if (!issue) return;

    selectedIssueId = issue.id;
    document.getElementById("modalTitle").textContent = `รายละเอียดปัญหา #${issue.id.slice(-6).toUpperCase()}`;
    document.getElementById("modalIssueImg").src = issue.beforeImg || DEFAULT_PLACEHOLDER_IMG;

    const afterBox = document.getElementById("modalAfterImgBox");
    if (issue.afterImg) {
        afterBox.style.display = "block";
        document.getElementById("modalAfterImg").src = issue.afterImg;
    } else {
        afterBox.style.display = "none";
    }

    document.getElementById("modalIssueDesc").textContent = `${issue.category} : ${issue.description}`;
    document.getElementById("modalIssueInfo").textContent = `📍 ${issue.location || "ไม่ระบุพิกัด"} | 👤 ${issue.reporterName || getDefaultReporter()} | 🕒 ${issue.createdAt}`;

    const chatBox = document.getElementById("modalChatBox");
    if (issue.messages && issue.messages.length > 0) {
        chatBox.style.display = "flex";
        chatBox.innerHTML = issue.messages.map(m => `
            <div class="modal-chat-bubble ${m.sender}">
                <strong>${m.name}</strong> : ${m.text}
                ${m.time ? `<span class="chat-time">🕒 ${m.time}</span>` : ""}
            </div>
        `).join("");
        setTimeout(() => { chatBox.scrollTop = chatBox.scrollHeight; }, 10);
    } else {
        chatBox.style.display = "none";
    }

    populateTechnicianDropdown(issue.assignedTech || "");
    document.getElementById("modalStatusSelect").value = issue.status;
    document.getElementById("modalReplyInput").value = "";

    document.getElementById("issueDetailModal").classList.add("open");
}

async function submitAssignTechnician(event) {
    event.preventDefault();
    if (!selectedIssueId) return;

    const tech = document.getElementById("modalTechSelect").value;
    const status = document.getElementById("modalStatusSelect").value;
    const reply = document.getElementById("modalReplyInput").value.trim();

    const now = new Date();
    const timeStr = `${now.toLocaleDateString("th-TH")} ${now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`;
    const adminName = getAdminDisplayName();
    const stepMap = { pending: 1, assigned: 2, in_progress: 3, completed: 5 };

    const actionLabel = tech
        ? `อัปเดตสถานะ "${getStatusThai(status)}" (ช่าง: ${tech})`
        : `อัปเดตสถานะ "${getStatusThai(status)}"`;

    const payload = {
        assignedTech: tech,
        status: status,
        stepLevel: stepMap[status] || 1,
        newLog: {
            actor: `คุณ${adminName} (นิติบุคคล)`,
            action: actionLabel,
            note: reply
        }
    };

    if (reply) {
        payload.newMessage = {
            sender: "admin",
            name: `คุณ${adminName} (นิติบุคคล)`,
            text: reply,
            time: timeStr
        };
    }

    try {
        const res = await fetch(`${ADMIN_API_BASE_URL}/issues/${selectedIssueId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            await fetchIssuesFromDB();
            updateDashboardCounters();
            renderIssuesTable();
            closeModal("issueDetailModal");
        } else {
            alert("ไม่สามารถบันทึกการอัปเดตลงฐานข้อมูลได้");
        }
    } catch (err) {
        console.error(err);
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
}

// ========================================================
// 4. จัดการประกาศข่าวประชาสัมพันธ์ (MongoDB)
// ========================================================

function handleNewsImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement("canvas");
            const maxWidth = 700;
            const scale = Math.min(1, maxWidth / img.width);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);

            document.getElementById("newsFormPreviewImg").src = compressedDataUrl;
            document.getElementById("newsImageData").value = compressedDataUrl;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function submitNewsPageForm(event) {
    event.preventDefault();
    const editId = document.getElementById("editNewsId").value;
    const content = document.getElementById("newsContentInput").value.trim();
    const image = document.getElementById("newsImageData").value || DEFAULT_PLACEHOLDER_IMG;
    if (!content) return;

    const today = new Date().toLocaleDateString("th-TH");

    try {
        const url = editId ? `${ADMIN_API_BASE_URL}/news/${editId}` : `${ADMIN_API_BASE_URL}/news`;
        const method = editId ? "PUT" : "POST";

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, image, date: today })
        });

        if (res.ok) {
            await fetchNewsFromDB();
            cancelEditNewsCard();
            renderNewsCardsPage();
            showNewsToast("✅ บันทึกข้อมูลลง MongoDB เรียบร้อยแล้ว");
        }
    } catch (err) {
        console.error(err);
        showNewsToast("⚠️ บันทึกข่าวไม่สำเร็จ");
    }
}

function startEditNewsCard(newsId) {
    const news = cachedNews.find(n => n.id === newsId);
    if (!news) return;

    document.getElementById("editNewsId").value = news.id;
    document.getElementById("newsContentInput").value = news.content;
    document.getElementById("newsImageData").value = news.image || DEFAULT_PLACEHOLDER_IMG;
    document.getElementById("newsFormPreviewImg").src = news.image || DEFAULT_PLACEHOLDER_IMG;
    document.getElementById("newsPreviewDate").textContent = `ลง ณ วันที่ ${news.date}`;

    document.getElementById("newsEditorTitle").textContent = "✏️ แก้ไขประกาศข่าวประชาสัมพันธ์";
    document.getElementById("submitNewsBtn").innerHTML = "<span>💾 บันทึกการแก้ไข</span>";
    document.getElementById("cancelEditNewsBtn").style.display = "inline-flex";

    document.getElementById("newsEditorSection")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function cancelEditNewsCard() {
    const editIdEl = document.getElementById("editNewsId");
    if (!editIdEl) return;

    editIdEl.value = "";
    document.getElementById("newsContentInput").value = "";
    document.getElementById("newsImageData").value = DEFAULT_PLACEHOLDER_IMG;
    document.getElementById("newsFormPreviewImg").src = DEFAULT_PLACEHOLDER_IMG;
    document.getElementById("newsPreviewDate").textContent = `ลง ณ วันที่ ${new Date().toLocaleDateString("th-TH")}`;

    const fileInput = document.getElementById("newsFileInput");
    if (fileInput) fileInput.value = "";

    document.getElementById("newsEditorTitle").textContent = "📢 สร้างประกาศข่าวประชาสัมพันธ์ใหม่";
    document.getElementById("submitNewsBtn").innerHTML = "<span>+ โพสต์ประกาศข่าว</span>";
    document.getElementById("cancelEditNewsBtn").style.display = "none";
}

async function deleteNewsCard(newsId, btnEl) {
    if (btnEl && btnEl.dataset.confirmed !== "true") {
        btnEl.dataset.confirmed = "true";
        btnEl.textContent = "⚠️ กดอีกครั้งเพื่อยืนยันลบ";
        setTimeout(() => {
            if (btnEl) {
                btnEl.dataset.confirmed = "false";
                btnEl.textContent = "🗑️ ลบ";
            }
        }, 3000);
        return;
    }

    try {
        const res = await fetch(`${ADMIN_API_BASE_URL}/news/${newsId}`, { method: "DELETE" });
        if (res.ok) {
            await fetchNewsFromDB();
            renderNewsCardsPage();
            renderNewsTable();
        }
    } catch (err) {
        console.error(err);
    }
}

// ========================================================
// 4.1 จัดการเทมเพลตประกาศข่าว
// ========================================================

function getNewsTemplates() {
    const saved = localStorage.getItem("village_news_templates");
    if (!saved) return [];
    try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function saveNewsTemplates(list) {
    localStorage.setItem("village_news_templates", JSON.stringify(list));
}

function showNewsToast(message) {
    const toast = document.getElementById("newsToastMsg");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}

function saveNewsCardAsTemplate(newsId, btnEl) {
    const news = cachedNews.find(n => n.id === newsId);
    if (!news) return;

    const templates = getNewsTemplates();
    const isDuplicate = templates.some(
        t => t.content.trim() === news.content.trim() && (t.image || "") === (news.image || "")
    );

    if (isDuplicate) {
        if (btnEl) {
            const oldText = btnEl.textContent;
            btnEl.textContent = "⚠️ มีในเทมเพลตแล้ว";
            setTimeout(() => { btnEl.textContent = oldText; }, 2200);
        }
        showNewsToast("⚠️ ประกาศนี้ถูกบันทึกเป็นเทมเพลตไว้แล้ว");
        return;
    }

    templates.unshift({
        id: "TPL-" + Date.now(),
        content: news.content,
        image: news.image || DEFAULT_PLACEHOLDER_IMG
    });

    saveNewsTemplates(templates);
    renderNewsTemplates();
    if (btnEl) {
        btnEl.textContent = "✅ บันทึกเทมเพลตแล้ว";
        setTimeout(() => {
            if (btnEl) btnEl.textContent = "💾 บันทึกเป็นเทมเพลต";
        }, 2500);
    }
    showNewsToast("💾 บันทึกประกาศข่าวเป็นเทมเพลตเรียบร้อยแล้ว");
}

function saveEditorAsTemplate() {
    const contentEl = document.getElementById("newsContentInput");
    const content = contentEl ? contentEl.value.trim() : "";
    const image = document.getElementById("newsImageData")?.value || DEFAULT_PLACEHOLDER_IMG;

    if (!content) {
        if (contentEl) {
            contentEl.style.borderColor = "#dc2626";
            contentEl.focus();
            setTimeout(() => { contentEl.style.borderColor = ""; }, 2000);
        }
        return;
    }

    const templates = getNewsTemplates();
    templates.unshift({
        id: "TPL-" + Date.now(),
        content: content,
        image: image
    });

    saveNewsTemplates(templates);
    renderNewsTemplates();
    showNewsToast("💾 บันทึกเทมเพลตใหม่เรียบร้อยแล้ว");
}

function useNewsTemplate(templateId) {
    const tpl = getNewsTemplates().find(t => t.id === templateId);
    if (!tpl) return;

    document.getElementById("editNewsId").value = "";
    document.getElementById("newsContentInput").value = tpl.content;
    document.getElementById("newsImageData").value = tpl.image || DEFAULT_PLACEHOLDER_IMG;
    document.getElementById("newsFormPreviewImg").src = tpl.image || DEFAULT_PLACEHOLDER_IMG;
    document.getElementById("newsPreviewDate").textContent = `ลง ณ วันที่ ${new Date().toLocaleDateString("th-TH")}`;

    document.getElementById("newsEditorTitle").textContent = "📢 สร้างประกาศจากเทมเพลต (ปรับวันที่/ข้อความแล้วกดโพสต์ได้เลย)";
    document.getElementById("submitNewsBtn").innerHTML = "<span>+ โพสต์ประกาศข่าว</span>";
    document.getElementById("cancelEditNewsBtn").style.display = "none";

    document.getElementById("newsEditorSection")?.scrollIntoView({ behavior: "smooth", block: "center" });
    document.getElementById("newsContentInput")?.focus();
}

function deleteNewsTemplate(templateId, btnEl) {
    if (btnEl && btnEl.dataset.confirmed !== "true") {
        btnEl.dataset.confirmed = "true";
        btnEl.textContent = "ยืนยันลบ?";
        setTimeout(() => {
            if (btnEl) {
                btnEl.dataset.confirmed = "false";
                btnEl.textContent = "🗑️ ลบ";
            }
        }, 3000);
        return;
    }

    const updated = getNewsTemplates().filter(t => t.id !== templateId);
    saveNewsTemplates(updated);
    renderNewsTemplates();
}

function renderNewsTemplates() {
    const container = document.getElementById("newsTemplatesList");
    const countEl = document.getElementById("newsTemplatesCount");
    if (!container) return;

    const templates = getNewsTemplates();
    if (countEl) countEl.textContent = templates.length;

    if (templates.length === 0) {
        container.innerHTML = `
            <div class="template-empty-box">
                ยังไม่มีเทมเพลตที่บันทึกไว้ — สามารถกดปุ่ม <strong>"💾 บันทึกเป็นเทมเพลต"</strong> ที่ประกาศข่าวด้านล่างเพื่อเก็บไว้ใช้ในรอบอื่นได้
            </div>
        `;
        return;
    }

    container.innerHTML = templates.map(tpl => `
        <div class="template-item-card">
            <img src="${tpl.image || DEFAULT_PLACEHOLDER_IMG}" alt="รูปเทมเพลต" class="template-item-thumb">
            <div class="template-item-info">
                <p class="template-item-text">${tpl.content}</p>
                <div class="template-item-actions">
                    <button type="button" class="btn-use-template" onclick="useNewsTemplate('${tpl.id}')">✨ นำมาใช้ประกาศ</button>
                    <button type="button" class="btn-del-template" onclick="deleteNewsTemplate('${tpl.id}', this)">🗑️ ลบ</button>
                </div>
            </div>
        </div>
    `).join("");
}

function renderNewsCardsPage() {
    const container = document.getElementById("adminNewsCardsList");
    if (!container) return;

    if (cachedNews.length === 0) {
        container.innerHTML = `
            <div class="news-editor-card" style="text-align:center; color:#64748b; font-weight:600;">
                ยังไม่มีประกาศข่าวประชาสัมพันธ์ในระบบ สามารถสร้างประกาศใหม่ได้ที่กล่องด้านบนครับ
            </div>
        `;
        return;
    }

    container.innerHTML = cachedNews.map(n => `
        <article class="news-feed-card">
            <div class="news-card-media">
                <img src="${n.image || DEFAULT_PLACEHOLDER_IMG}" alt="รูปประกอบข่าว">
                <span class="news-date-red">ลง ณ วันที่ ${n.date}</span>
            </div>
            <div class="news-card-body">
                <p class="news-card-text">${n.content}</p>
                <div class="news-card-footer">
                    <button type="button" class="btn-news-template" onclick="saveNewsCardAsTemplate('${n.id}', this)">💾 บันทึกเป็นเทมเพลต</button>
                    <button type="button" class="btn-news-edit" onclick="startEditNewsCard('${n.id}')">✏️ แก้ไข</button>
                    <button type="button" class="btn-news-delete" onclick="deleteNewsCard('${n.id}', this)">🗑️ ลบประกาศ</button>
                </div>
            </div>
        </article>
    `).join("");
}

function renderNewsTable() {
    const tbody = document.getElementById("adminNewsTbody");
    if (!tbody) return;

    if (cachedNews.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="padding:24px; color:#64748b;">ยังไม่มีประกาศข่าวประชาสัมพันธ์</td></tr>`;
        return;
    }

    tbody.innerHTML = cachedNews.map(n => `
        <tr onclick="openNewsPreviewModal('${n.id}')" title="คลิกเพื่อดูตัวอย่างประกาศข่าว">
            <td style="text-align:left;">
                <div class="dashboard-news-item">
                    <div class="dashboard-news-media">
                        <img src="${n.image || DEFAULT_PLACEHOLDER_IMG}" alt="รูปประกอบข่าว">
                        <span class="news-date-red">ลง ณ วันที่ ${n.date}</span>
                    </div>
                    <p class="dashboard-news-text">${n.content}</p>
                </div>
            </td>
            <td style="white-space:nowrap;">${n.date}</td>
            <td style="white-space:nowrap;" onclick="event.stopPropagation()">
                <button type="button" class="btn-pill-dark" style="padding:5px 14px; font-size:12px;" onclick="window.location.href="/admin/admin-news.html">จัดการ</button>
                <button type="button" class="btn-action btn-red" style="display:inline-flex; padding:5px 14px; font-size:12px;" onclick="deleteNewsCard('${n.id}', this)">ลบ</button>
            </td>
        </tr>
    `).join("");
}

function openNewsPreviewModal(newsId) {
    const news = cachedNews.find(n => n.id === newsId);
    const modal = document.getElementById("newsPreviewModal");
    if (!news || !modal) return;

    document.getElementById("previewNewsImg").src = news.image || DEFAULT_PLACEHOLDER_IMG;
    document.getElementById("previewNewsDate").textContent = `ลง ณ วันที่ ${news.date}`;
    document.getElementById("previewNewsContent").textContent = news.content;
    modal.classList.add("open");
}

// ========================================================
// 5. หน้าฐานข้อมูลสมาชิกและทีมช่าง (MongoDB)
// ========================================================

function renderUsersTable() {
    const tbody = document.getElementById("adminUsersTbody");
    if (!tbody) return;

    const roleNames = { resident: "ลูกบ้าน", technician: "ช่างซ่อมบำรุง", admin: "นิติบุคคล" };
    const searchKw = (document.getElementById("userSearchInput")?.value || "").toLowerCase().trim();

    let users = [...cachedUsers];
    if (currentUserRoleFilter !== "all") {
        users = users.filter(u => u.role === currentUserRoleFilter);
    }
    if (searchKw) {
        users = users.filter(u =>
            (u.fullname && u.fullname.toLowerCase().includes(searchKw)) ||
            (u.username && u.username.toLowerCase().includes(searchKw)) ||
            (u.houseNo && u.houseNo.toLowerCase().includes(searchKw)) ||
            (u.phone && u.phone.includes(searchKw)) ||
            (u.email && u.email.toLowerCase().includes(searchKw))
        );
    }

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding:24px; color:#64748b;">ไม่พบรายชื่อผู้ใช้งานที่ค้นหา</td></tr>`;
        return;
    }

    tbody.innerHTML = users.map(u => `
        <tr>
            <td>
                ${u.fullname}
                <span class="issue-time-sub">Username: ${u.username || "-"}</span>
            </td>
            <td>${roleNames[u.role] || u.role}</td>
            <td>${u.houseNo}</td>
            <td>${u.phone}</td>
            <td>${u.email || "-"}</td>
            <td>
                <button type="button" class="btn-action btn-red" style="display:inline-flex; padding:4px 12px; font-size:12px;" onclick="deleteUserItem('${u.id}', this)">ลบ</button>
            </td>
        </tr>
    `).join("");
}

function filterUsersRole(role) {
    currentUserRoleFilter = role;
    document.querySelectorAll("#usersDataSection .status-pill-btn").forEach(b => {
        b.classList.toggle("active", b.getAttribute("data-role") === role);
    });
    renderUsersTable();
}

function switchDataTab(tab) {
    const isUsers = tab === "users";
    const tabUsersBtn = document.getElementById("tabUsersBtn");
    const tabRatingsBtn = document.getElementById("tabRatingsBtn");
    if (!tabUsersBtn || !tabRatingsBtn) return;

    tabUsersBtn.classList.toggle("active", isUsers);
    tabRatingsBtn.classList.toggle("active", !isUsers);
    document.getElementById("usersDataSection").style.display = isUsers ? "flex" : "none";
    document.getElementById("ratingsDataSection").style.display = isUsers ? "none" : "flex";
    if (!isUsers) renderRatingsTable();
}

function renderRatingsTable() {
    const tbody = document.getElementById("adminRatingsTbody");
    if (!tbody) return;

    const rated = cachedIssues.filter(i => i.rating && i.rating > 0);
    const avgEl = document.getElementById("avgRatingSummary");

    if (rated.length === 0) {
        if (avgEl) avgEl.textContent = "ยังไม่มีผลประเมิน";
        tbody.innerHTML = `<tr><td colspan="5" style="padding:24px; color:#64748b;">ยังไม่มีรายการประเมินความพึงพอใจจากลูกบ้าน</td></tr>`;
        return;
    }

    const avgScore = (rated.reduce((sum, item) => sum + item.rating, 0) / rated.length).toFixed(1);
    if (avgEl) avgEl.textContent = `⭐ ${avgScore} / 5.0 (จากทั้งหมด ${rated.length} รายการ)`;

    tbody.innerHTML = rated.map(i => `
        <tr>
            <td>#${i.id.slice(-6).toUpperCase()}</td>
            <td>${i.description}</td>
            <td>${i.assignedTech || "-"}</td>
            <td style="color:#eab308;">${"★".repeat(i.rating)} (${i.rating}/5)</td>
            <td>${i.ratingComment || "-"}</td>
        </tr>
    `).join("");
}

function openAddUserModal() {
    document.getElementById("addUserModal")?.classList.add("open");
}

function highlightAdminDuplicateInput(inputEl, warningText) {
    if (!inputEl) return;
    inputEl.style.borderColor = "#dc2626";
    inputEl.style.backgroundColor = "#fef2f2";
    inputEl.value = "";
    inputEl.placeholder = warningText;
}

async function submitNewUser(event) {
    event.preventDefault();

    const fullnameInput = document.getElementById("userFullnameInput");
    const phoneInput = document.getElementById("userPhoneInput");
    const emailInput = document.getElementById("userEmailInput");
    const usernameInput = document.getElementById("userUsernameInput");

    const fullname = fullnameInput.value.trim().replace(/\s+/g, " ");
    const phone = phoneInput.value.trim();
    const email = emailInput ? emailInput.value.trim() : "";
    const username = usernameInput.value.trim();
    const password = document.getElementById("userPasswordInput").value;
    const role = document.getElementById("userRoleInput").value;
    const houseNo = document.getElementById("userHouseInput").value.trim();

    [fullnameInput, phoneInput, emailInput, usernameInput].forEach(el => {
        if (el) {
            el.style.borderColor = "";
            el.style.backgroundColor = "";
        }
    });

    let firstInvalid = null;

    if (cachedUsers.some(u => (u.fullname || "").trim().toLowerCase() === fullname.toLowerCase())) {
        highlightAdminDuplicateInput(fullnameInput, "⚠️ ชื่อ-นามสกุลนี้มีในระบบแล้ว");
        if (!firstInvalid) firstInvalid = fullnameInput;
    }
    if (cachedUsers.some(u => (u.phone || "").replace(/[\s-]/g, "") === phone.replace(/[\s-]/g, ""))) {
        highlightAdminDuplicateInput(phoneInput, "⚠️ เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว");
        if (!firstInvalid) firstInvalid = phoneInput;
    }
    if (email && cachedUsers.some(u => u.email && u.email.toLowerCase() === email.toLowerCase())) {
        highlightAdminDuplicateInput(emailInput, "⚠️ อีเมลนี้ถูกใช้งานแล้ว");
        if (!firstInvalid) firstInvalid = emailInput;
    }
    if (cachedUsers.some(u => u.username && u.username.toLowerCase() === username.toLowerCase())) {
        highlightAdminDuplicateInput(usernameInput, "⚠️ ชื่อผู้ใช้นี้ซ้ำ กรุณาใช้ชื่ออื่น");
        if (!firstInvalid) firstInvalid = usernameInput;
    }

    if (firstInvalid) {
        firstInvalid.focus();
        return;
    }

    try {
        const res = await fetch(`${ADMIN_API_BASE_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, fullname, role, houseNo, phone, email })
        });
        const data = await res.json();

        if (!res.ok) {
            alert(data.error || "เพิ่มสมาชิกไม่สำเร็จ");
            return;
        }

        await fetchUsersFromDB();
        event.target.reset();
        closeModal("addUserModal");
        renderUsersTable();
    } catch (err) {
        console.error(err);
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
    }
}

async function deleteUserItem(id, btnEl) {
    if (btnEl && btnEl.dataset.confirmed !== "true") {
        btnEl.dataset.confirmed = "true";
        btnEl.textContent = "⚠️ ยืนยันลบ?";
        setTimeout(() => {
            if (btnEl) {
                btnEl.dataset.confirmed = "false";
                btnEl.textContent = "ลบ";
            }
        }, 3000);
        return;
    }

    try {
        const res = await fetch(`${ADMIN_API_BASE_URL}/users/${id}`, { method: "DELETE" });
        if (res.ok) {
            await fetchUsersFromDB();
            renderUsersTable();
        }
    } catch (err) {
        console.error(err);
    }
}

// ========================================================
// 6. เมนูโปรไฟล์ และควบคุม Modal ทั่วไป
// ========================================================

function toggleAdminMenu() {
    document.getElementById("adminProfileDropdown")?.classList.toggle("show");
}

function clearAuthSessionAndLogout() {
    ["currentUser", "role", "userRole", "username", "fullname", "houseNo", "phone", "adminName"].forEach(k => {
        localStorage.removeItem(k);
    });
    window.location.href = "/index.html";
}

function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove("open");
}

window.addEventListener("click", function (event) {
    const menuWrapper = document.querySelector(".user-menu-wrapper");
    const dropdown = document.getElementById("adminProfileDropdown");
    if (menuWrapper && dropdown && !menuWrapper.contains(event.target)) {
        dropdown.classList.remove("show");
    }
});

// ========================================================
// 7. ทำงานอัตโนมัติเมื่อหน้าโหลดเสร็จ
// ========================================================

document.addEventListener("DOMContentLoaded", async function () {
    const currentRole = localStorage.getItem("role") || localStorage.getItem("userRole");
    if (currentRole === "resident") {
        alert("⛔ คุณไม่มีสิทธิ์เข้าถึงหน้าจัดการของนิติบุคคล");
        window.location.href = "/resident/dashboard.html";
        return;
    }

    const adminName = getAdminDisplayName();
    const welcomeEl = document.getElementById("adminWelcomeName");
    const greetingEl = document.getElementById("adminCardGreeting");
    const dropdownEl = document.getElementById("adminDropdownName");

    if (welcomeEl) welcomeEl.textContent = `คุณ${adminName} (นิติบุคคล)`;
    if (greetingEl) greetingEl.textContent = `สวัสดี, คุณ ${adminName}`;
    if (dropdownEl) dropdownEl.textContent = `คุณ ${adminName}`;

    const previewDateEl = document.getElementById("newsPreviewDate");
    if (previewDateEl) {
        previewDateEl.textContent = `ลง ณ วันที่ ${new Date().toLocaleDateString("th-TH")}`;
    }

    // โหลดข้อมูลทั้งหมดจาก MongoDB พร้อมกัน
    await Promise.all([
        fetchIssuesFromDB(),
        fetchUsersFromDB(),
        fetchNewsFromDB()
    ]);

    updateDashboardCounters();
    renderIssuesTable();
    renderUsersTable();
    renderNewsTemplates();
    renderNewsCardsPage();
});