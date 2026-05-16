"use client";

import React, { useEffect, useState, useMemo } from "react";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import Textinput from "@/components/ui/Textinput";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import GlobalFilter from "@/components/partials/table/GlobalFilter";
import HomeBredCurbs from "@/components/partials/HomeBredCurbs";
import {
  useTable,
  useRowSelect,
  useSortBy,
  useGlobalFilter,
  usePagination,
} from "react-table";

const IndeterminateCheckbox = React.forwardRef(
  ({ indeterminate, ...rest }, ref) => {
    const defaultRef = React.useRef();
    const resolvedRef = ref || defaultRef;

    React.useEffect(() => {
      resolvedRef.current.indeterminate = indeterminate;
    }, [resolvedRef, indeterminate]);

    return (
      <input
        type="checkbox"
        ref={resolvedRef}
        {...rest}
        className="table-checkbox"
      />
    );
  }
);

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "", role: "CUSTOMER", isVerified: false, phone: "" });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch larger set for client-side pagination
      const res = await fetch(`/api/users?limit=1000`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setUsers(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = () => {
    setCurrentUser(null);
    setFormData({ fullName: "", email: "", password: "", role: "CUSTOMER", isVerified: false, phone: "" });
    setModalOpen(true);
  };

  const handleEdit = (user) => {
    setCurrentUser(user);
    setFormData({
      fullName: user.fullName || "",
      email: user.email || "",
      password: "",
      role: user.role || "CUSTOMER",
      isVerified: !!user.isVerified,
      phone: user.phone || ""
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      fetchUsers();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleUnlock = async (id) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unlock: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      fetchUsers();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleSubmit = async () => {
    const url = currentUser ? `/api/users/${currentUser.id}` : "/api/users";
    const method = currentUser ? "PUT" : "POST";
    const body = { ...formData };
    if (currentUser && !body.password) delete body.password;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || res.statusText);
      }
      setModalOpen(false);
      fetchUsers();
    } catch (e) {
      alert(e.message);
    }
  };

  const COLUMNS = [
    {
      Header: "User",
      accessor: "fullName",
      Cell: (row) => (
        <div>
          <span className="inline-flex items-center">
            <span className="w-7 h-7 rounded-full ltr:mr-3 rtl:ml-3 flex-none bg-slate-600">
              <span className="text-white text-xs flex w-full h-full justify-center items-center">
                {row?.cell?.value.charAt(0)}
              </span>
            </span>
            <div className="flex flex-col">
              <span className="text-sm text-slate-600 dark:text-slate-300 capitalize">{row?.cell?.value}</span>
              <span className="text-xs text-slate-500">{row?.row?.original?.email}</span>
            </div>
          </span>
        </div>
      ),
    },
    {
      Header: "Role",
      accessor: "role",
      Cell: (row) => (
        <span className="badge bg-primary-500/10 text-primary-500">{row?.cell?.value}</span>
      ),
    },
    {
      Header: "Status",
      accessor: "isVerified",
      Cell: (row) => {
        const user = row?.row?.original;
        const isLocked = user?.lockedUntil && new Date(user.lockedUntil) > new Date();
        return (
          <div className="flex flex-col gap-1">
            {row?.cell?.value ? (
              <span className="text-success-500 text-xs">Verified</span>
            ) : (
              <span className="text-slate-400 text-xs">Unverified</span>
            )}
            {user?.googleId && <span className="text-xs text-info-500">Google</span>}
            {user?.appleId && <span className="text-xs text-slate-500">Apple</span>}
            {isLocked && (
              <span className="text-danger-500 text-xs font-medium">
                Locked ({user.loginAttempts} attempts)
              </span>
            )}
          </div>
        );
      },
    },
    {
      Header: "Tasks / Responses",
      accessor: "id", // Dummy accessor for stats
      Cell: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {row?.row?.original?._count?.tasks ?? 0} tasks / {row?.row?.original?._count?.responses ?? 0} responses
        </span>
      ),
      disableSortBy: true,
    },
    {
      Header: "Action",
      accessor: "action",
      Cell: (row) => {
        const user = row?.row?.original;
        const isLocked = user?.lockedUntil && new Date(user.lockedUntil) > new Date();
        return (
          <div className="flex space-x-3 rtl:space-x-reverse">
            <Tooltip content="Edit" placement="top" arrow animation="shift-away">
              <button className="action-btn" type="button" onClick={() => handleEdit(user)}>
                <Icon icon="heroicons:pencil-square" />
              </button>
            </Tooltip>
            {isLocked && (
              <Tooltip content="Unlock" placement="top" arrow animation="shift-away">
                <button className="action-btn text-warning-500" type="button" onClick={() => handleUnlock(user.id)}>
                  <Icon icon="heroicons:lock-open" />
                </button>
              </Tooltip>
            )}
            <Tooltip content="Delete" placement="top" arrow animation="shift-away" theme="danger">
              <button className="action-btn" type="button" onClick={() => handleDelete(user.id)}>
                <Icon icon="heroicons:trash" />
              </button>
            </Tooltip>
          </div>
        );
      },
    },
  ];

  const columns = useMemo(() => COLUMNS, []);
  const data = useMemo(() => users, [users]);

  const tableInstance = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0, pageSize: 10 }, // Set initial page size
    },
    useGlobalFilter,
    useSortBy,
    usePagination,
    useRowSelect,
    (hooks) => {
      hooks.visibleColumns.push((columns) => [
        {
          id: "selection",
          Header: ({ getToggleAllRowsSelectedProps }) => (
            <div>
              <IndeterminateCheckbox {...getToggleAllRowsSelectedProps()} />
            </div>
          ),
          Cell: ({ row }) => (
            <div>
              <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
            </div>
          ),
        },
        ...columns,
      ]);
    }
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    pageOptions,
    state,
    gotoPage,
    pageCount,
    setPageSize,
    setGlobalFilter,
    prepareRow,
  } = tableInstance;

  const { globalFilter, pageIndex, pageSize } = state;

  return (
    <div>
      <HomeBredCurbs title="Users management" />
      <Card noborder>
        <div className="md:flex justify-between items-center mb-6">
          <Button text="Add User" className="btn-success btn-sm" onClick={handleCreate} />
          <GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />
        </div>
        {error && (
          <p className="text-danger text-sm mb-4 flex items-center gap-2">
            <Icon icon="heroicons-outline:exclamation-circle" className="text-lg" />
            {error} — ensure .env has DATABASE_URL and run: npm run db:push
          </p>
        )}
        {loading ? (
          <div className="p-5 text-center">Loading...</div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-6">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden ">
                  <table
                    className="min-w-full divide-y divide-slate-100 table-fixed dark:divide-slate-700"
                    {...getTableProps()}
                  >
                    <thead className="bg-slate-200 dark:bg-slate-700">
                      {headerGroups.map((headerGroup) => {
                        const { key, ...restHeaderGroupProps } = headerGroup.getHeaderGroupProps();
                        return (
                          <tr key={key} {...restHeaderGroupProps}>
                            {headerGroup.headers.map((column) => {
                              const { key, ...restColumn } = column.getHeaderProps(column.getSortByToggleProps());
                              return (
                                <th
                                  key={key}
                                  {...restColumn}
                                  scope="col"
                                  className=" table-th "
                                >
                                  {column.render("Header")}
                                  <span>
                                    {column.isSorted
                                      ? column.isSortedDesc
                                        ? " 🔽"
                                        : " 🔼"
                                      : ""}
                                  </span>
                                </th>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </thead>
                    <tbody
                      className="bg-white divide-y divide-slate-100 dark:bg-slate-800 dark:divide-slate-700"
                      {...getTableBodyProps()}
                    >
                      {page.map((row) => {
                        prepareRow(row);
                        const { key, ...restRowProps } = row.getRowProps();
                        return (
                          <tr key={key} {...restRowProps}>
                            {row.cells.map((cell) => {
                              const { key, ...restCellProps } = cell.getCellProps();
                              return (
                                <td
                                  key={key}
                                  {...restCellProps}
                                  className="table-td"
                                >
                                  {cell.render("Cell")}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="md:flex md:space-y-0 space-y-5 justify-between mt-6 items-center">
              <div className=" flex items-center space-x-3 rtl:space-x-reverse">
                <select
                  className="form-control py-2 w-max"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {[10, 25, 50, 100].map((pageSize) => (
                    <option key={pageSize} value={pageSize}>
                      Show {pageSize}
                    </option>
                  ))}
                </select>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Page{" "}
                  <span>
                    {pageIndex + 1} of {pageOptions.length}
                  </span>
                </span>
              </div>
              <ul className="flex items-center  space-x-3  rtl:space-x-reverse flex-wrap">
                <li className="text-xl leading-4 text-slate-900 dark:text-white rtl:rotate-180">
                  <button
                    className={` ${!canPreviousPage ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    onClick={() => gotoPage(0)}
                    disabled={!canPreviousPage}
                  >
                    <Icon icon="heroicons:chevron-double-left-solid" />
                  </button>
                </li>
                <li className="text-sm leading-4 text-slate-900 dark:text-white rtl:rotate-180">
                  <button
                    className={` ${!canPreviousPage ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    onClick={() => previousPage()}
                    disabled={!canPreviousPage}
                  >
                    Prev
                  </button>
                </li>
                {pageOptions.map((page, pageIdx) => (
                  <li key={pageIdx}>
                    <button
                      href="#"
                      aria-current="page"
                      className={` ${pageIdx === pageIndex
                          ? "bg-slate-900 dark:bg-slate-600  dark:text-slate-200 text-white font-medium "
                          : "bg-slate-100 dark:bg-slate-700 dark:text-slate-400 text-slate-900  font-normal  "
                        }    text-sm rounded leading-[16px] flex h-6 w-6 items-center justify-center transition-all duration-150`}
                      onClick={() => gotoPage(pageIdx)}
                    >
                      {page + 1}
                    </button>
                  </li>
                ))}
                <li className="text-sm leading-4 text-slate-900 dark:text-white rtl:rotate-180">
                  <button
                    className={` ${!canNextPage ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    onClick={() => nextPage()}
                    disabled={!canNextPage}
                  >
                    Next
                  </button>
                </li>
                <li className="text-xl leading-4 text-slate-900 dark:text-white rtl:rotate-180">
                  <button
                    onClick={() => gotoPage(pageCount - 1)}
                    disabled={!canNextPage}
                    className={` ${!canNextPage ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                  >
                    <Icon icon="heroicons:chevron-double-right-solid" />
                  </button>
                </li>
              </ul>
            </div>
          </>
        )}
      </Card>

      {/* Modal Logic preserved */}
      <Modal
        activeModal={modalOpen}
        onClose={() => setModalOpen(false)}
        title={currentUser ? "Edit User" : "Add User"}
        footerContent={
          <Button
            text={currentUser ? "Update" : "Create"}
            className="btn-dark"
            onClick={handleSubmit}
          />
        }
      >
        <div className="space-y-4">
          <Textinput
            label="Full Name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="John Doe"
          />
          <Textinput
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="user@example.com"
          />
          <Textinput
            label={currentUser ? "Password (leave blank to keep current)" : "Password"}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="******"
          />
          <Textinput
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1234567890"
          />
          <Select
            label="Role"
            options={["CUSTOMER", "PROVIDER", "ADMIN"]}
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          />
          <Checkbox
            label="Verified User"
            value={formData.isVerified}
            onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
          />
        </div>
      </Modal>
    </div>
  );
}
