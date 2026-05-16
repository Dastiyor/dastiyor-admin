"use client";

import React, { useState, useEffect, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import HomeBredCurbs from "@/components/partials/HomeBredCurbs";
import Link from "next/link";

const TASK_STATUS_COLORS = {
  OPEN: "primary",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

export default function AdminCalendarPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeModal, setActiveModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedStatuses, setSelectedStatuses] = useState(
    Object.keys(TASK_STATUS_COLORS)
  );

  const categories = useMemo(
    () =>
      Object.entries(TASK_STATUS_COLORS).map(([value, color]) => ({
        label: value.replace("_", " "),
        value,
        activeClass: `ring-${color}-500 bg-${color}-500`,
      })),
    []
  );

  useEffect(() => {
    let cancelled = false;
    async function fetchTasks() {
      try {
        const res = await fetch("/api/tasks?limit=500", { credentials: "include" });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (!cancelled) setTasks(json.data || []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchTasks();
    return () => { cancelled = true; };
  }, []);

  const calendarEvents = useMemo(() => {
    return tasks
      .filter((t) => t.dueDate || t.createdAt)
      .map((task) => {
        const date = task.dueDate ? new Date(task.dueDate) : new Date(task.createdAt);
        return {
          id: task.id,
          title: task.title,
          start: date,
          allDay: true,
          extendedProps: {
            type: "task",
            status: task.status,
            taskId: task.id,
            category: task.status,
          },
        };
      });
  }, [tasks]);

  const filteredEvents = useMemo(
    () =>
      calendarEvents.filter((ev) =>
        selectedStatuses.includes(ev.extendedProps?.status)
      ),
    [calendarEvents, selectedStatuses]
  );

  const handleDateClick = (arg) => {
    setSelectedDate(arg.dateStr);
    setActiveModal(true);
  };

  const handleEventClick = (arg) => {
    const status = arg.event.extendedProps?.status;
    if (status) window.location.href = `/admin/tasks?status=${status}`;
    else window.location.href = "/admin/tasks";
  };

  const handleClassName = (arg) => {
    const status = arg.event.extendedProps?.status;
    const color = TASK_STATUS_COLORS[status] || "primary";
    return color;
  };

  const toggleStatus = (status) => {
    if (selectedStatuses.includes(status)) {
      setSelectedStatuses(selectedStatuses.filter((s) => s !== status));
    } else {
      setSelectedStatuses([...selectedStatuses, status]);
    }
  };

  const toggleAll = () => {
    if (selectedStatuses.length === categories.length) {
      setSelectedStatuses([]);
    } else {
      setSelectedStatuses(categories.map((c) => c.value));
    }
  };

  if (loading) {
    return (
      <div>
        <HomeBredCurbs title="Calendar" />
        <div className="p-8 text-center text-slate-500">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <HomeBredCurbs title="Calendar" />
        <p className="text-danger flex items-center gap-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="dastiyor-calender">
      <HomeBredCurbs title="Calendar" />
      <div className="grid grid-cols-12 gap-4">
        <Card className="lg:col-span-3 col-span-12 bg-white">
          <Link href="/admin/tasks">
            <Button
              icon="heroicons-outline:clipboard-document-list"
              text="View all tasks"
              className="btn-dark w-full block"
            />
          </Link>
          <div className="block py-4 text-slate-800 dark:text-slate-400 font-semibold text-xs uppercase mt-4">
            Filter by status
          </div>
          <ul className="space-y-2">
            <li>
              <Checkbox
                activeClass="ring-primary-500 bg-primary-500"
                label="All"
                value={selectedStatuses.length === categories.length}
                onChange={toggleAll}
              />
            </li>
            {categories.map((category) => (
              <li key={category.value}>
                <Checkbox
                  activeClass={category.activeClass}
                  label={category.label}
                  value={selectedStatuses.includes(category.value)}
                  onChange={() => toggleStatus(category.value)}
                />
              </li>
            ))}
          </ul>
          <p className="text-slate-500 text-xs mt-4">
            Tasks shown by due date (or creation date if no due date).
          </p>
        </Card>
        <Card className="lg:col-span-9 col-span-12 bg-white">
          <FullCalendar
            plugins={[
              dayGridPlugin,
              timeGridPlugin,
              interactionPlugin,
              listPlugin,
            ]}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
            }}
            events={filteredEvents}
            editable={false}
            selectable={true}
            dayMaxEvents={3}
            weekends={true}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventClassNames={handleClassName}
            initialView="dayGridMonth"
          />
        </Card>
      </div>

      {activeModal && selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setActiveModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-xl max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h5 className="font-medium text-slate-900 dark:text-white mb-2">
              Date: {new Date(selectedDate).toLocaleDateString(undefined, { dateStyle: "long" })}
            </h5>
            <p className="text-sm text-slate-500 mb-4">
              Create tasks from the Tasks page; they will appear here by due date.
            </p>
            <Button
              text="Close"
              className="btn-dark w-full"
              onClick={() => setActiveModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
