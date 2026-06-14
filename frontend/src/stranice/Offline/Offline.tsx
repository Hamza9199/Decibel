import React, {
  memo,
  useEffect,
  useState
} from "react";
import { OfflineSong } from "../../types";
import { useTranslation } from "react-i18next";
import Header from "../../komponente/Header/Header";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import Footer from "../../komponente/Footer/Footer";
import { playPreview } from "../../utils/playPreview";

type Styles = Record<string, string>;


const Offline: React.FC = () => {
  const { t } = useTranslation();
const [styles, setStyles] = useState<Styles>({});


useEffect(() => {
    const loadTheme = async () => {
      const tema =
        localStorage.getItem("decibel_tema") || "dark";

      if (tema === "dark") {
        const mod = await import("./Offline.module.css");
        setStyles(mod.default);
      } else {
        const mod = await import("./OfflineWhite.module.css");
        setStyles(mod.default);
      }
    };

    loadTheme();
  }, []);
  
    
  const [songs, setSongs] =
    useState<OfflineSong[]>([]);

  useEffect(() => {
    type ElectronWindow = Window & {
      electron?: {
        ipcRenderer?: {
          invoke?: (
            channel: string
          ) => Promise<OfflineSong[]>;
        };
      };
    };

    const electronWindow =
      window as ElectronWindow;

    electronWindow.electron?.ipcRenderer
      ?.invoke?.("get-offline-songs")
      .then((data) => {
        setSongs(data || []);
      });
  }, []);

  const handleDelete = async (
    songId: number
    ) => {
    type ElectronWindow = Window & {
        electron?: {
        ipcRenderer?: {
            invoke?: (
            channel: string,
            ...args: unknown[]
            ) => Promise<boolean>;
        };
        };
    };

    const electronWindow =
        window as ElectronWindow;

    const success =
        await electronWindow.electron
        ?.ipcRenderer
        ?.invoke?.(
            "delete-offline-song",
            songId
        );

    if (!success) {
        alert("Greška pri brisanju");
        return;
    }

    setSongs((prev) =>
        prev.filter(
        (song) => song.id !== songId
        )
    );
    };

    const handlePlay = (
    song: OfflineSong
    ) => {

          playPreview(song.putanjaAudio);
      
    window.dispatchEvent(
        new CustomEvent(
        "globalAudioPlay",
        {
            detail: {
            id: song.id,
            src: song.putanjaAudio,
            title: song.naziv,
            putanjaSlika:
                song.putanjaSlika,
            },
        }
        )
    );
    };

  return (
    <>
         <Header />
          <Sidebar />
    <div className={styles.offlineContainer}>
        <h1 className={styles.title}>
        {t("offlinesongs")}
        </h1>

        {songs.length === 0 ? (
        <p className={styles.emptyText}>
            {t("noofflinesongs")}
        </p>
        ) : (
        songs.map((song) => (
            <div
            key={song.id}
            className={styles.songCard}
            >
            <img
                src={song.putanjaSlika}
                alt={song.naziv}
                className={styles.songImage}
            />

            <div className={styles.songInfo}>
                <div className={styles.songTitle}>
                {song.naziv}
                </div>

                <div className={styles.songArtist}>
                {song.izvodjac}
                </div>
            </div>

            <div className={styles.actions}>
                <button
                className={styles.actionBtn}
                onClick={() => handlePlay(song)}
                >
                ▶
                </button>

                <button
                className={styles.actionBtn}
                onClick={() =>
                    handleDelete(song.id)
                }
                >
                🗑
                </button>
            </div>
            </div>
        ))
        )}
    </div>
    <Footer />
    </>
    );
};

export default memo(Offline);