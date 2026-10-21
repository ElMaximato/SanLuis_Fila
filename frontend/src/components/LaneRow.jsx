// Verde ≤ 20 min · ámbar ≤ 45 · rojo > 45
function toneFor(min) {
  if (min <= 20) return 'good';
  if (min <= 45) return 'warn';
  return 'bad';
}

const TEXT = { closed: 'Cerrado', pending: 'Pendiente', na: '—' };

export default function LaneRow({ label, lane }) {
  const isOpen = lane?.state === 'open';
  const tone = isOpen ? toneFor(lane.delayMin) : 'idle';

  return (
    <div className="lane" aria-label={isOpen ? `${label}: ${lane.delayMin} minutos` : label}>
      <div className="lane__value">
        {isOpen ? (
          <>
            <span className="lane__num">{lane.delayMin}</span>
            <span className="lane__unit">min</span>
          </>
        ) : (
          <span className="lane__off">{TEXT[lane?.state] ?? '—'}</span>
        )}
      </div>
      <div className="lane__label">
        <span className={`dot dot--${tone}`} />
        {label}
      </div>
    </div>
  );
}
