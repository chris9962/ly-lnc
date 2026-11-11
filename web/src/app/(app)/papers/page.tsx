import Link from "next/link";
import { notFound } from "next/navigation";
import { flattenFolders } from "@/components/papers/folderNodes";
import { FolderTree } from "@/components/papers/FolderTree";
import { AnswerTag } from "@/components/papers/PaperTags";
import { UploadPaperButton } from "@/components/papers/UploadPaperButton";
import { Card } from "@/components/ui/Card";
import { FilterBar } from "@/components/ui/FilterBar";
import { hrefWith } from "@/components/ui/hrefWith";
import { Pager } from "@/components/ui/Pager";
import { UPDATED_LABELS, UPDATED_PRESETS } from "@/lib/dateRange";
import { formatDate } from "@/lib/format";
import { GRADE_OPTIONS } from "@/lib/grades";
import { listPapersQuery } from "@/lib/paperForm";
import { FORMAT_NAMES } from "@/lib/paperLayout";
import { requirePage } from "@/lib/permissions";
import { listFolders } from "@/server/folders";
import { listPapers } from "@/server/papers";

export const metadata = { title: "Ngân hàng đề" };

const PATH = "/papers";
const cell = "px-3 py-2.5 align-middle";

export default async function PapersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePage("papers.manage");
  const query = listPapersQuery.parse(await searchParams);
  const list = listPapers(user, query);
  const folderList = listFolders(user);
  if (!list.ok || !folderList.ok) notFound();

  const nodes = flattenFolders(folderList.folders);
  const ranged = query.updated === "range";
  const params = {
    q: query.q,
    grade: query.grade,
    answers: query.answers === "all" ? undefined : query.answers,
    folder: query.folder,
    updated: query.updated,
    from: ranged ? query.from : undefined,
    to: ranged ? query.to : undefined,
  };
  const filtered = query.q || query.grade || query.answers !== "all" || query.updated;
  const total = folderList.folders.reduce((sum, folder) => sum + folder.paperCount, 0);
  const allCount = listPapers(user, { q: "", answers: "all", page: 1 });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Ngân hàng đề</h1>
        <UploadPaperButton folders={nodes} defaultFolder={query.folder} defaultGrade={query.grade} />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <Card className="p-3 lg:sticky lg:top-[calc(var(--header-h)+1rem)]">
          <FolderTree
            nodes={nodes}
            current={query.folder}
            total={allCount.ok ? allCount.total : total}
            allHref={hrefWith(PATH, params, { folder: undefined })}
            hrefFor={Object.fromEntries(nodes.map((node) => [node.id, hrefWith(PATH, params, { folder: node.id })]))}
          />
        </Card>
        <Card>
          <FilterBar
            path={PATH}
            searchLabel="Tìm đề theo tên"
            q={query.q}
            keep={{ folder: query.folder?.toString() }}
            rangeOf="updated"
            total={list.total}
            unit="đề"
            selects={[
              { name: "grade", label: "Khối", base: "", options: GRADE_OPTIONS },
              {
                name: "answers",
                label: "Đáp án",
                base: "all",
                options: [
                  { value: "all", label: "Mọi trạng thái" },
                  { value: "has", label: "Đủ đáp án" },
                  { value: "none", label: "Chưa đủ đáp án" },
                ],
              },
              {
                name: "updated",
                label: "Ngày cập nhật",
                base: "",
                options: [{ value: "", label: "Mọi lúc" }, ...UPDATED_PRESETS.map((preset) => ({ value: preset, label: UPDATED_LABELS[preset] }))],
              },
            ]}
            values={{ grade: query.grade?.toString() ?? "", answers: query.answers, updated: query.updated ?? "", from: params.from ?? "", to: params.to ?? "" }}
          />
          {list.rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                    <th scope="col" className={cell}>Tên đề</th>
                    <th scope="col" className={cell}>Khối</th>
                    <th scope="col" className={cell}>Số câu</th>
                    <th scope="col" className={cell}>Đáp án</th>
                    <th scope="col" className={cell}>Cập nhật</th>
                  </tr>
                </thead>
                <tbody>
                  {list.rows.map((paper) => (
                    <tr key={paper.id} className="border-b border-line last:border-0">
                      <td className={cell}>
                        <Link href={`/papers/${paper.id}`} className="font-semibold text-ink hover:text-brand">
                          {paper.title}
                        </Link>
                        <div className="text-sm text-muted">
                          {FORMAT_NAMES[paper.format]}
                          {paper.folderName && !query.folder ? `, thư mục ${paper.folderName}` : ""}
                        </div>
                      </td>
                      <td className={cell}>{paper.grade}</td>
                      <td className={cell}>{paper.questionCount}</td>
                      <td className={cell}>
                        <AnswerTag questionCount={paper.questionCount} keyedCount={paper.keyedCount} />
                      </td>
                      <td className={`${cell} whitespace-nowrap`}>{formatDate(paper.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-10 text-center text-muted">{filtered || query.folder ? "Không có đề khớp bộ lọc" : "Chưa có đề nào"}</p>
          )}
          <Pager
            path={PATH}
            params={{ q: query.q || undefined, grade: params.grade?.toString(), answers: params.answers, folder: params.folder?.toString(), updated: params.updated, from: params.from, to: params.to }}
            page={list.page}
            pageCount={Math.ceil(list.total / list.pageSize)}
          />
        </Card>
      </div>
    </>
  );
}
