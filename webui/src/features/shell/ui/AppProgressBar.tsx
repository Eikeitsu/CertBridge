type AppProgressBarProps = {
  active: boolean;
};

export function AppProgressBar({ active }: AppProgressBarProps) {
  return <div className={`cb-progress${active ? " is-on" : ""}`} aria-hidden />;
}
