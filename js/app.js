// Theater Note: 共通ナビゲーションと、デモ表示用の小さな処理
document.addEventListener("DOMContentLoaded", () => {
  const currentPage = document.body.dataset.page || "home";
  document.querySelectorAll(`[data-nav="${currentPage}"]`).forEach(link => {
    link.classList.add("active");
    link.setAttribute("aria-current", "page");
  });

  const dateNode = document.querySelector("[data-today]");
  if (dateNode) {
    const today = new Date();
    dateNode.textContent = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric", month: "long", day: "numeric", weekday: "short"
    }).format(today);
  }
});
