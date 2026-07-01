import axios from "axios";
import i18n from "../i18n";

let previewAudio: HTMLAudioElement | null = null;
let previewAdEl: HTMLDivElement | null = null;
let previewTimer: ReturnType<typeof setTimeout> | null = null;

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

export const playPreview = async (
  src: string,
) => {

  const user = JSON.parse(localStorage.getItem("korisnik") || "{}");
  const slusacID = user?.id || "";
  let pretplataValid = false;  

  try {
    const res = await axios.get(
      `${API_BASE}/korisnik_pretplata/korisnik/${slusacID}`
    );

    pretplataValid =
      res.data?.pretplataStatus === "aktivna" ||
      res.data?.pretplataStatus === "pauzirana";
  } catch {
    pretplataValid = false;
  }

  if (pretplataValid) {
    return false;
  }

  if (previewAudio) {
    previewAudio.pause();
    previewAudio = null;
  }
  if (previewAdEl) {
    previewAdEl.remove();
    previewAdEl = null;
  }
  if (previewTimer) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }

  previewAdEl = document.createElement("div");
  previewAdEl.style.position = "fixed";
  previewAdEl.style.left = "0";
  previewAdEl.style.right = "0";
  previewAdEl.style.bottom = "0";
  previewAdEl.style.zIndex = "3000";
  previewAdEl.style.background = "#232323";
  previewAdEl.style.color = "#ffe6ec";
  previewAdEl.style.padding = "32px 0 36px 0";
  previewAdEl.style.textAlign = "center";
  previewAdEl.style.boxShadow = "0 -4px 24px #b91d9533";
  previewAdEl.style.fontFamily = "system-ui, sans-serif";
  previewAdEl.innerHTML = `
    <button
      type="button"
      aria-label="Zatvori"
      style="position:absolute;top:10px;right:24px;background:none;border:none;color:#ffe6ec;font-size:28px;cursor:pointer;line-height:1;z-index:10;"
    >×</button>
    <div style="font-size:1.2rem;margin-bottom:16px;">
      ${i18n.t("noSubscription") || i18n.t("subscription_required") || "You must have an active subscription to listen to music."}
    </div>
    <button
      type="button"
      style="background:#b91d95;color:#fff;border:none;border-radius:8px;padding:10px 28px;font-weight:600;font-size:1.1rem;cursor:pointer;"
    >
      ${i18n.t("buySubscription") || i18n.t("buy_subscription") || "Buy subscription"}
    </button>
  `;
  document.body.appendChild(previewAdEl);

  const closeBtn = previewAdEl.querySelector("button");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      if (previewAdEl) {
        previewAdEl.remove();
        previewAdEl = null;
      }
    });
  }
  const buyBtn = previewAdEl.querySelectorAll("button")[1];
  if (buyBtn) {
    buyBtn.addEventListener("click", () => {
      window.location.href = "/profile/subscription";
    });
  }

  previewAudio = new Audio(src);
  previewAudio.volume = 0.3;
  previewAudio.play().catch(() => {});

  previewTimer = setTimeout(() => {
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.currentTime = 0;
      previewAudio = null;
    }
    if (previewAdEl) {
      previewAdEl.remove();
      previewAdEl = null;
    }
    previewTimer = null;
  }, 5000);

  return true;
};
