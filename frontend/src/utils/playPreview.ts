import axios from "axios";

let previewAudio: HTMLAudioElement | null = null;

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

  previewAudio = new Audio(src);
  previewAudio.volume = 0.3;

  await previewAudio.play();

  setTimeout(() => {
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.currentTime = 0;
      previewAudio = null;
    }
  }, 10000);

  return true;
};