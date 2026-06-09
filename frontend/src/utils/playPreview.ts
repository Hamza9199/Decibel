import axios from "axios";

let previewAudio: HTMLAudioElement | null = null;

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

export const playPreview = async (
  src: string,
) => {

  const slusacID = localStorage.getItem("korisnik") || "";
     

  const res = await axios.get(
    `${API_BASE}/korisnik_pretplata/korisnik/${slusacID}`
  );

  const pretplataValid = res.data?.aktivna === true;

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