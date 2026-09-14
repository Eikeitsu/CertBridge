import { useRef, type ReactNode } from "react";
import { Button } from "antd-mobile";

type FilePickButtonProps = {
  accept?: string;
  onPick: (file: File) => void;
  children: ReactNode;
};

export function FilePickButton({ accept, onPick, children }: FilePickButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          event.target.value = "";
        }}
      />
      <Button size="mini" color="primary" onClick={() => inputRef.current?.click()}>
        {children}
      </Button>
    </>
  );
}
