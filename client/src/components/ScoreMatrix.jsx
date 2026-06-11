// Module H: Correct Score Matrix

const RANK_COLORS = ['#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'];

export default function ScoreMatrix({ scores = [] }) {
  const max = scores[0]?.prob || 1;

  return (
    <div className="card p-5">
      <div className="mb-4">
        <h3 className="font-display font-semibold text-zinc-100 text-sm">波胆矩阵</h3>
        <p className="text-xs text-zinc-500 mt-0.5">Correct Score · Top 10</p>
      </div>

      <div className="space-y-1.5">
        {scores.map((item, i) => (
          <div key={item.score} className="flex items-center gap-3">
            <span className="font-mono text-xs text-zinc-500 w-4 text-right">{i + 1}</span>
            <span className="font-mono font-medium text-zinc-100 w-10 text-center tracking-wider">
              {item.score}
            </span>
            <div className="flex-1 bg-zinc-800 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-700"
                style={{
                  width: `${(item.prob / max) * 100}%`,
                  background: RANK_COLORS[Math.min(i, RANK_COLORS.length - 1)],
                }}
              />
            </div>
            <span className="font-mono text-xs w-10 text-right"
              style={{ color: RANK_COLORS[Math.min(i, RANK_COLORS.length - 1)] }}>
              {item.prob}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
