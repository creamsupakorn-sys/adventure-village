// --- Global State ---
let allTechIssues = [];
let currentTechIssueId = null;
let currentTechFilter = "all";

document.addEventListener("DOMContentLoaded", () => {
  checkTechAuth();
  loadTechIssues();
});

// ตรวจสอบสิทธิ์การเข้าใช้งาน (ต้องเป็น technician หรือ admin)
// ตรวจสอบสิทธิ์การเข้าใช้งาน
// ตรวจสอบสิทธิ์การเข้าใช้งาน
function checkTechAuth() {
  const userStr = localStorage.getItem("user");
  if (!userStr) {
    window.location.href = "/login.html"; // 👈 แก้เป็นพาร์ธสัมพัทธ์จาก Root Server
    return;
  }
  try {
    const user = JSON.parse(userStr);
    if (user.role !== "technician" && user.role !== "admin") {
      alert("คุณไม่มีสิทธิ์เข้าถึงระบบช่างซ่อมบำรุง");
      window.location.href = "/login.html"; // 👈 แก้เป็น /login.html
      return;
    }

    // แสดงชื่อผู้ใช้ในหน้าจอ
    const nameDisplay = user.fullname || user.username;
    const welcomeEl = document.getElementById("techWelcomeName");
    const cardGreetingEl = document.getElementById("techCardGreeting");
    const dropdownNameEl = document.getElementById("techDropdownName");
    const dropdownHouseEl = document.getElementById("techDropdownHouse");

    if (welcomeEl) welcomeEl.textContent = nameDisplay;
    if (cardGreetingEl) cardGreetingEl.textContent = `สวัสดี, ${nameDisplay}`;
    if (dropdownNameEl) dropdownNameEl.textContent = nameDisplay;
    if (dropdownHouseEl && user.houseNo)
      dropdownHouseEl.textContent = `🏠 ${user.houseNo}`;
  } catch (e) {
    console.error("Auth parse error:", e);
    window.location.href = "/login.html"; // 👈 แก้เป็น /login.html
  }
}

// ออกจากระบบ
function clearAuthSessionAndLogout() {
  localStorage.removeItem("user");
  window.location.href = "/login.html"; // 👈 แก้เป็น /login.html
}

// เปิด-ปิดเมจุดรอปดาวน์โปรไฟล์
function toggleTechMenu() {
  const card = document.getElementById("techProfileDropdown");
  if (card) {
    card.style.display = card.style.display === "block" ? "none" : "block";
  }
}

