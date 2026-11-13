"use client";
import { useEffect, useState } from "react";
import { FileSpreadsheet, Download } from "lucide-react";
import { catalogIssues, csvDownload, parseCsv } from "@/lib/partner/model";
export function CatalogPreview({
  file,
  onUseFile,
}: {
  file: File | null;
  onUseFile: (file: File) => void;
}) {
  const [rows, setRows] = useState<string[][]>([]),
    [original, setOriginal] = useState<string[][]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [page, setPage] = useState(0),
    [sheet, setSheet] = useState(0),
    [sheets, setSheets] = useState<Array<{ name: string; rows: string[][] }>>(
      [],
    );
  useEffect(() => {
    let alive = true;
    setRows([]);
    setOriginal([]);
    setError("");
    setPage(0);
    setSheets([]);
    if (!file || !/\.(csv|xlsx|xls)$/i.test(file.name)) return;
    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Inline preview supports files up to 5 MB. You can still submit your original file up to 12 MB.",
      );
      return;
    }
    if (/\.xls$/i.test(file.name)) {
      setError(
        "To preview and edit an older XLS catalog, save it as XLSX or CSV. You can still upload the original XLS file.",
      );
      return;
    }
    setBusy(true);
    void (async () => {
      try {
        let sources: Array<{ name: string; rows: string[][] }>;
        if (/\.csv$/i.test(file.name))
          sources = [
            {
              name: "Catalog",
              rows: parseCsv((await file.text()).replace(/^\uFEFF/, "")),
            },
          ];
        else {
          const excelModule = await import("exceljs");
          const ExcelJS = excelModule.default || excelModule;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(await file.arrayBuffer());
          sources = workbook.worksheets.map((ws) => {
            if (ws.rowCount > 5001 || ws.columnCount > 40)
              throw Error(
                "Preview supports up to 5,000 data rows and 40 columns.",
              );
            const data: string[][] = [];
            ws.eachRow((row) => {
              const values = Array.from({ length: ws.columnCount }, (_, i) => {
                const cell = row.getCell(i + 1);
                if (cell.type === ExcelJS.ValueType.Formula)
                  return cell.result == null ? "" : String(cell.result);
                return cell.text || "";
              });
              if (values.some((v) => v.trim())) data.push(values);
            });
            return { name: ws.name, rows: data };
          });
        }
        if (!sources.length || !sources[0].rows.length)
          throw Error("No catalog rows found.");
        if (sources.some((s) => s.rows.length > 5001 || s.rows[0].length > 40))
          throw Error("Preview supports 5,000 rows and 40 columns.");
        if (alive) {
          setSheets(sources);
          setSheet(0);
          setRows(sources[0].rows);
          setOriginal(sources[0].rows);
        }
      } catch (e: any) {
        if (alive)
          setError(
            e.message ||
              "This catalog could not be previewed. You can upload the original.",
          );
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [file]);
  if (!file || !/\.(csv|xlsx|xls)$/i.test(file.name)) return null;
  const headers = rows[0] || [],
    data = rows.slice(1),
    issues = data
      .map((row, i) => ({ row: i + 2, errors: catalogIssues(headers, row) }))
      .filter((v) => v.errors.length);
  function corrected() {
    return new File(
      [csvDownload(rows)],
      file!.name.replace(/\.[^.]+$/, "") + "-reviewed.csv",
      { type: "text/csv" },
    );
  }
  return (
    <section className="op-catalog op-card" aria-label="Catalog preview">
      <div className="op-row">
        <h3>
          <FileSpreadsheet size={19} />
          Review your catalog
        </h3>
        {sheets.length > 1 && (
          <label>
            Worksheet
            <select
              value={sheet}
              onChange={(e) => {
                const i = Number(e.target.value);
                setSheet(i);
                setRows(sheets[i].rows);
                setOriginal(sheets[i].rows);
                setPage(0);
              }}
            >
              {sheets.map((s, i) => (
                <option key={i} value={i}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <p>
        The first row is used as the header. Checks look for SKU, product name,
        and price. Edit missing values before uploading a reviewed copy.
      </p>
      {busy && <p role="status">Reading catalog…</p>}
      {error && (
        <p role="alert" className="op-error">
          {error}
        </p>
      )}
      {rows.length > 0 && (
        <>
          <p role="status">
            {data.length} rows · {issues.length} rows need attention.{" "}
            {sheets.length > 1
              ? "Reviewed export includes the selected worksheet only."
              : ""}
          </p>
          <div className="op-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  {headers.map((h, i) => (
                    <th key={i}>
                      <input
                        aria-label={`Column ${i + 1} header`}
                        value={h}
                        onChange={(e) =>
                          setRows((all) =>
                            all.map((r, j) =>
                              j === 0
                                ? r.map((v, k) =>
                                    k === i ? e.target.value : v,
                                  )
                                : r,
                            ),
                          )
                        }
                      />
                    </th>
                  ))}
                  <th>Checks</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(page * 15, (page + 1) * 15).map((row, i) => {
                  const index = page * 15 + i + 1;
                  return (
                    <tr key={index}>
                      <th>{index + 1}</th>
                      {headers.map((h, j) => (
                        <td key={j}>
                          <input
                            aria-label={`Row ${index + 1}, ${h || "column " + (j + 1)}`}
                            value={row[j] || ""}
                            onChange={(e) =>
                              setRows((all) =>
                                all.map((r, k) =>
                                  k === index
                                    ? headers.map((_, c) =>
                                        c === j ? e.target.value : r[c] || "",
                                      )
                                    : r,
                                ),
                              )
                            }
                          />
                        </td>
                      ))}
                      <td>
                        {catalogIssues(headers, row).join(", ") || "Ready"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="op-row">
            <button
              type="button"
              className="op-link"
              disabled={!page}
              onClick={() => setPage((v) => v - 1)}
            >
              Previous
            </button>
            <span>
              Page {page + 1} / {Math.max(1, Math.ceil(data.length / 15))}
            </span>
            <button
              type="button"
              className="op-link"
              disabled={(page + 1) * 15 >= data.length}
              onClick={() => setPage((v) => v + 1)}
            >
              Next
            </button>
          </div>
          <div className="op-actions">
            <button
              type="button"
              className="op-link"
              disabled={headers.length >= 40}
              onClick={() =>
                setRows((all) =>
                  all.map((r, i) => [...r, i === 0 ? "New column" : ""]),
                )
              }
            >
              Add column
            </button>
            <button
              type="button"
              className="op-secondary"
              onClick={() => onUseFile(corrected())}
            >
              Use reviewed CSV for submission
            </button>
            <button
              type="button"
              className="op-link"
              onClick={() => {
                const url = URL.createObjectURL(corrected()),
                  a = document.createElement("a");
                a.href = url;
                a.download = corrected().name;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              <Download size={15} />
              Download reviewed CSV
            </button>
            <button
              type="button"
              className="op-link"
              onClick={() => setRows(original)}
            >
              Reset edits
            </button>
          </div>
          <small>
            The original file is unchanged. Reviewed CSV exports preserve values
            only; formatting, formulas, and other worksheets are excluded.
          </small>
        </>
      )}
    </section>
  );
}
