import React from "react";
import styles from "./PreviewCard.module.css";

type Props = {
  title: string;
  children: React.ReactNode;
};

const PreviewCard: React.FC<Props> = ({ title, children }) => {
  return (
    <div className={styles.card}>
      <div className={styles.title}>{title}</div>
      {children}
    </div>
  );
};

export default PreviewCard;