// ออกจากระบบ
function clearAuthSessionAndLogout() {
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// โหลดรายการแจ้งซ่อมทั้งหมดจาก API
async function loadTechIssues() {
  try {
    const res = await fetch("/api/issues");
    if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลรายการแจ้งซ่อมได้");
    allTechIssues = await res.json();
    renderTechIssuesTable();
  } catch (err) {
    console.error("Error loading issues:", err);
  }
}

// กรองสถานะงาน
function filterTechIssues(status) {
  currentTechFilter = status;

  // สลับคลาส active ของปุ่มฟิลเตอร์
  document.querySelectorAll(".status-pill-btn").forEach((btn) => {
    if (btn.getAttribute("data-status") === status) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  renderTechIssuesTable();
}

// เรนเดอร์ข้อมูลลงในตารางและอัปเดตตัวเลขสถิติ
function renderTechIssuesTable() {
  const tbody = document.getElementById("techIssuesTbody");
  const searchInput = document.getElementById("techSearchInput");
  const categoryFilter = document.getElementById("techCategoryFilter");

  if (!tbody) return;

  const keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const selectedCategory = categoryFilter ? categoryFilter.value : "all";

  // นับจำนวนแยกตามสถานะทั้งหมด
  let countAssigned = 0;
  let countInProgress = 0;
  let countCompleted = 0;
  let countAll = allTechIssues.length;

  allTechIssues.forEach((item) => {
    if (item.status === "assigned") countAssigned++;
    if (item.status === "in_progress") countInProgress++;
    if (item.status === "completed") countCompleted++;
  });

  // อัปเดตตัวเลขในกล่องสถิติและแบดจ์
  setSafeText("techCountAssigned", countAssigned);
  setSafeText("techCountInProgress", countInProgress);
  setSafeText("techCountCompleted", countCompleted);

  setSafeText("techBadgeAll", countAll);
  setSafeText("techBadgeAssigned", countAssigned);
  setSafeText("techBadgeInProgress", countInProgress);
  setSafeText("techBadgeCompleted", countCompleted);

  // กรองข้อมูลตามเงื่อนไข (Search, Category, Status)
  const filtered = allTechIssues.filter((item) => {
    // กรองสถานะ
    if (currentTechFilter !== "all" && item.status !== currentTechFilter) {
      return false;
    }
    // กรองหมวดหมู่
    if (selectedCategory !== "all" && item.category !== selectedCategory) {
      return false;
    }
    // กรองคำค้นหา
    if (keyword) {
      const desc = (item.description || "").toLowerCase();
      const loc = (item.location || "").toLowerCase();
      const cat = (item.category || "").toLowerCase();
      const reporter = (item.reporterName || "").toLowerCase();
      if (
        !desc.includes(keyword) &&
        !loc.includes(keyword) &&
        !cat.includes(keyword) &&
        !reporter.includes(keyword)
      ) {
        return false;
      }
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 2rem;">ไม่พบรายการแจ้งซ่อมตามเงื่อนไข</td></tr>`;
    return;
  }

  let html = "";
  filtered.forEach((item) => {
    let badgeClass = "badge-pending";
    let statusText = "รอดำเนินการ";
    if (item.status === "assigned") {
      statusText = "มอบหมายแล้ว";
      badgeClass = "badge-assigned";
    } else if (item.status === "in_progress") {
      statusText = "กำลังซ่อมแซม";
      badgeClass = "badge-progress";
    } else if (item.status === "completed") {
      statusText = "เสร็จสิ้น";
      badgeClass = "badge-completed";
    }

    const catIcon = getCategoryIcon(item.category);

    html += `
            <tr onclick="openTechIssueModal('${item.id}')" style="cursor: pointer;">
                <td>
                    <div style="font-weight: 600; color: #1e293b; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${escapeHtml(item.description)}
                    </div>
                    <div style="font-size: 0.8rem; color: #64748b;">รหัสเคส: #${item.id.slice(-6)}</div>
                </td>
                <td><span class="category-badge">${catIcon} ${escapeHtml(item.category)}</span></td>
                <td>📍 ${escapeHtml(item.location)}</td>
                <td>
                    <div>👤 ${escapeHtml(item.reporterName || "ลูกบ้าน")}</div>
                    <span class="status-badge ${badgeClass}">${statusText}</span>
                </td>
            </tr>
        `;
  });

  tbody.innerHTML = html;
}

// เปิด Modal รายละเอียดงานเพื่ออัปเดต
function openTechIssueModal(id) {
  const item = allTechIssues.find((i) => i.id === id);
  if (!item) return;

  currentTechIssueId = id;

  setSafeText("techModalTitle", `รายละเอียดงานซ่อม #${item.id.slice(-6)}`);
  setSafeText("techModalIssueDesc", `📝 รายละเอียด: ${item.description}`);
  setSafeText(
    "techModalIssueInfo",
    `📍 จุดเกิดเหตุ: ${item.location} | 👤 ผู้แจ้ง: ${item.reporterName || "ลูกบ้าน"} | 🏷️ หมวดหมู่: ${item.category}`,
  );

  // รูปก่อนซ่อม
  const imgEl = document.getElementById("techModalIssueImg");
  if (imgEl) {
    imgEl.src =
      item.beforeImg ||
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='250'%3E%3Crect width='100%25' height='100%25' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='sans-serif' font-size='18'%3Eไม่มีรูปภาพก่อนซ่อม%3C/text%3E%3C/svg%3E";
  }

  // เซ็ตค่าฟอร์มปัจจุบัน
  const statusSelect = document.getElementById("techModalStatusSelect");
  if (statusSelect) statusSelect.value = item.status || "assigned";

  const afterImgInput = document.getElementById("techAfterImgInput");
  if (afterImgInput) afterImgInput.value = item.afterImg || "";

  const replyInput = document.getElementById("techModalReplyInput");
  if (replyInput) replyInput.value = "";

  // แสดง Modal
  const modal = document.getElementById("techIssueModal");
  if (modal) modal.style.display = "flex";
}
// ฟังก์ชันแปลงไฟล์รูปหลังซ่อมเป็น Base64 สำหรับส่งเข้า API
function previewTechAfterImage(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const preview = document.getElementById("techImagePreview");
      const defaultContent = document.getElementById(
        "techUploadDefaultContent",
      );
      const hiddenInput = document.getElementById("techAfterImgInput");

      if (preview) {
        preview.src = e.target.result;
        preview.style.display = "block";
      }
      if (defaultContent) {
        defaultContent.style.display = "none";
      }
      if (hiddenInput) {
        hiddenInput.value = e.target.result; // เซฟค่า Base64 ลง input hidden
      }
    };
    reader.readAsDataURL(file);
  }
}
// ส่งข้อมูลอัปเดตจากฝั่งช่าง
async function submitTechUpdate(event) {
  event.preventDefault();
  if (!currentTechIssueId) return;

  const newStatus = document.getElementById("techModalStatusSelect").value;
  const afterImg = document.getElementById("techAfterImgInput").value.trim();
  const replyNote = document.getElementById("techModalReplyInput").value.trim();

  let stepLevel = 3;
  if (newStatus === "in_progress") stepLevel = 3;
  if (newStatus === "completed") stepLevel = 4;

  const userStr = localStorage.getItem("user");
  const techUser = userStr
    ? JSON.parse(userStr)
    : { fullname: "ช่างซ่อมบำรุง" };
  const techName = techUser.fullname || techUser.username;

  const payload = {
    status: newStatus,
    stepLevel: stepLevel,
    afterImg: afterImg,
    newLog: {
      actor: techName,
      action:
        newStatus === "completed"
          ? "ซ่อมแซมเสร็จสิ้น"
          : "อัปเดตความคืบหน้างานซ่อม",
      note:
        replyNote ||
        (newStatus === "completed"
          ? "ดำเนินการแก้ไขเรียบร้อย"
          : "กำลังดำเนินการปฏิบัติงาน"),
    },
  };

  try {
    const res = await fetch(`/api/issues/${currentTechIssueId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("ไม่สามารถอัปเดตสถานะงานได้");

    alert("บันทึกผลการปฏิบัติงานสำเร็จ!");
    closeModal("techIssueModal");
    loadTechIssues(); // รีเฟรชตาราง
  } catch (err) {
    console.error("Update error:", err);
    alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
  }
}

// ปิด Modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = "none";
}

// ฟังก์ชันเสริม
function setSafeText(elementId, text) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = text;
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getCategoryIcon(cat) {
  switch (cat) {
    case "ขยะ":
      return "🗑️";
    case "ไฟฟ้า":
      return "⚡";
    case "น้ำ":
      return "💧";
    case "ถนน":
      return "🛣️";
    case "สัตว์จรจัด":
      return "🐾";
    case "ไฟ":
      return "🔥";
    default:
      return "⚠️";
  }
}
