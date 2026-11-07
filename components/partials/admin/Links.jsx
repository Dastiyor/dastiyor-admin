"use client";

import React from "react";
import Link from "next/link";

/** Wraps a table cell in a link to the user's or task's detail page; plain block when there is no id. */
function DetailLink({ base, id, className = "", children }) {
  if (!id) return <div className={className}>{children}</div>;
  return (
    <Link href={`${base}/${id}`} className={`${className} hover:text-primary-500 hover:[&_span]:text-primary-500`}>
      {children}
    </Link>
  );
}

export const UserLink = (props) => <DetailLink base="/admin/users" {...props} />;
export const TaskLink = (props) => <DetailLink base="/admin/tasks" {...props} />;
