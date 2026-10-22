import ludoBoardAsset from '../../assets/boards/ludo.png';

export function LudoBoardImage() {
  return (
    <img
      src={ludoBoardAsset}
      alt="Hye Arcade Ludo board"
      draggable={false}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        objectFit: 'contain',
        userSelect: 'none',
        pointerEvents: 'none',
        filter: 'drop-shadow(0 18px 36px rgba(0,0,0,0.55))',
      }}
    />
  );
}
