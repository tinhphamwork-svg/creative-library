import { useState } from 'react';

function getCell(creatives, concept, angle) {
  const matches = creatives.filter(c => c.concept === concept && c.angle === angle);
  if (matches.length === 0) return null;
  const withRoas = matches.filter(c => c.roas !== '' && c.roas !== null && !isNaN(Number(c.roas)));
  const avgRoas = withRoas.length > 0
    ? withRoas.reduce((s, c) => s + Number(c.roas), 0) / withRoas.length
    : null;
  const winners = matches.filter(c => ['Winning', 'Scaling'].includes(c.status)).length;
  return { count: matches.length, avgRoas, winners, items: matches };
}

function cellStyle(cell) {
  if (!cell) return 'bg-slate-50 text-slate-300 border border-slate-100';
  if (cell.avgRoas === null) return 'bg-blue-50 text-blue-600 border border-blue-100 cursor-pointer hover:bg-blue-100';
  if (cell.avgRoas >= 3)   return 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer hover:bg-emerald-100';
  if (cell.avgRoas >= 1.5) return 'bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer hover:bg-amber-100';
  return 'bg-red-50 text-red-600 border border-red-200 cursor-pointer hover:bg-red-100';
}

function roasLabel(cell) {
  if (!cell) return null;
  if (cell.avgRoas === null) return 'No data';
  return `${cell.avgRoas.toFixed(1)}x`;
}

export default function MatrixView({ creatives, onSelectCreative }) {
  const [selectedCell, setSelectedCell] = useState(null); // { concept, angle }

  const concepts = [...new Set(creatives.map(c => c.concept).filter(Boolean))].sort();
  const angles   = [...new Set(creatives.map(c => c.angle).filter(Boolean))].sort();

  // Creatives không có concept hoặc angle → hiện riêng
  const uncategorized = creatives.filter(c => !c.concept || !c.angle);

  const selectedItems = selectedCell
    ? (getCell(creatives, selectedCell.concept, selectedCell.angle)?.items || [])
    : [];

  function handleCellClick(concept, angle, cell) {
    if (!cell) return;
    const key = `${concept}__${angle}`;
    setSelectedCell(prev => prev && `${prev.concept}__${prev.angle}` === key ? null : { concept, angle });
  }

  if (concepts.length === 0 || angles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-sm gap-2">
        <span className="text-2xl">⊞</span>
        <p>Chưa đủ data để hiện Matrix View.</p>
        <p className="text-xs">Cần ít nhất 1 creative có cả Concept và Angle.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="font-medium text-slate-600">ROAS:</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200 inline-block"/>≥ 3x Win</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200 inline-block"/>1.5–3x OK</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block"/>{'< 1.5x Fail'}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200 inline-block"/>Đang test</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100 border border-slate-100 inline-block"/>Chưa test</span>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="text-xs border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="text-left p-2 text-slate-500 font-semibold min-w-[120px]">Concept \ Angle</th>
              {angles.map(angle => (
                <th key={angle} className="text-center p-2 text-slate-600 font-semibold min-w-[110px] max-w-[140px]">
                  <span className="block truncate" title={angle}>{angle}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {concepts.map(concept => (
              <tr key={concept}>
                <td className="p-2 font-semibold text-slate-700 align-middle pr-3">
                  <span className="block truncate max-w-[160px]" title={concept}>{concept}</span>
                </td>
                {angles.map(angle => {
                  const cell = getCell(creatives, concept, angle);
                  const isSelected = selectedCell?.concept === concept && selectedCell?.angle === angle;
                  return (
                    <td key={angle}
                      onClick={() => handleCellClick(concept, angle, cell)}
                      className={`rounded-lg p-2 text-center transition-all ${cellStyle(cell)} ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}>
                      {cell ? (
                        <>
                          <div className="font-bold text-sm leading-tight">{roasLabel(cell)}</div>
                          <div className="opacity-60 mt-0.5">{cell.count} ad{cell.count > 1 ? 's' : ''}{cell.winners > 0 ? ` · ${cell.winners}W` : ''}</div>
                        </>
                      ) : (
                        <span className="text-xs">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected cell detail */}
      {selectedCell && selectedItems.length > 0 && (
        <div className="border border-slate-200 rounded-lg bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">
              {selectedCell.concept} × {selectedCell.angle}
              <span className="ml-2 text-slate-400 font-normal">({selectedItems.length} creative)</span>
            </h3>
            <button onClick={() => setSelectedCell(null)} className="text-slate-400 hover:text-slate-600 text-xs">✕ Đóng</button>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
            {selectedItems.map(c => (
              <button key={c.id}
                onClick={() => onSelectCreative(c)}
                className="text-left p-3 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 transition-colors">
                <div className="font-medium text-slate-800 text-xs truncate">{c.hook || '(no hook)'}</div>
                <div className="text-xs text-slate-400 mt-0.5">{c.format} · {c.status}</div>
                <div className="flex gap-3 mt-1.5 text-xs">
                  {c.roas && <span className="text-emerald-600 font-bold">{Number(c.roas).toFixed(1)}x</span>}
                  {c.ctr  && <span className="text-slate-400">CTR {c.ctr}%</span>}
                  {c.spend && <span className="text-slate-400">${Number(c.spend).toLocaleString()}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Uncategorized */}
      {uncategorized.length > 0 && (
        <div className="text-xs text-slate-400 mt-2">
          {uncategorized.length} creative chưa có Concept/Angle → không hiện trong matrix.
        </div>
      )}
    </div>
  );
}
