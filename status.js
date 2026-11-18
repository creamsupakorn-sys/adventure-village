const API_BASE = "/api";
const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27400%27%20height=%27250%27%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20fill=%27%23e2e8f0%27/%3E%3Ctext%20x=%2750%25%27%20y=%2750%25%27%20dominant-baseline=%27middle%27%20text-anchor=%27middle%27%20fill=%27%2364748b%27%20font-family=%27sans-serif%27%20font-size=%2720%27%20font-weight=%27bold%27%3EADVENTURE%20VILLAGE%3C/text%3E%3C/svg%3E";

let allIssues = [];

// 1. ฟังก์ชันดึงข้อมูลรายการแจ้งปัญหาจาก MongoDB API
async function fetchIssues() {
  const container = document.getElementById("issueListContainer");
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/issues`);
    if (res.ok) {
      allIssues = await res.json();
      renderIssues(allIssues);
    } else {
      container.innerHTML = `<p style="text-align:center; color:#ffffff; font-weight:600;">ไม่สามารถโหลดข้อมูลรายการแจ้งปัญหาได้</p>`;
    }
  } catch (err) {
    console.error("Error fetching issues:", err);
    container.innerHTML = `<p style="text-align:center; color:#ffffff; font-weight:600;">ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้</p>`;
  }
}

// 2. ฟังก์ชันเรนเดอร์รายการปัญหาลงในหน้า HTML
function renderIssues(issues) {
  const container = document.getElementById("issueListContainer");
  if (!container) return;

  if (issues.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:#ffffff; font-weight:600; padding: 20px;">ยังไม่มีรายการแจ้งปัญหาในขณะนี้</p>`;
    return;
  }

  container.innerHTML = issues
    .map((item) => {
      const statusClass = item.status || "pending";
      let statusText = "รอดำเนินการ";
      if (statusClass === "assigned") statusText = "มอบหมายแล้ว";
      if (statusClass === "in_progress") statusText = "กำลังดำเนินการ";
      if (statusClass === "completed") statusText = "ซ่อมเสร็จสิ้น";

      const issueId = item._id ? item._id.slice(-6) : "N/A";

      return `
        <div class="issue-card">
            <div class="issue-card-left">
                <img src="${item.beforeImg || PLACEHOLDER_SVG}" class="issue-thumb" alt="รูปปัญหา">
                <div class="issue-card-info">
                    <div class="issue-card-header">
                        <span class="issue-id-badge">ID: ${issueId}</span>
                        <span class="issue-cat-title">${item.category}</span>
                    </div>
                    <p class="issue-short-desc">${item.description}</p>
                    <span class="issue-date-text">แจ้งเมื่อ: ${item.createdAt}</span>
                </div>
            </div>
            <div class="issue-card-right">
                <span class="status-badge status-${statusClass}">${statusText}</span>
                <a href="issue-detail.html?id=${item._id || ""}" class="btn-detail">ดูรายละเอียด</a>
            </div>
        </div>
      `;
    })
    .join("");
}

// 3. ฟังก์ชันกรองสถานะตามปุ่มที่กด (ทั้งหมด, รอดำเนินการ, กำลังดำเนินการ, ซ่อมเสร็จสิ้น)
function filterIssues(status, btnElement) {
  const buttons = document.querySelectorAll(".filter-btn");
  buttons.forEach((btn) => btn.classList.remove("active"));
  if (btnElement) btnElement.classList.add("active");

  if (status === "all") {
    renderIssues(allIssues);
  } else {
    const filtered = allIssues.filter(
      (item) => (item.status || "pending") === status,
    );
    renderIssues(filtered);
  }
}

// โหลดข้อมูลอัตโนมัติเมื่อเปิดหน้าเว็บ
document.addEventListener("DOMContentLoaded", function () {
  fetchIssues();
});
