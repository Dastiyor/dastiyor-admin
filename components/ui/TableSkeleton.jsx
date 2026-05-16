const TableSkeleton = ({ rows = 8, cols = 5 }) => (
  <div className="animate-pulse">
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="table-th">
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="table-td">
                  <div className={`h-3 bg-slate-100 dark:bg-slate-800 rounded ${c === 0 ? "w-32" : "w-20"}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default TableSkeleton;
